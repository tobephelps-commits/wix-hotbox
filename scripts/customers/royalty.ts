/**
 * Royalty Calculation Engine
 *
 * Pure-function module that calculates per-line-item royalty amounts for a
 * customer over a date range. Takes a customer account, orders, and date range
 * as inputs, producing a detailed royalty ledger. Discount-aware: orders with
 * any discount applied have royalty zeroed on all line items.
 *
 * Functions:
 * 1. matchOrdersToCustomer   - filter orders by collection name matching customer
 * 2. filterOrdersByDateRange - filter orders by date range, exclude cancelled
 * 3. isDiscountedLineItem    - check if a line item was sold at a discount
 * 4. calculateRoyaltyForLineItem - calculate royalty for a single line item
 * 5. generateRoyaltyReport   - main entry point, produces full RoyaltyReport
 *
 * Critical: All money calculations round to 2 decimal places using
 * Math.round(value * 100) / 100 at each step to prevent floating-point drift.
 *
 * Phase 26: Royalty Calculation & PDF Reporting
 */

import type { CustomerAccount } from './types.js';
import type { Order, OrderLineItem } from '../orders/types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Represents one order line item's royalty calculation.
 */
export interface RoyaltyLineItem {
  /** Reference to the order */
  orderId: string;
  /** Display order number */
  orderNumber: number;
  /** ISO-8601 date from order.createdAt */
  orderDate: string;
  /** From OrderLineItem.productName */
  productName: string;
  /** From OrderLineItem.sku (or empty string) */
  sku: string;
  /** From OrderLineItem.color (or empty string) */
  color: string;
  /** From OrderLineItem.size (or empty string) */
  size: string;
  /** From OrderLineItem.quantity */
  quantity: number;
  /** Actual unit price charged (from OrderLineItem.unitPrice) */
  unitPrice: number;
  /** Customer's royaltyPercent (copied for transparency) */
  royaltyRate: number;
  /** Calculated royalty per unit (may be $0 if discounted) */
  royaltyPerUnit: number;
  /** royaltyPerUnit * quantity */
  royaltyTotal: number;
  /** True if royalty was zeroed due to discount */
  discounted: boolean;
}

/**
 * Complete royalty report for a customer over a date range.
 */
export interface RoyaltyReport {
  /** Customer account ID */
  customerId: string;
  /** Customer brand name */
  customerName: string;
  /** Customer's royaltyPercent */
  royaltyRate: number;
  /** ISO-8601 date range start */
  periodStart: string;
  /** ISO-8601 date range end */
  periodEnd: string;
  /** ISO-8601 timestamp when report was generated */
  generatedAt: string;
  /** All line items sorted by orderDate ASC */
  lineItems: RoyaltyLineItem[];
  /** Sum of all line item quantities */
  totalUnits: number;
  /** Sum of all unitPrice * quantity */
  totalRevenue: number;
  /** Sum of all royaltyTotal */
  totalRoyalty: number;
  /** Count of line items with discounted=true */
  discountedLineItems: number;
  /** Number of distinct orders in the report */
  orderCount: number;
}

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
 *
 * @param orders - All orders to search through
 * @param customerName - The customer/brand name to match against
 * @returns Matched orders sorted by createdAt ASC
 */
export function matchOrdersToCustomer(orders: Order[], customerName: string): Order[] {
  const normalizedName = customerName.trim().toLowerCase();
  return orders
    .filter((order) => {
      const collection = (order.collection ?? '').trim().toLowerCase();
      return collection === normalizedName;
    })
    .sort((a, b) => {
      // Sort by createdAt ASC (lexicographic works for ISO-8601)
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
 *
 * @param orders - Orders to filter
 * @param start - ISO-8601 date range start (inclusive)
 * @param end - ISO-8601 date range end (inclusive)
 * @returns Filtered orders within the date range, non-cancelled
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
 *
 * @param _lineItem - The line item (unused in current heuristic, reserved for future per-line-item discount tracking)
 * @param order - The order containing the line item
 * @returns True if discounted (royalty should be $0)
 */
export function isDiscountedLineItem(_lineItem: OrderLineItem, order: Order): boolean {
  return order.discount > 0;
}

/**
 * Calculate royalty for a single line item.
 *
 * If the line item is discounted, royaltyPerUnit is $0. Otherwise,
 * royaltyPerUnit = round2(unitPrice * royaltyPercent / 100).
 *
 * @param lineItem - The order line item
 * @param order - The order containing the line item
 * @param royaltyPercent - Customer's royalty rate percentage
 * @returns Complete RoyaltyLineItem with all fields populated
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
    orderNumber: order.orderNumber,
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
 * Main entry point. Takes a customer and ALL orders (caller is responsible
 * for loading orders from store). Filters by customer, date range, and
 * calculates per-line-item royalty amounts.
 *
 * @param params - Customer account, all orders, and date range
 * @returns Complete RoyaltyReport with all aggregated totals
 */
export function generateRoyaltyReport(params: {
  customer: CustomerAccount;
  orders: Order[];
  periodStart: string;
  periodEnd: string;
}): RoyaltyReport {
  const { customer, orders, periodStart, periodEnd } = params;

  // Step 1: Filter orders for this customer
  const customerOrders = matchOrdersToCustomer(orders, customer.name);

  // Step 2: Apply date range filter (excludes cancelled orders)
  const filteredOrders = filterOrdersByDateRange(customerOrders, periodStart, periodEnd);

  // Step 3: Calculate royalty for each line item
  const lineItems: RoyaltyLineItem[] = [];
  const orderIds = new Set<string>();

  for (const order of filteredOrders) {
    orderIds.add(order.id);
    for (const lineItem of order.lineItems) {
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
