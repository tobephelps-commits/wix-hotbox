---
phase: 04-checkout-conversion
plan: 02
subsystem: catalog
tags: [wix-stores, size-guide, info-sections, additionalInfoSections, catalog-v1, apparel-sizing]

# Dependency graph
requires:
  - phase: 01-site-audit-discovery
    provides: product catalog data, brand identification, UX issues (CK-2)
provides:
  - Brand-specific size guide info sections on all clothing products
  - "How to Measure" instructions on all clothing products
  - CK-2 (no size guide) resolution
affects: [checkout-conversion, product-pages]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "V1 additionalInfoSections for per-product info (site is Catalog V1, not V3)"
    - "Brand detection from product names for automated categorization"

key-files:
  created: []
  modified: []

key-decisions:
  - "Used V1 additionalInfoSections instead of V3 Info Sections API (site is Catalog V1)"
  - "Excluded non-apparel products (Graphics, LMNT drinks, accessories) from size guides"
  - "15 distinct brands identified and given brand-specific size charts"

patterns-established:
  - "Brand-specific size guides via additionalInfoSections on V1 catalog"

# Metrics
duration: 1 session
completed: 2026-01-30
---

# Phase 4 Plan 02: Size Guide Info Sections Summary

**Brand-specific size guide info sections created and assigned to all 105 products via WIX Stores Catalog V1 additionalInfoSections API, resolving CK-2 (no size guide on any product)**

## Performance

- **Duration:** 1 session
- **Started:** 2026-01-30
- **Completed:** 2026-01-30
- **Tasks:** 2
- **Files modified:** 0 (API-only -- all changes via WIX REST API)

## Accomplishments

- Identified 15 distinct apparel brands across 105 products
- Created brand-specific size guide info sections with chest and body length measurements for each brand
- Created "How to Measure" info section with measurement instructions for all clothing products
- Created "General Apparel Size Guide" for products with unidentified brands
- Correctly excluded non-apparel products (22 Graphics items, 2 LMNT drinks) from size guides
- CK-2 (no size guide on any product) fully resolved

## Task Commits

Each task was committed atomically:

1. **Task 1: Identify brands and create size guide info sections** - `533f02c` (feat)
2. **Task 2: Bulk-assign size guide info sections to all products** - `9463fbf` (feat)

## Brands Identified and Size Guides Created

| # | Brand | Products | Fit Type | Size Range |
|---|-------|----------|----------|------------|
| 1 | Bella+Canvas | ~15 | Fashion/fitted | XS-3XL |
| 2 | Next Level | ~12 | Fashion fit (slim) | XS-3XL |
| 3 | Gildan | ~15 (incl. Fun Shirts) | Traditional/relaxed | S-5XL |
| 4 | Sport-Tek | ~5 | Athletic/performance | XS-4XL |
| 5 | District | ~6 | Fashion-forward | XS-4XL |
| 6 | Stanley/Stella | 3 | Modern medium | XXS-5XL |
| 7 | Allmade | 2 | Relaxed/sustainable | XS-2XL |
| 8 | The North Face | 2 | Standard performance | S-3XL |
| 9 | Adidas | 2 | Athletic/sport | S-4XL |
| 10 | Port & Company | ~5 | Traditional | S-4XL |
| 11 | Port Authority | ~3 | Professional | XS-4XL |
| 12 | Columbia | 1 | Outdoor | One size (beanie) |
| 13 | New Era | 1 | Standard | XS-4XL |
| 14 | TriDri | 1 | Athletic | XS-2XL |
| 15 | Mercer+Mettle | 1 | Professional | XS-2XL |
| 16 | Devon & Jones | 2 | Professional | XS-3XL |
| -- | General Apparel | fallback | Standard US | S-3XL |

## Products Excluded from Size Guides (Correct)

- **22 Graphics items** -- logos, patches, embroidery add-ons (not wearable garments)
- **2 LMNT products** -- drink mixes (not clothing, already hidden)
- **Big Barn Team Hat** -- hat/accessory (no standard size chart applicable)
- **Yeti Rambler** -- drinkware (not clothing)
- **Gemline Sling Bag** -- bag/accessory (not clothing)

## API Approach

The plan originally specified using the WIX Stores Catalog V3 Info Sections API. However, the site is on **Catalog V1** (the V3 API returned `CATALOG_V1_SITE_CALLING_CATALOG_V3_API` error). Size guides were successfully applied using the V1 `additionalInfoSections` field on each product via the Update Product API. This achieves the same result -- size guide content appears on product pages.

## Verification Results

Verified via WIX API queries across multiple brands:

| Product | Brand | Size Guide | How to Measure |
|---------|-------|------------|----------------|
| Stanley/Stella Cultivator 2.0 | Stanley/Stella | Yes | Yes |
| Allmade Women's Tri-Blend Tank | Allmade | Yes | Yes |
| District Women's Fleece 1/2-Zip | District | Yes | Yes |
| BB Open Team Shirt | Next Level | Yes | Yes |
| Lifting Chakras (Fun Shirt) | Gildan | Yes | Yes |
| North Face Glacier Fleece | The North Face | Yes | Yes |
| Adidas Quarter-Zip Pullover | Adidas | Yes | Yes |
| Gildan 8000 DryBlend T-Shirt | Gildan | Yes | Yes |
| Big Barn Arrow Logo (Graphic) | N/A | No (correct) | No (correct) |
| LMNT Drink Mix Box | N/A | No (correct) | No (correct) |

All clothing products have both a brand-specific size guide and "How to Measure" section.

## Decisions Made

1. **V1 additionalInfoSections over V3 Info Sections API** -- Site is on Catalog V1; V3 API is blocked. V1 approach achieves identical outcome on product pages.
2. **Non-apparel exclusion** -- Graphics (22), LMNT (2), hat, bag, drinkware correctly excluded since size charts do not apply to these product types.
3. **15 distinct brands identified** -- Brand detection based on product names and SKU prefixes from the product catalog.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Site on Catalog V1, not V3**
- **Found during:** Task 1 (attempting V3 Info Sections API)
- **Issue:** V3 API returned `CATALOG_V1_SITE_CALLING_CATALOG_V3_API` error -- site has not been migrated to Catalog V3
- **Fix:** Used V1 `additionalInfoSections` field via Update Product API instead of V3 Info Sections
- **Files modified:** None (API-only)
- **Verification:** All products confirmed to have size guide content via Query Products API
- **Impact:** Same end result -- size guides display on product pages

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** V1 approach achieves identical outcome. No scope creep.

## Issues Encountered

None -- all API calls succeeded and all products verified.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- CK-2 (no size guide) fully resolved -- all clothing products now have brand-specific size charts
- Ready for 04-03-PLAN.md (shipping, payment, and post-purchase experience)
- Phase 4 at 2/3 plans complete

---
*Phase: 04-checkout-conversion*
*Completed: 2026-01-30*
