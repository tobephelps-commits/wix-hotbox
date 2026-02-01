/**
 * Inventory Monitoring Types
 *
 * TypeScript interfaces for the inventory monitoring system:
 * - Configuration for polling intervals and alert thresholds
 * - Tracked products with optional color/size filtering
 * - Inventory snapshots for point-in-time readings
 * - Stock alerts for threshold crossings
 *
 * Phase 8: Inventory Monitoring
 */

// =============================================================================
// Poll Priority
// =============================================================================

/**
 * Priority tier for polling frequency.
 *
 * - 'hot': High-demand products polled frequently (default: every 15 min)
 * - 'normal': Standard products polled at default interval (default: every 60 min)
 * - 'slow': Stable products polled less often (default: every 120 min)
 */
export type PollPriority = 'hot' | 'normal' | 'slow';

// =============================================================================
// Configuration
// =============================================================================

/**
 * Configuration for the inventory monitoring system.
 *
 * Controls polling frequency, data storage location, and
 * alert thresholds for stock level changes.
 */
export interface MonitorConfig {
  /** How often to check inventory, in minutes (default: 60) — serves as 'normal' interval */
  pollIntervalMinutes: number;
  /** Directory for JSON state files (default: "./data/monitor") */
  dataDir: string;
  /** Total qty below this = low stock alert (default: 10) */
  lowStockThreshold: number;
  /** Total qty below this = critical alert (default: 3) */
  criticalStockThreshold: number;
  /** Total qty at or below this = out of stock alert (default: 0) */
  outOfStockThreshold: number;
  /** Poll interval for 'hot' priority products, in minutes (default: 15) */
  hotIntervalMinutes?: number;
  /** Poll interval for 'slow' priority products, in minutes (default: 120) */
  slowIntervalMinutes?: number;
}

// =============================================================================
// Tracked Products
// =============================================================================

/**
 * A product being monitored for inventory changes.
 *
 * Each tracked product maps to a SanMar style number. Optional
 * color and size filters allow monitoring a subset of variants.
 */
export interface TrackedProduct {
  /** SanMar style number (e.g., "PC61") */
  style: string;
  /** Human-friendly name for alerts (e.g., "Port & Company Essential Tee") */
  name: string;
  /** ISO timestamp when product was added to monitoring */
  addedAt: string;
  /** Optional: only monitor specific catalog colors (monitor all if omitted) */
  colors?: string[];
  /** Optional: only monitor specific sizes (monitor all if omitted) */
  sizes?: string[];
  /** Polling priority tier (default: 'normal') */
  priority?: PollPriority;
  /** ISO timestamp of last successful poll for this product */
  lastPolledAt?: string;
}

// =============================================================================
// Inventory Snapshots
// =============================================================================

/**
 * Per-warehouse quantity for a single SKU at snapshot time.
 *
 * Preserves individual warehouse stock levels so downstream consumers
 * can implement closest-warehouse logic, warehouse-aware alerts, and
 * warehouse inventory dashboards.
 */
export interface WarehouseQuantity {
  /** SanMar warehouse ID (e.g., 1 = Seattle, 2 = Cincinnati) */
  warehouseId: number;
  /** Human-readable warehouse name (e.g., "Seattle", "Dallas") */
  warehouseName: string;
  /** Quantity available at this warehouse */
  qty: number;
}

/**
 * A point-in-time inventory reading for a single style.
 *
 * Contains per-SKU inventory data captured during a poll cycle.
 * Only the latest snapshot is persisted per style (for change detection).
 */
export interface InventorySnapshot {
  /** SanMar style number */
  style: string;
  /** ISO timestamp of this snapshot */
  timestamp: string;
  /** Per-SKU inventory readings */
  skus: SkuSnapshot[];
}

/**
 * Per-SKU inventory at snapshot time.
 *
 * Summarizes warehouse-level data into a single total quantity
 * and a well-stocked boolean flag. Optionally includes per-warehouse
 * breakdown for warehouse-aware consumers.
 */
export interface SkuSnapshot {
  /** Catalog color name */
  color: string;
  /** Size code (e.g., "S", "M", "L", "XL") */
  size: string;
  /** Sum of quantity across all warehouses */
  totalQty: number;
  /** true if any warehouse is at the 1500 inventory cap */
  wellStocked: boolean;
  /** Per-warehouse quantity breakdown (optional for backward compatibility) */
  warehouses?: WarehouseQuantity[];
}

// =============================================================================
// Stock Alerts
// =============================================================================

/**
 * An alert triggered by a stock level threshold crossing.
 *
 * Defined here in Plan 01, consumed by Plan 02 (alert thresholds).
 * Alerts are generated by comparing current snapshot against previous.
 */
export interface StockAlert {
  /** Alert type based on threshold crossed */
  type: 'out-of-stock' | 'critical' | 'low-stock' | 'back-in-stock';
  /** SanMar style number */
  style: string;
  /** Human-friendly product name */
  productName: string;
  /** Catalog color that triggered the alert */
  color: string;
  /** Size that triggered the alert */
  size: string;
  /** Quantity at previous snapshot */
  previousQty: number;
  /** Quantity at current snapshot */
  currentQty: number;
  /** ISO timestamp when alert was generated */
  timestamp: string;
}
