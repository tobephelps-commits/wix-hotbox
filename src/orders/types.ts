/**
 * Order Management Types (v2.0)
 *
 * Type definitions for the order management system backed by SQLite.
 * Ported from v1.x scripts/orders/types.ts with relational schema adaptations.
 *
 * Defines the full order lifecycle from receipt through delivery,
 * unified data shapes for orders from any source (WIX eCommerce or manual entry),
 * and valid state transitions.
 */

// =============================================================================
// Order Status & Source
// =============================================================================

/**
 * Full order lifecycle status.
 *
 * Lifecycle flow:
 *   new -> ordered -> received -> in-production -> packed -> shipped -> delivered
 *   (any non-terminal status can transition to 'on-hold' or 'cancelled')
 *
 * Terminal states: 'delivered', 'cancelled'
 */
export type OrderStatus =
  | 'new'
  | 'on-hold'
  | 'ordered'
  | 'received'
  | 'in-production'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

/**
 * Where the order originated.
 * - 'wix': Pulled from WIX eCommerce via API
 * - 'manual': Entered manually (phone, email, in-person)
 */
export type OrderSource = 'wix' | 'manual';

/**
 * Operation types that can produce tracked errors on an order.
 */
export type OrderErrorOperation =
  | 'sync'
  | 'cart-fill'
  | 'print-invoice'
  | 'print-label'
  | 'status-update';

// =============================================================================
// Constants
// =============================================================================

/**
 * All valid order statuses in lifecycle order.
 */
export const ORDER_STATUSES: OrderStatus[] = [
  'new',
  'on-hold',
  'ordered',
  'received',
  'in-production',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
];

/**
 * Terminal statuses — no outgoing transitions allowed.
 */
export const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'cancelled'];

/**
 * Active (non-terminal) statuses — orders still in progress.
 */
export const ACTIVE_STATUSES: OrderStatus[] = ORDER_STATUSES.filter(
  (s) => !TERMINAL_STATUSES.includes(s)
);

/**
 * Valid status transitions for the order lifecycle state machine.
 *
 * Each status maps to the set of statuses it can transition to.
 * 'delivered' and 'cancelled' are terminal states (no outgoing transitions).
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  'new': ['ordered', 'on-hold', 'cancelled'],
  'on-hold': ['new', 'ordered', 'cancelled'],
  'ordered': ['received', 'on-hold', 'cancelled'],
  'received': ['in-production', 'on-hold', 'cancelled'],
  'in-production': ['packed', 'on-hold', 'cancelled'],
  'packed': ['shipped', 'on-hold', 'cancelled'],
  'shipped': ['delivered', 'on-hold', 'cancelled'],
  'delivered': [],
  'cancelled': [],
};

/**
 * Aging thresholds in hours per status.
 * Orders exceeding these thresholds are flagged on the dashboard.
 */
export const AGING_THRESHOLDS: Partial<Record<OrderStatus, number>> = {
  'new': 48,
  'in-production': 72,
  'packed': 24,
};

// =============================================================================
// Address
// =============================================================================

/**
 * A shipping or billing address.
 * Stored as JSON blob in the orders table.
 */
export interface OrderAddress {
  firstName: string;
  lastName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  company?: string;
}

// =============================================================================
// Order Line Item (DB row)
// =============================================================================

/**
 * A single line item in an order (maps to order_items table row).
 */
export interface OrderLineItem {
  id: number;
  orderId: string;
  productName: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  vendorStyle?: string;
  vendor?: string;
  color?: string;
  size?: string;
  imageUrl?: string;
  notes?: string;
  createdAt: string;
}

// =============================================================================
// Order Status History (DB row)
// =============================================================================

/**
 * A status change entry (maps to order_status_history table row).
 */
export interface OrderStatusEntry {
  id: number;
  orderId: string;
  status: OrderStatus;
  note?: string;
  createdAt: string;
}

// =============================================================================
// Order Error (DB row)
// =============================================================================

/**
 * A tracked error for a specific operation on an order
 * (maps to order_errors table row).
 */
export interface OrderError {
  id: number;
  orderId: string;
  operation: OrderErrorOperation;
  message: string;
  retryCount: number;
  resolved: boolean;
  createdAt: string;
}

// =============================================================================
// Order (DB row)
// =============================================================================

/**
 * A unified order from any source (WIX or manual).
 * Maps to the orders table row.
 */
export interface Order {
  id: string;
  wixOrderId?: string;
  orderNumber: number;
  source: OrderSource;
  status: OrderStatus;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddress?: OrderAddress;
  shippingAddress?: OrderAddress;
  collection?: string;
  notes?: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  lastSyncError?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// Composite Types
// =============================================================================

/**
 * Order with all related data loaded (items, history, errors).
 */
export interface OrderWithDetails extends Order {
  items: OrderLineItem[];
  statusHistory: OrderStatusEntry[];
  errors: OrderError[];
}

/**
 * Filter criteria for querying orders.
 */
export interface OrderFilter {
  status?: OrderStatus;
  source?: OrderSource;
  /** Search string for name, email, or order number */
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Dashboard summary statistics for orders.
 */
export interface OrderSummary {
  statusCounts: Record<OrderStatus, number>;
  errorCount: number;
  totalOrders: number;
  lastSync?: string;
}

/**
 * Input for creating a new order.
 */
export interface CreateOrderInput {
  source: OrderSource;
  customerFirstName?: string;
  customerLastName?: string;
  customerEmail?: string;
  customerPhone?: string;
  billingAddress?: OrderAddress;
  shippingAddress?: OrderAddress;
  collection?: string;
  notes?: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  items: Omit<OrderLineItem, 'id' | 'orderId' | 'createdAt'>[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check whether a status transition is valid per the state machine.
 */
export function isValidTransition(
  from: OrderStatus,
  to: OrderStatus
): boolean {
  const allowed = ORDER_STATUS_TRANSITIONS[from];
  return allowed !== undefined && allowed.includes(to);
}
