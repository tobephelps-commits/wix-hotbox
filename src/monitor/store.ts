/**
 * Inventory Monitor Store (v2.0)
 *
 * SQLite-based persistence for tracked products, configuration defaults,
 * and inventory snapshots. All functions accept a Database parameter
 * (from fastify.db) following the v2.0 module pattern.
 *
 * Ported from scripts/monitor/store.ts, converting JSON file persistence
 * to SQLite prepared statements.
 *
 * Phase 51: Inventory Sync
 */

import type Database from 'better-sqlite3';
import type {
  MonitorConfig,
  TrackedProduct,
  InventorySnapshot,
  SkuSnapshot,
  PollPriority,
} from './types.js';
import type { VendorId } from '../vendors/types.js';

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Default monitor configuration values.
 * v2.0: No dataDir field -- persistence is via SQLite.
 */
export const DEFAULT_CONFIG: MonitorConfig = {
  pollIntervalMinutes: 60,
  lowStockThreshold: 10,
  criticalStockThreshold: 3,
  outOfStockThreshold: 0,
  hotIntervalMinutes: 15,
  slowIntervalMinutes: 120,
  snapshotMaxAgeMinutes: 180,
};

/**
 * Returns the default monitor configuration.
 */
export function getMonitorConfig(): MonitorConfig {
  return { ...DEFAULT_CONFIG };
}

// =============================================================================
// Snapshot Staleness Detection
// =============================================================================

/**
 * Check if a snapshot is stale (older than the configured max age).
 *
 * Pure function -- no DB dependency.
 *
 * @param snapshot - Inventory snapshot to check
 * @param maxAgeMinutes - Maximum acceptable age in minutes
 * @returns true if the snapshot is older than maxAgeMinutes
 */
export function isSnapshotStale(snapshot: InventorySnapshot, maxAgeMinutes: number): boolean {
  const snapshotTime = new Date(snapshot.timestamp).getTime();
  const now = Date.now();
  const ageMinutes = (now - snapshotTime) / (1000 * 60);
  return ageMinutes > maxAgeMinutes;
}

// =============================================================================
// Tracked Products CRUD
// =============================================================================

/** Row shape from tracked_products table */
interface TrackedProductRow {
  id: number;
  style: string;
  name: string;
  vendor: string;
  colors: string | null;
  sizes: string | null;
  priority: string;
  low_stock_threshold: number | null;
  critical_stock_threshold: number | null;
  out_of_stock_threshold: number | null;
  last_polled_at: string | null;
  added_at: string;
}

/**
 * Map a database row to a TrackedProduct.
 */
function rowToTrackedProduct(row: TrackedProductRow): TrackedProduct {
  return {
    id: row.id,
    style: row.style,
    name: row.name,
    vendor: row.vendor as VendorId,
    colors: row.colors ? (JSON.parse(row.colors) as string[]) : undefined,
    sizes: row.sizes ? (JSON.parse(row.sizes) as string[]) : undefined,
    priority: row.priority as PollPriority,
    lowStockThreshold: row.low_stock_threshold ?? undefined,
    criticalStockThreshold: row.critical_stock_threshold ?? undefined,
    outOfStockThreshold: row.out_of_stock_threshold ?? undefined,
    lastPolledAt: row.last_polled_at ?? undefined,
    addedAt: row.added_at,
  };
}

/**
 * List all tracked products.
 */
export function listTrackedProducts(db: Database.Database): TrackedProduct[] {
  const rows = db.prepare('SELECT * FROM tracked_products ORDER BY added_at ASC').all() as TrackedProductRow[];
  return rows.map(rowToTrackedProduct);
}

/**
 * Add a product to the tracked products list.
 *
 * Uses INSERT OR IGNORE to prevent duplicates (style + vendor is UNIQUE).
 */
export function addTrackedProduct(
  db: Database.Database,
  product: Omit<TrackedProduct, 'id' | 'addedAt' | 'lastPolledAt'>,
): void {
  db.prepare(`
    INSERT OR IGNORE INTO tracked_products (style, name, vendor, colors, sizes, priority, low_stock_threshold, critical_stock_threshold, out_of_stock_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    product.style,
    product.name,
    product.vendor,
    product.colors ? JSON.stringify(product.colors) : null,
    product.sizes ? JSON.stringify(product.sizes) : null,
    product.priority,
    product.lowStockThreshold ?? null,
    product.criticalStockThreshold ?? null,
    product.outOfStockThreshold ?? null,
  );
}

/**
 * Remove a tracked product by style and vendor.
 *
 * @returns true if a product was deleted, false if not found
 */
export function removeTrackedProduct(
  db: Database.Database,
  style: string,
  vendor: VendorId,
): boolean {
  const result = db.prepare('DELETE FROM tracked_products WHERE style = ? AND vendor = ?').run(style, vendor);
  return result.changes > 0;
}

/**
 * Update a tracked product by style and vendor.
 *
 * Accepts a partial update object -- only provided fields are changed.
 */
export function updateTrackedProduct(
  db: Database.Database,
  style: string,
  vendor: VendorId,
  updates: Partial<Pick<TrackedProduct, 'name' | 'colors' | 'sizes' | 'priority' | 'lowStockThreshold' | 'criticalStockThreshold' | 'outOfStockThreshold'>>,
): void {
  const setClauses: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.name !== undefined) {
    setClauses.push('name = ?');
    values.push(updates.name);
  }
  if (updates.colors !== undefined) {
    setClauses.push('colors = ?');
    values.push(updates.colors ? JSON.stringify(updates.colors) : null);
  }
  if (updates.sizes !== undefined) {
    setClauses.push('sizes = ?');
    values.push(updates.sizes ? JSON.stringify(updates.sizes) : null);
  }
  if (updates.priority !== undefined) {
    setClauses.push('priority = ?');
    values.push(updates.priority);
  }
  if (updates.lowStockThreshold !== undefined) {
    setClauses.push('low_stock_threshold = ?');
    values.push(updates.lowStockThreshold);
  }
  if (updates.criticalStockThreshold !== undefined) {
    setClauses.push('critical_stock_threshold = ?');
    values.push(updates.criticalStockThreshold);
  }
  if (updates.outOfStockThreshold !== undefined) {
    setClauses.push('out_of_stock_threshold = ?');
    values.push(updates.outOfStockThreshold);
  }

  if (setClauses.length === 0) return;

  values.push(style, vendor);
  db.prepare(`UPDATE tracked_products SET ${setClauses.join(', ')} WHERE style = ? AND vendor = ?`).run(...values);
}

// =============================================================================
// Snapshot Persistence
// =============================================================================

/**
 * Get the latest inventory snapshot for a style+vendor.
 *
 * @returns Parsed InventorySnapshot or null if none exists
 */
export function getSnapshot(
  db: Database.Database,
  style: string,
  vendor: VendorId,
): InventorySnapshot | null {
  const row = db.prepare(
    'SELECT * FROM inventory_snapshots WHERE style = ? AND vendor = ?',
  ).get(style, vendor) as { style: string; vendor: string; timestamp: string; data: string } | undefined;

  if (!row) return null;

  return {
    style: row.style,
    vendor: row.vendor as VendorId,
    timestamp: row.timestamp,
    skus: JSON.parse(row.data) as SkuSnapshot[],
  };
}

/**
 * Save an inventory snapshot (INSERT OR REPLACE -- only latest kept per style+vendor).
 */
export function saveSnapshot(
  db: Database.Database,
  style: string,
  vendor: VendorId,
  snapshot: InventorySnapshot,
): void {
  db.prepare(`
    INSERT OR REPLACE INTO inventory_snapshots (style, vendor, timestamp, data)
    VALUES (?, ?, ?, ?)
  `).run(style, vendor, snapshot.timestamp, JSON.stringify(snapshot.skus));
}

// =============================================================================
// Product Last-Polled Tracking
// =============================================================================

/**
 * Update a product's last_polled_at timestamp.
 */
export function updateLastPolledAt(
  db: Database.Database,
  style: string,
  vendor: VendorId,
): void {
  db.prepare(
    "UPDATE tracked_products SET last_polled_at = datetime('now') WHERE style = ? AND vendor = ?",
  ).run(style, vendor);
}
