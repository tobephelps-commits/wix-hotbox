/**
 * Sync Module - Barrel Exports
 *
 * Public API for the stock sync system:
 * - Types: ProductMapping, SyncResult, SyncHealth, NotificationConfig, etc.
 * - Product mappings: CRUD operations for vendor style -> WIX product ID
 * - Notifications: SMTP email digest delivery
 * - Stock sync: WIX inventory updates from vendor snapshots
 * - Sync poller: Daemon lifecycle and health tracking
 */

// Types
export type {
  ProductMapping,
  SyncResult,
  MappingAuditResult,
  NotificationResult,
  NotificationConfig,
  SyncHealth,
} from './types.js';

// Product mapping CRUD
export {
  findMapping,
  saveMapping,
  removeMapping,
  listMappings,
} from './product-map.js';

// Notifications
export { sendSyncNotification } from './notifications.js';

// Stock sync engine
export { parseSku, syncProductStock, buildSyncSummary } from './stock-sync.js';
export type { WixConfig } from './stock-sync.js';

// Sync poller / daemon
export {
  syncOnce,
  startDaemon,
  stopDaemon,
  isDaemonRunning,
  getSyncHealth,
} from './sync-poller.js';
