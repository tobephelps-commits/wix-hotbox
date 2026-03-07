/**
 * Order Service (v2.0)
 *
 * SQLite-based order management with CRUD operations, status transition
 * validation, error tracking, and summary/metrics queries.
 *
 * Replaces v1.x's JSON file-based order-store.ts with SQLite operations
 * using better-sqlite3 prepared statements.
 *
 * Functions accept `Database` as first parameter following the same pattern
 * as other v2.0 modules (pipeline, logos) that receive db at init time.
 *
 * Phase 49: Order Management Core
 */

import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type {
  Order,
  OrderWithDetails,
  OrderLineItem,
  OrderStatusEntry,
  OrderError,
  OrderAddress,
  OrderFilter,
  OrderSummary,
  OrderStatus,
  OrderSource,
  OrderErrorOperation,
  CreateOrderInput,
} from './types.js';
import {
  ORDER_STATUSES,
  ACTIVE_STATUSES,
  AGING_THRESHOLDS,
  isValidTransition,
} from './types.js';

// =============================================================================
// Extended Summary Type
// =============================================================================

/**
 * Extended order summary with aging, attention counts, and stage metrics.
 */
export interface ExtendedOrderSummary extends OrderSummary {
  /** Orders exceeding aging thresholds in their current status */
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
  stageMetrics: Record<
    string,
    {
      count: number;
      totalItems: number;
      totalValue: number;
      oldestOrderHours: number | null;
    }
  >;
}

// =============================================================================
// Row Types (SQLite result shapes)
// =============================================================================

interface OrderRow {
  id: string;
  wix_order_id: string | null;
  order_number: number;
  source: string;
  status: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  billing_address: string | null;
  shipping_address: string | null;
  collection: string | null;
  notes: string | null;
  subtotal: number;
  shipping_cost: number;
  tax: number;
  discount: number;
  total: number;
  last_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

interface ItemRow {
  id: number;
  order_id: string;
  product_name: string;
  sku: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  vendor_style: string | null;
  vendor: string | null;
  color: string | null;
  size: string | null;
  image_url: string | null;
  created_at: string;
}

interface StatusHistoryRow {
  id: number;
  order_id: string;
  status: string;
  note: string | null;
  created_at: string;
}

interface ErrorRow {
  id: number;
  order_id: string;
  operation: string;
  message: string;
  retry_count: number;
  resolved: number;
  created_at: string;
}

// =============================================================================
// Row Mappers
// =============================================================================

function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    wixOrderId: row.wix_order_id ?? undefined,
    orderNumber: row.order_number,
    source: row.source as OrderSource,
    status: row.status as OrderStatus,
    customerFirstName: row.customer_first_name ?? undefined,
    customerLastName: row.customer_last_name ?? undefined,
    customerEmail: row.customer_email ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
    billingAddress: row.billing_address
      ? (JSON.parse(row.billing_address) as OrderAddress)
      : undefined,
    shippingAddress: row.shipping_address
      ? (JSON.parse(row.shipping_address) as OrderAddress)
      : undefined,
    collection: row.collection ?? undefined,
    notes: row.notes ?? undefined,
    subtotal: row.subtotal,
    shippingCost: row.shipping_cost,
    tax: row.tax,
    discount: row.discount,
    total: row.total,
    lastSyncError: row.last_sync_error ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItemRow(row: ItemRow): OrderLineItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productName: row.product_name,
    sku: row.sku ?? undefined,
    quantity: row.quantity,
    unitPrice: row.unit_price,
    totalPrice: row.total_price,
    vendorStyle: row.vendor_style ?? undefined,
    vendor: row.vendor ?? undefined,
    color: row.color ?? undefined,
    size: row.size ?? undefined,
    imageUrl: row.image_url ?? undefined,
    createdAt: row.created_at,
  };
}

function mapStatusHistoryRow(row: StatusHistoryRow): OrderStatusEntry {
  return {
    id: row.id,
    orderId: row.order_id,
    status: row.status as OrderStatus,
    note: row.note ?? undefined,
    createdAt: row.created_at,
  };
}

function mapErrorRow(row: ErrorRow): OrderError {
  return {
    id: row.id,
    orderId: row.order_id,
    operation: row.operation as OrderErrorOperation,
    message: row.message,
    retryCount: row.retry_count,
    resolved: row.resolved === 1,
    createdAt: row.created_at,
  };
}

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Get the next available order number.
 * Returns MAX(order_number) + 1, or 1001 if no orders exist.
 */
export function getNextOrderNumber(db: Database.Database): number {
  const row = db
    .prepare('SELECT MAX(order_number) as max_num FROM orders')
    .get() as { max_num: number | null } | undefined;
  return row?.max_num != null ? row.max_num + 1 : 1001;
}

/**
 * Create a new order with line items and initial status history.
 * Wrapped in a transaction for atomicity.
 */
export function createOrder(
  db: Database.Database,
  input: CreateOrderInput
): OrderWithDetails {
  const id = randomUUID();
  const orderNumber = getNextOrderNumber(db);

  const insertOrder = db.prepare(`
    INSERT INTO orders (
      id, order_number, source, status,
      customer_first_name, customer_last_name, customer_email, customer_phone,
      billing_address, shipping_address,
      collection, notes,
      subtotal, shipping_cost, tax, discount, total
    ) VALUES (
      ?, ?, ?, 'new',
      ?, ?, ?, ?,
      ?, ?,
      ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  const insertItem = db.prepare(`
    INSERT INTO order_items (
      order_id, product_name, sku, quantity, unit_price, total_price,
      vendor_style, vendor, color, size, image_url
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertHistory = db.prepare(`
    INSERT INTO order_status_history (order_id, status, note)
    VALUES (?, ?, ?)
  `);

  const txn = db.transaction(() => {
    insertOrder.run(
      id,
      orderNumber,
      input.source,
      input.customerFirstName ?? null,
      input.customerLastName ?? null,
      input.customerEmail ?? null,
      input.customerPhone ?? null,
      input.billingAddress ? JSON.stringify(input.billingAddress) : null,
      input.shippingAddress ? JSON.stringify(input.shippingAddress) : null,
      input.collection ?? null,
      input.notes ?? null,
      input.subtotal,
      input.shippingCost,
      input.tax,
      input.discount,
      input.total
    );

    for (const item of input.items) {
      insertItem.run(
        id,
        item.productName,
        item.sku ?? null,
        item.quantity,
        item.unitPrice,
        item.totalPrice,
        item.vendorStyle ?? null,
        item.vendor ?? null,
        item.color ?? null,
        item.size ?? null,
        item.imageUrl ?? null
      );
    }

    insertHistory.run(id, 'new', 'Order created');
  });

  txn();

  return getOrder(db, id)!;
}

/**
 * Get a single order with all related data (items, history, errors).
 * Returns null if not found.
 */
export function getOrder(
  db: Database.Database,
  id: string
): OrderWithDetails | null {
  const row = db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .get(id) as OrderRow | undefined;

  if (!row) return null;

  const order = mapOrderRow(row);

  const items = (
    db
      .prepare('SELECT * FROM order_items WHERE order_id = ?')
      .all(id) as ItemRow[]
  ).map(mapItemRow);

  const statusHistory = (
    db
      .prepare(
        'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC'
      )
      .all(id) as StatusHistoryRow[]
  ).map(mapStatusHistoryRow);

  const errors = (
    db
      .prepare('SELECT * FROM order_errors WHERE order_id = ?')
      .all(id) as ErrorRow[]
  ).map(mapErrorRow);

  return { ...order, items, statusHistory, errors };
}

/**
 * Get an order by its display order number.
 */
export function getOrderByNumber(
  db: Database.Database,
  orderNumber: number
): OrderWithDetails | null {
  const row = db
    .prepare('SELECT id FROM orders WHERE order_number = ?')
    .get(orderNumber) as { id: string } | undefined;

  if (!row) return null;
  return getOrder(db, row.id);
}

/**
 * Get an order by its WIX order ID.
 */
export function getOrderByWixId(
  db: Database.Database,
  wixOrderId: string
): OrderWithDetails | null {
  const row = db
    .prepare('SELECT id FROM orders WHERE wix_order_id = ?')
    .get(wixOrderId) as { id: string } | undefined;

  if (!row) return null;
  return getOrder(db, row.id);
}

/**
 * List orders with optional filtering and pagination.
 * Returns Order[] (without details) for list performance, plus totalCount.
 */
export function listOrders(
  db: Database.Database,
  filter?: OrderFilter
): { orders: Order[]; totalCount: number } {
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filter?.status) {
    conditions.push('status = ?');
    params.push(filter.status);
  }

  if (filter?.source) {
    conditions.push('source = ?');
    params.push(filter.source);
  }

  if (filter?.search) {
    const searchPattern = `%${filter.search}%`;
    conditions.push(
      '(customer_first_name LIKE ? OR customer_last_name LIKE ? OR customer_email LIKE ? OR CAST(order_number AS TEXT) LIKE ?)'
    );
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get total count for pagination
  const countRow = db
    .prepare(`SELECT COUNT(*) as count FROM orders ${whereClause}`)
    .get(...params) as { count: number };
  const totalCount = countRow.count;

  // Build the data query with ordering and pagination
  let query = `SELECT * FROM orders ${whereClause} ORDER BY updated_at DESC`;
  const dataParams = [...params];

  if (filter?.limit != null) {
    query += ' LIMIT ?';
    dataParams.push(filter.limit);
  }

  if (filter?.offset != null) {
    if (filter?.limit == null) {
      // OFFSET requires LIMIT in SQLite
      query += ' LIMIT -1';
    }
    query += ' OFFSET ?';
    dataParams.push(filter.offset);
  }

  const rows = db.prepare(query).all(...dataParams) as OrderRow[];
  const orders = rows.map(mapOrderRow);

  return { orders, totalCount };
}

/**
 * Update an order's status with state machine validation.
 * Throws if the transition is invalid.
 */
export function updateOrderStatus(
  db: Database.Database,
  id: string,
  newStatus: OrderStatus,
  note?: string
): Order {
  const row = db
    .prepare('SELECT status FROM orders WHERE id = ?')
    .get(id) as { status: string } | undefined;

  if (!row) {
    throw new Error(`Order not found: ${id}`);
  }

  const currentStatus = row.status as OrderStatus;

  if (!isValidTransition(currentStatus, newStatus)) {
    throw new Error(
      `Cannot transition from '${currentStatus}' to '${newStatus}'. ` +
        `Valid transitions from '${currentStatus}': ${
          ORDER_STATUSES.filter((s) => isValidTransition(currentStatus, s)).join(
            ', '
          ) || '(terminal state -- no transitions allowed)'
        }`
    );
  }

  const txn = db.transaction(() => {
    db.prepare(
      "UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(newStatus, id);

    db.prepare(
      'INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)'
    ).run(id, newStatus, note ?? null);
  });

  txn();

  const updated = db
    .prepare('SELECT * FROM orders WHERE id = ?')
    .get(id) as OrderRow;
  return mapOrderRow(updated);
}

/**
 * Bulk update order statuses. Processes each individually.
 * Partial success is acceptable -- some may fail validation.
 */
export function updateOrderStatusBulk(
  db: Database.Database,
  ids: string[],
  newStatus: OrderStatus,
  note?: string
): { succeeded: string[]; failed: { id: string; error: string }[] } {
  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const id of ids) {
    try {
      updateOrderStatus(db, id, newStatus, note);
      succeeded.push(id);
    } catch (err) {
      failed.push({
        id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { succeeded, failed };
}

/**
 * Upsert a WIX order. If the order exists by wix_order_id:
 * - Updates order fields and replaces line items
 * - Preserves local status if more advanced than WIX-mapped status
 * If new: creates the order with wixOrderId set.
 */
export function upsertWixOrder(
  db: Database.Database,
  orderData: CreateOrderInput & { wixOrderId: string }
): { order: OrderWithDetails; action: 'created' | 'updated' | 'unchanged' } {
  const existing = getOrderByWixId(db, orderData.wixOrderId);

  if (!existing) {
    // New WIX order -- create it
    const id = randomUUID();
    const orderNumber = getNextOrderNumber(db);

    const txn = db.transaction(() => {
      db.prepare(`
        INSERT INTO orders (
          id, wix_order_id, order_number, source, status,
          customer_first_name, customer_last_name, customer_email, customer_phone,
          billing_address, shipping_address,
          collection, notes,
          subtotal, shipping_cost, tax, discount, total
        ) VALUES (
          ?, ?, ?, ?, 'new',
          ?, ?, ?, ?,
          ?, ?,
          ?, ?,
          ?, ?, ?, ?, ?
        )
      `).run(
        id,
        orderData.wixOrderId,
        orderNumber,
        orderData.source,
        orderData.customerFirstName ?? null,
        orderData.customerLastName ?? null,
        orderData.customerEmail ?? null,
        orderData.customerPhone ?? null,
        orderData.billingAddress
          ? JSON.stringify(orderData.billingAddress)
          : null,
        orderData.shippingAddress
          ? JSON.stringify(orderData.shippingAddress)
          : null,
        orderData.collection ?? null,
        orderData.notes ?? null,
        orderData.subtotal,
        orderData.shippingCost,
        orderData.tax,
        orderData.discount,
        orderData.total
      );

      for (const item of orderData.items) {
        db.prepare(`
          INSERT INTO order_items (
            order_id, product_name, sku, quantity, unit_price, total_price,
            vendor_style, vendor, color, size, image_url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          item.productName,
          item.sku ?? null,
          item.quantity,
          item.unitPrice,
          item.totalPrice,
          item.vendorStyle ?? null,
          item.vendor ?? null,
          item.color ?? null,
          item.size ?? null,
          item.imageUrl ?? null
        );
      }

      db.prepare(
        'INSERT INTO order_status_history (order_id, status, note) VALUES (?, ?, ?)'
      ).run(id, 'new', 'Imported from WIX');
    });

    txn();

    return { order: getOrder(db, id)!, action: 'created' };
  }

  // Existing WIX order -- check if update needed
  // WIX only maps to: 'new', 'shipped', 'packed', 'cancelled'
  // If local status is beyond WIX mapping, preserve it
  const wixStatuses: OrderStatus[] = ['new', 'shipped', 'packed', 'cancelled'];
  const localStatusAdvanced =
    !wixStatuses.includes(existing.status) ||
    (existing.status === 'shipped' && orderData.source === 'wix');

  const txn = db.transaction(() => {
    // Update order fields
    db.prepare(`
      UPDATE orders SET
        customer_first_name = ?,
        customer_last_name = ?,
        customer_email = ?,
        customer_phone = ?,
        billing_address = ?,
        shipping_address = ?,
        collection = COALESCE(?, collection),
        notes = COALESCE(?, notes),
        subtotal = ?,
        shipping_cost = ?,
        tax = ?,
        discount = ?,
        total = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      orderData.customerFirstName ?? null,
      orderData.customerLastName ?? null,
      orderData.customerEmail ?? null,
      orderData.customerPhone ?? null,
      orderData.billingAddress
        ? JSON.stringify(orderData.billingAddress)
        : null,
      orderData.shippingAddress
        ? JSON.stringify(orderData.shippingAddress)
        : null,
      orderData.collection ?? null,
      orderData.notes ?? null,
      orderData.subtotal,
      orderData.shippingCost,
      orderData.tax,
      orderData.discount,
      orderData.total,
      existing.id
    );

    // Replace line items (delete + reinsert)
    db.prepare('DELETE FROM order_items WHERE order_id = ?').run(existing.id);
    for (const item of orderData.items) {
      db.prepare(`
        INSERT INTO order_items (
          order_id, product_name, sku, quantity, unit_price, total_price,
          vendor_style, vendor, color, size, image_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        existing.id,
        item.productName,
        item.sku ?? null,
        item.quantity,
        item.unitPrice,
        item.totalPrice,
        item.vendorStyle ?? null,
        item.vendor ?? null,
        item.color ?? null,
        item.size ?? null,
        item.imageUrl ?? null
      );
    }

    // Status: only update if local hasn't advanced beyond WIX mapping
    if (!localStatusAdvanced) {
      // WIX default is 'new'; don't regress
      // Status is preserved as-is since we don't change it during upsert
      // unless WIX explicitly provides a different status in the future
    }
  });

  txn();

  return { order: getOrder(db, existing.id)!, action: 'updated' };
}

/**
 * Delete an order by ID. CASCADE handles items, history, errors.
 */
export function deleteOrder(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM orders WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * Delete all WIX-sourced orders.
 * Returns count of deleted orders.
 */
export function clearWixOrders(db: Database.Database): number {
  const result = db
    .prepare("DELETE FROM orders WHERE source = 'wix'")
    .run();
  return result.changes;
}

// =============================================================================
// Error Tracking
// =============================================================================

/**
 * Add or increment an error for an order/operation.
 * If an unresolved error with the same operation exists, increments retry_count.
 * Otherwise inserts a new error record.
 */
export function addOrderError(
  db: Database.Database,
  orderId: string,
  error: { operation: OrderErrorOperation; message: string }
): OrderError {
  // Check for existing unresolved error with same operation
  const existing = db
    .prepare(
      'SELECT * FROM order_errors WHERE order_id = ? AND operation = ? AND resolved = 0'
    )
    .get(orderId, error.operation) as ErrorRow | undefined;

  if (existing) {
    db.prepare(
      'UPDATE order_errors SET retry_count = retry_count + 1, message = ? WHERE id = ?'
    ).run(error.message, existing.id);

    const updated = db
      .prepare('SELECT * FROM order_errors WHERE id = ?')
      .get(existing.id) as ErrorRow;
    return mapErrorRow(updated);
  }

  const result = db
    .prepare(
      'INSERT INTO order_errors (order_id, operation, message) VALUES (?, ?, ?)'
    )
    .run(orderId, error.operation, error.message);

  const inserted = db
    .prepare('SELECT * FROM order_errors WHERE id = ?')
    .get(result.lastInsertRowid) as ErrorRow;
  return mapErrorRow(inserted);
}

/**
 * Resolve all unresolved errors of a given operation on an order.
 */
export function resolveOrderError(
  db: Database.Database,
  orderId: string,
  operation: OrderErrorOperation
): void {
  db.prepare(
    'UPDATE order_errors SET resolved = 1 WHERE order_id = ? AND operation = ? AND resolved = 0'
  ).run(orderId, operation);
}

/**
 * Get all orders that have at least one unresolved error.
 */
export function getOrdersWithErrors(db: Database.Database): Order[] {
  const rows = db
    .prepare(
      `SELECT DISTINCT o.* FROM orders o
       JOIN order_errors e ON e.order_id = o.id
       WHERE e.resolved = 0`
    )
    .all() as OrderRow[];
  return rows.map(mapOrderRow);
}

// =============================================================================
// Summary / Metrics
// =============================================================================

/**
 * Get order summary with status counts, error count, and last sync time.
 */
export function getOrderSummary(db: Database.Database): OrderSummary {
  // Status counts
  const statusRows = db
    .prepare('SELECT status, COUNT(*) as count FROM orders GROUP BY status')
    .all() as { status: string; count: number }[];

  const statusCounts = {} as Record<OrderStatus, number>;
  for (const s of ORDER_STATUSES) {
    statusCounts[s] = 0;
  }
  for (const row of statusRows) {
    statusCounts[row.status as OrderStatus] = row.count;
  }

  // Unresolved error count
  const errorRow = db
    .prepare(
      'SELECT COUNT(DISTINCT order_id) as count FROM order_errors WHERE resolved = 0'
    )
    .get() as { count: number };

  // Total orders
  const totalRow = db
    .prepare('SELECT COUNT(*) as count FROM orders')
    .get() as { count: number };

  // Last sync: most recent updated_at for WIX orders
  const syncRow = db
    .prepare(
      "SELECT MAX(updated_at) as last_sync FROM orders WHERE source = 'wix'"
    )
    .get() as { last_sync: string | null };

  return {
    statusCounts,
    errorCount: errorRow.count,
    totalOrders: totalRow.count,
    lastSync: syncRow.last_sync ?? undefined,
  };
}

/**
 * Get extended order summary with aging, attention counts, and stage metrics.
 * Uses SQLite julianday arithmetic for time calculations.
 */
export function getOrderSummaryExtended(
  db: Database.Database
): ExtendedOrderSummary {
  const base = getOrderSummary(db);

  // Aging orders: find orders where hours in current status exceed thresholds
  // Use the most recent status history entry to determine when the order entered its current status
  const agingOrders: ExtendedOrderSummary['agingOrders'] = [];

  for (const [status, thresholdHours] of Object.entries(AGING_THRESHOLDS)) {
    if (thresholdHours === undefined) continue;

    const rows = db
      .prepare(
        `SELECT o.id, o.order_number, o.status,
                (julianday('now') - julianday(
                  COALESCE(
                    (SELECT MAX(h.created_at) FROM order_status_history h
                     WHERE h.order_id = o.id AND h.status = o.status),
                    o.updated_at
                  )
                )) * 24 as hours_in_status
         FROM orders o
         WHERE o.status = ?
           AND (julianday('now') - julianday(
                  COALESCE(
                    (SELECT MAX(h.created_at) FROM order_status_history h
                     WHERE h.order_id = o.id AND h.status = o.status),
                    o.updated_at
                  )
                )) * 24 > ?`
      )
      .all(status, thresholdHours) as {
      id: string;
      order_number: number;
      status: string;
      hours_in_status: number;
    }[];

    for (const row of rows) {
      agingOrders.push({
        status: row.status as OrderStatus,
        orderId: row.id,
        orderNumber: row.order_number,
        hoursInStatus: Math.round(row.hours_in_status),
      });
    }
  }

  // Sort by hours descending
  agingOrders.sort((a, b) => b.hoursInStatus - a.hoursInStatus);

  // Attention counts
  const cartFillPending = base.statusCounts['new'] ?? 0;

  const stuckRow = db
    .prepare(
      `SELECT COUNT(*) as count FROM orders o
       WHERE o.status = 'in-production'
         AND (julianday('now') - julianday(
                COALESCE(
                  (SELECT MAX(h.created_at) FROM order_status_history h
                   WHERE h.order_id = o.id AND h.status = 'in-production'),
                  o.updated_at
                )
              )) * 24 > 72`
    )
    .get() as { count: number };

  const awaitingRow = db
    .prepare(
      `SELECT COUNT(*) as count FROM orders o
       WHERE o.status = 'packed'
         AND (julianday('now') - julianday(
                COALESCE(
                  (SELECT MAX(h.created_at) FROM order_status_history h
                   WHERE h.order_id = o.id AND h.status = 'packed'),
                  o.updated_at
                )
              )) * 24 > 24`
    )
    .get() as { count: number };

  // Stage metrics per active status
  const stageMetrics: ExtendedOrderSummary['stageMetrics'] = {};

  for (const status of ACTIVE_STATUSES) {
    const metricsRow = db
      .prepare(
        `SELECT
           COUNT(*) as order_count,
           COALESCE(SUM(o.total), 0) as total_value,
           COALESCE(SUM((SELECT COALESCE(SUM(i.quantity), 0) FROM order_items i WHERE i.order_id = o.id)), 0) as total_items,
           MAX(
             (julianday('now') - julianday(
               COALESCE(
                 (SELECT MAX(h.created_at) FROM order_status_history h
                  WHERE h.order_id = o.id AND h.status = o.status),
                 o.updated_at
               )
             )) * 24
           ) as oldest_hours
         FROM orders o
         WHERE o.status = ?`
      )
      .get(status) as {
      order_count: number;
      total_value: number;
      total_items: number;
      oldest_hours: number | null;
    };

    stageMetrics[status] = {
      count: metricsRow.order_count,
      totalItems: metricsRow.total_items,
      totalValue: metricsRow.total_value,
      oldestOrderHours:
        metricsRow.oldest_hours != null
          ? Math.round(metricsRow.oldest_hours)
          : null,
    };
  }

  return {
    ...base,
    agingOrders,
    attention: {
      cartFillPending,
      stuckInProduction: stuckRow.count,
      awaitingShipment: awaitingRow.count,
      unresolvedErrors: base.errorCount,
    },
    stageMetrics,
  };
}
