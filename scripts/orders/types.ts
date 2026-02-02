/**
 * Order Management Types
 *
 * Type definitions for the order management system. Defines the full order
 * lifecycle from receipt through delivery, unified data shapes for orders
 * from any source (WIX eCommerce or manual entry), and valid state transitions.
 *
 * Phase 18: Order Management — Invoice & Label Printing
 */

// =============================================================================
// Order Status & Source
// =============================================================================

/**
 * Full order lifecycle status.
 *
 * Lifecycle flow:
 *   new -> ordered -> received -> in-production -> packed -> shipped -> delivered
 *   (any non-terminal status can transition to 'cancelled')
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

// =============================================================================
// Order Line Items
// =============================================================================

/**
 * A single line item in an order.
 */
export interface OrderLineItem {
  /** Product display name */
  productName: string;
  /** SKU identifier (optional) */
  sku?: string;
  /** Quantity ordered */
  quantity: number;
  /** Retail price per unit charged to customer */
  unitPrice: number;
  /** Total price for this line (quantity * unitPrice) */
  totalPrice: number;
  /** Vendor style number for ordering from SanMar/S&S (optional) */
  vendorStyle?: string;
  /** Source vendor for this item (optional) */
  vendor?: 'sanmar' | 'ss';
  /** Color name (optional) */
  color?: string;
  /** Size label (optional) */
  size?: string;
  /** Product image URL (optional) */
  imageUrl?: string;
}

// =============================================================================
// Address & Customer
// =============================================================================

/**
 * A shipping or billing address.
 */
export interface OrderAddress {
  /** First name */
  firstName: string;
  /** Last name */
  lastName: string;
  /** Company name (optional) */
  company?: string;
  /** Street address line 1 */
  addressLine1: string;
  /** Street address line 2 (optional) */
  addressLine2?: string;
  /** City */
  city: string;
  /** State/province (2-letter code for US) */
  state: string;
  /** Postal/ZIP code */
  postalCode: string;
  /** Country code (default 'US') */
  country: string;
  /** Phone number (optional) */
  phone?: string;
}

/**
 * Customer information on an order.
 */
export interface OrderCustomer {
  /** Customer first name */
  firstName: string;
  /** Customer last name */
  lastName: string;
  /** Customer email (optional) */
  email?: string;
  /** Customer phone number (optional) */
  phone?: string;
}

// =============================================================================
// Order Error Tracking
// =============================================================================

/**
 * Tracked error for a specific operation on an order.
 *
 * Enables per-order failure visibility so the dashboard can surface
 * exactly what needs attention vs what's fine.
 */
export interface OrderError {
  /** What operation failed */
  operation: 'sync' | 'cart-fill' | 'print-invoice' | 'print-label' | 'status-update';
  /** Error message */
  message: string;
  /** ISO-8601 timestamp of failure */
  timestamp: string;
  /** Number of retry attempts so far */
  retryCount: number;
  /** Whether this error has been resolved */
  resolved: boolean;
}

// =============================================================================
// Order
// =============================================================================

/**
 * A unified order from any source (WIX or manual).
 *
 * This is the core data model for the order management system.
 * All orders follow the same lifecycle regardless of source.
 */
export interface Order {
  /** Unique identifier (UUID v4 for local, WIX order ID for WIX orders) */
  id: string;
  /** Display order number (e.g., 10043) */
  orderNumber: number;
  /** Where this order originated */
  source: OrderSource;
  /** WIX order ID (only for WIX-sourced orders) */
  wixOrderId?: string;
  /** Current lifecycle status */
  status: OrderStatus;
  /** Customer information */
  customer: OrderCustomer;
  /** Billing address (optional) */
  billingAddress?: OrderAddress;
  /** Shipping address (optional) */
  shippingAddress?: OrderAddress;
  /** Line items in this order */
  lineItems: OrderLineItem[];
  /** Order subtotal (sum of line item totals) */
  subtotal: number;
  /** Shipping cost */
  shippingCost: number;
  /** Tax amount */
  tax: number;
  /** Discount amount */
  discount: number;
  /** Order total (subtotal + shipping + tax - discount) */
  total: number;
  /** Collection/brand category for pickup labels (e.g., "Big Barn", "Board30") */
  collection?: string;
  /** Buyer notes or internal notes (optional) */
  notes?: string;
  /** ISO-8601 creation timestamp */
  createdAt: string;
  /** ISO-8601 last update timestamp */
  updatedAt: string;
  /** History of status changes for audit trail */
  statusHistory: Array<{
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }>;
  /** Tracked errors for this order (empty array if none) */
  errors?: OrderError[];
  /** Last WIX sync error message (quick indicator) */
  lastSyncError?: string;
}

// =============================================================================
// Order Status Transitions (State Machine)
// =============================================================================

/**
 * Valid status transitions for the order lifecycle state machine.
 *
 * Each status maps to the set of statuses it can transition to.
 * 'delivered' and 'cancelled' are terminal states (no outgoing transitions).
 *
 * Any non-terminal status can also transition to 'cancelled'.
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
