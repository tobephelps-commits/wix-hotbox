---
phase: 57-pi-e2e-test-automation
plan: 07
subsystem: testing
tags: [iterative-runner, flaky-detection, pi-deployment, test-automation]

# Dependency graph
requires:
  - phase: 57-01
    provides: Playwright config, test fixtures, server harness
  - phase: 57-02 through 57-06
    provides: Full API and UI test suites (159 tests)
provides:
  - Iterative multi-pass test runner with flaky test detection
  - JSON report output for CI consumption
  - Pi deployment test script with environment detection
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [multi-pass test execution, flaky test detection, environment-aware test scripts]

key-files:
  created:
    - tests/iterative-runner.ts
    - scripts/run-tests.sh
  modified:
    - package.json

key-decisions:
  - "Flaky tests are warnings (exit 0), stable failures are errors (exit 1)"
  - "Pi detection via uname -m aarch64 and /proc/device-tree/model"
  - "Pi tests default to UI project only against production port 3456"
  - "Dev tests default to all projects against test port 3457"

patterns-established:
  - "execSync with captured stdout for Playwright JSON reporter parsing"
  - "Environment-aware test script with systemd service management"

# Metrics
duration: 5min
completed: 2026-03-08
---

# Phase 57 Plan 07: Iterative Multi-Pass Test Runner & Pi Deployment Script

**Iterative test runner with flaky detection and Pi-aware deployment script**

## Performance

- **Duration:** 5 min
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 1

## Accomplishments
- Built iterative-runner.ts that executes the full test suite N times and categorizes each test as stable-pass, stable-fail, flaky, or skipped
- Console summary report with counts and detailed flaky/failure listings
- JSON report written to test-results/iterative-report.json for CI consumption
- Pi deployment script with aarch64/device-tree detection, systemd integration, and DISPLAY setup
- Added 4 npm scripts: test:iterative, test:iterative:5, test:api:iterative, test:ui:iterative

## Task Commits

1. **Task 1: Create iterative multi-pass test runner** - `5d8bb24` (feat)
2. **Task 2: Create Pi deployment test script** - `63b1970` (feat)

## Files Created/Modified
- `tests/iterative-runner.ts` - Multi-pass runner with CLI args, JSON parsing, flaky detection, and reporting
- `scripts/run-tests.sh` - Environment-aware test script for Pi and dev machines
- `package.json` - Added iterative test npm scripts

## Verification
- `npm run test:iterative -- --passes 2` completed successfully: 159 tests, 2 passes, all stable-pass, JSON report generated
- `bash -n scripts/run-tests.sh` syntax check passed
- `bash scripts/run-tests.sh --help` displays usage information

## Decisions Made
- Flaky tests exit 0 (warnings only); stable failures exit 1 -- flaky detection is informational, not blocking
- Pi environment detected via architecture check (aarch64) with device-tree fallback
- On Pi, defaults to UI project against production port 3456 with DISPLAY=:0 for headed browser tests
- On dev machines, defaults to all projects against test server port 3457

## Deviations from Plan
None. Both tasks implemented as specified.

## Issues Encountered
None.

---
*Phase: 57-pi-e2e-test-automation*
*Completed: 2026-03-08*
