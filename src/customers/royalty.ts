/**
 * Royalty Calculation Engine
 *
 * Pure-function module that calculates per-line-item royalty amounts for a
 * customer over a date range. Takes a customer account, orders, and date range
 * as inputs, producing a detailed royalty ledger. Discount-aware: orders with
 * any discount applied have royalty zeroed on all line items.
 *
 * All money calculations round to 2 decimal places using
 * Math.round(value * 100) / 100 at each step to prevent floating-point drift.
 *
 * Phase 53: Customer & Royalty System (v2.0 port)
 */

import type { CustomerAccount, RoyaltyLineItem, RoyaltyReport } from './types.js';
import type { Order, OrderLineItem, OrderWithDetails } from '../orders/types.js';

// =============================================================================
// Helper
// =============================================================================

/** Round a number to 2 decimal places (money precision). */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

// =============================================================================
// Calculation Functions
// =============================================================================

/**
 * Filter orders where order.collection matches customerName.
 *
 * Uses case-insensitive trim comparison. WIX orders have `collection` set
 * to the brand name during sync, which corresponds to the customer account name.
 */
export function matchOrdersToCustomer(orders: Order[], customerName: string): Order[] {
  const normalizedName = customerName.trim().toLowerCase();
  return orders
    .filter((order) => {
      const collection = (order.collection ?? '').trim().toLowerCase();
      return collection === normalizedName;
    })
    .sort((a, b) => {
      if (a.createdAt < b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      return 0;
    });
}

/**
 * Filter orders by date range, excluding cancelled orders.
 *
 * Uses ISO-8601 string comparison (lexicographic) which works correctly
 * for date range comparisons.
 */
export function filterOrdersByDateRange(orders: Order[], start: string, end: string): Order[] {
  return orders.filter((order) => {
    if (order.status === 'cancelled') return false;
    return order.createdAt >= start && order.createdAt <= end;
  });
}

/**
 * Determine if a line item was sold at a discount that eliminates markup.
 *
 * Conservative heuristic: if the order has ANY discount applied (order.discount > 0),
 * mark ALL line items in that order as discounted. This avoids charging royalty on
 * orders where discount codes were used.
 */
export function isDiscountedLineItem(_lineItem: OrderLineItem, order: Order): boolean {
  return order.discount > 0;
}

/**
 * Calculate royalty for a single line item.
 *
 * If the line item is discounted, royaltyPerUnit is $0. Otherwise,
 * royaltyPerUnit = round2(unitPrice * royaltyPercent / 100).
 */
export function calculateRoyaltyForLineItem(
  lineItem: OrderLineItem,
  order: Order,
  royaltyPercent: number,
): RoyaltyLineItem {
  const discounted = isDiscountedLineItem(lineItem, order);
  const royaltyPerUnit = discounted ? 0 : round2(lineItem.unitPrice * royaltyPercent / 100);
  const royaltyTotal = round2(royaltyPerUnit * lineItem.quantity);

  return {
    orderId: order.id,
    orderNumber: String(order.orderNumber),
    orderDate: order.createdAt,
    productName: lineItem.productName,
    sku: lineItem.sku ?? '',
    color: lineItem.color ?? '',
    size: lineItem.size ?? '',
    quantity: lineItem.quantity,
    unitPrice: lineItem.unitPrice,
    royaltyRate: royaltyPercent,
    royaltyPerUnit,
    royaltyTotal,
    discounted,
  };
}

/**
 * Generate a complete royalty report for a customer over a date range.
 *
 * Main entry point. Takes a customer and ALL orders with details (caller is
 * responsible for loading orders from store). Filters by customer, date range,
 * and calculates per-line-item royalty amounts.
 *
 * Uses OrderWithDetails[] because line items are on the `items` property
 * in v2.0 (loaded via order store's getOrderWithDetails).
 */
export function generateRoyaltyReport(params: {
  customer: CustomerAccount;
  orders: OrderWithDetails[];
  periodStart: string;
  periodEnd: string;
}): RoyaltyReport {
  const { customer, orders, periodStart, periodEnd } = params;

  // Step 1: Filter orders for this customer
  const customerOrders = matchOrdersToCustomer(orders, customer.name);

  // Step 2: Apply date range filter (excludes cancelled orders)
  const filteredOrders = filterOrdersByDateRange(customerOrders, periodStart, periodEnd);

  // Step 3: Calculate royalty for each line item
  // Lookup map from order id to OrderWithDetails for item access
  const orderMap = new Map<string, OrderWithDetails>();
  for (const order of orders) {
    orderMap.set(order.id, order);
  }

  const lineItems: RoyaltyLineItem[] = [];
  const orderIds = new Set<string>();

  for (const order of filteredOrders) {
    orderIds.add(order.id);
    const detailed = orderMap.get(order.id);
    const items = detailed?.items ?? [];
    for (const lineItem of items) {
      const royaltyLineItem = calculateRoyaltyForLineItem(
        lineItem,
        order,
        customer.royaltyPercent,
      );
      lineItems.push(royaltyLineItem);
    }
  }

  // Step 4: Sort line items by orderDate ASC
  lineItems.sort((a, b) => {
    if (a.orderDate < b.orderDate) return -1;
    if (a.orderDate > b.orderDate) return 1;
    return 0;
  });

  // Step 5: Aggregate totals
  let totalUnits = 0;
  let totalRevenue = 0;
  let totalRoyalty = 0;
  let discountedLineItems = 0;

  for (const item of lineItems) {
    totalUnits += item.quantity;
    totalRevenue = round2(totalRevenue + round2(item.unitPrice * item.quantity));
    totalRoyalty = round2(totalRoyalty + item.royaltyTotal);
    if (item.discounted) discountedLineItems++;
  }

  return {
    customerId: customer.id,
    customerName: customer.name,
    royaltyRate: customer.royaltyPercent,
    periodStart,
    periodEnd,
    generatedAt: new Date().toISOString(),
    lineItems,
    totalUnits,
    totalRevenue,
    totalRoyalty,
    discountedLineItems,
    orderCount: orderIds.size,
  };
}
