---
phase: 07-pricing-variant-logic
plan: 02
subsystem: api
tags: [pricing, pipeline, mapper, variants, per-variant-pricing, upcharges]

# Dependency graph
requires:
  - phase: 07-01-pricing-rules-engine
    provides: PricingConfig type, calculateRetailPrice, calculateVariantPrice, getPresetConfig
  - phase: 06-product-creation-pipeline
    provides: pipeline types, mapper, create-product orchestrator
provides:
  - CuratedProduct.pricingConfig replaces basePrice for variable per-variant pricing
  - mapper.ts per-variant price calculation via calculateVariantPrice
  - CLI default preset (standard-tee) for quick product creation testing
affects: [07-03-preview-ui-pricing]

# Tech tracking
tech-stack:
  added: []
  patterns: [per-variant pricing via PricingConfig, size upcharge integration in mapper]

key-files:
  created: []
  modified: [scripts/pipeline/types.ts, scripts/pipeline/mapper.ts, scripts/pipeline/create-product.ts]

key-decisions:
  - "Replaced basePrice with pricingConfig directly (no backward-compat shim) since all consumers updated in same plan or next plan"
  - "Base product listing price uses calculateRetailPrice (standard size, no upcharges) as the WIX product-level price"
  - "CLI --price flag derives markup from wholesale cost with no rounding and no upcharges for exact price match"
  - "Standard-tee preset as CLI default provides 100% markup with nearest-99 rounding"

patterns-established:
  - "PricingConfig re-exported from types.ts as central import point for pipeline modules"
  - "Per-variant pricing: base retail + flat dollar size upcharge for extended sizes"

# Metrics
duration: 5min
completed: 2026-01-30
---

# Phase 7 Plan 02: Pipeline Integration Summary

**Per-variant pricing wired into pipeline: CuratedProduct uses PricingConfig, mapper calculates size-specific prices, CLI defaults to standard-tee preset**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-30
- **Completed:** 2026-01-30
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced uniform basePrice with PricingConfig in CuratedProduct type for per-variant pricing support
- mapper.ts buildVariantUpdates now calculates different prices for standard vs extended sizes using calculateVariantPrice
- mapper.ts buildCreateProductPayload uses calculateRetailPrice for the WIX product listing price (minimum variant price)
- CLI create-product defaults to standard-tee preset (100% markup, nearest-99 rounding, standard upcharges)
- TypeScript compiles cleanly across all pipeline files including preview-server.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Update CuratedProduct type for pricing config** - `40b44d6` (feat)
2. **Task 2: Wire pricing rules into mapper and product creation flow** - `3c081a7` (feat)

## Files Created/Modified
- `scripts/pipeline/types.ts` - CuratedProduct.pricingConfig replaces basePrice; PricingConfig imported and re-exported
- `scripts/pipeline/mapper.ts` - buildCreateProductPayload and buildVariantUpdates use pricing calculation functions
- `scripts/pipeline/create-product.ts` - CLI uses standard-tee preset, verification log shows markup percentage

## Decisions Made
- Replaced basePrice with pricingConfig directly (no backward-compat shim) -- all consumers are updated in this plan or the next plan (07-03)
- Base product listing price = calculateRetailPrice (standard size, no upcharges) -- this is what WIX shows as the product price
- CLI --price flag calculates markup percentage from wholesale cost with 'none' rounding and no upcharges for exact price match
- Standard-tee preset as CLI default -- most common product type, provides sensible 100% markup

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Pipeline fully supports per-variant pricing with size upcharges
- preview-server.ts compiles cleanly (PricingConfig change didn't break it since it reads from CuratedProduct)
- Ready for 07-03: Preview UI pricing controls and curation UX improvements
- No blockers or concerns

---
*Phase: 07-pricing-variant-logic*
*Completed: 2026-01-30*
