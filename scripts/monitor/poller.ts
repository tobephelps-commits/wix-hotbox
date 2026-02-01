/**
 * Inventory Monitor Polling Engine
 *
 * Core polling logic that periodically fetches inventory from any
 * registered vendor adapter for all tracked products, saves snapshots,
 * detects stock level transitions, and generates alerts.
 *
 * Vendor routing: Each TrackedProduct has an optional `vendor` field
 * (defaults to 'sanmar'). The poller uses the VendorAdapter registry
 * to route inventory queries to the correct vendor API.
 *
 * Usage:
 *   import { pollOnce, startPolling } from './poller.js';
 *   const snapshots = await pollOnce(config);
 *   // or
 *   await startPolling(config); // runs continuously
 *
 * Phase 8: Inventory Monitoring
 * Phase 17: Vendor-agnostic polling via VendorAdapter
 */

import 'dotenv/config';

import type { VendorId, UnifiedInventory } from '../vendor/types.js';
import { getVendor } from '../vendor/registry.js';
// Register both adapters so getVendor() can find them
import '../sanmar/adapter.js';
import '../ss-activewear/adapter.js';

import type { MonitorConfig, InventorySnapshot, SkuSnapshot, StockAlert, TrackedProduct, WarehouseQuantity } from './types.js';
import { loadConfig, loadTrackedProducts, loadLatestSnapshot, saveSnapshot, updateProductLastPolled } from './store.js';
import { detectAlerts, formatAlertSummary } from './alerts.js';
import { appendAlerts, ensureAlertLog } from './alert-log.js';

// =============================================================================
// Unified Inventory -> SkuSnapshot Mapping
// =============================================================================

/**
 * Convert UnifiedInventory[] from a VendorAdapter to SkuSnapshot[] format.
 *
 * Maps UnifiedWarehouse[] to WarehouseQuantity[] (both use string IDs).
 * Determines wellStocked based on a high-quantity threshold (1500 for SanMar,
 * generous threshold for other vendors).
 *
 * @param inventory - Unified inventory from a VendorAdapter
 * @returns SkuSnapshot array for use in InventorySnapshot
 */
export function unifiedInventoryToSnapshots(inventory: UnifiedInventory[]): SkuSnapshot[] {
  return inventory.map((item) => {
    // Map UnifiedWarehouse[] to WarehouseQuantity[]
    const warehouses: WarehouseQuantity[] = item.warehouses
      .filter((w) => w.qty > 0)
      .map((w) => ({
        warehouseId: w.id,
        warehouseName: w.name,
        qty: w.qty,
      }));

    // wellStocked: true if any warehouse has >= 1500 (SanMar cap) or total >= 1500
    const wellStocked = item.warehouses.some((w) => w.qty >= 1500) || item.totalQty >= 1500;

    return {
      color: item.color,
      size: item.size,
      totalQty: item.totalQty,
      wellStocked,
      warehouses,
    };
  });
}

// =============================================================================
// Pre-flight Check
// =============================================================================

/** Set of vendors whose credentials have been checked this process */
const _credsChecked = new Set<VendorId>();

/**
 * Run a pre-flight credential check for a vendor (once per process).
 * Validates credentials via the adapter's validateCredentials() method.
 *
 * @param vendorId - Vendor to check
 * @throws Error if credentials are not configured
 */
async function ensureCredentials(vendorId: VendorId): Promise<void> {
  if (_credsChecked.has(vendorId)) return;

  const adapter = getVendor(vendorId);
  const valid = await adapter.validateCredentials();
  if (!valid) {
    throw new Error(
      `${adapter.vendorName} credentials not configured or invalid. ` +
      `Check your .env file for the required ${adapter.vendorName} environment variables.`,
    );
  }
  _credsChecked.add(vendorId);
}

// =============================================================================
// Single Poll Cycle
// =============================================================================

/**
 * Execute a single poll cycle for all tracked products.
 *
 * For each tracked product:
 * 1. Determine vendor from product.vendor (defaults to 'sanmar')
 * 2. Get the VendorAdapter and call getStyleInventory(style)
 * 3. Convert UnifiedInventory[] to SkuSnapshot[]
 * 4. Filter to tracked colors/sizes if specified
 * 5. Load previous snapshot for change detection
 * 6. Detect stock level transitions and generate alerts
 * 7. Save new snapshot (overwriting previous)
 * 8. Append alerts to persistent log
 *
 * @param config - Monitor configuration
 * @param onAlerts - Optional callback invoked when alerts are generated
 * @param productsOverride - Optional subset of products to poll (if omitted, polls all tracked products)
 * @returns Array of new inventory snapshots (one per tracked product)
 */
export async function pollOnce(
  config: MonitorConfig,
  onAlerts?: (alerts: StockAlert[]) => void,
  productsOverride?: TrackedProduct[],
): Promise<InventorySnapshot[]> {
  const products = productsOverride ?? await loadTrackedProducts(config);

  if (products.length === 0) {
    console.log('[Monitor] No tracked products. Add products with: monitor add <style> <name>');
    return [];
  }

  // Pre-flight credential checks for all vendors in the product list
  const vendorsNeeded = new Set<VendorId>(products.map((p) => p.vendor ?? 'sanmar'));
  for (const v of vendorsNeeded) {
    await ensureCredentials(v);
  }

  console.log(`[Monitor] Polling ${products.length} tracked product(s)...`);
  const snapshots: InventorySnapshot[] = [];
  let totalAlerts = 0;

  for (const product of products) {
    try {
      const vendorId = product.vendor ?? 'sanmar';
      const adapter = getVendor(vendorId);

      // Fetch all SKU inventory via vendor adapter
      const unifiedInventory = await adapter.getStyleInventory(product.style);

      // Convert UnifiedInventory[] to SkuSnapshot[]
      let skuSnapshots = unifiedInventoryToSnapshots(unifiedInventory);

      // Filter to tracked colors if specified
      if (product.colors && product.colors.length > 0) {
        const trackedColors = new Set(product.colors);
        skuSnapshots = skuSnapshots.filter((s) => trackedColors.has(s.color));
      }

      // Filter to tracked sizes if specified
      if (product.sizes && product.sizes.length > 0) {
        const trackedSizes = new Set(product.sizes);
        skuSnapshots = skuSnapshots.filter((s) => trackedSizes.has(s.size));
      }

      const snapshot: InventorySnapshot = {
        style: product.style,
        timestamp: new Date().toISOString(),
        vendor: vendorId,
        skus: skuSnapshots,
      };

      // Load previous snapshot BEFORE saving new one (for change detection)
      const previousSnapshot = await loadLatestSnapshot(product.style, config);

      // Persist new snapshot (overwrites previous)
      await saveSnapshot(snapshot, config);
      snapshots.push(snapshot);

      // Detect stock level transitions
      const alerts = detectAlerts(snapshot, previousSnapshot, config, product.name);

      if (alerts.length > 0) {
        // Log alerts to console
        console.log(formatAlertSummary(alerts));
        // Persist alerts to log file
        await appendAlerts(alerts, config);
        // Invoke callback if provided
        if (onAlerts) {
          onAlerts(alerts);
        }
        totalAlerts += alerts.length;
      }

      const vendorLabel = vendorId === 'sanmar' ? 'SanMar' : 'S&S';
      console.log(`[Monitor] ${product.style} (${vendorLabel}): ${skuSnapshots.length} SKUs fetched`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Monitor] ${product.style}: Error - ${message}`);
    }
  }

  // Ensure alerts.json exists (even if empty) after every poll cycle
  await ensureAlertLog(config);

  console.log(`[Monitor] Poll complete. ${products.length} products checked, ${totalAlerts} alerts generated.`);
  return snapshots;
}

// =============================================================================
// Priority-Based Polling
// =============================================================================

/**
 * Get the poll interval in minutes for a given priority tier.
 *
 * @param priority - Product priority tier (defaults to 'normal')
 * @param config - Monitor configuration with optional interval overrides
 * @returns Interval in minutes for this priority tier
 */
function getIntervalForPriority(priority: TrackedProduct['priority'], config: MonitorConfig): number {
  switch (priority ?? 'normal') {
    case 'hot':
      return config.hotIntervalMinutes ?? 15;
    case 'slow':
      return config.slowIntervalMinutes ?? 120;
    case 'normal':
    default:
      return config.pollIntervalMinutes;
  }
}

/**
 * Determine which tracked products are due for polling based on their
 * priority tier and lastPolledAt timestamp.
 *
 * A product is "due" if:
 * - It has never been polled (lastPolledAt is undefined)
 * - The elapsed time since lastPolledAt exceeds the interval for its priority tier
 *
 * @param products - All tracked products
 * @param config - Monitor configuration with interval settings
 * @returns Subset of products that need polling now
 */
export function getProductsDueToPoll(
  products: TrackedProduct[],
  config: MonitorConfig,
): TrackedProduct[] {
  const now = Date.now();

  return products.filter((product) => {
    // Never polled -- always due
    if (!product.lastPolledAt) {
      return true;
    }

    const lastPolled = new Date(product.lastPolledAt).getTime();
    const intervalMs = getIntervalForPriority(product.priority, config) * 60 * 1000;

    return (now - lastPolled) >= intervalMs;
  });
}

/**
 * Poll only products that are due based on their priority tier.
 *
 * Uses getProductsDueToPoll() to determine which products need checking,
 * then polls them via pollOnce with vendor-aware routing. After each product
 * is polled, updates its lastPolledAt timestamp.
 *
 * @param config - Monitor configuration
 * @param onAlerts - Optional callback invoked when alerts are generated
 * @returns Array of new inventory snapshots for products that were polled
 */
export async function pollDue(
  config: MonitorConfig,
  onAlerts?: (alerts: StockAlert[]) => void,
): Promise<InventorySnapshot[]> {
  const allProducts = await loadTrackedProducts(config);
  const dueProducts = getProductsDueToPoll(allProducts, config);

  if (dueProducts.length === 0) {
    console.log('[Monitor] No products due for polling this tick.');
    return [];
  }

  console.log(`[Monitor] ${dueProducts.length} of ${allProducts.length} product(s) due for polling...`);

  // Poll due products via pollOnce with productsOverride.
  // pollOnce routes each product through the correct VendorAdapter.
  const pollSnapshots = await pollOnce(config, onAlerts, dueProducts);

  // Update lastPolledAt for each successfully polled product
  const now = new Date().toISOString();
  for (const product of dueProducts) {
    // Check if this product got a snapshot (it was successfully polled)
    const wasPolled = pollSnapshots.some((s) => s.style === product.style);
    if (wasPolled) {
      await updateProductLastPolled(product.style, now, config);
    }
  }

  return pollSnapshots;
}

// =============================================================================
// Continuous Polling
// =============================================================================

/**
 * Start continuous inventory polling.
 *
 * Runs pollOnce immediately, then sets up an interval to repeat
 * at the configured frequency. Handles SIGINT for graceful shutdown.
 *
 * @param config - Monitor configuration (loaded from file if not provided)
 */
export async function startPolling(config?: MonitorConfig): Promise<void> {
  const cfg = config ?? await loadConfig();
  const products = await loadTrackedProducts(cfg);

  console.log(
    `[Monitor] Started. Polling every ${cfg.pollIntervalMinutes} minutes for ${products.length} product(s).`,
  );

  // Run immediately
  await pollOnce(cfg);

  // Set up interval
  const intervalMs = cfg.pollIntervalMinutes * 60 * 1000;
  const interval = setInterval(async () => {
    try {
      await pollOnce(cfg);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[Monitor] Poll cycle error: ${message}`);
    }
  }, intervalMs);

  // Graceful shutdown on SIGINT
  process.on('SIGINT', () => {
    clearInterval(interval);
    console.log('\n[Monitor] Stopped.');
    process.exit(0);
  });

  // Keep process alive
  console.log(`[Monitor] Next poll in ${cfg.pollIntervalMinutes} minutes. Press Ctrl+C to stop.`);
}
