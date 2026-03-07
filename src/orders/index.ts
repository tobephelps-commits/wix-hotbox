/**
 * Orders Module - Barrel Export
 *
 * Re-exports all order types and service functions for convenient importing.
 *
 * v2.0 architecture: src/orders/
 * Phase 49: Order Management Core
 */

// Types and constants
export type {
  OrderStatus,
  OrderSource,
  OrderErrorOperation,
  Order,
  OrderWithDetails,
  OrderLineItem,
  OrderStatusEntry,
  OrderError,
  OrderAddress,
  OrderFilter,
  OrderSummary,
  CreateOrderInput,
} from './types.js';

export {
  ORDER_STATUSES,
  TERMINAL_STATUSES,
  ACTIVE_STATUSES,
  ORDER_STATUS_TRANSITIONS,
  AGING_THRESHOLDS,
  isValidTransition,
} from './types.js';

// Service functions
export {
  getNextOrderNumber,
  createOrder,
  getOrder,
  getOrderByNumber,
  getOrderByWixId,
  listOrders,
  updateOrderStatus,
  updateOrderStatusBulk,
  upsertWixOrder,
  deleteOrder,
  clearWixOrders,
  addOrderError,
  resolveOrderError,
  getOrdersWithErrors,
  getOrderSummary,
  getOrderSummaryExtended,
} from './order-service.js';

export type { ExtendedOrderSummary } from './order-service.js';
