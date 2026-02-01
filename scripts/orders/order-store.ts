/**
 * Order Store
 *
 * JSON-file-backed order storage with lifecycle management.
 * Follows the same pattern as scripts/monitor/store.ts (loadConfig/saveConfig
 * with data/ directory). All orders persist to data/orders/orders.json.
 *
 * Features:
 * - CRUD operations for orders
 * - Auto-incrementing order numbers
 * - Status lifecycle transitions with validation
 * - WIX order upsert (import without duplicates)
 * - Atomic file writes (write to .tmp then rename)
 *
 * Phase 18: Order Management — Invoice & Label Printing
 */

import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import type { Order, OrderStatus, OrderSource } from './types.js';
import { ORDER_STATUS_TRANSITIONS } from './types.js';

// =============================================================================
// Constants
// =============================================================================

/** Directory for order data files */
const ORDERS_DIR = './data/orders';

/** Path to the orders JSON file */
const ORDERS_FILE = path.join(ORDERS_DIR, 'orders.json');

/** Starting order number for new installations */
const INITIAL_ORDER_NUMBER = 1001;

// =============================================================================
// Order Store Type
// =============================================================================

/**
 * Shape of the persisted order store file.
 */
export interface OrderStore {
  /** All orders */
  orders: Order[];
  /** ISO-8601 timestamp of last WIX sync */
  lastSync: string;
  /** Next order number to assign (auto-increments) */
  nextOrderNumber: number;
}

// =============================================================================
// Persistence
// =============================================================================

/**
 * Load orders from data/orders/orders.json.
 *
 * Creates the directory and file with empty data if missing.
 *
 * @returns Parsed OrderStore
 */
export async function loadOrders(): Promise<OrderStore> {
  try {
    const raw = await readFile(ORDERS_FILE, 'utf-8');
    const store = JSON.parse(raw) as OrderStore;

    // Normalize orders that may be missing fields added after initial sync
    for (const order of store.orders) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const o = order as any;
      if (!o.source) o.source = 'wix';
      if (!o.customer) o.customer = { firstName: '', lastName: '' };
      if (!o.lineItems) o.lineItems = [];
      if (o.total == null) o.total = 0;
      if (o.subtotal == null) o.subtotal = 0;
      if (!o.statusHistory) o.statusHistory = [];
    }

    return store;
  } catch {
    // File doesn't exist or is invalid — return empty store
    const emptyStore: OrderStore = {
      orders: [],
      lastSync: '',
      nextOrderNumber: INITIAL_ORDER_NUMBER,
    };

    // Ensure directory exists and write initial file
    await mkdir(ORDERS_DIR, { recursive: true });
    await writeFile(ORDERS_FILE, JSON.stringify(emptyStore, null, 2), 'utf-8');

    return emptyStore;
  }
}

/**
 * Save orders atomically (write to .tmp then rename).
 *
 * @param store - The full order store to persist
 */
export async function saveOrders(store: OrderStore): Promise<void> {
  await mkdir(ORDERS_DIR, { recursive: true });
  const tmpPath = ORDERS_FILE + '.tmp';
  await writeFile(tmpPath, JSON.stringify(store, null, 2), 'utf-8');
  await rename(tmpPath, ORDERS_FILE);
}

// =============================================================================
// Read Operations
// =============================================================================

/**
 * Find an order by its unique ID.
 *
 * @param id - Order UUID
 * @returns The order, or undefined if not found
 */
export async function getOrder(id: string): Promise<Order | undefined> {
  const store = await loadOrders();
  return store.orders.find((o) => o.id === id);
}

/**
 * Find an order by its display order number.
 *
 * @param orderNumber - Display order number (e.g., 10043)
 * @returns The order, or undefined if not found
 */
export async function getOrderByNumber(orderNumber: number): Promise<Order | undefined> {
  const store = await loadOrders();
  return store.orders.find((o) => o.orderNumber === orderNumber);
}

/**
 * Return the next order number without incrementing.
 *
 * @returns The next available order number
 */
export async function getNextOrderNumber(): Promise<number> {
  const store = await loadOrders();
  return store.nextOrderNumber;
}

/**
 * List orders with optional filtering.
 *
 * @param filter - Optional status and/or source filter
 * @returns Filtered orders sorted by updatedAt DESC
 */
export async function listOrders(filter?: {
  status?: OrderStatus;
  source?: OrderSource;
}): Promise<Order[]> {
  const store = await loadOrders();
  let orders = store.orders;

  if (filter?.status) {
    orders = orders.filter((o) => o.status === filter.status);
  }
  if (filter?.source) {
    orders = orders.filter((o) => o.source === filter.source);
  }

  // Sort by updatedAt descending (most recent first)
  orders.sort((a, b) => {
    const dateA = new Date(a.updatedAt).getTime();
    const dateB = new Date(b.updatedAt).getTime();
    return dateB - dateA;
  });

  return orders;
}

// =============================================================================
// Write Operations
// =============================================================================

/**
 * Add a new order to the store.
 *
 * Generates a UUID for id, auto-increments orderNumber from store.nextOrderNumber,
 * sets createdAt/updatedAt to now, initializes statusHistory with first entry.
 *
 * @param orderData - Order data without auto-generated fields
 * @returns The complete Order with all generated fields
 */
export async function addOrder(
  orderData: Omit<Order, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt' | 'statusHistory'>,
): Promise<Order> {
  const store = await loadOrders();
  const now = new Date().toISOString();

  const order: Order = {
    ...orderData,
    id: crypto.randomUUID(),
    orderNumber: store.nextOrderNumber,
    createdAt: now,
    updatedAt: now,
    statusHistory: [
      {
        status: orderData.status,
        timestamp: now,
        note: orderData.source === 'manual' ? 'Order created manually' : 'Order created',
      },
    ],
  };

  store.orders.push(order);
  store.nextOrderNumber += 1;
  await saveOrders(store);

  return order;
}

/**
 * Upsert a WIX order into the local store.
 *
 * If an order with the same wixOrderId exists, update it (but preserve local
 * status if it's been advanced beyond the WIX mapping). If new, add with source='wix'.
 *
 * @param order - The mapped WIX order
 * @returns The upserted order and whether it was new or updated
 */
export async function upsertWixOrder(order: Order): Promise<{ order: Order; isNew: boolean }> {
  const store = await loadOrders();
  const now = new Date().toISOString();

  // Find existing by wixOrderId
  const existingIdx = store.orders.findIndex(
    (o) => o.wixOrderId && o.wixOrderId === order.wixOrderId,
  );

  if (existingIdx >= 0) {
    const existing = store.orders[existingIdx];

    // Preserve local status if it's been advanced beyond what WIX would set
    // WIX only maps to: 'new', 'shipped', 'packed', 'cancelled'
    // If we've manually progressed to 'ordered', 'received', 'in-production', etc., keep it
    const wixStatuses: OrderStatus[] = ['new', 'shipped', 'packed', 'cancelled'];
    const shouldPreserveLocalStatus =
      !wixStatuses.includes(existing.status) || // Local status is beyond WIX mapping
      (existing.status === 'shipped' && order.status === 'new'); // Don't regress shipped to new

    // Update fields from WIX but preserve local lifecycle progress
    existing.customer = order.customer;
    existing.billingAddress = order.billingAddress;
    existing.shippingAddress = order.shippingAddress;
    existing.lineItems = order.lineItems;
    existing.subtotal = order.subtotal;
    existing.shippingCost = order.shippingCost;
    existing.tax = order.tax;
    existing.discount = order.discount;
    existing.total = order.total;
    existing.notes = order.notes ?? existing.notes;
    existing.collection = order.collection ?? existing.collection;
    existing.updatedAt = now;

    if (!shouldPreserveLocalStatus && existing.status !== order.status) {
      existing.status = order.status;
      existing.statusHistory.push({
        status: order.status,
        timestamp: now,
        note: 'Updated from WIX sync',
      });
    }

    store.orders[existingIdx] = existing;
    await saveOrders(store);
    return { order: existing, isNew: false };
  }

  // New WIX order — assign local order number
  const newOrder: Order = {
    ...order,
    id: order.id || crypto.randomUUID(),
    orderNumber: order.orderNumber || store.nextOrderNumber,
    source: 'wix',
    createdAt: order.createdAt || now,
    updatedAt: now,
    statusHistory: order.statusHistory.length > 0
      ? order.statusHistory
      : [{ status: order.status, timestamp: now, note: 'Imported from WIX' }],
  };

  // If WIX order had no orderNumber or had 0, use our auto-increment
  if (!order.orderNumber || order.orderNumber === 0) {
    newOrder.orderNumber = store.nextOrderNumber;
    store.nextOrderNumber += 1;
  } else {
    // WIX orders keep their order number; ensure nextOrderNumber is ahead
    if (order.orderNumber >= store.nextOrderNumber) {
      store.nextOrderNumber = order.orderNumber + 1;
    }
  }

  store.orders.push(newOrder);
  await saveOrders(store);
  return { order: newOrder, isNew: true };
}

/**
 * Remove all WIX-sourced orders from the store.
 *
 * Preserves manual orders and the nextOrderNumber counter.
 * Used by "reset & resync" to get a clean re-import from WIX.
 *
 * @returns Number of WIX orders removed
 */
export async function clearWixOrders(): Promise<number> {
  const store = await loadOrders();
  const before = store.orders.length;
  store.orders = store.orders.filter((o) => o.source !== 'wix');
  store.lastSync = '';
  const removed = before - store.orders.length;
  await saveOrders(store);
  return removed;
}

/**
 * Update an order's lifecycle status.
 *
 * Validates the transition using ORDER_STATUS_TRANSITIONS from types.ts.
 * Throws a descriptive error if the transition is invalid.
 *
 * @param id - Order UUID
 * @param newStatus - Target status
 * @param note - Optional note for the status history entry
 * @returns The updated order
 * @throws Error if order not found or transition is invalid
 */
export async function updateOrderStatus(
  id: string,
  newStatus: OrderStatus,
  note?: string,
): Promise<Order> {
  const store = await loadOrders();
  const order = store.orders.find((o) => o.id === id);

  if (!order) {
    throw new Error(`Order not found: ${id}`);
  }

  // Validate transition
  const validTransitions = ORDER_STATUS_TRANSITIONS[order.status];
  if (!validTransitions.includes(newStatus)) {
    const validStr = validTransitions.length > 0
      ? validTransitions.join(', ')
      : '(terminal state — no transitions allowed)';
    throw new Error(
      `Cannot transition from '${order.status}' to '${newStatus}'. ` +
      `Valid transitions from '${order.status}': ${validStr}`,
    );
  }

  const now = new Date().toISOString();
  order.status = newStatus;
  order.updatedAt = now;
  order.statusHistory.push({
    status: newStatus,
    timestamp: now,
    note,
  });

  await saveOrders(store);
  return order;
}
