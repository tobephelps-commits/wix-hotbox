/**
 * Cart Consolidation Engine (v2.0)
 *
 * Vendor-agnostic order consolidation for cart automation. Groups line items
 * from multiple orders by style+color+size, sums quantities, and tracks
 * which order numbers contributed to each cart item.
 *
 * Combines v1.x's cart-consolidator.ts (SanMar) and ss-cart-consolidator.ts
 * (S&S) into a single vendor-agnostic module. Uses SQLite via order-service
 * instead of v1.x's JSON file storage.
 *
 * Phase 52: Cart Automation
 */

import type Database from 'better-sqlite3';
import type { VendorId } from '../vendors/types.js';
import type { Order, OrderStatus } from './types.js';
import type { CartItem, CartFillRequest } from './cart-types.js';
import { listOrders } from './order-service.js';

// =============================================================================
// Order Loading
// =============================================================================

/**
 * Load orders eligible for cart fill from SQLite.
 *
 * Filters to orders in eligible statuses (default: 'new') and optionally
 * filters to orders containing items from a specific vendor.
 *
 * @param db - SQLite database instance
 * @param vendor - Optional vendor filter; if specified, only orders with
 *                 at least one line item from this vendor are returned
 * @param filter - Optional filter criteria
 * @param filter.statuses - Order statuses to include (default: ['new'])
 * @returns Orders eligible for cart fill, sorted by orderNumber ascending
 */
export function getOrdersForCartFill(
  db: Database.Database,
  vendor?: VendorId,
  filter?: { statuses?: OrderStatus[] },
): Order[] {
  const statuses = filter?.statuses ?? ['new'];

  // Collect orders across all requested statuses
  const allOrders: Order[] = [];
  const seen = new Set<string>();

  for (const status of statuses) {
    const { orders } = listOrders(db, { status });
    for (const order of orders) {
      if (!seen.has(order.id)) {
        seen.add(order.id);
        allOrders.push(order);
      }
    }
  }

  // Sort by orderNumber ascending for deterministic processing order
  allOrders.sort((a, b) => a.orderNumber - b.orderNumber);

  // If vendor filter specified, we need to check line items.
  // listOrders returns Order[] without items, so we need to load items
  // to filter by vendor. Query order_items directly for efficiency.
  if (vendor) {
    const vendorOrderIds = new Set<string>();
    const rows = db
      .prepare('SELECT DISTINCT order_id FROM order_items WHERE vendor = ?')
      .all(vendor) as { order_id: string }[];
    for (const row of rows) {
      vendorOrderIds.add(row.order_id);
    }
    return allOrders.filter((o) => vendorOrderIds.has(o.id));
  }

  return allOrders;
}

// =============================================================================
// Consolidation Engine
// =============================================================================

/**
 * Consolidate multiple orders into a single CartFillRequest.
 *
 * Loads line items from SQLite for the given orders, then:
 * 1. If vendor specified, only include items matching that vendor.
 *    If no vendor specified, include all items with a known vendor.
 * 2. Filter line items that have vendorStyle defined.
 * 3. Group by composite key: vendor:style:color:size (lowercased for comparison).
 * 4. Sum quantities across matching items.
 * 5. Track which orderNumbers contributed to each CartItem in sourceOrders.
 * 6. Sort by vendorStyle, then color, then size.
 *
 * @param db - SQLite database instance
 * @param orders - Orders to consolidate (must have been loaded with getOrdersForCartFill)
 * @param vendor - Optional vendor filter; only include items from this vendor
 * @returns CartFillRequest with consolidated items ready for cart automation
 */
export function consolidateOrders(
  db: Database.Database,
  orders: Order[],
  vendor?: VendorId,
): CartFillRequest {
  /** Map of composite key -> CartItem being built */
  const itemMap = new Map<string, CartItem>();

  for (const order of orders) {
    // Load line items for this order from SQLite
    const lineItems = db
      .prepare('SELECT * FROM order_items WHERE order_id = ?')
      .all(order.id) as {
      product_name: string;
      vendor_style: string | null;
      vendor: string | null;
      color: string | null;
      size: string | null;
      quantity: number;
    }[];

    let matchingItemCount = 0;

    for (const li of lineItems) {
      // Vendor filtering
      if (vendor) {
        // Only include items matching the requested vendor
        if (li.vendor !== vendor) continue;
      } else {
        // No vendor filter: skip items without a known vendor
        if (!li.vendor || (li.vendor !== 'sanmar' && li.vendor !== 'ss')) continue;
      }

      // Skip items without a vendorStyle
      if (!li.vendor_style) {
        console.warn(
          `[cart-consolidator] Order #${order.orderNumber}: Skipping "${li.product_name}" — no vendorStyle defined`,
        );
        continue;
      }

      // Skip items without color or size
      if (!li.color || !li.size) {
        console.warn(
          `[cart-consolidator] Order #${order.orderNumber}: Skipping "${li.product_name}" (${li.vendor_style}) — missing color or size`,
        );
        continue;
      }

      matchingItemCount++;

      const itemVendor = li.vendor as VendorId;

      // Composite key for grouping (lowercased for comparison)
      const key = `${itemVendor}:${li.vendor_style.toLowerCase()}:${li.color.toLowerCase()}:${li.size.toLowerCase()}`;

      const existing = itemMap.get(key);
      if (existing) {
        existing.quantity += li.quantity;
        if (!existing.sourceOrders.includes(order.orderNumber)) {
          existing.sourceOrders.push(order.orderNumber);
        }
      } else {
        itemMap.set(key, {
          vendor: itemVendor,
          vendorStyle: li.vendor_style,
          color: li.color,
          size: li.size,
          quantity: li.quantity,
          sourceOrders: [order.orderNumber],
          productName: li.product_name,
        });
      }
    }

    if (matchingItemCount === 0) {
      const vendorLabel = vendor ?? 'any vendor';
      console.warn(
        `[cart-consolidator] Order #${order.orderNumber}: Zero ${vendorLabel} line items after filtering`,
      );
    }
  }

  // Sort items by vendorStyle, then color, then size
  const sortedItems = Array.from(itemMap.values()).sort((a, b) => {
    const styleCompare = a.vendorStyle.localeCompare(b.vendorStyle);
    if (styleCompare !== 0) return styleCompare;

    const colorCompare = a.color.localeCompare(b.color);
    if (colorCompare !== 0) return colorCompare;

    return a.size.localeCompare(b.size);
  });

  if (sortedItems.length === 0) {
    const vendorLabel = vendor ?? 'any vendor';
    console.warn(
      `[cart-consolidator] Consolidated cart is empty — no items to order from ${vendorLabel}`,
    );
  }

  // Collect all order numbers included in this batch
  const orderNumbers = orders
    .map((o) => o.orderNumber)
    .sort((a, b) => a - b);

  return {
    items: sortedItems,
    orderNumbers,
    createdAt: new Date().toISOString(),
  };
}

// =============================================================================
// Convenience Function
// =============================================================================

/**
 * Build a CartFillRequest from the database in one call.
 *
 * Convenience function that calls getOrdersForCartFill + consolidateOrders.
 *
 * @param db - SQLite database instance
 * @param vendor - Optional vendor filter
 * @returns CartFillRequest with consolidated items
 */
export function buildCartFillRequest(
  db: Database.Database,
  vendor?: VendorId,
): CartFillRequest {
  const orders = getOrdersForCartFill(db, vendor);
  return consolidateOrders(db, orders, vendor);
}
