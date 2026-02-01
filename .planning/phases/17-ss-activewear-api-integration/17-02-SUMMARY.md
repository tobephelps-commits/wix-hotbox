---
phase: 17-ss-activewear-api-integration
plan: 02
subsystem: api
tags: [ss-activewear, rest-api, fetch, rate-limiting, http-basic-auth]

# Dependency graph
requires:
  - phase: 17-01
    provides: Unified vendor types (VendorId, UnifiedProduct, UnifiedPricing, etc.) and VendorAdapter interface
provides:
  - S&S Activewear REST API client with auth, rate limiting, error handling
  - Product, inventory, and style query service functions
  - S&S-specific type definitions matching API V2 response format
  - Image URL resolver for S&S relative paths
affects: [17-04-ss-adapter, 17-05-pipeline-refactor, 17-06-monitor-refactor]

# Tech tracking
tech-stack:
  added: []
  patterns: [rate-limited-rest-client, sliding-window-throttle, http-basic-auth, vendor-specific-module-structure]

key-files:
  created:
    - scripts/ss-activewear/types/product.ts
    - scripts/ss-activewear/types/inventory.ts
    - scripts/ss-activewear/types/common.ts
    - scripts/ss-activewear/types/index.ts
    - scripts/ss-activewear/constants.ts
    - scripts/ss-activewear/auth.ts
    - scripts/ss-activewear/utils/error-handler.ts
    - scripts/ss-activewear/utils/rate-limiter.ts
    - scripts/ss-activewear/client.ts
    - scripts/ss-activewear/services/product.ts
    - scripts/ss-activewear/services/inventory.ts
    - scripts/ss-activewear/services/styles.ts
    - scripts/ss-activewear/index.ts
  modified: []

key-decisions:
  - "Zero new dependencies — uses Node.js built-in fetch for REST/JSON"
  - "Sliding window rate limiter as shared singleton across all S&S usage"
  - "404 returns empty array (not exceptional for query-style endpoints)"
  - "Image URL resolver replaces _fm suffix with requested size (_fl/_fs)"

patterns-established:
  - "REST client pattern: rate-limit acquire -> fetch -> error classify -> retry"
  - "Service functions use ssGetWithRetry internally, hide client from consumers"
  - "Barrel export mirrors SanMar module structure (services public, client internal)"

# Metrics
duration: 8min
completed: 2026-02-01
---

# Phase 17 Plan 02: S&S Activewear API Client Core Summary

**REST client for S&S Activewear V2 API with rate-limited fetch, Basic auth, error classification, and product/inventory/styles service functions**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-01T00:00:00Z
- **Completed:** 2026-02-01T00:08:00Z
- **Tasks:** 2
- **Files created:** 13

## Accomplishments
- Complete S&S Activewear API client module mirroring SanMar module structure
- Type definitions matching all S&S V2 REST API response formats (products, inventory, styles, brands, categories)
- Rate-limited REST client with sliding window throttle (60 req/min) and exponential backoff retry
- Product, inventory, and style service functions with clean public API via barrel export
- Error handler classifying HTTP 401/404/429/500+ and connection errors into typed SSError
- Image URL resolver handling S&S relative paths with size suffix replacement (_fl/_fm/_fs)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create S&S types, constants, auth, and error handling** - `5e631e5` (feat)
2. **Task 2: Create S&S REST client and service functions** - `e5f738c` (feat)

## Files Created/Modified
- `scripts/ss-activewear/types/product.ts` - SSProduct, SSWarehouse interfaces matching /v2/products/ response
- `scripts/ss-activewear/types/inventory.ts` - SSInventoryItem, SSInventoryWarehouse for lighter inventory endpoint
- `scripts/ss-activewear/types/common.ts` - SSStyle, SSCategory, SSBrand, SSErrorResponse shared types
- `scripts/ss-activewear/types/index.ts` - Barrel re-export of all S&S types
- `scripts/ss-activewear/constants.ts` - Base URLs, rate limits, 12 warehouse definitions
- `scripts/ss-activewear/auth.ts` - Credential loading, Basic auth header builder, credential validation
- `scripts/ss-activewear/utils/error-handler.ts` - SSErrorType enum, SSError class, HTTP status classification, retry logic
- `scripts/ss-activewear/utils/rate-limiter.ts` - RateLimiter class with sliding window, shared singleton
- `scripts/ss-activewear/client.ts` - ssGet/ssGetWithRetry REST functions with rate limiting and error handling
- `scripts/ss-activewear/services/product.ts` - Style/SKU/brand queries, color/size extraction, image URL resolver
- `scripts/ss-activewear/services/inventory.ts` - Style inventory, batch SKU queries, stock helpers
- `scripts/ss-activewear/services/styles.ts` - Style metadata lookup, keyword search
- `scripts/ss-activewear/index.ts` - Public barrel export (services, types, constants, errors)

## Decisions Made
- Zero new runtime dependencies — S&S REST API uses built-in Node.js fetch with Basic auth
- Sliding window rate limiter shared as singleton across all S&S API calls (pipeline, monitoring, sync)
- 404 responses return empty array rather than throwing (not found is not exceptional for queries)
- Image URL resolver replaces `_fm` (medium) suffix with requested size for proper resolution control

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**External services require manual configuration.** See [17-USER-SETUP.md](./17-USER-SETUP.md) for:
- SS_ACCOUNT_NUMBER and SS_API_KEY environment variables
- S&S Activewear account setup instructions
- Verification commands

## Issues Encountered
None

## Next Phase Readiness
- S&S client module complete and importable
- Ready for Plan 17-03 (SanMar vendor adapter) and Plan 17-04 (S&S vendor adapter)
- Both Wave 2 plans can wrap these service functions in VendorAdapter implementations

---
*Phase: 17-ss-activewear-api-integration*
*Completed: 2026-02-01*
