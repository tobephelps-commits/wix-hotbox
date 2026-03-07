/**
 * Inventory Monitor Module (v2.0)
 *
 * Barrel export for the monitoring subsystem.
 * Re-exports types, store, alerts, and alert-log.
 *
 * Phase 51: Inventory Sync
 */

// Types
export type {
  PollPriority,
  MonitorThresholds,
  MonitorConfig,
  TrackedProduct,
  WarehouseQuantity,
  SkuSnapshot,
  InventorySnapshot,
  AlertWarehouseDetail,
  StockAlert,
} from './types.js';

// Store
export {
  DEFAULT_CONFIG,
  getMonitorConfig,
  isSnapshotStale,
  listTrackedProducts,
  addTrackedProduct,
  removeTrackedProduct,
  updateTrackedProduct,
  getSnapshot,
  saveSnapshot,
  updateLastPolledAt,
} from './store.js';

// Alerts (pure functions)
export type { StockLevel } from './alerts.js';
export {
  classifyStockLevel,
  getEffectiveThresholds,
  detectAlerts,
} from './alerts.js';

// Alert Log
export type { AlertFilter } from './alert-log.js';
export {
  logAlerts,
  getAlerts,
  pruneAlerts,
  acknowledgeAlert,
} from './alert-log.js';

// Poller
export {
  unifiedInventoryToSnapshots,
  pollDue,
  pollProduct,
  pollOnce,
} from './poller.js';
