---
phase: 28-order-management-hardening
plan: 01
subsystem: api, orders
tags: [retry, exponential-backoff, error-tracking, order-status, state-machine]

# Dependency graph
requires:
  - phase: 18-order-management-invoice-label-printing
    provides: Order types, order-store CRUD, WIX sync, preview-server order endpoints
  - phase: 19-sanmar-cart-automation
    provides: Cart fill operations, order status transitions
provides:
  - OrderError interface for per-order failure tracking
  - on-hold status in order state machine
  - syncWithRetry with exponential backoff
  - GET /api/orders/summary endpoint
  - GET /api/orders/errors endpoint
  - POST /api/orders/:id/resolve-error endpoint
  - addOrderError, resolveOrderError, getOrdersWithErrors, getOrderSummary store functions
affects: [28-02, 29, 30]

# Tech tracking
tech-stack:
  added: []
  patterns: [exponential-backoff-retry, error-tracking-per-entity, status-summary-aggregation]

key-files:
  created: []
  modified:
    - scripts/orders/types.ts
    - scripts/orders/order-store.ts
    - scripts/orders/wix-order-sync.ts
    - scripts/orders/index.ts
    - scripts/pipeline/preview-server.ts

key-decisions:
  - "on-hold transitions allow resuming from new or ordered (bidirectional)"
  - "Only WIX API fetch failures trigger retry, not per-order errors"
  - "errored is a cross-cutting count in summary, not a real status"

patterns-established:
  - "Exponential backoff retry pattern: baseDelayMs * 2^attempt"
  - "Per-entity error tracking with operation type and resolved flag"

# Metrics
duration: 8min
completed: 2026-02-02
---

# Phase 28 Plan 01: Order Management Hardening Summary

**Self-healing order pipeline with retry logic, per-order error tracking, on-hold status, and summary/error API endpoints**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-02T19:00:00Z
- **Completed:** 2026-02-02T19:08:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added `on-hold` status to order state machine with bidirectional transitions (can resume from where paused)
- Added `OrderError` interface for per-order failure tracking with operation type, retry count, and resolved flag
- Implemented `syncWithRetry()` with exponential backoff (2s, 4s, 8s) for transient WIX API failures
- Added `AbortSignal` support for cancellable syncs
- Created `/api/orders/summary` endpoint for at-a-glance status counts with error overview
- Created `/api/orders/errors` endpoint for orders with unresolved errors
- Created `/api/orders/:id/resolve-error` endpoint to clear resolved errors
- Added `addOrderError`, `resolveOrderError`, `getOrdersWithErrors`, `getOrderSummary` to order store

## Task Commits

Each task was committed atomically:

1. **Task 1: Add error tracking, on-hold status, and retry metadata** - `eba7a37` (feat)
2. **Task 2: Add retry logic and summary/error API endpoints** - `c3eaa0f` (feat)

## Files Created/Modified
- `scripts/orders/types.ts` - Added on-hold status, OrderError interface, errors/lastSyncError fields on Order
- `scripts/orders/order-store.ts` - Added addOrderError, resolveOrderError, getOrdersWithErrors, getOrderSummary functions
- `scripts/orders/wix-order-sync.ts` - Added syncWithRetry with exponential backoff, AbortSignal support, retriesUsed tracking
- `scripts/orders/index.ts` - Exported new functions and OrderError type
- `scripts/pipeline/preview-server.ts` - Added summary, errors, and resolve-error endpoints; updated sync to use retry

## Decisions Made
- `on-hold` allows bidirectional transitions: new -> on-hold -> new, ordered -> on-hold -> ordered. This lets orders be paused and resumed from the same point.
- Only the WIX API fetch (getRecentOrders) is retried with backoff — per-order processing errors are captured but not retried, as they're more likely data issues than transient failures.
- `errored` is a cross-cutting count in the summary response, not a real order status. Orders with errors still have their actual lifecycle status.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Error tracking and retry infrastructure ready for Phase 28 Plan 02
- Summary endpoint provides at-a-glance status overview for dashboard integration
- All existing order endpoints continue working unchanged (backward compatible)

---
*Phase: 28-order-management-hardening*
*Completed: 2026-02-02*
