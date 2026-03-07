/**
 * Order types for the UI layer.
 *
 * Mirrors the server-side types from src/orders/types.ts but
 * kept separate since UI runs in the browser and cannot import
 * server modules directly.
 *
 * Phase 50: Order Management Advanced (Plan 02)
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

export type OrderSource = 'wix' | 'manual';

/**
 * Valid status transitions -- mirrors ORDER_STATUS_TRANSITIONS from server.
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
  createdAt: string;
}

export interface OrderStatusEntry {
  id: number;
  orderId: string;
  status: OrderStatus;
  note?: string;
  createdAt: string;
}

export interface OrderError {
  id: number;
  orderId: string;
  operation: string;
  message: string;
  retryCount: number;
  resolved: boolean;
  createdAt: string;
}

export interface OrderWithDetails {
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
  items: OrderLineItem[];
  statusHistory: OrderStatusEntry[];
  errors: OrderError[];
}
