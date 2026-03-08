---
phase: 57-pi-e2e-test-automation
plan: 03
subsystem: testing
tags: [playwright, api-testing, orders, monitor, sync, inventory]

# Dependency graph
requires:
  - phase: 57-pi-e2e-test-automation
    provides: Test fixtures, server harness, DB seed utilities (plan 01)
  - phase: 49-order-management-core
    provides: Order CRUD endpoints, status transitions, PDF generation
  - phase: 51-inventory-sync
    provides: Monitor and sync route plugins, daemon control
provides:
  - API tests for /orders endpoint group (CRUD, status, summary, PDF, cart, sync)
  - API tests for /monitor endpoint group (config, tracked product CRUD, alerts, poll)
  - API tests for /sync endpoint group (mapping CRUD, daemon control, audit)
  - seededApi fixture for tests needing pre-populated data
affects: [57-04, 57-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [seededApi fixture pattern for data-dependent tests]

key-files:
  created:
    - tests/api/orders.test.ts
    - tests/api/monitor.test.ts
    - tests/api/sync.test.ts
  modified:
    - tests/fixtures.ts
    - tests/helpers/db.ts

key-decisions:
  - "Added seededApi fixture connecting to seededServer for order tests"
  - "Fixed seed data to match actual DB schema (wix_order_id, split customer name, unit_price/total_price)"

patterns-established:
  - "Use seededApi fixture for tests requiring pre-populated data"
  - "Accept multiple status codes for endpoints dependent on external credentials"

# Metrics
duration: 6min
completed: 2026-03-08
---

# Phase 57 Plan 03: Order, Monitor & Sync API Tests Summary

**41 API tests covering order lifecycle, inventory monitoring CRUD, and stock sync daemon control**

## Performance

- **Duration:** 6 min
- **Tasks:** 2
- **Files created:** 3
- **Files modified:** 2

## Accomplishments
- 22 order API tests: list, get, status transitions, summary, errors, sync, invoice/production-sheet PDF, bulk status, cart preview
- 11 monitor API tests: config, tracked product CRUD (add/list/update/delete), alerts, on-demand poll
- 8 sync API tests: mapping CRUD, daemon health/start/stop, audit
- All tests handle missing external credentials gracefully (WIX API, vendor APIs)
- Fixed test seed data to match actual SQLite schema

## Task Commits

1. **Task 1: Test order management endpoints** - `0dcc0af` (test)
2. **Task 2: Test inventory monitoring and sync endpoints** - `d93fd5f` (test)

## Files Created/Modified
- `tests/api/orders.test.ts` - 22 tests for /api/orders endpoint group
- `tests/api/monitor.test.ts` - 11 tests for /api/monitor endpoint group
- `tests/api/sync.test.ts` - 8 tests for /api/sync endpoint group
- `tests/fixtures.ts` - Added seededApi fixture for data-dependent tests
- `tests/helpers/db.ts` - Fixed seed SQL to match actual DB schema

## Decisions Made
- Added seededApi fixture (connects to seededServer) rather than modifying existing api fixture
- Fixed seed data: column names (wix_order_id not wix_id), split customer name fields, order_items schema (unit_price/total_price, INTEGER auto-increment id)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed seed data schema mismatch**
- **Found during:** Task 1 (order tests)
- **Issue:** Seed SQL used wrong column names (wix_id, customer_name, price/total, text id) that didn't match actual migration schema
- **Fix:** Updated seed to use wix_order_id, customer_first_name/customer_last_name, unit_price/total_price, auto-increment id
- **Files modified:** tests/helpers/db.ts
- **Verification:** All 41 tests pass
- **Committed in:** 0dcc0af (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for tests to run; seed data must match migration schema.

## Issues Encountered
None.

## Next Phase Readiness
- 41 new API tests passing (65 total across plans 02-03)
- Ready for plan 04 (if any) or phase completion
- seededApi fixture available for future data-dependent tests

---
*Phase: 57-pi-e2e-test-automation*
*Completed: 2026-03-08*
