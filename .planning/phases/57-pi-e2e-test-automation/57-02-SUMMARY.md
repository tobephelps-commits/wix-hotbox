---
phase: 57-pi-e2e-test-automation
plan: 02
subsystem: testing
tags: [playwright, e2e, api-testing, fastify, pipeline, vendors]

# Dependency graph
requires:
  - phase: 57-pi-e2e-test-automation
    plan: 01
    provides: Playwright config, test fixtures, server harness, API client
  - phase: 44-pi-backend-foundation
    provides: Fastify app, health/system/network endpoints
  - phase: 47-product-pipeline-creation-ui
    provides: Pipeline routes (presets, templates, preview)
provides:
  - API tests for health, system, network, vendor, and pipeline endpoints
  - Template CRUD test cycle (create, list, delete)
  - Error handling validation for unknown vendors and invalid styles
affects: [57-03, 57-04, 57-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [random port allocation for parallel test workers, conditional Content-Type headers]

key-files:
  created:
    - tests/api/health.test.ts
    - tests/api/system.test.ts
    - tests/api/vendors.test.ts
    - tests/api/pipeline.test.ts
  modified:
    - tests/helpers/server.ts
    - tests/helpers/api.ts
    - tests/fixtures.ts

key-decisions:
  - "Random port allocation (10000-60000) replaces fixed ports to avoid EADDRINUSE in parallel workers"
  - "Content-Type header only sent when request has a body (prevents Fastify 400 on bodiless DELETE/GET)"
  - "S&S vendor ID is 'ss' not 'ss-activewear' (matches adapter registration)"

patterns-established:
  - "Random ephemeral port for each test worker via randomPort() helper"
  - "Test API client omits Content-Type for bodyless requests"

# Metrics
duration: 10min
completed: 2026-03-08
---

# Phase 57 Plan 02: API Endpoint Tests Summary

**24 passing API tests covering health, system, network, vendors, and pipeline endpoints with template CRUD validation**

## Performance

- **Duration:** 10 min
- **Tasks:** 2/2
- **Files created:** 4
- **Files modified:** 3

## Accomplishments
- Health endpoint tests validate status, version, uptime, timestamp, and sub-500ms response time
- System endpoint tests verify CPU, memory, database, and network info shapes
- Vendor endpoint tests confirm SanMar and S&S Activewear registration with correct IDs
- Pipeline tests cover presets listing, template CRUD lifecycle, and error handling for invalid vendors/styles

## Task Commits

1. **Task 1: Test core system endpoints** - `44ed12f` (test)
2. **Task 2: Test pipeline endpoints** - `bf62dd2` (test)

## Files Created/Modified
- `tests/api/health.test.ts` - Health endpoint response shape and performance tests
- `tests/api/system.test.ts` - System info and network info endpoint tests
- `tests/api/vendors.test.ts` - Vendor registry listing and vendor ID verification
- `tests/api/pipeline.test.ts` - Presets, templates CRUD, preview error handling tests
- `tests/helpers/server.ts` - Random port allocation for parallel worker isolation
- `tests/helpers/api.ts` - Conditional Content-Type header (only with body)
- `tests/fixtures.ts` - Removed hardcoded port from seededServer fixture

## Decisions Made
- Random port allocation (10000-60000 range) for test workers to avoid EADDRINUSE collisions
- Content-Type: application/json only sent when request body is present (Fastify rejects bodiless requests with JSON content type)
- S&S Activewear vendor ID verified as 'ss' (matching adapter.vendorId in ss-activewear/adapter.ts)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed port collisions in parallel test workers**
- **Found during:** Task 1 (health/system/vendor tests)
- **Issue:** All 3 test file workers attempted port 3457, causing EADDRINUSE failures
- **Fix:** Changed startTestServer() to use random ephemeral port (10000-60000) by default
- **Files modified:** tests/helpers/server.ts, tests/fixtures.ts
- **Verification:** All 24 tests pass with parallel workers
- **Committed in:** 44ed12f (Task 1 commit)

**2. [Rule 3 - Blocking] Fixed API client sending Content-Type on bodyless requests**
- **Found during:** Task 2 (pipeline template DELETE tests)
- **Issue:** DELETE and GET requests sent Content-Type: application/json header without body, causing Fastify to reject with 400
- **Fix:** Only set Content-Type header when body is provided
- **Files modified:** tests/helpers/api.ts
- **Verification:** DELETE template CRUD and 404 tests pass
- **Committed in:** bf62dd2 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for test infrastructure correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed blocking issues above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- 24 API tests passing across 4 test files
- Test infrastructure stable with parallel worker support
- Ready for UI tests (plan 03) or additional API coverage

---
*Phase: 57-pi-e2e-test-automation*
*Completed: 2026-03-08*
