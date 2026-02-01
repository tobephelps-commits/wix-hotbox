/**
 * Order Module — Public API
 *
 * Barrel export for the order management system. Provides a single import
 * surface for all order-related functionality: types, CRUD, sync, invoices,
 * labels, and printing.
 *
 * Usage:
 *   import { loadOrders, generateInvoice, printInvoice } from '../orders/index.js';
 *
 * Phase 18: Order Management — Invoice & Label Printing (Plan 05)
 */

// =============================================================================
// Types
// =============================================================================

export type {
  OrderStatus,
  OrderSource,
  OrderLineItem,
  OrderAddress,
  OrderCustomer,
  Order,
} from './types.js';

export {
  ORDER_STATUS_TRANSITIONS,
  ORDER_STATUSES,
} from './types.js';

// =============================================================================
// Order Store (CRUD + lifecycle)
// =============================================================================

export {
  loadOrders,
  getOrder,
  getOrderByNumber,
  addOrder,
  updateOrderStatus,
  listOrders,
  upsertWixOrder,
} from './order-store.js';

export type { OrderStore } from './order-store.js';

// =============================================================================
// WIX Order Sync
// =============================================================================

export { syncWixOrders, autoSync } from './wix-order-sync.js';
export type { SyncResult } from './wix-order-sync.js';

// =============================================================================
// WIX Orders API (direct API access)
// =============================================================================

export {
  getRecentOrders,
  searchOrders,
} from './wix-orders-api.js';

// =============================================================================
// Invoice Generation
// =============================================================================

export { generateInvoice, saveInvoice } from './invoice-generator.js';

// =============================================================================
// Shipping Label Generation
// =============================================================================

export { generateShippingLabel, saveShippingLabel } from './label-generator.js';

// =============================================================================
// Print Service
// =============================================================================

export {
  printInvoice,
  printShippingLabel,
  printPdf,
  listPrinters,
} from './print-service.js';

export type { PrintResult } from './print-service.js';
