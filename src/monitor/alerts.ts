/**
 * Stock Alert Detection and Change Comparison (v2.0)
 *
 * Pure functions for comparing inventory snapshots and detecting
 * stock level transitions. No database dependency -- all functions
 * operate on in-memory data structures.
 *
 * Transition types:
 *   normal/low/critical -> out-of-stock  : "out-of-stock"
 *   normal/low -> critical               : "critical"
 *   normal -> low-stock                  : "low-stock"
 *   out-of-stock -> anything above       : "back-in-stock"
 *
 * Ported from scripts/monitor/alerts.ts for v2.0 Pi Appliance.
 * Key change: buildWarehouseDetail works from snapshot data only
 * (no vendor-specific WAREHOUSES constant import).
 *
 * Phase 51: Inventory Sync
 */

import type {
  MonitorConfig,
  MonitorThresholds,
  TrackedProduct,
  InventorySnapshot,
  SkuSnapshot,
  StockAlert,
  AlertWarehouseDetail,
} from './types.js';

// =============================================================================
// Stock Level Classification
// =============================================================================

/** Ordered stock levels from worst to best */
export type StockLevel = 'out-of-stock' | 'critical' | 'low-stock' | 'normal';

/**
 * Classify a SKU's stock level based on threshold values.
 *
 * Checks in order:
 *   <= outOfStockThreshold -> out-of-stock
 *   <= criticalStockThreshold -> critical
 *   <= lowStockThreshold -> low-stock
 *   else -> normal
 *
 * @param totalQty - Total quantity across all warehouses
 * @param thresholds - Threshold values (from config or per-product overrides)
 * @returns Stock level classification
 */
export function classifyStockLevel(
  totalQty: number,
  thresholds: MonitorThresholds,
): StockLevel {
  if (totalQty <= thresholds.outOfStockThreshold) return 'out-of-stock';
  if (totalQty <= thresholds.criticalStockThreshold) return 'critical';
  if (totalQty <= thresholds.lowStockThreshold) return 'low-stock';
  return 'normal';
}

/**
 * Resolve effective thresholds for a product.
 *
 * Per-product threshold overrides take precedence; missing fields
 * fall back to the global MonitorConfig thresholds.
 */
export function getEffectiveThresholds(
  product: TrackedProduct,
  config: MonitorConfig,
): MonitorThresholds {
  return {
    lowStockThreshold: product.lowStockThreshold ?? config.lowStockThreshold,
    criticalStockThreshold: product.criticalStockThreshold ?? config.criticalStockThreshold,
    outOfStockThreshold: product.outOfStockThreshold ?? config.outOfStockThreshold,
  };
}

// =============================================================================
// Warehouse Detail Builder
// =============================================================================

/**
 * Build warehouse detail from a SkuSnapshot's warehouse data.
 *
 * v2.0: Works from snapshot data only (no vendor-specific constant import).
 * Splits warehouses into "with stock" and "out of stock" groups.
 *
 * @param sku - Current SKU snapshot (must have warehouses array)
 * @returns AlertWarehouseDetail or undefined if no warehouse data
 */
function buildWarehouseDetail(sku: SkuSnapshot): AlertWarehouseDetail | undefined {
  if (!sku.warehouses || sku.warehouses.length === 0) {
    return undefined;
  }

  const withStock: AlertWarehouseDetail['warehousesWithStock'] = [];
  const outOfStock: AlertWarehouseDetail['warehousesOutOfStock'] = [];

  for (const wh of sku.warehouses) {
    if (wh.qty > 0) {
      withStock.push({ id: wh.warehouseId, name: wh.warehouseName, qty: wh.qty });
    } else {
      outOfStock.push({ id: wh.warehouseId, name: wh.warehouseName });
    }
  }

  // Sort with-stock by qty descending
  withStock.sort((a, b) => b.qty - a.qty);

  return {
    warehousesWithStock: withStock,
    warehousesOutOfStock: outOfStock,
    totalWarehouses: sku.warehouses.length,
  };
}

// =============================================================================
// Alert Detection
// =============================================================================

/**
 * Compare current snapshot against previous to detect stock level transitions.
 *
 * For each SKU in the current snapshot:
 * 1. Find matching SKU in previous (by color + size)
 * 2. Classify both current and previous stock levels
 * 3. Generate alert only if level CHANGED (transitions)
 *
 * If no previous snapshot (first poll):
 *   - Only generate alerts for SKUs already at critical or out-of-stock
 *   - Skip low-stock on first run to avoid alert flood
 *
 * @param product - TrackedProduct with optional per-product thresholds
 * @param previousSnapshot - Previous inventory snapshot (null for first poll)
 * @param currentSnapshot - Current inventory snapshot
 * @param config - Monitor configuration with thresholds
 * @returns Array of StockAlert objects for any detected transitions
 */
export function detectAlerts(
  product: TrackedProduct,
  previousSnapshot: InventorySnapshot | null,
  currentSnapshot: InventorySnapshot,
  config: MonitorConfig,
): StockAlert[] {
  const alerts: StockAlert[] = [];
  const now = new Date().toISOString();
  const thresholds = getEffectiveThresholds(product, config);

  for (const sku of currentSnapshot.skus) {
    const currentLevel = classifyStockLevel(sku.totalQty, thresholds);

    // Find matching SKU in previous snapshot
    const prevSku = previousSnapshot
      ? previousSnapshot.skus.find(
          (s) => s.color.toLowerCase() === sku.color.toLowerCase() && s.size === sku.size,
        )
      : null;

    if (previousSnapshot && prevSku) {
      // We have a previous reading -- detect transitions
      const prevLevel = classifyStockLevel(prevSku.totalQty, thresholds);

      if (currentLevel === prevLevel) {
        // No level change -- skip
        continue;
      }

      const alertType = getTransitionAlertType(prevLevel, currentLevel);
      if (alertType) {
        alerts.push({
          type: alertType,
          style: currentSnapshot.style,
          productName: product.name,
          color: sku.color,
          size: sku.size,
          previousQty: prevSku.totalQty,
          currentQty: sku.totalQty,
          timestamp: now,
          vendor: product.vendor,
          warehouseDetail: buildWarehouseDetail(sku),
        });
      }
    } else {
      // No previous snapshot or SKU is new -- first poll behavior
      // Only alert for critical or out-of-stock (skip low-stock to avoid flood)
      if (currentLevel === 'out-of-stock' || currentLevel === 'critical') {
        alerts.push({
          type: currentLevel,
          style: currentSnapshot.style,
          productName: product.name,
          color: sku.color,
          size: sku.size,
          previousQty: 0,
          currentQty: sku.totalQty,
          timestamp: now,
          vendor: product.vendor,
          warehouseDetail: buildWarehouseDetail(sku),
        });
      }
    }
  }

  return alerts;
}

/**
 * Determine the alert type for a stock level transition.
 *
 * Returns null if the transition does not warrant an alert.
 */
function getTransitionAlertType(
  prevLevel: StockLevel,
  currentLevel: StockLevel,
): StockAlert['type'] | null {
  // Out-of-stock -> anything above = back in stock
  if (prevLevel === 'out-of-stock' && currentLevel !== 'out-of-stock') {
    return 'back-in-stock';
  }

  // Anything -> out-of-stock = out of stock alert
  if (currentLevel === 'out-of-stock' && prevLevel !== 'out-of-stock') {
    return 'out-of-stock';
  }

  // normal/low -> critical
  if (currentLevel === 'critical' && (prevLevel === 'normal' || prevLevel === 'low-stock')) {
    return 'critical';
  }

  // normal -> low-stock
  if (currentLevel === 'low-stock' && prevLevel === 'normal') {
    return 'low-stock';
  }

  // All other transitions (e.g., critical -> low-stock, low-stock -> normal)
  // are improvements -- no alert needed (except out-of-stock recovery above)
  return null;
}
