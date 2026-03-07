/**
 * Cart Types for Vendor Cart Automation (v2.0)
 *
 * Type definitions for the cart consolidation and browser automation workflow.
 * Defines shapes for consolidated cart items (grouped by style+color+size),
 * cart fill requests (what to add), and cart fill results (what happened).
 *
 * Vendor-agnostic: supports both SanMar and S&S Activewear cart filling.
 *
 * Ported from v1.x scripts/orders/cart-types.ts with vendor field added.
 * Phase 52: Cart Automation
 */

import type { VendorId } from '../vendors/types.js';

// =============================================================================
// Cart Item (Consolidated Line)
// =============================================================================

/**
 * A single consolidated cart item ready for vendor website.
 *
 * Multiple order line items with the same style+color+size are merged into
 * one CartItem with summed quantity. The sourceOrders array tracks which
 * order numbers contributed to this item for audit trail.
 */
export interface CartItem {
  /** Which vendor this item should be ordered from */
  vendor: VendorId;
  /** Vendor style number (e.g., "PC61" for SanMar, "2000" for S&S) */
  vendorStyle: string;
  /** Color name as it appears on line items */
  color: string;
  /** Size label (e.g., "M", "XL", "2XL") */
  size: string;
  /** Consolidated quantity across all contributing orders */
  quantity: number;
  /** Order numbers that contributed to this cart item (audit trail) */
  sourceOrders: number[];
  /** Display name from first matching line item */
  productName: string;
}

// =============================================================================
// Cart Fill Request
// =============================================================================

/**
 * A request to fill a vendor's shopping cart with consolidated items.
 *
 * Created by the consolidation engine from multiple orders. Passed to the
 * browser automation engine to execute the actual cart filling.
 */
export interface CartFillRequest {
  /** Consolidated items to add to cart */
  items: CartItem[];
  /** All order numbers included in this batch */
  orderNumbers: number[];
  /** ISO-8601 timestamp when consolidation was created */
  createdAt: string;
}

// =============================================================================
// Cart Fill Result
// =============================================================================

/**
 * Result of a cart fill attempt by the browser automation engine.
 *
 * Tracks overall status and per-item results so the operator can see
 * exactly what succeeded, what failed, and where to pick up manually.
 */
export interface CartFillResult {
  /** The original fill request */
  request: CartFillRequest;
  /** Overall result: success (all items), partial (some failed), or failed (none added) */
  status: 'success' | 'partial' | 'failed';
  /** Per-item result for each cart item */
  itemResults: CartItemResult[];
  /** URL where the browser was left for manual checkout (if any items succeeded) */
  checkoutUrl?: string;
  /** ISO-8601 timestamp when the fill completed */
  completedAt: string;
}

// =============================================================================
// Cart Item Result
// =============================================================================

/**
 * Result of attempting to add a single item to a vendor's cart.
 */
export interface CartItemResult {
  /** The cart item that was attempted */
  item: CartItem;
  /** Whether the item was successfully added to cart */
  success: boolean;
  /** Error message if the item could not be added */
  error?: string;
}

// =============================================================================
// Cart Fill Options
// =============================================================================

/**
 * Options for the browser automation cart fill engine.
 */
export interface CartFillOptions {
  /** Run browser in headless mode (default: true) */
  headless?: boolean;
  /** Slow down operations by this many ms (useful for debugging) */
  slowMo?: number;
  /** Timeout for the entire cart fill operation in ms (default: 60000) */
  timeout?: number;
}
