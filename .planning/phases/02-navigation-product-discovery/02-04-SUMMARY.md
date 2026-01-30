---
phase: 02-navigation-product-discovery
plan: 04
subsystem: ui
tags: [wix-mcp, site-search, product-filters, product-sorting, product-discovery, api-limitations]

# Dependency graph
requires:
  - phase: 01-site-audit-discovery
    provides: UX issues list (NV-2, NV-3), site structure, product catalog
  - phase: 02-navigation-product-discovery/plan-01
    provides: WIX REST API limitation patterns, chat widget removed
  - phase: 02-navigation-product-discovery/plan-03
    provides: Shop All page documentation (prerequisite for filter setup)
provides:
  - Site search setup manual instructions (Wix Site Search app installation + configuration)
  - Product filtering and sorting manual instructions for 7 collection pages
  - Verified WIX REST API cannot install Site Search app or configure gallery widget settings
affects: [03-mobile-experience-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WIX Site Search API exists for programmatic queries but app installation requires WIX Editor"
    - "Product gallery widget settings (filters, sorting, display) are WIX Editor-only operations"

key-files:
  created:
    - .planning/phases/02-navigation-product-discovery/SITE-SEARCH-SETUP.md
    - .planning/phases/02-navigation-product-discovery/PRODUCT-FILTERS-SORTING.md
  modified: []

key-decisions:
  - "WIX REST API confirmed unable to install Site Search app (appDefId not in documented API list)"
  - "WIX REST API confirmed unable to configure product gallery widget settings (filters, sorting, display)"
  - "Category filter on Shop All page, Price + Product Options filters on all client pages"
  - "All 4 sort options enabled: Price (low-high), Price (high-low), Newest, Name (A-Z)"

patterns-established:
  - "Site search and product filtering/sorting are WIX Editor-only features requiring manual documentation"
  - "Consistent filter/sort configuration pattern: Shop All gets Category filter, client pages do not"

# Metrics
duration: 12min
completed: 2026-01-30
---

# Phase 2 Plan 04: Search & Product Filtering/Sorting Summary

**Investigated WIX REST API for Site Search app installation and product gallery filter/sort configuration -- confirmed both require WIX Editor; documented step-by-step instructions for installing Wix Site Search app with search bar configuration, and enabling price/category/product-option filters plus 4 sort options across 7 collection pages**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-01-30T17:00:00Z
- **Completed:** 2026-01-30T17:12:00Z
- **Tasks:** 2
- **API calls made:** 4 (1 installed apps list, 2 Site Search API tests, 1 REST docs search)

## Accomplishments
- Confirmed WIX Site Search app cannot be installed via REST API (appDefId not in documented app installation API, though the Site Search Query API exists for programmatic use)
- Tested Site Search API on the live site -- returned 0 results for all queries, confirming the app is not installed/indexed
- Documented complete Wix Site Search installation and configuration instructions with 8 verification test cases
- Documented product filtering and sorting setup for all 7 collection pages with per-page filter recommendations
- Identified Fun Shirts as special case where Product Options filter is especially valuable (32 color options per product)

## Task Commits

Each task was committed atomically:

1. **Task 1: Document site search setup instructions** - `84ab50e` (docs)
2. **Task 2: Document product filtering and sorting setup** - `8c2e99d` (docs)

## Files Created/Modified
- `.planning/phases/02-navigation-product-discovery/SITE-SEARCH-SETUP.md` - Manual instructions for installing Wix Site Search app, configuring search bar, and customizing search results
- `.planning/phases/02-navigation-product-discovery/PRODUCT-FILTERS-SORTING.md` - Manual instructions for enabling price/category/product-option filters and 4 sort options on 7 collection pages

## Decisions Made
- **WIX Site Search app requires WIX Editor installation:** The Site Search app's appDefId is not in the documented Wix App Installation API list. The REST API has a Site Search Query endpoint (for programmatic search), but the app itself and its search bar widget must be installed via the WIX Editor's "Add Apps" panel.
- **Site Search API returns 0 results:** Tested the Site Search API (`POST /site-search/v1/search`) with product queries -- returned empty results for all queries including empty expression. This confirms the search index is not active, meaning the app is not installed.
- **Category filter on Shop All only:** Shop All page gets Category + Price + Product Options filters. Client collection pages get Price + Product Options only (Category filter unnecessary on single-collection pages).
- **All 4 sort options enabled everywhere:** Price (low-high), Price (high-low), Newest, Name (A-Z) enabled on all pages for maximum flexibility.
- **Fun Shirts Product Options filter is high priority:** With 14 products each having 32 Gildan 8000 color options, the Product Options filter at the gallery level helps customers narrow choices before entering product pages.

## Deviations from Plan

### Limitations Encountered

**1. [Rule 3 - Blocking] WIX REST API cannot install Site Search app**
- **Found during:** Task 1 (site search functionality)
- **Issue:** Wix Site Search app's appDefId is not in the documented Wix Apps Created by Wix list (checked both REST and Velo docs). The App Installation API cannot install it. The Site Search API endpoint exists for querying but requires the app to be installed via the editor first.
- **Fix:** Created SITE-SEARCH-SETUP.md with step-by-step WIX Editor instructions for installing and configuring the search app
- **Files modified:** `.planning/phases/02-navigation-product-discovery/SITE-SEARCH-SETUP.md`
- **Verification:** Confirmed via API that Site Search returns 0 results (app not yet installed)
- **Committed in:** `84ab50e`

**2. [Rule 3 - Blocking] WIX REST API cannot configure product gallery widget settings**
- **Found during:** Task 2 (product filtering and sorting)
- **Issue:** Product gallery filter/sort controls are widget-level settings configured in the WIX Editor. The REST API has Catalog V3 filtering for programmatic queries but no endpoint for enabling/disabling frontend filter controls on gallery widgets.
- **Fix:** Created PRODUCT-FILTERS-SORTING.md with step-by-step WIX Editor instructions for all 7 collection pages
- **Files modified:** `.planning/phases/02-navigation-product-discovery/PRODUCT-FILTERS-SORTING.md`
- **Verification:** Documented verification checklist for each page
- **Committed in:** `8c2e99d`

---

**Total deviations:** 2 blocking issues (both WIX API limitations, consistent with Plans 02-01 through 02-03)
**Impact on plan:** Both tasks documented as manual WIX Editor instructions. This is the established pattern for this project -- WIX REST API handles product/collection data, not frontend widget configuration or app installation for UI components.

## Issues Encountered
- WIX REST API limitation pattern continues from all previous Phase 2 plans: frontend-facing features (search bar, gallery filters, sorting controls) have no API support. This is now a thoroughly established constraint.
- The Wix Site Search Query API does exist and works, but it requires the app to be installed first via the editor. Once the store owner installs the app, the API could potentially be used for custom search integrations in the future.

## User Setup Required

**Manual WIX Editor changes required.** See:
- `SITE-SEARCH-SETUP.md` for installing Wix Site Search app and configuring the search bar (should be done first)
- `PRODUCT-FILTERS-SORTING.md` for enabling product filters and sorting on 7 collection pages (should be done after Shop All page is created per SHOP-ALL-PAGE.md)

**Execution order for all pending manual changes:**
1. Shop All page creation (SHOP-ALL-PAGE.md) -- prerequisite for filter setup
2. Navigation restructure (NAVIGATION-RESTRUCTURE.md)
3. Site Search installation (SITE-SEARCH-SETUP.md)
4. Product filters and sorting (PRODUCT-FILTERS-SORTING.md) -- depends on Shop All page existing
5. URL slug changes (URL-SLUG-CHANGES.md)
6. Accessibility fixes (ACCESSIBILITY-FIXES.md)
7. Content fixes from Plan 02-01 (02-01-changes.md)

## Next Step
- Phase 2 has 1 more plan remaining: 02-05 (cross-selling & gallery standardization)
- 14 manual WIX Editor actions now documented across Plans 02-01 through 02-04
- Ready for 02-05-PLAN.md (related products / cross-selling and gallery standardization)

---
*Phase: 02-navigation-product-discovery*
*Completed: 2026-01-30*
