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
import type { Order, OrderStatus, OrderSource, OrderError } from './types.js';
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
      if (!o.errors) o.errors = [];
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

// =============================================================================
// Error Tracking
// =============================================================================

/**
 * Add a tracked error to an order.
 *
 * Initializes the errors array if not present, appends the error with
 * retryCount: 0 and resolved: false.
 *
 * @param id - Order UUID
 * @param error - Error details (without retryCount and resolved)
 * @returns The updated order
 * @throws Error if order not found
 */
export async function addOrderError(
  id: string,
  error: Omit<OrderError, 'retryCount' | 'resolved'>,
): Promise<Order> {
  const store = await loadOrders();
  const order = store.orders.find((o) => o.id === id);

  if (!order) {
    throw new Error(`Order not found: ${id}`);
  }

  if (!order.errors) order.errors = [];

  order.errors.push({
    ...error,
    retryCount: 0,
    resolved: false,
  });

  order.updatedAt = new Date().toISOString();
  await saveOrders(store);
  return order;
}

/**
 * Resolve the most recent unresolved error of a given operation on an order.
 *
 * @param id - Order UUID
 * @param operation - The error operation type to resolve
 * @returns The updated order
 * @throws Error if order not found or no matching unresolved error
 */
export async function resolveOrderError(
  id: string,
  operation: OrderError['operation'],
): Promise<Order> {
  const store = await loadOrders();
  const order = store.orders.find((o) => o.id === id);

  if (!order) {
    throw new Error(`Order not found: ${id}`);
  }

  if (!order.errors || order.errors.length === 0) {
    throw new Error(`No errors found on order: ${id}`);
  }

  // Find the most recent unresolved error matching the operation
  const unresolvedErrors = order.errors
    .map((err, idx) => ({ err, idx }))
    .filter((e) => e.err.operation === operation && !e.err.resolved);

  if (unresolvedErrors.length === 0) {
    throw new Error(`No unresolved '${operation}' error found on order: ${id}`);
  }

  // Most recent = last in array (appended in chronological order)
  const target = unresolvedErrors[unresolvedErrors.length - 1];
  order.errors[target.idx].resolved = true;

  // Clear lastSyncError if resolving a sync error
  if (operation === 'sync') {
    order.lastSyncError = undefined;
  }

  order.updatedAt = new Date().toISOString();
  await saveOrders(store);
  return order;
}

/**
 * Get all orders that have at least one unresolved error.
 *
 * @returns Orders with unresolved errors, sorted by most recent error timestamp descending
 */
export async function getOrdersWithErrors(): Promise<Order[]> {
  const store = await loadOrders();

  const ordersWithErrors = store.orders.filter((o) =>
    o.errors && o.errors.some((e) => !e.resolved),
  );

  // Sort by most recent error timestamp descending
  ordersWithErrors.sort((a, b) => {
    const aLatest = (a.errors ?? [])
      .filter((e) => !e.resolved)
      .reduce((max, e) => (e.timestamp > max ? e.timestamp : max), '');
    const bLatest = (b.errors ?? [])
      .filter((e) => !e.resolved)
      .reduce((max, e) => (e.timestamp > max ? e.timestamp : max), '');
    return bLatest.localeCompare(aLatest);
  });

  return ordersWithErrors;
}

/**
 * Get a summary of order counts grouped by status.
 *
 * Includes an extra `errored` key counting orders with unresolved errors
 * (this is not a status, just a cross-cutting count).
 *
 * @returns Record of status → count, plus errored count
 */
export async function getOrderSummary(): Promise<Record<string, number>> {
  const store = await loadOrders();

  const counts: Record<string, number> = {};

  // Initialize all statuses to 0
  for (const order of store.orders) {
    counts[order.status] = (counts[order.status] || 0) + 1;
  }

  // Count orders with unresolved errors
  const erroredCount = store.orders.filter((o) =>
    o.errors && o.errors.some((e) => !e.resolved),
  ).length;
  counts['errored'] = erroredCount;

  return counts;
}

// =============================================================================
// Extended Order Summary (Phase 40)
// =============================================================================

/**
 * Extended order summary with time-in-stage metrics and attention counts.
 *
 * Provides richer data for dashboard visibility including:
 * - Status counts by order status
 * - Aging orders that have been in a status too long
 * - Attention breakdown for actionable items
 * - Stage metrics with aggregated values per status
 *
 * Phase 40: Order Status Dashboard
 */
export interface OrderSummaryExtended {
  statusCounts: Record<OrderStatus, number>;
  errorCount: number;
  errorOrderIds: string[];
  lastSync: string | null;

  /** Orders that have been in their status longer than thresholds */
  agingOrders: {
    status: OrderStatus;
    orderId: string;
    orderNumber: number;
    hoursInStatus: number;
  }[];

  /** Actionable attention breakdown */
  attention: {
    /** New orders not yet ordered from vendor */
    cartFillPending: number;
    /** Orders in production > 72 hours */
    stuckInProduction: number;
    /** Packed orders awaiting shipment > 24 hours */
    awaitingShipment: number;
    /** Orders with unresolved errors */
    unresolvedErrors: number;
  };

  /** Metrics aggregated by active status */
  stageMetrics: Record<string, {
    orderCount: number;
    totalItems: number;
    totalValue: number;
    oldestOrderHours: number | null;
  }>;
}

/** Aging thresholds in hours per status */
const AGING_THRESHOLDS: Partial<Record<OrderStatus, number>> = {
  'new': 48,
  'in-production': 72,
  'packed': 24,
};

/** Active statuses to include in stage metrics */
const ACTIVE_STATUSES: OrderStatus[] = [
  'new',
  'ordered',
  'received',
  'in-production',
  'packed',
  'shipped',
];

/**
 * Calculate hours since a given ISO timestamp.
 */
function hoursSince(isoTimestamp: string): number {
  const then = new Date(isoTimestamp).getTime();
  const now = Date.now();
  return (now - then) / (1000 * 60 * 60);
}

/**
 * Get the timestamp when an order entered its current status.
 * Looks at the most recent statusHistory entry matching the current status.
 */
function getStatusEntryTime(order: Order): string {
  // Find the most recent history entry with the current status
  const matching = order.statusHistory
    .filter((h) => h.status === order.status)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (matching.length > 0) {
    return matching[0].timestamp;
  }

  // Fallback to updatedAt if no matching history entry
  return order.updatedAt;
}

/**
 * Get an extended order summary with time-in-stage metrics, attention counts, and batch metrics.
 *
 * @returns Extended summary data for dashboard display
 */
export async function getOrderSummaryExtended(): Promise<OrderSummaryExtended> {
  const store = await loadOrders();
  const orders = store.orders;
  const now = Date.now();

  // Initialize status counts with zeros for all statuses
  const statusCounts: Record<OrderStatus, number> = {
    'new': 0,
    'on-hold': 0,
    'ordered': 0,
    'received': 0,
    'in-production': 0,
    'packed': 0,
    'shipped': 0,
    'delivered': 0,
    'cancelled': 0,
  };

  // Collect orders with errors
  const errorOrders: Order[] = [];

  // Aging orders list
  const agingOrders: OrderSummaryExtended['agingOrders'] = [];

  // Attention counters
  const attention = {
    cartFillPending: 0,
    stuckInProduction: 0,
    awaitingShipment: 0,
    unresolvedErrors: 0,
  };

  // Stage metrics accumulators
  const stageMetrics: Record<string, {
    orderCount: number;
    totalItems: number;
    totalValue: number;
    oldestOrderHours: number | null;
  }> = {};

  // Initialize stage metrics for active statuses
  for (const status of ACTIVE_STATUSES) {
    stageMetrics[status] = {
      orderCount: 0,
      totalItems: 0,
      totalValue: 0,
      oldestOrderHours: null,
    };
  }

  // Process each order
  for (const order of orders) {
    // Count by status
    statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;

    // Track error orders
    if (order.errors && order.errors.some((e) => !e.resolved)) {
      errorOrders.push(order);
      attention.unresolvedErrors++;
    }

    // Calculate hours in current status
    const statusEntryTime = getStatusEntryTime(order);
    const hoursInStatus = hoursSince(statusEntryTime);

    // Check aging thresholds
    const threshold = AGING_THRESHOLDS[order.status];
    if (threshold !== undefined && hoursInStatus > threshold) {
      agingOrders.push({
        status: order.status,
        orderId: order.id,
        orderNumber: order.orderNumber,
        hoursInStatus: Math.round(hoursInStatus),
      });
    }

    // Attention counts
    if (order.status === 'new') {
      attention.cartFillPending++;
    }
    if (order.status === 'in-production' && hoursInStatus > 72) {
      attention.stuckInProduction++;
    }
    if (order.status === 'packed' && hoursInStatus > 24) {
      attention.awaitingShipment++;
    }

    // Stage metrics for active statuses
    if (ACTIVE_STATUSES.includes(order.status)) {
      const metrics = stageMetrics[order.status];
      metrics.orderCount++;
      metrics.totalValue += order.total;

      // Sum line item quantities
      let itemCount = 0;
      for (const item of order.lineItems) {
        itemCount += item.quantity;
      }
      metrics.totalItems += itemCount;

      // Track oldest order
      if (metrics.oldestOrderHours === null || hoursInStatus > metrics.oldestOrderHours) {
        metrics.oldestOrderHours = Math.round(hoursInStatus);
      }
    }
  }

  // Sort aging orders by hours descending (most aged first)
  agingOrders.sort((a, b) => b.hoursInStatus - a.hoursInStatus);

  return {
    statusCounts,
    errorCount: errorOrders.length,
    errorOrderIds: errorOrders.map((o) => o.id),
    lastSync: store.lastSync || null,
    agingOrders,
    attention,
    stageMetrics,
  };
}
