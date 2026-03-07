/**
 * Inventory Monitor Polling Engine (v2.0)
 *
 * Core polling logic that fetches inventory from registered vendor adapters
 * for tracked products, saves snapshots, detects stock level transitions,
 * and generates alerts.
 *
 * Vendor routing: Each TrackedProduct has a `vendor` field. The poller uses
 * the VendorAdapter registry to route inventory queries to the correct API.
 *
 * v2.0 adaptations from v1.x:
 * - Database parameter instead of file-based store
 * - Uses getVendor() from src/vendors/registry.ts
 * - Credentials validated via adapter.validateCredentials() once per process
 * - Config comes from Fastify (fastify.config)
 *
 * Phase 51: Inventory Sync
 */

import type Database from 'better-sqlite3';
import type { VendorId, UnifiedInventory } from '../vendors/types.js';
import { getVendor } from '../vendors/registry.js';
import type {
  MonitorConfig,
  TrackedProduct,
  InventorySnapshot,
  SkuSnapshot,
  StockAlert,
  WarehouseQuantity,
} from './types.js';
import {
  DEFAULT_CONFIG,
  listTrackedProducts,
  getSnapshot,
  saveSnapshot,
  updateLastPolledAt,
} from './store.js';
import { detectAlerts } from './alerts.js';
import { logAlerts } from './alert-log.js';

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
// Pre-flight Credential Check
// =============================================================================

/** Set of vendors whose credentials have been checked this process */
const _credsChecked = new Set<VendorId>();

/**
 * Run a pre-flight credential check for a vendor (once per process).
 * Validates credentials via the adapter's validateCredentials() method.
 *
 * @param vendorId - Vendor to check
 * @throws Error if credentials are not configured or invalid
 */
async function ensureCredentials(vendorId: VendorId): Promise<void> {
  if (_credsChecked.has(vendorId)) return;

  const adapter = getVendor(vendorId);
  const valid = await adapter.validateCredentials();
  if (!valid) {
    throw new Error(
      `${adapter.vendorName} credentials not configured or invalid. ` +
      `Check your environment variables for the required ${adapter.vendorName} credentials.`,
    );
  }
  _credsChecked.add(vendorId);
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
 * Check which tracked products are due for polling based on priority tier
 * intervals and lastPolledAt timestamps.
 *
 * A product is "due" if:
 * - It has never been polled (lastPolledAt is undefined)
 * - The elapsed time since lastPolledAt exceeds the interval for its priority tier
 *
 * @param db - Database instance
 * @param config - Monitor configuration with interval settings
 * @returns Subset of tracked products that need polling now
 */
export function pollDue(db: Database.Database, config: MonitorConfig): TrackedProduct[] {
  const products = listTrackedProducts(db);
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

// =============================================================================
// Single Product Poll
// =============================================================================

/**
 * Fetch inventory for a single tracked product via the vendor adapter registry.
 *
 * Steps:
 * 1. Get the VendorAdapter for this product's vendor
 * 2. Call getStyleInventory(style) to fetch unified inventory
 * 3. Convert UnifiedInventory[] to SkuSnapshot[] format
 * 4. Filter to tracked colors/sizes if specified
 * 5. Load previous snapshot for change detection
 * 6. Save new snapshot, detect alerts, log alerts
 * 7. Update lastPolledAt timestamp
 *
 * @param db - Database instance
 * @param product - Tracked product to poll
 * @param config - Monitor configuration
 * @returns Object with snapshot and any alerts generated
 */
export async function pollProduct(
  db: Database.Database,
  product: TrackedProduct,
  config: MonitorConfig,
): Promise<{ snapshot: InventorySnapshot; alerts: StockAlert[] }> {
  const vendorId = product.vendor;
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
  const previousSnapshot = getSnapshot(db, product.style, vendorId);

  // Persist new snapshot (overwrites previous)
  saveSnapshot(db, product.style, vendorId, snapshot);

  // Detect stock level transitions
  const alerts = detectAlerts(product, previousSnapshot, snapshot, config);

  if (alerts.length > 0) {
    // Persist alerts to database
    logAlerts(db, alerts);
  }

  // Update lastPolledAt
  updateLastPolledAt(db, product.style, vendorId);

  return { snapshot, alerts };
}

// =============================================================================
// Single Poll Cycle
// =============================================================================

/**
 * Execute a single poll cycle: get due products, poll each sequentially,
 * collect all alerts.
 *
 * @param db - Database instance
 * @param config - Monitor configuration (defaults to DEFAULT_CONFIG)
 * @returns Summary of poll cycle results
 */
export async function pollOnce(
  db: Database.Database,
  config: MonitorConfig = DEFAULT_CONFIG,
): Promise<{ productsPolled: number; alerts: StockAlert[]; errors: string[] }> {
  const dueProducts = pollDue(db, config);

  if (dueProducts.length === 0) {
    return { productsPolled: 0, alerts: [], errors: [] };
  }

  // Pre-flight credential checks for all vendors in the product list
  const vendorsNeeded = new Set<VendorId>(dueProducts.map((p) => p.vendor));
  for (const v of vendorsNeeded) {
    await ensureCredentials(v);
  }

  const allAlerts: StockAlert[] = [];
  const errors: string[] = [];
  let polledCount = 0;

  for (const product of dueProducts) {
    try {
      const result = await pollProduct(db, product, config);
      allAlerts.push(...result.alerts);
      polledCount++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${product.style}: ${message}`);
    }
  }

  return { productsPolled: polledCount, alerts: allAlerts, errors };
}
