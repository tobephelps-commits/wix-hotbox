/**
 * Stock Sync Engine (v2.0)
 *
 * Core sync engine that processes vendor inventory snapshots and updates
 * WIX variant inventory accordingly. Out-of-stock variants get quantity 0;
 * restocked variants get their actual quantity from the snapshot.
 *
 * Ported from scripts/sync/stock-sync.ts for v2.0 Pi Appliance.
 * Key changes:
 * - Self-contained WIX API calls (same pattern as orders/wix-sync.ts)
 * - Database parameter instead of file-based SyncConfig
 * - wixConfig parameter { apiKey, siteId } instead of env vars
 *
 * Phase 51: Inventory Sync
 */

import type Database from 'better-sqlite3';
import type { InventorySnapshot, SkuSnapshot, MonitorConfig } from '../monitor/types.js';
import type { SyncResult, ProductMapping } from './types.js';
import { findMapping, listMappings } from './product-map.js';
import { isSnapshotStale, getSnapshot } from '../monitor/store.js';

// =============================================================================
// WIX API Types (local, matching Stores V1 response shape)
// =============================================================================

/** WIX config for API calls */
export interface WixConfig {
  apiKey: string;
  siteId: string;
}

/** WIX product variant from Stores V1 API */
interface WixVariant {
  id: string;
  variant: {
    sku: string;
    [key: string]: unknown;
  };
  stock?: {
    quantity?: number;
    inStock?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/** WIX product from Stores V1 API */
interface WixProduct {
  id: string;
  name: string;
  variants?: WixVariant[];
  [key: string]: unknown;
}

/** WIX inventory variant update payload */
interface WixInventoryVariant {
  variantId: string;
  inStock: boolean;
  quantity: number;
}

// =============================================================================
// Constants
// =============================================================================

/** WIX Stores V1 API base URL */
const STORES_API_BASE = 'https://www.wixapis.com/stores/v1';

/** Delay between WIX API calls to respect rate limits (ms) */
const WIX_RATE_LIMIT_DELAY_MS = 200;

// =============================================================================
// WIX API Helpers
// =============================================================================

/**
 * Build WIX API request headers.
 */
function getHeaders(wixConfig: WixConfig): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${wixConfig.apiKey}`,
    'wix-site-id': wixConfig.siteId,
  };
}

/**
 * Delay helper for rate limiting.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a WIX product with its variants.
 */
async function getProduct(
  wixProductId: string,
  wixConfig: WixConfig,
): Promise<WixProduct> {
  const endpoint = `${STORES_API_BASE}/products/${wixProductId}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getHeaders(wixConfig),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '(unable to read body)');
    throw new Error(
      `WIX Stores API ${response.status} at GET ${endpoint}: ${body}`,
    );
  }

  const data = await response.json() as { product: WixProduct };
  return data.product;
}

/**
 * Update WIX product inventory (quantities and inStock flags).
 */
async function updateInventory(
  wixProductId: string,
  update: { trackQuantity: boolean; variants: WixInventoryVariant[] },
  wixConfig: WixConfig,
): Promise<void> {
  const endpoint = `${STORES_API_BASE}/products/${wixProductId}/variants/inventory`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getHeaders(wixConfig),
    body: JSON.stringify({
      trackQuantity: update.trackQuantity,
      variants: update.variants.map((v) => ({
        variantId: v.variantId,
        inStock: v.inStock,
        quantity: v.quantity,
      })),
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '(unable to read body)');
    throw new Error(
      `WIX Stores API ${response.status} at POST ${endpoint}: ${body}`,
    );
  }
}

// =============================================================================
// SKU Parsing
// =============================================================================

/**
 * Parse a WIX variant SKU to extract catalogColor and size.
 *
 * SKU format: {style}-{catalogColor}-{size}
 * The style prefix is known, so we strip it. The last segment
 * after the final dash is the size. Everything between the style
 * prefix and the size is the catalogColor (which may contain dashes).
 *
 * Examples:
 *   "PC61-Ath. Maroon-2XL" -> { catalogColor: "Ath. Maroon", size: "2XL" }
 *   "K420-Black-M"         -> { catalogColor: "Black", size: "M" }
 *
 * @param sku - The full SKU string
 * @param style - The vendor style prefix to strip
 * @returns Parsed color and size, or null if SKU format is invalid
 */
export function parseSku(
  sku: string,
  style: string,
): { catalogColor: string; size: string } | null {
  const prefix = `${style}-`;
  if (!sku.startsWith(prefix)) {
    return null;
  }

  const remainder = sku.slice(prefix.length);
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
 * Sync a single product's WIX inventory based on vendor snapshot.
 *
 * For each WIX variant:
 * 1. Parse SKU to get catalogColor + size
 * 2. Find matching SkuSnapshot in the inventory snapshot
 * 3. Compare quantity and inStock status
 * 4. Collect updates for variants that need changing
 * 5. Send batch update to WIX API
 *
 * @param db - SQLite database instance
 * @param mapping - Product mapping linking vendor style to WIX product
 * @param wixConfig - WIX API credentials
 * @returns SyncResult with change counts
 */
export async function syncProductStock(
  db: Database.Database,
  mapping: ProductMapping,
  wixConfig: WixConfig,
): Promise<SyncResult> {
  const { style, vendor } = mapping;

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

  // Get latest snapshot from monitor store
  const snapshot = getSnapshot(db, style, vendor);
  if (!snapshot) {
    result.errors.push('No inventory snapshot available');
    return result;
  }

  // Check snapshot staleness
  const maxAge = 180; // 3 hours default
  if (isSnapshotStale(snapshot, maxAge)) {
    const snapshotTime = new Date(snapshot.timestamp).getTime();
    const ageMinutes = Math.round((Date.now() - snapshotTime) / (1000 * 60));
    console.log(
      `[Sync] ${style}: Snapshot is ${ageMinutes}min old (max: ${maxAge}min) -- skipping sync`,
    );
    result.errors.push('Snapshot too old -- poll may have failed');
    return result;
  }

  try {
    // Fetch current WIX variant state
    const product = await getProduct(mapping.wixProductId, wixConfig);

    if (!product.variants || product.variants.length === 0) {
      result.errors.push('No variants found on WIX product');
      return result;
    }

    // Build lookup map: "lowercasedColor|size" -> SkuSnapshot
    const snapshotMap = new Map<string, SkuSnapshot>();
    for (const sku of snapshot.skus) {
      snapshotMap.set(`${sku.color.toLowerCase()}|${sku.size}`, sku);
    }

    // Build inventory updates
    const inventoryUpdate: WixInventoryVariant[] = [];

    for (const variant of product.variants) {
      const parsed = parseSku(variant.variant.sku, style);
      if (!parsed) {
        result.parseErrors++;
        result.errors.push(`Could not parse SKU: ${variant.variant.sku}`);
        result.variantsUnchanged++;
        continue;
      }

      // Find matching snapshot SKU (case-insensitive color, exact size)
      const snapshotSku = snapshotMap.get(
        `${parsed.catalogColor.toLowerCase()}|${parsed.size}`,
      );
      const newQty = snapshotSku?.totalQty ?? 0;

      const currentQty = variant.stock?.quantity ?? 0;
      const currentInStock = variant.stock?.inStock ?? false;
      const newInStock = newQty > 0;

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
      await delay(WIX_RATE_LIMIT_DELAY_MS);
      await updateInventory(
        mapping.wixProductId,
        { trackQuantity: true, variants: inventoryUpdate },
        wixConfig,
      );
    } else {
      console.log(`[Sync] ${style}: No inventory changes needed.`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes('not found') ||
      message.includes('404') ||
      message.includes('Not Found')
    ) {
      result.errors.push(
        `WIX product ${mapping.wixProductId} not found -- may have been deleted`,
      );
      console.error(
        `[Sync] ${style}: WIX product ${mapping.wixProductId} not found`,
      );
    } else {
      result.errors.push(message);
      console.error(`[Sync] ${style}: Error - ${message}`);
    }
  }

  return result;
}

// =============================================================================
// Summary Formatting
// =============================================================================

/**
 * Build a human-readable summary of sync results.
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
