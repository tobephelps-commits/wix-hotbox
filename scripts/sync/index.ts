/**
 * Stock Sync Module - Public API
 *
 * Barrel export providing the clean import surface for the
 * stock sync system. Exports types, product mapping CRUD,
 * and sync engine functions.
 *
 * Usage:
 *   import { syncAllProducts, findMapping, loadProductMap } from '../sync/index.js';
 *
 * Phase 9: Automated Stock Sync
 */

// Types
export type {
  ProductMapping,
  SyncResult,
  SyncConfig,
  NotificationConfig,
} from './types.js';

// Product mapping store (CRUD + config)
export {
  loadProductMap,
  saveProductMap,
  addProductMapping,
  removeProductMapping,
  findMapping,
  getDefaultSyncConfig,
} from './product-map.js';

// Stock sync engine
export {
  parseSku,
  syncProductStock,
  syncAllProducts,
  buildSyncSummary,
} from './stock-sync.js';

// Notifications
export {
  buildSyncEmailBody,
  sendSyncNotification,
  notifySyncResults,
} from './notifications.js';
