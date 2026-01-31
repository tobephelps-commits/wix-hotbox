---
phase: 06-product-creation-pipeline
plan: 01
subsystem: api
tags: [wix, sanmar, mapper, product-creation, typescript, variants, media, pricing]

# Dependency graph
requires:
  - phase: 05-05
    provides: Public API barrel export with all SanMar service functions
  - phase: 05-03
    provides: Product data service and media content service with image grouping
provides:
  - WIX V1 product types (WixCreateProductRequest, WixProductOption, WixMediaItem, WixVariantUpdate)
  - Pipeline intermediate types (CuratedProduct, CuratedColor, ProductPreview, ColorPreview, PricingPreview)
  - 4 mapper functions transforming SanMar data to WIX V1 API payloads
  - buildProductPreview for curation UI with colors, sizes, images, stock, pricing
  - buildCreateProductPayload for WIX product creation
  - buildMediaPayload for WIX media assignment (front images per color)
  - buildVariantUpdates for WIX variant pricing/SKU/weight/visibility
affects: [06-02-product-creation-flow, 06-03-image-handling, 07-pricing-variant-logic]

# Tech tracking
tech-stack:
  added: []
  patterns: [displayColor vs catalogColor separation in WIX-facing data, literal type enforcement for draft-first workflow, 15-image WIX media limit with priority ordering]

key-files:
  created:
    - scripts/pipeline/mapper.ts
  modified:
    - scripts/pipeline/types.ts

key-decisions:
  - "WIX V1 types use literal false/true for visible/manageVariants to enforce draft-first at type level"
  - "displayColor ALWAYS used in WIX-facing data; catalogColor ONLY for SanMar API queries"
  - "Media payload prioritizes 1 front image per color then fills with primary/high-res up to 15 total"
  - "Variant SKU format: {style}-{catalogColor}-{size} for traceability back to SanMar"
  - "Uniform pricing across all variants in Phase 6 (Phase 7 adds variable pricing)"

patterns-established:
  - "Pattern: pipeline/types.ts as the WIX API type definitions shared across all pipeline modules"
  - "Pattern: mapper functions take SanMar types in, return WIX types out, with CuratedProduct as the curation bridge"
  - "Pattern: MEDIA_CLASS_TYPE constants (1004 swatch, 1007 front, 1006 primary, 2001 high) for image classification"

# Metrics
duration: 8min
completed: 2026-01-30
---

# Phase 6 Plan 01: SanMar-to-WIX Data Mapping Summary

**WIX V1 product types with literal-type draft enforcement, pipeline curation types, and 4 mapper functions transforming SanMar product/pricing/media/inventory data into WIX Create Product, Add Media, and Update Variants API payloads**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-30T23:50:00Z
- **Completed:** 2026-01-30T23:58:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Defined 11 TypeScript interfaces covering WIX V1 product creation API and pipeline curation workflow
- Built 4 mapper functions: buildProductPreview, buildCreateProductPayload, buildMediaPayload, buildVariantUpdates
- Enforced draft-first workflow at the type level with `visible: false` and `manageVariants: true` literal types
- Color/size option mapping correctly uses displayColor for WIX-facing data and catalogColor for SanMar queries
- Media payload implements priority-based image selection (front per color first, then primary/high-res, max 15)
- Variant updates compute stock visibility from SanMar inventory data per color+size combination

## Task Commits

Each task was committed atomically:

1. **Task 1: Define WIX V1 product types and pipeline intermediate types** - `2c1d531` (feat, from prior agent run)
2. **Task 2: Build SanMar-to-WIX mapper functions** - `9859094` (feat)

**Plan metadata:** (next commit)

## Files Created/Modified
- `scripts/pipeline/types.ts` - 11 interfaces: WixCreateProductRequest, WixProductOption, WixChoice, WixInfoSection, WixMediaItem, WixVariantUpdate, CuratedProduct, CuratedColor, ProductPreview, ColorPreview, PricingPreview
- `scripts/pipeline/mapper.ts` - 4 mapper functions: buildProductPreview, buildCreateProductPayload, buildMediaPayload, buildVariantUpdates

## Decisions Made
- WIX V1 types use literal `false` for visible and literal `true` for manageVariants -- prevents accidental publishing at compile time
- displayColor used everywhere in WIX-facing data; catalogColor is ONLY for SanMar API queries
- Media payload uses priority ordering: 1 front image per selected color (assigned to Color choice), then primary/high-res images as general images, capped at 15 total per WIX limit
- Variant SKU format: `{style}-{catalogColor}-{size}` enables tracing any WIX variant back to its SanMar source
- Product weight set to 0 at base product level; actual weight set per-variant from SanMar pieceWeight
- additionalInfoSections left as empty array -- size guides were already added in Phase 4 (plan 04-02)
- Phase 6 uses uniform pricing across all variants; Phase 7 will add variable pricing logic

## Deviations from Plan

### Note on Prior Agent Work

Task 1 types.ts was already created and committed by a prior agent run (commit `2c1d531`, labeled as `06-02`). The types matched the plan specification exactly (11 interfaces with correct field types and literal enforcement). No changes were needed.

---

**Total deviations:** 0 -- plan executed as written (types pre-existed from prior run)
**Impact on plan:** None. All deliverables are complete and correct.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- WIX V1 types and mapper functions ready for Plan 06-02 (product creation flow)
- buildCreateProductPayload, buildMediaPayload, and buildVariantUpdates ready to feed into WIX API calls
- buildProductPreview ready for curation UI in Plan 06-03 or later
- All code compiles with zero TypeScript errors
- 4 more plans remain in Phase 6

---
*Phase: 06-product-creation-pipeline*
*Completed: 2026-01-30*
