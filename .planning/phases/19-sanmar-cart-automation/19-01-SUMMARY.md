---
phase: 19-sanmar-cart-automation
plan: 01
subsystem: orders
tags: [cart, consolidation, sanmar, batch-fulfillment, types]

# Dependency graph
requires:
  - phase: 18-order-management
    provides: Order types, order store, line item structure with vendorStyle/color/size/vendor fields
provides:
  - CartItem, CartFillRequest, CartFillResult, CartItemResult type definitions
  - consolidateOrders function for multi-order SKU merging
  - getOrdersForCartFill function for status-based order loading
affects: [19-02 browser automation, 19-03 CLI and dashboard integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Composite key grouping (style:color:size) for cart item deduplication"
    - "Case-insensitive key matching with original casing preserved in output"

key-files:
  created:
    - scripts/orders/cart-types.ts
    - scripts/orders/cart-consolidator.ts
  modified:
    - scripts/orders/index.ts

key-decisions:
  - "SanMar-only filtering: vendor==='ss' excluded, vendor===undefined defaults to SanMar"
  - "Items without vendorStyle, color, or size skipped with console warnings"
  - "Consolidation uses lowercased composite key but preserves original casing in CartItem output"

patterns-established:
  - "Cart consolidation pattern: group by composite key, sum quantities, track source orders"
  - "Console.warn for skipped items provides operator visibility without throwing"

# Metrics
duration: 4min
completed: 2026-02-01
---

# Phase 19 Plan 01: Cart Types & Order Consolidation Summary

**Cart type definitions and consolidation engine that merges multi-order line items by style:color:size into minimal SanMar cart items with summed quantities**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-01
- **Completed:** 2026-02-01
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Defined complete cart data model (CartItem, CartFillRequest, CartFillResult, CartItemResult) for the batch fulfillment workflow
- Built consolidation engine that groups across orders by style+color+size with quantity summing and source order tracking
- SanMar-only filtering with vendor and vendorStyle validation and clear console warnings for skipped items
- Barrel exports added to orders/index.ts for clean API surface

## Task Commits

Each task was committed atomically:

1. **Task 1: Define cart types for SanMar batch fulfillment** - `f78fea0` (feat)
2. **Task 2: Build order consolidation engine** - `2f44a45` (feat)

## Files Created/Modified
- `scripts/orders/cart-types.ts` - CartItem, CartFillRequest, CartFillResult, CartItemResult interfaces
- `scripts/orders/cart-consolidator.ts` - consolidateOrders and getOrdersForCartFill functions
- `scripts/orders/index.ts` - Barrel exports for cart types and consolidator

## Decisions Made
- SanMar-only filtering: items with `vendor === 'ss'` are excluded; `vendor === undefined` defaults to SanMar (backward compatible with existing orders)
- Items without vendorStyle, color, or size are skipped with console warnings rather than throwing errors — operator visibility without blocking automation
- Composite key uses lowercased values for comparison but preserves original casing in output CartItem — handles inconsistent casing in source data

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added color/size validation to consolidation**
- **Found during:** Task 2 (Consolidation engine)
- **Issue:** Plan specified filtering on vendorStyle only, but items without color or size cannot form a valid composite key and would produce broken cart items
- **Fix:** Added null/undefined check for color and size fields with console.warn for skipped items
- **Files modified:** scripts/orders/cart-consolidator.ts
- **Verification:** Type-check passes, logic handles missing color/size gracefully
- **Committed in:** 2f44a45 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for correctness — prevents broken composite keys. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Cart types and consolidation engine ready for Plan 19-02 (browser automation)
- consolidateOrders produces CartFillRequest that the Playwright automation engine will consume
- getOrdersForCartFill provides the order loading interface for both CLI and preview server

---
*Phase: 19-sanmar-cart-automation*
*Completed: 2026-02-01*
