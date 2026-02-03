/**
 * Stock Sync Service
 *
 * Core sync engine that processes SanMar inventory snapshots and updates
 * WIX variant visibility accordingly. Out-of-stock variants are hidden;
 * restocked variants are restored to visible.
 *
 * The sync service:
 * 1. Looks up WIX product ID from the product mapping store
 * 2. Fetches current WIX variant state
 * 3. Parses variant SKUs to match against SanMar inventory
 * 4. Updates only variants whose visibility needs to change
 *
 * SKU format: {style}-{catalogColor}-{size}
 *   Example: "PC61-Ath. Maroon-2XL"
 *   - style prefix is removed
 *   - last segment after final dash is size
 *   - everything in between is catalogColor
 *
 * Phase 9: Automated Stock Sync
 */

import { getProduct, updateInventory } from '../pipeline/wix-api.js';
import type { WixInventoryVariant } from '../pipeline/types.js';
import type { MonitorConfig, InventorySnapshot, SkuSnapshot } from '../monitor/types.js';
// Note: classifyStockLevel is no longer used — Phase 31 updates quantities directly
import { isSnapshotStale } from '../monitor/store.js';
import { findMapping } from './product-map.js';
import type { SyncConfig, SyncResult } from './types.js';

// =============================================================================
// SKU Parsing
// =============================================================================

/**
 * Parse a WIX variant SKU to extract catalogColor and size.
 *
 * SKU format: {style}-{catalogColor}-{size}
 * The style prefix is known, so we strip it. The last segment
 * after the final dash is the size. Everything between the style
 * prefix and the size is the catalogColor (which may contain dashes,
 * though uncommon for SanMar).
 *
 * Examples:
 *   "PC61-Ath. Maroon-2XL" -> { catalogColor: "Ath. Maroon", size: "2XL" }
 *   "K420-Black-M"         -> { catalogColor: "Black", size: "M" }
 *   "F244-True Navy-L"     -> { catalogColor: "True Navy", size: "L" }
 *
 * @param sku - The full SKU string
 * @param style - The SanMar style prefix to strip
 * @returns Parsed color and size, or null if SKU format is invalid
 */
export function parseSku(
  sku: string,
  style: string,
): { catalogColor: string; size: string } | null {
  // Strip the style prefix and the first dash
  const prefix = `${style}-`;
  if (!sku.startsWith(prefix)) {
    return null;
  }

  const remainder = sku.slice(prefix.length);
  // Last segment after the final dash is size
  const lastDash = remainder.lastIndexOf('-');
  if (lastDash === -1 || lastDash === 0 || lastDash === remainder.length - 1) {
    return null;
  }

  const catalogColor = remainder.slice(0, lastDash).trim();
  const size = remainder.slice(lastDash + 1).trim();

  return { catalogColor, size };
}

// =============================================================================
// Single Product Sync
// =============================================================================

/**
 * Sync a single product's WIX variant visibility based on SanMar inventory.
 *
 * For each WIX variant:
 * 1. Parse SKU to get catalogColor + size
 * 2. Find matching SkuSnapshot in the inventory snapshot
 * 3. Classify stock level using monitor thresholds
 * 4. Determine desired visibility: out-of-stock -> hidden, everything else -> visible
 * 5. Compare against current variant visibility
 * 6. Collect updates for variants that need changing
 * 7. Send a single batch update to WIX API
 *
 * @param style - SanMar style number
 * @param snapshot - Current inventory snapshot for this style
 * @param config - Monitor configuration (for stock thresholds)
 * @param syncConfig - Sync configuration (for product map location)
 * @returns SyncResult with change counts, or null if product is not mapped
 */
export async function syncProductStock(
  style: string,
  snapshot: InventorySnapshot,
  config: MonitorConfig,
  syncConfig: SyncConfig,
): Promise<SyncResult | null> {
  // Look up WIX product ID from product map
  const mapping = await findMapping(style, syncConfig);
  if (!mapping) {
    return null; // Product not linked to WIX
  }

  const result: SyncResult = {
    style,
    productName: mapping.productName,
    wixProductId: mapping.wixProductId,
    variantsOutOfStock: 0,
    variantsRestocked: 0,
    variantsUnchanged: 0,
    parseErrors: 0,
    errors: [],
  };

  // Check snapshot staleness before syncing
  const maxAge = config.snapshotMaxAgeMinutes ?? 180;
  if (isSnapshotStale(snapshot, maxAge)) {
    const snapshotTime = new Date(snapshot.timestamp).getTime();
    const ageMinutes = Math.round((Date.now() - snapshotTime) / (1000 * 60));
    console.log(
      `[Sync] ${style}: Snapshot is ${ageMinutes}min old (max: ${maxAge}min) — skipping sync to avoid stale data`,
    );
    result.errors.push('Snapshot too old — poll may have failed');
    return result;
  }

  try {
    // Fetch current WIX variant state
    const product = await getProduct(mapping.wixProductId);

    if (!product.variants || product.variants.length === 0) {
      result.errors.push('No variants found on WIX product');
      return result;
    }

    // Build a lookup map for snapshot SKUs: "lowercasedColor|size" -> SkuSnapshot
    // Color is lowercased for case-insensitive matching; sizes are always uppercase
    const snapshotMap = new Map<string, SkuSnapshot>();
    for (const sku of snapshot.skus) {
      snapshotMap.set(`${sku.color.toLowerCase()}|${sku.size}`, sku);
    }

    // Phase 31: Build inventory updates instead of visibility toggles
    // Compare quantity and inStock status, update via Inventory API
    const inventoryUpdate: WixInventoryVariant[] = [];

    for (const variant of product.variants) {
      // Parse SKU to extract catalogColor and size
      const parsed = parseSku(variant.variant.sku, style);
      if (!parsed) {
        // Can't parse SKU -- track as parse error
        result.parseErrors++;
        result.errors.push(`Could not parse SKU: ${variant.variant.sku}`);
        result.variantsUnchanged++;
        continue;
      }

      // Find matching snapshot SKU (case-insensitive color match)
      const snapshotSku = snapshotMap.get(`${parsed.catalogColor.toLowerCase()}|${parsed.size}`);
      const newQty = snapshotSku?.totalQty ?? 0;

      // WIX returns stock.quantity for current level
      const currentQty = variant.stock?.quantity ?? 0;
      const currentInStock = variant.stock?.inStock ?? false;
      const newInStock = newQty > 0;

      // Only update if quantity or inStock status changed
      if (currentQty !== newQty || currentInStock !== newInStock) {
        inventoryUpdate.push({
          variantId: variant.id,
          inStock: newInStock,
          quantity: newQty,
        });

        if (newInStock && !currentInStock) {
          result.variantsRestocked++;
        } else if (!newInStock && currentInStock) {
          result.variantsOutOfStock++;
        }
      } else {
        result.variantsUnchanged++;
      }
    }

    // Send inventory update if changes detected
    if (inventoryUpdate.length > 0) {
      console.log(
        `[Sync] ${style}: Updating ${inventoryUpdate.length} variant(s) ` +
        `(${result.variantsOutOfStock} out-of-stock, ${result.variantsRestocked} restocked)`,
      );
      await updateInventory(mapping.wixProductId, {
        trackQuantity: true,
        variants: inventoryUpdate,
      });
    } else {
      console.log(`[Sync] ${style}: No inventory changes needed.`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Detect 404 for deleted WIX products
    if (message.includes('not found') || message.includes('404') || message.includes('Not Found')) {
      result.errors.push(
        `WIX product ${mapping.wixProductId} not found -- it may have been deleted. Run \`npm run sync:scan\` to refresh mappings.`,
      );
      console.error(
        `[Sync] ${style}: WIX product ${mapping.wixProductId} not found -- it may have been deleted. Run \`npm run sync:scan\` to refresh mappings.`,
      );
    } else {
      result.errors.push(message);
      console.error(`[Sync] ${style}: Error - ${message}`);
    }
  }

  return result;
}

// =============================================================================
// Multi-Product Sync
// =============================================================================

/**
 * Sync all products with inventory snapshots.
 *
 * Iterates through all snapshots and syncs each product that has
 * a WIX product mapping. Products without mappings are silently skipped.
 *
 * @param snapshots - Current inventory snapshots (one per tracked style)
 * @param config - Monitor configuration (for stock thresholds)
 * @param syncConfig - Sync configuration (for product map location)
 * @returns Array of SyncResults (only for mapped products)
 */
export async function syncAllProducts(
  snapshots: InventorySnapshot[],
  config: MonitorConfig,
  syncConfig: SyncConfig,
): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (const snapshot of snapshots) {
    const result = await syncProductStock(
      snapshot.style,
      snapshot,
      config,
      syncConfig,
    );
    if (result) {
      results.push(result);
    }
  }

  return results;
}

// =============================================================================
// Summary Formatting
// =============================================================================

/**
 * Build a human-readable summary of sync results.
 *
 * Shows per-product visibility changes in a compact format:
 *   [Sync] 3 products synced
 *     PC61 Port & Company Essential Tee: 2 hidden, 1 restored, 57 unchanged
 *     K420 Sport-Tek Polo: 0 hidden, 3 restored, 12 unchanged
 *     F244 Port Authority Fleece: 5 hidden, 0 restored, 10 unchanged
 *
 * @param results - Array of SyncResults from syncAllProducts
 * @returns Formatted multi-line summary string
 */
export function buildSyncSummary(results: SyncResult[]): string {
  if (results.length === 0) {
    return '[Sync] No mapped products to sync.';
  }

  const lines: string[] = [];
  lines.push(`[Sync] ${results.length} product(s) synced`);

  for (const r of results) {
    const parts: string[] = [];
    parts.push(`${r.variantsOutOfStock} out-of-stock`);
    parts.push(`${r.variantsRestocked} restocked`);
    parts.push(`${r.variantsUnchanged} unchanged`);

    let line = `  ${r.style} ${r.productName}: ${parts.join(', ')}`;
    if (r.parseErrors > 0) {
      line += ` [${r.parseErrors} parse error(s)]`;
    }
    if (r.errors.length > 0) {
      line += ` [${r.errors.length} error(s)]`;
    }
    lines.push(line);
  }

  // Totals
  const totalOutOfStock = results.reduce((sum, r) => sum + r.variantsOutOfStock, 0);
  const totalRestocked = results.reduce((sum, r) => sum + r.variantsRestocked, 0);
  const totalUnchanged = results.reduce((sum, r) => sum + r.variantsUnchanged, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  lines.push('');
  lines.push(
    `  Total: ${totalOutOfStock} out-of-stock, ${totalRestocked} restocked, ` +
    `${totalUnchanged} unchanged` +
    (totalErrors > 0 ? `, ${totalErrors} error(s)` : ''),
  );

  return lines.join('\n');
}
