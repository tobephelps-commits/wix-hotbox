---
phase: 30-integration-testing-polish
plan: 01
subsystem: testing
tags: [smoke-test, integration, v1.0, api-validation, module-import]

# Dependency graph
requires:
  - phase: 20-integration-testing-polish
    provides: Original v0.2 smoke test (13 endpoints, 7 modules)
  - phase: 25-customer-account-system
    provides: Customer REST API and module files
  - phase: 27-pipeline-automation
    provides: Preferences API endpoint
  - phase: 28-order-management-hardening
    provides: Order summary and errors API endpoints
provides:
  - v1.0 smoke test covering 17 API endpoints and 8 module groups
  - Integration validation gate for v1.0 release
affects: [30-integration-testing-polish]

# Tech tracking
tech-stack:
  added: []
  patterns: [multi-file module import testing for non-barrel modules]

key-files:
  created: []
  modified: [scripts/smoke-test.ts]

key-decisions:
  - "Multi-file import strategy for customers module (no barrel export)"

patterns-established:
  - "Multi-file import test pattern: sentinel path triggers custom import script generation"

# Metrics
duration: 5min
completed: 2026-02-02
---

# Phase 30 Plan 01: Update Smoke Test for v1.0 Coverage Summary

**Expanded smoke test from v0.2 (13 endpoints, 7 modules) to v1.0 (17 endpoints, 8 modules) with all 34 checks passing green**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-02T21:00:00Z
- **Completed:** 2026-02-02T21:05:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Updated smoke test banner and header from v0.2 to v1.0
- Added 4 new v1.0 API endpoint tests: /api/customers, /api/preferences, /api/orders/summary, /api/orders/errors
- Added customers module import test using multi-file strategy (types+store+royalty)
- All 34 smoke test checks pass: 1 TypeScript, 8 CLI, 17 API, 8 Import

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand smoke test with v1.0 API endpoints and customer module** - `9c69bcb` (feat)
2. **Task 2: Run updated smoke test and fix any issues** - No commit needed (all tests passed, no fixes required)

**Plan metadata:** (this commit) (docs: complete plan)

## Files Created/Modified
- `scripts/smoke-test.ts` - Updated from v0.2 to v1.0: 4 new API endpoints, customers module import, version banner update

## Decisions Made
- Used multi-file import strategy for customers module since it has no barrel export (index.ts). The temp script imports types.js, store.js, and royalty.js individually using a sentinel path marker.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Smoke test v1.0 integration gate is active and green
- Ready for 30-02-PLAN.md (OPERATIONS.md update)
- All v1.0 endpoints validated, all modules importable

---
*Phase: 30-integration-testing-polish*
*Completed: 2026-02-02*
