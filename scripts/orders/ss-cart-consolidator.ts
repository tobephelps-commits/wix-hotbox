/**
 * S&S Cart Consolidation Engine
 *
 * Aggregates line items from multiple orders into a consolidated cart ready
 * for S&S Activewear website automation. Groups items by style+color+size,
 * sums quantities, and tracks which order numbers contributed to each cart item.
 *
 * Only S&S-vendor items (vendor === 'ss') with a vendorStyle are included.
 * Items from other vendors (e.g., SanMar) or without a style number are skipped
 * with console warnings.
 *
 * Phase 39: S&S Cart Automation
 */

import type { Order, OrderStatus } from './types.js';
import type { CartItem, CartFillRequest } from './cart-types.js';
import { listOrders } from './order-store.js';

// =============================================================================
// Order Loading
// =============================================================================

/**
 * Load orders eligible for S&S cart fill from the order store.
 *
 * Filters to orders in eligible statuses (default: 'new') and returns them
 * sorted by orderNumber ascending for deterministic processing order.
 *
 * @param filter - Optional filter criteria
 * @param filter.statuses - Order statuses to include (default: ['new'])
 * @returns Orders eligible for S&S Activewear cart fill, sorted by orderNumber ascending
 */
export async function getSSOrdersForCartFill(
  filter?: { statuses?: OrderStatus[] },
): Promise<Order[]> {
  const statuses = filter?.statuses ?? ['new'];

  // Load all orders matching each eligible status and merge
  const orderSets = await Promise.all(
    statuses.map((status) => listOrders({ status })),
  );
  const allOrders = orderSets.flat();

  // Deduplicate by id (in case of overlapping queries)
  const seen = new Set<string>();
  const unique = allOrders.filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });

  // Sort by orderNumber ascending for deterministic processing order
  unique.sort((a, b) => a.orderNumber - b.orderNumber);

  return unique;
}

// =============================================================================
// Consolidation Engine
// =============================================================================

/**
 * Consolidate multiple orders into a single CartFillRequest for S&S Activewear.
 *
 * Logic:
 * 1. Filter line items to S&S-vendor only (vendor === 'ss').
 *    Skip items where vendor is 'sanmar' or undefined.
 * 2. Filter line items that have vendorStyle defined. Log a warning for skipped items.
 * 3. Group by composite key: style:color:size (lowercased for comparison).
 * 4. Sum quantities across matching items.
 * 5. Track which orderNumbers contributed to each CartItem in sourceOrders.
 * 6. Return a CartFillRequest with items sorted by vendorStyle, then color, then size.
 *
 * @param orders - Orders to consolidate
 * @returns CartFillRequest with consolidated items ready for S&S cart automation
 */
export function consolidateSSOrders(orders: Order[]): CartFillRequest {
  /** Map of composite key -> CartItem being built */
  const itemMap = new Map<string, CartItem>();

  for (const order of orders) {
    let ssItemCount = 0;

    for (const lineItem of order.lineItems) {
      // Only include S&S vendor items
      if (lineItem.vendor !== 'ss') {
        continue;
      }

      // Skip items without a vendorStyle — cannot be added to S&S cart
      if (!lineItem.vendorStyle) {
        console.warn(
          `[ss-cart-consolidator] Order #${order.orderNumber}: Skipping "${lineItem.productName}" — no vendorStyle defined`,
        );
        continue;
      }

      // Skip items without color or size — required for cart item identification
      if (!lineItem.color || !lineItem.size) {
        console.warn(
          `[ss-cart-consolidator] Order #${order.orderNumber}: Skipping "${lineItem.productName}" (${lineItem.vendorStyle}) — missing color or size`,
        );
        continue;
      }

      ssItemCount++;

      // Composite key for grouping (lowercased for comparison)
      const key = `${lineItem.vendorStyle.toLowerCase()}:${lineItem.color.toLowerCase()}:${lineItem.size.toLowerCase()}`;

      const existing = itemMap.get(key);
      if (existing) {
        // Merge into existing cart item
        existing.quantity += lineItem.quantity;
        if (!existing.sourceOrders.includes(order.orderNumber)) {
          existing.sourceOrders.push(order.orderNumber);
        }
      } else {
        // Create new cart item (preserve original casing)
        itemMap.set(key, {
          vendorStyle: lineItem.vendorStyle,
          color: lineItem.color,
          size: lineItem.size,
          quantity: lineItem.quantity,
          sourceOrders: [order.orderNumber],
          productName: lineItem.productName,
        });
      }
    }

    if (ssItemCount === 0) {
      console.warn(
        `[ss-cart-consolidator] Order #${order.orderNumber}: Zero S&S line items after filtering`,
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
    console.warn(
      '[ss-cart-consolidator] Consolidated cart is empty — no items to order from S&S Activewear',
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
