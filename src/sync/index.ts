/**
 * Sync Module - Barrel Exports
 *
 * Public API for the stock sync system:
 * - Types: ProductMapping, SyncResult, SyncHealth, NotificationConfig, etc.
 * - Product mappings: CRUD operations for vendor style -> WIX product ID
 * - Notifications: SMTP email digest delivery
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
