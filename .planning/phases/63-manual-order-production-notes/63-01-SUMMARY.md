---
phase: 63-manual-order-production-notes
plan: 01
subsystem: api, ui
tags: [sqlite, pdfkit, react, orders, production-sheet]

# Dependency graph
requires:
  - phase: 50-order-advanced
    provides: order service, production sheet PDF generator, OrderDetail component
  - phase: 62-manual-order-product-picker
    provides: OrderCreateForm with ProductPicker integration
provides:
  - per-item production notes field on order_items table
  - notes input in OrderCreateForm
  - notes display in OrderDetail
  - notes rendered on production sheet PDFs
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created:
    - src/db/migrations/008-item-notes.sql
  modified:
    - src/orders/types.ts
    - src/orders/order-service.ts
    - ui/src/components/orders/types.ts
    - ui/src/components/orders/OrderCreateForm.tsx
    - ui/src/components/orders/OrderDetail.tsx
    - src/orders/production-sheet.ts

key-decisions:
  - "Notes stored as nullable TEXT column on order_items, not a separate table"
  - "Production sheet groups unique notes per product section to avoid duplication"

patterns-established: []

# Metrics
duration: 8min
completed: 2026-03-10
---

# Phase 63, Plan 01: Production Notes Summary

**Per-item production notes field end-to-end: DB column, form input, detail view, and production sheet PDF rendering**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-10
- **Completed:** 2026-03-10
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments
- Added `notes` TEXT column to order_items via migration 008
- Production Notes textarea per line item in OrderCreateForm
- Notes displayed in italic below product variant in OrderDetail
- Notes rendered in italic on production sheet PDFs below vendor badge, above quantities table

## Task Commits

Each task was committed atomically:

1. **Task 1: Add notes column to order_items and update types + service** - `9f782d8` (feat)
2. **Task 2: Add notes input to OrderCreateForm and display in OrderDetail** - `57393a3` (feat)
3. **Task 3: Display production notes on production sheet PDF** - `8820324` (feat)

## Files Created/Modified
- `src/db/migrations/008-item-notes.sql` - ALTER TABLE adding notes column
- `src/orders/types.ts` - Added notes to OrderLineItem interface
- `src/orders/order-service.ts` - Added notes to ItemRow, mapItemRow, createOrder, upsertWixOrder
- `ui/src/components/orders/types.ts` - Added notes to UI OrderLineItem interface
- `ui/src/components/orders/OrderCreateForm.tsx` - Production Notes textarea per item
- `ui/src/components/orders/OrderDetail.tsx` - Conditional notes display below variant info
- `src/orders/production-sheet.ts` - Notes array in ProductGroup, rendered in italic on PDF

## Decisions Made
- Notes stored as nullable TEXT column directly on order_items (simplest approach, no separate table needed)
- Production sheet collects unique notes per product group to avoid duplicate printing when multiple size/color variants share the same note

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Production notes feature complete end-to-end
- Migration 008 will run automatically on next server start
- Ready for any remaining plans in phase 63

---
*Phase: 63-manual-order-production-notes*
*Completed: 2026-03-10*
