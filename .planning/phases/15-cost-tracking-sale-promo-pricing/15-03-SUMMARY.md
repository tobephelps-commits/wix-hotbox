---
phase: 15-cost-tracking-sale-promo-pricing
plan: 03
subsystem: api
tags: [wix-coupons, coupon-management, cli, wix-api-v2, promo-codes]

# Dependency graph
requires:
  - phase: 15-01
    provides: cost tracking foundation types in types.ts
  - phase: 12
    provides: getCollectionByName for collection-scoped coupons
provides:
  - WIX Coupons V2 API integration (create, get, list, delete, update)
  - CLI for coupon management (percentOff, moneyOff, freeShipping)
  - Store-wide, collection-scoped, and product-specific coupon support
affects: [phase-15-sale-pricing, phase-20-integration-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Local auth helpers duplicated from wix-api.ts (avoids modifying internal functions)"
    - "CLI arg parser with --flag value and --flag=value support"
    - "Table formatter for coupon listing display"

key-files:
  created:
    - scripts/pipeline/wix-coupons.ts
  modified:
    - scripts/pipeline/types.ts
    - package.json

key-decisions:
  - "Coupon types added to types.ts were shared with plan 15-02 (parallel execution)"
  - "Local auth helpers instead of exporting from wix-api.ts to avoid breaking changes"
  - "PascalCase normalization for WIX API type field responses"

patterns-established:
  - "Coupon CLI pattern: create/list/delete subcommands with --flag options"

# Metrics
duration: 5min
completed: 2026-01-31
---

# Phase 15 Plan 03: WIX Coupon Management Summary

**WIX Coupons V2 API integration with CLI for creating, listing, and deleting store-level promo codes**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-31T00:20:00Z
- **Completed:** 2026-01-31T00:25:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Full CRUD operations for WIX Coupons V2 API (create, get, list, delete, update)
- CLI supporting three coupon types: percentOff, moneyOff, freeShipping
- Scope support: store-wide, collection-scoped (by name), product-specific
- Usage limits, per-customer limits, and expiration date support
- Formatted table output verified against live WIX API (9 existing coupons displayed correctly)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add WIX coupon types** - `a2d3eb3` (feat - shared with 15-02 parallel execution)
2. **Task 2: Build WIX coupon management module with CLI** - `067cf1f` (feat)

## Files Created/Modified
- `scripts/pipeline/wix-coupons.ts` - Coupon CRUD API functions and CLI interface
- `scripts/pipeline/types.ts` - WixCouponScope, WixCouponCreate, WixCoupon interfaces (committed in 15-02)
- `package.json` - Added "coupons" npm script

## Decisions Made
- Local auth helpers duplicated from wix-api.ts rather than exporting private functions -- avoids modifying wix-api.ts internals
- PascalCase normalization added for WIX API type field (API returns "PercentOff" not "percentOff")
- Invalid date handling for coupons without expiration dates

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed WIX API PascalCase type display**
- **Found during:** Task 2 (list command testing)
- **Issue:** WIX Coupons V2 API returns type field in PascalCase ("PercentOff") not camelCase ("percentOff"), causing formatDiscount to fall through to default
- **Fix:** Case-insensitive comparison in formatDiscount and normalized type display in table
- **Files modified:** scripts/pipeline/wix-coupons.ts
- **Verification:** list command correctly shows "20% off", "$20.00 off" etc.
- **Committed in:** 067cf1f

**2. [Rule 1 - Bug] Fixed undefined numberOfUsages display**
- **Found during:** Task 2 (list command testing)
- **Issue:** Some coupons have undefined numberOfUsages, showing "undefined" in table
- **Fix:** Added nullish coalescing: `c.numberOfUsages ?? 0`
- **Files modified:** scripts/pipeline/wix-coupons.ts
- **Verification:** All usage counts display as numbers
- **Committed in:** 067cf1f

**3. [Rule 1 - Bug] Fixed Invalid Date display for missing expiration**
- **Found during:** Task 2 (list command testing)
- **Issue:** Coupons without expirationTime showed "Invalid Date" instead of dash
- **Fix:** Added `isNaN(d.getTime())` check in formatDate
- **Files modified:** scripts/pipeline/wix-coupons.ts
- **Verification:** Missing dates display as "—"
- **Committed in:** 067cf1f

---

**Total deviations:** 3 auto-fixed (3 bugs discovered during live API testing)
**Impact on plan:** All fixes necessary for correct display output. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Uses existing WIX_API_KEY from .env.

## Next Phase Readiness
- Coupon management fully operational via CLI
- Ready for 15-04-PLAN.md (if exists) or phase completion

---
*Phase: 15-cost-tracking-sale-promo-pricing*
*Completed: 2026-01-31*
