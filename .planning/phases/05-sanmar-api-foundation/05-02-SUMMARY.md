---
phase: 05-sanmar-api-foundation
plan: 02
subsystem: api
tags: [sanmar, soap, node-soap, typescript, error-handling, retry, exponential-backoff]

# Dependency graph
requires:
  - phase: 05-01
    provides: TypeScript project setup, WSDL URL constants, type definitions, auth module
provides:
  - SOAP client factory with Map-based caching for all 7 SanMar WSDLs
  - Typed error classification for all known SanMar failure modes
  - Retry utility with exponential backoff for transient errors
affects: [05-03-product-media-services, 05-04-pricing-inventory-services, 05-05-public-api-export]

# Tech tracking
tech-stack:
  added: []
  patterns: [singleton client cache via Map, typed error classification enum, exponential backoff retry, SanMar response error detection via errorOccured field]

key-files:
  created:
    - scripts/sanmar/client.ts
    - scripts/sanmar/utils/error-handler.ts
    - scripts/sanmar/utils/retry.ts
  modified: []

key-decisions:
  - "Module-level Map singleton for SOAP client caching (not class-based)"
  - "8 error types covering all documented SanMar failure modes"
  - "Non-retryable user errors (invalid style/color/size/credentials) vs retryable transient errors (timeout/connection/SOAP fault)"
  - "Actionable suggestions embedded in error objects for developer guidance"

patterns-established:
  - "Pattern: utils/ subdirectory for cross-cutting concerns (error handling, retry)"
  - "Pattern: classifyError() -> isRetryable() -> withRetry() error handling pipeline"
  - "Pattern: convenience functions wrapping getClient() for each WSDL service"

# Metrics
duration: 6min
completed: 2026-01-30
---

# Phase 5 Plan 02: SOAP Client Factory and Error Handling Summary

**Map-cached SOAP client factory for 7 SanMar WSDLs, typed error classification with 8 failure modes, and exponential backoff retry utility**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-30T00:10:00Z
- **Completed:** 2026-01-30T00:16:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Built SOAP client factory with Map-based caching that prevents expensive WSDL re-parsing
- Created 7 convenience functions for all SanMar services (3 Standard + 4 PromoStandards)
- Implemented typed error classification covering all 8 known SanMar failure modes
- Added actionable suggestions for common errors (catalogColor confusion, port 8080, large dataset timeouts)
- Built retry utility with configurable exponential backoff that respects retryability

## Task Commits

Each task was committed atomically:

1. **Task 1: Build SOAP client factory with caching** - `181966b` (feat)
2. **Task 2: Build error handling and retry utilities** - `de54360` (feat)

## Files Created/Modified
- `scripts/sanmar/client.ts` - SOAP client factory with Map caching, 7 convenience functions, debug helpers (describe, lastRequest, lastResponse), cache clear, soap re-export
- `scripts/sanmar/utils/error-handler.ts` - SanMarErrorType enum (8 types), SanMarError class, classifyError(), isRetryable(), formatError()
- `scripts/sanmar/utils/retry.ts` - RetryOptions interface, DEFAULT_RETRY_OPTIONS, withRetry() with exponential backoff

## Decisions Made
- Used module-level `Map<string, soap.Client>` singleton (not class-based) for simplicity and tree-shaking
- Classified 8 error types from SanMar RESEARCH.md: INVALID_CREDENTIALS, INVALID_STYLE, INVALID_COLOR, INVALID_SIZE, TIMEOUT, CONNECTION_ERROR, SOAP_FAULT, UNKNOWN
- Made INVALID_CREDENTIALS/STYLE/COLOR/SIZE non-retryable (user errors won't self-resolve) while TIMEOUT/CONNECTION_ERROR/SOAP_FAULT are retryable (transient)
- Preserved SanMar's API typo "errorOccured" in error detection logic to match actual API responses
- Default retry config: 3 retries, 1s base delay, 10s max delay (backoff: 1s, 2s, 4s)
- Embedded actionable suggestions in error objects: catalogColor vs display color, port 8080 firewall, style-level queries for timeouts

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Client factory and error utilities ready for service modules (Plans 03, 04)
- Product, inventory, pricing, and media services can now use `getClient()` with `withRetry()`
- All code compiles with zero TypeScript errors
- No blockers for next plan

---
*Phase: 05-sanmar-api-foundation*
*Completed: 2026-01-30*
