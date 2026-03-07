/**
 * Persistent Alert Log (v2.0)
 *
 * SQLite-based alert persistence with batch insert, filtering,
 * pagination, pruning, and acknowledgment. All functions accept
 * a Database parameter following the v2.0 module pattern.
 *
 * Ported from scripts/monitor/alert-log.ts, converting JSON file
 * persistence to SQLite prepared statements.
 *
 * Phase 51: Inventory Sync
 */

import type Database from 'better-sqlite3';
import type { StockAlert } from './types.js';
import type { VendorId } from '../vendors/types.js';

/** Default number of days to retain alerts before time-based pruning */
const DEFAULT_ALERT_RETENTION_DAYS = 30;

/** Default maximum number of alerts to keep after pruning */
const DEFAULT_MAX_ALERT_COUNT = 1000;

// =============================================================================
// Alert Row Type
// =============================================================================

interface AlertRow {
  id: number;
  type: string;
  style: string;
  product_name: string;
  vendor: string;
  color: string;
  size: string;
  previous_qty: number;
  current_qty: number;
  warehouse_detail: string | null;
  acknowledged: number;
  created_at: string;
}

/**
 * Map a database row to a StockAlert.
 */
function rowToStockAlert(row: AlertRow): StockAlert & { id: number; acknowledged: boolean } {
  return {
    id: row.id,
    type: row.type as StockAlert['type'],
    style: row.style,
    productName: row.product_name,
    vendor: row.vendor as VendorId,
    color: row.color,
    size: row.size,
    previousQty: row.previous_qty,
    currentQty: row.current_qty,
    timestamp: row.created_at,
    warehouseDetail: row.warehouse_detail ? JSON.parse(row.warehouse_detail) : undefined,
    acknowledged: row.acknowledged === 1,
  };
}

// =============================================================================
// Alert Log Operations
// =============================================================================

/**
 * Filter options for querying alerts.
 */
export interface AlertFilter {
  style?: string;
  vendor?: VendorId;
  type?: StockAlert['type'];
  since?: string;
  acknowledged?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Batch insert alerts into the database.
 *
 * @param db - Database instance
 * @param alerts - Array of StockAlert objects to persist
 */
export function logAlerts(db: Database.Database, alerts: StockAlert[]): void {
  if (alerts.length === 0) return;

  const insert = db.prepare(`
    INSERT INTO alerts (type, style, product_name, vendor, color, size, previous_qty, current_qty, warehouse_detail, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: StockAlert[]) => {
    for (const alert of items) {
      insert.run(
        alert.type,
        alert.style,
        alert.productName,
        alert.vendor,
        alert.color,
        alert.size,
        alert.previousQty,
        alert.currentQty,
        alert.warehouseDetail ? JSON.stringify(alert.warehouseDetail) : null,
        alert.timestamp,
      );
    }
  });

  insertMany(alerts);
}

/**
 * Query alerts with optional filtering and pagination.
 *
 * Results are ordered by created_at DESC (newest first).
 */
export function getAlerts(
  db: Database.Database,
  filters?: AlertFilter,
): (StockAlert & { id: number; acknowledged: boolean })[] {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters?.style) {
    conditions.push('style = ?');
    params.push(filters.style);
  }
  if (filters?.vendor) {
    conditions.push('vendor = ?');
    params.push(filters.vendor);
  }
  if (filters?.type) {
    conditions.push('type = ?');
    params.push(filters.type);
  }
  if (filters?.since) {
    conditions.push('created_at >= ?');
    params.push(filters.since);
  }
  if (filters?.acknowledged !== undefined) {
    conditions.push('acknowledged = ?');
    params.push(filters.acknowledged ? 1 : 0);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const rows = db.prepare(
    `SELECT * FROM alerts ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
  ).all(...params, limit, offset) as AlertRow[];

  return rows.map(rowToStockAlert);
}

/**
 * Prune old alerts beyond retention period, then cap total count.
 *
 * Strategy: First delete alerts older than maxAgeDays, then if count
 * still exceeds maxCount, delete oldest entries to bring count down.
 *
 * @param db - Database instance
 * @param maxAgeDays - Days to retain alerts (default: 30)
 * @param maxCount - Maximum number of alerts to keep (default: 1000)
 * @returns Number of alerts pruned
 */
export function pruneAlerts(
  db: Database.Database,
  maxAgeDays: number = DEFAULT_ALERT_RETENTION_DAYS,
  maxCount: number = DEFAULT_MAX_ALERT_COUNT,
): number {
  let totalPruned = 0;

  // Step 1: Delete alerts older than retention period
  const cutoffDate = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
  const ageResult = db.prepare('DELETE FROM alerts WHERE created_at < ?').run(cutoffDate);
  totalPruned += ageResult.changes;

  // Step 2: Cap total count (keep most recent maxCount)
  const countRow = db.prepare('SELECT COUNT(*) as cnt FROM alerts').get() as { cnt: number };
  if (countRow.cnt > maxCount) {
    const excess = countRow.cnt - maxCount;
    db.prepare(
      'DELETE FROM alerts WHERE id IN (SELECT id FROM alerts ORDER BY created_at ASC LIMIT ?)',
    ).run(excess);
    totalPruned += excess;
  }

  return totalPruned;
}

/**
 * Mark an alert as acknowledged.
 *
 * @param db - Database instance
 * @param id - Alert row ID
 * @returns true if the alert was found and acknowledged
 */
export function acknowledgeAlert(db: Database.Database, id: number): boolean {
  const result = db.prepare('UPDATE alerts SET acknowledged = 1 WHERE id = ?').run(id);
  return result.changes > 0;
}
