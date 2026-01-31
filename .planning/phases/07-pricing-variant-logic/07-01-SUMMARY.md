---
phase: 07-pricing-variant-logic
plan: 01
subsystem: api
tags: [pricing, markup, variants, sizes, upcharges, business-logic]

# Dependency graph
requires:
  - phase: 06-product-creation-pipeline
    provides: pipeline types, mapper, uniform pricing model
provides:
  - PricingConfig type for configurable markup/rounding/upcharges
  - calculateRetailPrice, calculateVariantPrice, calculateMargin functions
  - 7 category pricing presets (standard-tee through custom)
  - Size upcharge constants for extended sizes (2XL-6XL)
affects: [07-02-pipeline-integration, 07-03-preview-ui-pricing]

# Tech tracking
tech-stack:
  added: []
  patterns: [pure-function pricing engine, preset-based configuration]

key-files:
  created: [scripts/pipeline/pricing-rules.ts]
  modified: []

key-decisions:
  - "Pure business logic module with no SanMar API dependencies"
  - "Size upcharges applied AFTER rounding as flat dollar add-ons"
  - "7 category presets with category-specific markup percentages (70-120%)"
  - "nearest-99 rounding as default across all presets"

patterns-established:
  - "Pricing preset pattern: named configs with fallback to 'custom'"
  - "Size tier split: STANDARD_SIZES (no upcharge) vs UPCHARGE_SIZES (flat dollar add-on)"

# Metrics
duration: 5min
completed: 2026-01-30
---

# Phase 7 Plan 01: Pricing Rules Engine Summary

**Pure-function pricing engine with configurable markup, 3 rounding modes, size-based upcharges, and 7 category presets for common apparel types**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-30
- **Completed:** 2026-01-30
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Built self-contained pricing rules module with zero external dependencies
- Three calculation functions: retail price, variant price (with size upcharge), and margin
- Three rounding modes: nearest-99, nearest-dollar, none (2 decimal places)
- Seven category presets covering standard tees through outerwear and headwear
- Size upcharge system with per-category amounts (outerwear charges more than tees for extended sizes)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pricing rules types and calculation functions** - `413f9ad` (feat)
2. **Task 2: Add default pricing presets by product category** - `b911433` (feat)

## Files Created/Modified
- `scripts/pipeline/pricing-rules.ts` - Pricing rules engine with types, calculation functions, size constants, and category presets

## Decisions Made
- Pure business logic with no imports from SanMar services -- pricing rules can be used by mapper, preview server, and future UI independently
- Size upcharges are flat dollar amounts applied AFTER rounding, not percentages -- this matches industry practice where extended size surcharges are fixed amounts
- All presets use 'nearest-99' rounding -- common retail pricing pattern (X.99)
- Markup percentages tuned per category: basic tees 100%, premium tees 120%, hoodies 80%, polos 90%, outerwear 70%, headwear 100%
- Outerwear has higher extended-size upcharges ($4-$10) vs standard tees ($2-$6) reflecting wholesale cost differences

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Pricing rules module ready for integration into mapper and pipeline (07-02)
- All types and functions exported for use by preview UI (07-03)
- No blockers or concerns

---
*Phase: 07-pricing-variant-logic*
*Completed: 2026-01-30*
