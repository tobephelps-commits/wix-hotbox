---
phase: 02-navigation-product-discovery
plan: 03
subsystem: ui
tags: [wix-mcp, navigation, shop-all, product-discovery, information-architecture, api-limitations]

# Dependency graph
requires:
  - phase: 01-site-audit-discovery
    provides: UX issues list (CR-5, NV-1, NV-4), site structure, navigation hierarchy
  - phase: 02-navigation-product-discovery/plan-01
    provides: LMNT products hidden, chat widget removed, WIX API limitation patterns
  - phase: 02-navigation-product-discovery/plan-02
    provides: URL slug change docs, accessibility fix docs, API investigation patterns
provides:
  - Shop All page creation manual instructions (repurpose /shop-5 with All Products collection)
  - Navigation restructure manual instructions (customer-centric hierarchy with dropdown grouping)
  - Complete before/after navigation specification
  - Comprehensive verification checklists for both changes
affects: [03-mobile-experience-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WIX Editor-only operations documented as step-by-step manual instructions"
    - "Navigation restructure pattern: group client pages under dropdown, promote product discovery"

key-files:
  created:
    - .planning/phases/02-navigation-product-discovery/SHOP-ALL-PAGE.md
    - .planning/phases/02-navigation-product-discovery/NAVIGATION-RESTRUCTURE.md
  modified: []

key-decisions:
  - "WIX REST API confirmed unable to create site pages, modify navigation menus, or configure product gallery widgets"
  - "Recommended repurposing /shop-5 (empty LMNT page) as Shop All page rather than creating new page"
  - "Recommended 'Our Teams' as dropdown label for grouped client pages"
  - "Designed 6-item nav bar: Home | Shop All | Fun Shirts | Our Teams dropdown | Gift Card | Contact"

patterns-established:
  - "Manual WIX Editor documentation with prerequisites, step-by-step instructions, and verification checklists"
  - "Navigation hierarchy pattern: product discovery first, client pages grouped, utilities in footer"

# Metrics
duration: 15min
completed: 2026-01-30
---

# Phase 2 Plan 03: Shop All Page & Navigation Restructure Summary

**Investigated WIX REST API for page creation and navigation management -- confirmed both require WIX Editor; documented step-by-step instructions for creating Shop All page (repurpose /shop-5 with All Products collection) and restructuring navigation to customer-centric hierarchy (Shop All + Fun Shirts + Our Teams dropdown + Gift Card + Contact)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-01-30T16:00:00Z
- **Completed:** 2026-01-30T16:15:00Z
- **Tasks:** 2
- **API calls made:** 3 (1 collection query, 1 product query, 1 browser verification)

## Accomplishments
- Confirmed WIX REST API cannot create site pages, manage navigation menus, or configure product gallery widget settings
- Verified /shop-5 page is empty and has a Product Gallery widget (ideal candidate for repurposing as Shop All)
- Confirmed "All Products" collection exists and contains 103 visible products
- Verified current navigation structure via Playwright browser inspection (11 main items + 2 in More dropdown)
- Created comprehensive Shop All page creation instructions with two approaches (repurpose vs new page)
- Designed customer-centric navigation hierarchy reducing 13 nav items to 6 (with 5 grouped in dropdown)
- Provided dropdown label options with recommendation ("Our Teams")

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Shop All page documentation** - `bfdfa1d` (docs)
2. **Task 2: Document navigation restructure** - `dd9256d` (docs)

## Files Created/Modified
- `.planning/phases/02-navigation-product-discovery/SHOP-ALL-PAGE.md` - Manual instructions for creating Shop All page displaying all 103 products
- `.planning/phases/02-navigation-product-discovery/NAVIGATION-RESTRUCTURE.md` - Manual instructions for restructuring navigation to customer-centric hierarchy

## Decisions Made
- **Repurpose /shop-5 over creating new page:** The empty /shop-5 page already has a Product Gallery widget and just needs its linked collection changed from LMNT to All Products. This is simpler and faster than creating a new page from scratch.
- **"Our Teams" as dropdown label:** Friendly, short, and fits the CrossFit/fitness brand identity. Better than "Client Pages" (too internal) or "Custom Teams" (implies custom-only purchasing).
- **6-item nav bar design:** Home | Shop All | Fun Shirts | Our Teams (dropdown) | Gift Card | Contact. This prioritizes product discovery, groups 5 client names into 1 dropdown, and promotes Gift Card from the buried "More" dropdown.
- **Support and Store Policies to footer only:** These utility pages don't belong in prime nav real estate. They'll still be accessible via direct URL and footer links.

## Deviations from Plan

### Limitations Encountered

**1. [Rule 3 - Blocking] WIX REST API cannot create site pages or configure page widgets**
- **Found during:** Task 1 (Shop All page creation)
- **Issue:** No REST API endpoint exists for creating new site pages, adding widgets to pages, or configuring which collection a product gallery displays. "Add Store Pages to Site" only adds cart/checkout pages.
- **Fix:** Created SHOP-ALL-PAGE.md with step-by-step WIX Editor instructions and two approaches (repurpose /shop-5 or create new)
- **Files modified:** `.planning/phases/02-navigation-product-discovery/SHOP-ALL-PAGE.md`
- **Verification:** Confirmed /shop-5 page exists and is empty via Playwright; confirmed All Products collection exists via API
- **Committed in:** `bfdfa1d`

**2. [Rule 3 - Blocking] WIX REST API cannot manage site navigation menus**
- **Found during:** Task 2 (navigation restructure)
- **Issue:** Searched WIX REST API docs for navigation/menu management; found only restaurant menu APIs. No endpoint for site navigation structure, menu item ordering, or dropdown creation.
- **Fix:** Created NAVIGATION-RESTRUCTURE.md with step-by-step WIX Editor instructions for complete menu reorganization
- **Files modified:** `.planning/phases/02-navigation-product-discovery/NAVIGATION-RESTRUCTURE.md`
- **Verification:** Verified current navigation structure via Playwright browser snapshot (confirmed 11 items + More dropdown with Gift Card and Shop)
- **Committed in:** `dd9256d`

---

**Total deviations:** 2 blocking issues (both WIX API limitations, same root cause as Plans 02-01 and 02-02)
**Impact on plan:** Both tasks documented as manual WIX Editor instructions instead of automated execution. This is the expected pattern for this project -- WIX REST API handles product/collection data, not page/navigation structure.

## Issues Encountered
- WIX REST API limitation pattern continues from Plans 02-01 and 02-02: all page-level operations (creation, content editing, widget configuration, navigation menus) have no API support. This is now a fully established constraint for the project.
- Both documentation files include comprehensive verification checklists to ensure the store owner can confirm correct execution in the WIX Editor.

## User Setup Required

**Manual WIX Editor changes required.** See:
- `SHOP-ALL-PAGE.md` for creating the Shop All page (should be done first)
- `NAVIGATION-RESTRUCTURE.md` for restructuring the navigation hierarchy (should be done second, after Shop All page exists)

These are store-owner actions that must be performed in the WIX Editor. The navigation restructure depends on the Shop All page existing first.

## Next Step
- Phase 2 has 2 more plans remaining: 02-04 (search & filtering) and 02-05 (cross-selling & gallery standardization)
- WIX Editor-required changes documented so far:
  - Plan 02-01: 6 manual fixes (page headings, typos, copyright, external link, nav link, product image)
  - Plan 02-02: 9 URL slug changes + 4 accessibility fixes
  - Plan 02-03: Shop All page creation + navigation restructure
- API-executable changes already applied: chat widget removed, LMNT products hidden, product description added
- Ready for 02-04-PLAN.md (search functionality and product filtering/sorting)
- **Recommendation:** Store owner should execute Shop All page and navigation restructure in WIX Editor before Plans 02-04 and 02-05, as those plans may reference the new navigation structure

---
*Phase: 02-navigation-product-discovery*
*Completed: 2026-01-30*
