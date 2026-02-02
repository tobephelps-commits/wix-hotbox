/**
 * Stock Alert Detection and Change Comparison
 *
 * Compares current inventory snapshots against previous snapshots to
 * detect stock level transitions and generate alerts. Only alerts on
 * actual level CHANGES -- not every poll cycle where stock is low.
 *
 * Transition types:
 *   normal/low/critical -> out-of-stock  : "out-of-stock"
 *   normal/low -> critical               : "critical"
 *   normal -> low-stock                  : "low-stock"
 *   out-of-stock -> anything above       : "back-in-stock"
 *
 * Phase 8: Inventory Monitoring
 */

import type {
  MonitorConfig,
  TrackedProduct,
  InventorySnapshot,
  SkuSnapshot,
  StockAlert,
  AlertWarehouseDetail,
} from './types.js';
import { WAREHOUSES } from '../sanmar/constants.js';

// =============================================================================
// Stock Level Classification
// =============================================================================

/** Ordered stock levels from worst to best */
export type StockLevel = 'out-of-stock' | 'critical' | 'low-stock' | 'normal';

/**
 * Merge per-product threshold overrides with global config defaults.
 *
 * Per-product values take precedence when present; missing fields
 * fall back to the global MonitorConfig thresholds.
 *
 * @param product - TrackedProduct with optional per-product thresholds
 * @param config - Global monitor configuration (fallback values)
 * @returns Resolved threshold values to use for classification
 */
export function getEffectiveThresholds(
  product: TrackedProduct,
  config: MonitorConfig,
): { lowStockThreshold: number; criticalStockThreshold: number; outOfStockThreshold: number } {
  return {
    lowStockThreshold: product.thresholds?.lowStockThreshold ?? config.lowStockThreshold,
    criticalStockThreshold: product.thresholds?.criticalStockThreshold ?? config.criticalStockThreshold,
    outOfStockThreshold: product.thresholds?.outOfStockThreshold ?? config.outOfStockThreshold,
  };
}

/**
 * Classify a SKU's stock level based on config thresholds.
 *
 * Checks in order:
 *   <= outOfStockThreshold -> out-of-stock
 *   <= criticalStockThreshold -> critical
 *   <= lowStockThreshold -> low-stock
 *   else -> normal
 *
 * @param totalQty - Total quantity across all warehouses
 * @param config - Monitor configuration with threshold values
 * @param thresholdOverrides - Optional per-product threshold overrides (takes precedence over config)
 * @returns Stock level classification
 */
export function classifyStockLevel(
  totalQty: number,
  config: MonitorConfig,
  thresholdOverrides?: { lowStockThreshold?: number; criticalStockThreshold?: number; outOfStockThreshold?: number },
): StockLevel {
  const low = thresholdOverrides?.lowStockThreshold ?? config.lowStockThreshold;
  const critical = thresholdOverrides?.criticalStockThreshold ?? config.criticalStockThreshold;
  const outOf = thresholdOverrides?.outOfStockThreshold ?? config.outOfStockThreshold;
  if (totalQty <= outOf) return 'out-of-stock';
  if (totalQty <= critical) return 'critical';
  if (totalQty <= low) return 'low-stock';
  return 'normal';
}

// =============================================================================
// Warehouse Detail Builder
// =============================================================================

/**
 * Build warehouse detail from a SkuSnapshot's warehouse data.
 *
 * For SanMar products, splits warehouses into "with stock" and "out of stock" groups
 * using the WAREHOUSES constant. For other vendors (or when warehouse IDs don't match
 * the SanMar set), builds groups directly from the snapshot's warehouse data.
 *
 * @param sku - Current SKU snapshot (must have warehouses array)
 * @returns AlertWarehouseDetail or undefined if no warehouse data
 */
function buildWarehouseDetail(sku: SkuSnapshot): AlertWarehouseDetail | undefined {
  if (!sku.warehouses || sku.warehouses.length === 0) {
    return undefined;
  }

  // Build a map of warehouse IDs present in snapshot
  const snapshotMap = new Map(sku.warehouses.map((w) => [w.warehouseId, w]));

  const withStock: AlertWarehouseDetail['warehousesWithStock'] = [];
  const outOfStock: AlertWarehouseDetail['warehousesOutOfStock'] = [];

  // Check if this looks like SanMar data (numeric string IDs matching WAREHOUSES)
  const sanmarIds = new Set(WAREHOUSES.map((w) => String(w.id)));
  const isSanMar = sku.warehouses.some((w) => sanmarIds.has(w.warehouseId));

  if (isSanMar) {
    // SanMar path: iterate through known warehouses to show out-of-stock ones too
    for (const wh of WAREHOUSES) {
      const whId = String(wh.id);
      const entry = snapshotMap.get(whId);
      if (entry && entry.qty > 0) {
        withStock.push({ id: whId, name: wh.name, qty: entry.qty });
      } else {
        outOfStock.push({ id: whId, name: wh.name });
      }
    }
  } else {
    // Non-SanMar path: build from snapshot data only (we don't have a full warehouse list)
    for (const wh of sku.warehouses) {
      if (wh.qty > 0) {
        withStock.push({ id: wh.warehouseId, name: wh.warehouseName, qty: wh.qty });
      } else {
        outOfStock.push({ id: wh.warehouseId, name: wh.warehouseName });
      }
    }
  }

  // Sort with-stock by qty descending
  withStock.sort((a, b) => b.qty - a.qty);

  return {
    warehousesWithStock: withStock,
    warehousesOutOfStock: outOfStock,
    totalWarehouses: isSanMar ? WAREHOUSES.length : sku.warehouses.length,
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
 * @param current - Current inventory snapshot
 * @param previous - Previous inventory snapshot (null for first poll)
 * @param config - Monitor configuration with thresholds
 * @param productName - Human-friendly product name for alert messages
 * @param product - Optional TrackedProduct for per-product threshold overrides
 * @returns Array of StockAlert objects for any detected transitions
 */
export function detectAlerts(
  current: InventorySnapshot,
  previous: InventorySnapshot | null,
  config: MonitorConfig,
  productName: string,
  product?: TrackedProduct,
): StockAlert[] {
  const alerts: StockAlert[] = [];
  const now = new Date().toISOString();

  // Resolve per-product threshold overrides (if product provided)
  const overrides = product?.thresholds;

  for (const sku of current.skus) {
    const currentLevel = classifyStockLevel(sku.totalQty, config, overrides);

    // Find matching SKU in previous snapshot
    const prevSku = previous
      ? previous.skus.find((s) => s.color === sku.color && s.size === sku.size)
      : null;

    if (previous && prevSku) {
      // We have a previous reading -- detect transitions
      const prevLevel = classifyStockLevel(prevSku.totalQty, config, overrides);

      if (currentLevel === prevLevel) {
        // No level change -- skip
        continue;
      }

      const alertType = getTransitionAlertType(prevLevel, currentLevel);
      if (alertType) {
        alerts.push({
          type: alertType,
          style: current.style,
          productName,
          color: sku.color,
          size: sku.size,
          previousQty: prevSku.totalQty,
          currentQty: sku.totalQty,
          timestamp: now,
          warehouseDetail: buildWarehouseDetail(sku),
        });
      }
    } else {
      // No previous snapshot or SKU is new -- first poll behavior
      // Only alert for critical or out-of-stock (skip low-stock to avoid flood)
      if (currentLevel === 'out-of-stock' || currentLevel === 'critical') {
        alerts.push({
          type: currentLevel,
          style: current.style,
          productName,
          color: sku.color,
          size: sku.size,
          previousQty: 0,
          currentQty: sku.totalQty,
          timestamp: now,
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

// =============================================================================
// Alert Formatting
// =============================================================================

/**
 * Format a one-line warehouse summary for an alert.
 *
 * Shows up to 3 warehouses with stock (sorted by qty desc) and up to 2
 * out-of-stock warehouses, with "+N more" for the rest.
 *
 * Example: "Stock in: Seattle(450), Dallas(200). Out: Cincinnati, Reno, +5 more"
 *
 * @param detail - Warehouse detail from alert
 * @returns Formatted warehouse summary string
 */
function formatWarehouseSummary(detail: AlertWarehouseDetail): string {
  const parts: string[] = [];

  // Show up to 3 warehouses with stock
  if (detail.warehousesWithStock.length > 0) {
    const shown = detail.warehousesWithStock.slice(0, 3);
    const formatted = shown.map((w) => `${w.name}(${w.qty.toLocaleString()})`).join(', ');
    parts.push(`Stock in: ${formatted}`);
  }

  // Show up to 2 out-of-stock warehouses, then "+N more"
  if (detail.warehousesOutOfStock.length > 0) {
    const shown = detail.warehousesOutOfStock.slice(0, 2);
    const formatted = shown.map((w) => w.name).join(', ');
    const remaining = detail.warehousesOutOfStock.length - shown.length;
    const suffix = remaining > 0 ? `, +${remaining} more` : '';
    parts.push(`Out: ${formatted}${suffix}`);
  }

  return parts.join('. ');
}

/**
 * Format a single alert for console output.
 *
 * If warehouseDetail is present, appends a one-line warehouse summary.
 *
 * @param alert - Stock alert to format
 * @returns Formatted alert string with emoji prefix
 */
export function formatAlert(alert: StockAlert): string {
  const sku = `${alert.productName} - ${alert.color} ${alert.size}`;

  let line: string;
  switch (alert.type) {
    case 'out-of-stock':
      line = `\u26A0 OUT OF STOCK: ${sku} (was ${alert.previousQty}, now ${alert.currentQty})`;
      break;
    case 'critical':
      line = `\uD83D\uDD34 CRITICAL: ${sku} (${alert.currentQty} remaining)`;
      break;
    case 'low-stock':
      line = `\uD83D\uDFE1 LOW STOCK: ${sku} (${alert.currentQty} remaining)`;
      break;
    case 'back-in-stock':
      line = `\uD83D\uDFE2 BACK IN STOCK: ${sku} (${alert.currentQty} available)`;
      break;
  }

  // Append warehouse summary if detail is available
  if (alert.warehouseDetail) {
    const summary = formatWarehouseSummary(alert.warehouseDetail);
    if (summary) {
      line += `\n     ${summary}`;
    }
  }

  return line;
}

/**
 * Format a summary of multiple alerts for console output.
 *
 * Groups alerts by type and lists each one. If no alerts,
 * returns a "no changes" message.
 *
 * @param alerts - Array of stock alerts to summarize
 * @returns Formatted multi-line summary string
 */
export function formatAlertSummary(alerts: StockAlert[]): string {
  if (alerts.length === 0) {
    return 'No stock level changes detected.';
  }

  const lines: string[] = [];

  // Count by type
  const counts = {
    'out-of-stock': 0,
    critical: 0,
    'low-stock': 0,
    'back-in-stock': 0,
  };
  for (const alert of alerts) {
    counts[alert.type]++;
  }

  // Summary header
  const parts: string[] = [];
  if (counts['out-of-stock'] > 0) parts.push(`${counts['out-of-stock']} out-of-stock`);
  if (counts.critical > 0) parts.push(`${counts.critical} critical`);
  if (counts['low-stock'] > 0) parts.push(`${counts['low-stock']} low-stock`);
  if (counts['back-in-stock'] > 0) parts.push(`${counts['back-in-stock']} back-in-stock`);

  lines.push(`[Alerts] ${alerts.length} stock level change(s): ${parts.join(', ')}`);
  lines.push('');

  // List each alert
  for (const alert of alerts) {
    lines.push(`  ${formatAlert(alert)}`);
  }

  return lines.join('\n');
}
