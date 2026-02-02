---
phase: 26-royalty-calculation-pdf-reporting
plan: 01
subsystem: api
tags: [royalty, calculation, pure-functions, customer-accounts, orders, rest-api]

# Dependency graph
requires:
  - phase: 25-customer-account-system
    provides: CustomerAccount type with royaltyPercent, customer store
  - phase: 18-order-management
    provides: Order and OrderLineItem types, order store with loadOrders
provides:
  - Royalty calculation engine (pure functions) for per-line-item royalty computation
  - RoyaltyLineItem and RoyaltyReport types for royalty ledger data
  - REST API endpoints for royalty report generation (JSON and PDF stub)
affects: [26-02 PDF generator, 26-03 royalty dashboard UI]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure-function royalty engine (no I/O, no side effects)"
    - "Discount-aware heuristic: order.discount > 0 zeros all line item royalties"
    - "Dynamic import for PDF module (501 until Plan 02)"

key-files:
  created:
    - scripts/customers/royalty.ts
  modified:
    - scripts/customers/types.ts
    - scripts/pipeline/preview-server.ts

key-decisions:
  - "Conservative discount heuristic: any order-level discount zeros ALL line items"
  - "Dynamic import for PDF generator allows Plans 01 and 02 to run independently"

patterns-established:
  - "Royalty calculation follows same pure-function pattern as pricing.ts"
  - "round2 at every money calculation step for 2-decimal precision"

# Metrics
duration: 5min
completed: 2026-02-02
---

# Phase 26 Plan 01: Royalty Calculation Engine Summary

**Pure-function royalty engine with discount-aware per-line-item calculations and REST API endpoints for JSON report generation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-02
- **Completed:** 2026-02-02
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Royalty calculation engine with 5 pure functions matching the pricing.ts pattern
- RoyaltyLineItem and RoyaltyReport types providing full ledger transparency
- Discount-awareness: orders with discount > 0 have all line item royalties zeroed
- REST API: GET /api/customers/:id/royalty returns JSON royalty report with date range filtering
- REST API: GET /api/customers/:id/royalty/pdf returns 501 stub (activates after Plan 02)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create royalty calculation types and pure functions** - `45a54b9` (feat)
2. **Task 2: Add royalty report API endpoints to preview server** - `e715ed2` (feat)

## Files Created/Modified
- `scripts/customers/royalty.ts` - Royalty calculation engine with types and 5 pure functions
- `scripts/customers/types.ts` - Re-exports RoyaltyLineItem and RoyaltyReport types
- `scripts/pipeline/preview-server.ts` - Two new royalty API endpoints (JSON + PDF stub)

## Decisions Made
- Conservative discount heuristic: if order.discount > 0, ALL line items in that order get $0 royalty. This avoids charging royalty on staff/discount orders where markup was removed. The owner knows which orders used discount codes.
- Dynamic import for royalty-statement.js PDF module: allows Plan 02 to be developed independently. The PDF endpoint returns 501 until the module exists, then activates seamlessly.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Royalty calculation engine ready for Plan 02 (PDF statement generator) and Plan 03 (dashboard UI)
- JSON API endpoint fully functional for integration testing
- PDF endpoint will auto-activate once Plan 02 creates royalty-statement.ts

---
*Phase: 26-royalty-calculation-pdf-reporting*
*Completed: 2026-02-02*
