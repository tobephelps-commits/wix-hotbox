/**
 * Inventory Monitoring Types (v2.0)
 *
 * TypeScript interfaces for the inventory monitoring system:
 * - Configuration for polling intervals and alert thresholds
 * - Tracked products with optional color/size filtering
 * - Inventory snapshots for point-in-time readings
 * - Stock alerts for threshold crossings
 *
 * Ported from scripts/monitor/types.ts for v2.0 Pi Appliance.
 * Key change: MonitorConfig no longer has dataDir (v2.0 uses SQLite).
 */

import type { VendorId } from '../vendors/types.js';

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
// Thresholds
// =============================================================================

/**
 * Stock level threshold values for alert classification.
 *
 * Extracted as a reusable type for per-product overrides and
 * global config defaults.
 */
export interface MonitorThresholds {
  /** Total qty below this = low stock alert (default: 10) */
  lowStockThreshold: number;
  /** Total qty below this = critical alert (default: 3) */
  criticalStockThreshold: number;
  /** Total qty at or below this = out of stock alert (default: 0) */
  outOfStockThreshold: number;
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Configuration for the inventory monitoring system.
 *
 * Controls polling frequency and alert thresholds.
 * v2.0: No dataDir field -- persistence is via SQLite (Database parameter).
 */
export interface MonitorConfig extends MonitorThresholds {
  /** How often to check inventory, in minutes (default: 60) -- serves as 'normal' interval */
  pollIntervalMinutes: number;
  /** Poll interval for 'hot' priority products, in minutes (default: 15) */
  hotIntervalMinutes?: number;
  /** Poll interval for 'slow' priority products, in minutes (default: 120) */
  slowIntervalMinutes?: number;
  /** Maximum snapshot age in minutes before it's considered stale (default: 180) */
  snapshotMaxAgeMinutes?: number;
}

// =============================================================================
// Tracked Products
// =============================================================================

/**
 * A product being monitored for inventory changes.
 *
 * Each tracked product maps to a vendor style number. Optional
 * color and size filters allow monitoring a subset of variants.
 */
export interface TrackedProduct {
  /** Database row ID (present when loaded from DB) */
  id?: number;
  /** Vendor style number (e.g., "PC61" for SanMar, "2000" for S&S) */
  style: string;
  /** Human-friendly name for alerts (e.g., "Port & Company Essential Tee") */
  name: string;
  /** Which vendor to query for this product */
  vendor: VendorId;
  /** Optional: only monitor specific catalog colors (monitor all if omitted) */
  colors?: string[];
  /** Optional: only monitor specific sizes (monitor all if omitted) */
  sizes?: string[];
  /** Polling priority tier (default: 'normal') */
  priority: PollPriority;
  /** Optional per-product low stock threshold override */
  lowStockThreshold?: number;
  /** Optional per-product critical stock threshold override */
  criticalStockThreshold?: number;
  /** Optional per-product out of stock threshold override */
  outOfStockThreshold?: number;
  /** ISO timestamp of last successful poll for this product */
  lastPolledAt?: string;
  /** ISO timestamp when product was added to monitoring */
  addedAt: string;
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
 *
 * warehouseId is string to accommodate both vendors:
 * - SanMar: numeric IDs as strings (e.g., "1", "2", "31")
 * - S&S: state abbreviation codes (e.g., "IL", "TX", "NV")
 */
export interface WarehouseQuantity {
  /** Warehouse identifier (string for cross-vendor compatibility) */
  warehouseId: string;
  /** Human-readable warehouse name (e.g., "Seattle", "Dallas") */
  warehouseName: string;
  /** Quantity available at this warehouse */
  qty: number;
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

/**
 * A point-in-time inventory reading for a single style.
 *
 * Contains per-SKU inventory data captured during a poll cycle.
 * Only the latest snapshot is persisted per style+vendor (for change detection).
 */
export interface InventorySnapshot {
  /** Vendor style number */
  style: string;
  /** ISO timestamp of this snapshot */
  timestamp: string;
  /** Which vendor this snapshot came from */
  vendor: VendorId;
  /** Per-SKU inventory readings */
  skus: SkuSnapshot[];
}

// =============================================================================
// Stock Alerts
// =============================================================================

/**
 * Per-alert warehouse context showing which warehouses have stock
 * and which are out. Populated when the source SkuSnapshot includes
 * warehouse-level data; absent for legacy snapshots.
 */
export interface AlertWarehouseDetail {
  /** Warehouses with qty > 0, sorted by qty descending */
  warehousesWithStock: { id: string; name: string; qty: number }[];
  /** Warehouses with qty === 0 or not present in snapshot */
  warehousesOutOfStock: { id: string; name: string }[];
  /** Total warehouses for this vendor */
  totalWarehouses: number;
}

export interface StockAlert {
  /** Alert type based on threshold crossed */
  type: 'out-of-stock' | 'critical' | 'low-stock' | 'back-in-stock';
  /** Vendor style number */
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
  /** Which vendor this alert is for */
  vendor: VendorId;
  /** Per-warehouse stock detail (present when snapshot has warehouse data) */
  warehouseDetail?: AlertWarehouseDetail;
}
