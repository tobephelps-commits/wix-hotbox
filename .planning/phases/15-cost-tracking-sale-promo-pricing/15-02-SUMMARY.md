---
phase: 15-cost-tracking-sale-promo-pricing
plan: 02
subsystem: pricing
tags: [sale-pricing, promotions, flash-sale, discount, wix-api, cli]

# Dependency graph
requires:
  - phase: 15-cost-tracking-sale-promo-pricing
    provides: cost tracking types, cost-tracker.ts, pricing-rules.ts
provides:
  - SaleConfig and ActiveSalesFile types for sale lifecycle management
  - sale-pricing.ts module with create, apply, revert, cancel, check operations
  - CLI interface for all sale operations with intuitive discount format parsing
  - updateProduct() and updateProductPrice() WIX API functions
  - WIX coupon types (WixCouponScope, WixCouponCreate, WixCoupon) for V2 API
affects: [15-cost-tracking-sale-promo-pricing, 16-real-time-stock-sync]

# Tech tracking
tech-stack:
  added: []
  patterns: [sale lifecycle with original price snapshotting for revert, discount format parsing (percent/fixed/override)]

key-files:
  created:
    - scripts/pipeline/sale-pricing.ts
  modified:
    - scripts/pipeline/types.ts
    - scripts/pipeline/wix-api.ts
    - package.json

key-decisions:
  - "Sale data stored in data/active-sales.json following existing local-data gitignored pattern"
  - "Original prices snapshotted in sale record for reliable revert without external state"
  - "Discount format parsing: 20% (percent), $5 (fixed), @19.99 (override) for CLI ergonomics"
  - "checkAndProcessSales() as manual cron-like function, not automated scheduler"

patterns-established:
  - "Price snapshot before modification for guaranteed rollback"
  - "CLI discount format: percent/fixed/override with prefix syntax"

# Metrics
duration: 6min
completed: 2026-01-31
---

# Phase 15 Plan 02: Sale/Promo Pricing Engine Summary

**Sale pricing CLI with create/apply/revert/cancel/check commands, WIX product price update API, and original-price snapshotting for reliable sale revert**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-31T00:10:00Z
- **Completed:** 2026-01-31T00:16:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- SaleConfig and ActiveSalesFile types define the sale data model with discount types, product targeting, and status lifecycle
- WIX coupon types (WixCouponScope, WixCouponCreate, WixCoupon) added for future coupon management
- updateProduct() and updateProductPrice() added to wix-api.ts for direct product field updates
- sale-pricing.ts module handles full sale lifecycle: create, apply to WIX, revert to original prices, cancel, and check/process scheduled sales
- CLI supports intuitive discount formats: "20%" for percent off, "$5" for fixed amount off, "@19.99" for price override
- Original prices snapshotted before sale application, enabling reliable revert without external state
- Cost history integration records sale-start and sale-end events with margin recalculation

## Task Commits

Each task was committed atomically:

1. **Task 1: Define sale pricing types and WIX product update API** - `a2d3eb3` (feat)
2. **Task 2: Build sale pricing module with CLI commands** - `564947a` (feat)

## Files Created/Modified
- `scripts/pipeline/types.ts` - Added SaleConfig, ActiveSalesFile, WixCouponScope, WixCouponCreate, WixCoupon interfaces
- `scripts/pipeline/wix-api.ts` - Added updateProduct() generic PATCH and updateProductPrice() convenience wrapper
- `scripts/pipeline/sale-pricing.ts` - New module: sale CRUD, WIX price application/revert, scheduled processing, CLI interface
- `package.json` - Added "sale" npm script

## Decisions Made
- Sale data stored in data/active-sales.json following the same local-data gitignored pattern as collections.json and templates.json
- Original prices snapshotted directly in the SaleConfig record so revert requires no external state lookup
- Discount format parsing uses prefix/suffix syntax for CLI ergonomics: 20% (percent), $5 (fixed), @19.99 (override)
- checkAndProcessSales() designed as a manually-triggered function (not an automated scheduler) to keep the system simple and CLI-driven

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Sale pricing engine complete with full create/apply/revert lifecycle
- Ready for coupon code management in plan 15-03
- All existing pipeline behavior preserved (no breaking changes)

---
*Phase: 15-cost-tracking-sale-promo-pricing*
*Completed: 2026-01-31*
