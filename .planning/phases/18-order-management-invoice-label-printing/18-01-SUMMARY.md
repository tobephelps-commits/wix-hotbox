---
phase: 18-order-management-invoice-label-printing
plan: 01
subsystem: orders
tags: [typescript, wix-ecommerce, orders-api, state-machine]

# Dependency graph
requires:
  - phase: 17-ss-activewear-api-integration
    provides: Vendor types and API client patterns (duplicated auth helpers)
  - phase: 15-cost-tracking-sale-promo-pricing
    provides: Auth duplication pattern for WIX API modules
provides:
  - Order type definitions (OrderStatus, Order, OrderLineItem, etc.)
  - WIX eCommerce Orders API client (search, get, map)
  - OrderStatusTransition state machine
affects: [18-02, 18-03, 18-04, 18-05, 18-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Order lifecycle state machine with typed transitions"
    - "WIX eCommerce V1 Orders API (cursor-based pagination)"
    - "Contact details from billingInfo.contactDetails (not buyerInfo)"

key-files:
  created:
    - scripts/orders/types.ts
    - scripts/orders/wix-orders-api.ts
  modified: []

key-decisions:
  - "String literal unions (not enums) for OrderStatus/OrderSource per project conventions"
  - "Auth helpers duplicated locally per Phase 15-03 pattern"
  - "Customer name resolved from billingInfo.contactDetails (WIX V1 ecom pattern)"
  - "WIX addressLine field mapped to addressLine1 (WIX uses single field)"

patterns-established:
  - "Order lifecycle: new -> ordered -> received -> in-production -> packed -> shipped -> delivered/cancelled"
  - "WIX ecom V1 order status mapping: paymentStatus + fulfillmentStatus -> OrderStatus"

# Metrics
duration: 8min
completed: 2026-02-01
---

# Phase 18 Plan 01: Order Types & WIX Orders API Summary

**Order data model with full lifecycle state machine and WIX eCommerce V1 Orders API client fetching real orders**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-01
- **Completed:** 2026-02-01
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Complete order type system with 8-state lifecycle (new through delivered/cancelled)
- ORDER_STATUS_TRANSITIONS state machine enforcing valid transitions
- WIX eCommerce Orders V1 API client with cursor-based pagination
- CLI `--recent [days]` flag successfully fetches and displays real orders from the live store

## Task Commits

Each task was committed atomically:

1. **Task 1: Define order management types** - `1dbadcc` (feat)
2. **Task 2: Build WIX eCommerce Orders API client** - `7799452` (feat)

## Files Created/Modified
- `scripts/orders/types.ts` - OrderStatus, OrderSource, OrderLineItem, OrderAddress, OrderCustomer, Order interfaces and ORDER_STATUS_TRANSITIONS state machine
- `scripts/orders/wix-orders-api.ts` - WIX eCommerce V1 API client with searchOrders, getOrder, getRecentOrders, mapWixOrderToOrder, and CLI runner

## Decisions Made
- String literal unions for OrderStatus/OrderSource (not enums) to match project conventions
- Auth helpers duplicated locally per Phase 15-03 decision (avoids modifying wix-api.ts internals)
- Customer name resolved from billingInfo.contactDetails, not buyerInfo (discovered from live API response)
- WIX address uses `addressLine` field (not `addressLine1`) -- mapped correctly for our OrderAddress interface

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed customer name mapping from WIX ecom V1 API response**
- **Found during:** Task 2 (WIX Orders API client)
- **Issue:** Plan assumed buyer name would be in `buyerInfo.firstName`/`lastName`, but WIX eCommerce V1 API puts customer name in `billingInfo.contactDetails.firstName`/`lastName`. The `buyerInfo` only contains `contactId`, `email`, and `visitorId`.
- **Fix:** Updated customer mapping to pull from `billingInfo.contactDetails` with fallback to `buyerInfo` fields
- **Files modified:** scripts/orders/wix-orders-api.ts
- **Verification:** CLI `--recent` now shows correct customer names (e.g., "Becky Goodwin" instead of "N/A")
- **Committed in:** 7799452 (part of Task 2 commit)

**2. [Rule 1 - Bug] Fixed address field mapping for WIX ecom V1 API**
- **Found during:** Task 2 (WIX Orders API client)
- **Issue:** WIX eCommerce V1 uses `addressLine` (single field) not `addressLine1`/`addressLine2`. Also, contact details (name, phone) are in a separate `contactDetails` object, not in the address itself.
- **Fix:** Updated WixAddress interface to include `addressLine` field, updated mapWixAddress to accept contactDetails parameter
- **Files modified:** scripts/orders/wix-orders-api.ts
- **Verification:** Address data correctly populated from live API responses
- **Committed in:** 7799452 (part of Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs from WIX API response shape differences)
**Impact on plan:** Both fixes necessary for correct data mapping from live API. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Uses existing WIX_API_KEY which already has order read permissions.

## Next Phase Readiness
- Order types and WIX API client ready for all subsequent Phase 18 plans
- Ready for 18-02-PLAN.md (Invoice PDF generation with PDFKit)
- Live order data confirmed working (4 orders fetched from production store)

---
*Phase: 18-order-management-invoice-label-printing*
*Completed: 2026-02-01*
