/**
 * Inventory Monitor - Public API
 *
 * Barrel export providing the clean import surface for the
 * inventory monitoring system. Phase 9 (Automated Stock Sync)
 * and other consumers should import from this module.
 *
 * Usage:
 *   import { pollOnce, detectAlerts, loadConfig } from '../monitor/index.js';
 *
 * Phase 8: Inventory Monitoring
 */

// Types
export type {
  MonitorConfig,
  TrackedProduct,
  InventorySnapshot,
  SkuSnapshot,
  WarehouseQuantity,
  StockAlert,
  AlertWarehouseDetail,
} from './types.js';

// Store (configuration and tracked product management)
export {
  loadConfig,
  saveConfig,
  loadTrackedProducts,
  addTrackedProduct,
  removeTrackedProduct,
} from './store.js';

// Poller (inventory fetching)
export { pollOnce, startPolling, unifiedInventoryToSnapshots } from './poller.js';

// Alerts (stock level detection and formatting)
export {
  classifyStockLevel,
  detectAlerts,
  formatAlert,
  formatAlertSummary,
} from './alerts.js';
export type { StockLevel } from './alerts.js';

// Alert Log (persistent alert storage)
export {
  getRecentAlerts,
  appendAlerts,
  clearAlertLog,
  ensureAlertLog,
} from './alert-log.js';
