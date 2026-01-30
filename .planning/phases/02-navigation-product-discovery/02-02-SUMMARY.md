---
phase: 02-navigation-product-discovery
plan: 02
subsystem: ui
tags: [wix-mcp, url-slugs, seo, accessibility, wcag, breadcrumbs, alt-text, heading-hierarchy, footer-navigation, api-limitations]

# Dependency graph
requires:
  - phase: 01-site-audit-discovery
    provides: UX issues list (QW-6, QW-8, AC-1, AC-2, AC-3), site structure, product catalog
  - phase: 02-navigation-product-discovery/plan-01
    provides: WIX REST API limitation patterns, change log format
provides:
  - URL slug change manual instructions for 9 pages (SEO-friendly paths)
  - Breadcrumb collection order verified correct at API level
  - Homepage accessibility audit (H1 missing, alt text gaps, footer deficiencies)
  - Comprehensive manual fix documentation for WIX Editor changes
affects: [02-navigation-product-discovery, 03-mobile-experience-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WIX REST API investigation pattern: search docs, attempt API call, document limitation"
    - "Playwright accessibility snapshot for verifying page structure (heading levels, alt text)"

key-files:
  created:
    - .planning/phases/02-navigation-product-discovery/URL-SLUG-CHANGES.md
    - .planning/phases/02-navigation-product-discovery/ACCESSIBILITY-FIXES.md
  modified: []

key-decisions:
  - "WIX REST API confirmed unable to manage page slugs, page content, heading levels, image alt text, or footer content"
  - "Breadcrumb collection order already correct at API level; display issue is WIX platform behavior based on navigation context"
  - "Document manual fixes with detailed instructions rather than blocking on API limitations"

patterns-established:
  - "Systematic API capability investigation before documenting manual workarounds"
  - "Detailed manual instruction documents with verification checklists"

# Metrics
duration: 20min
completed: 2026-01-30
---

# Phase 2 Plan 02: URL Slug & Accessibility Fixes Summary

**Investigated WIX REST API for URL slug editing, breadcrumb reordering, page content editing (H1/alt text/footer) -- confirmed all require WIX Editor; documented manual instructions for 9 slug changes, 4 accessibility fixes, and footer navigation improvements**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-01-30T15:30:00Z
- **Completed:** 2026-01-30T15:50:00Z
- **Tasks:** 2
- **API calls made:** 4 (3 collection product queries, 1 collection list)

## Accomplishments
- Confirmed WIX REST API does not support page slug management (searched 3 different API doc queries, found member/service slugs only)
- Documented complete slug change mapping for 9 pages with step-by-step WIX Editor instructions and verification checklist
- Verified breadcrumb collection assignments are already correct at API level (Big Barn is first collectionId for multi-collection products)
- Audited homepage accessibility via Playwright: confirmed no H1 (all H2), logo alt text uses filename, 25/28 images missing alt text, footer has zero navigation links
- Created comprehensive ACCESSIBILITY-FIXES.md with 4 fix categories, recommended values, and manual instructions

## Task Commits

Each task was committed atomically:

1. **Task 1: Document URL slug changes** - `dc48a0d` (docs)
2. **Task 2: Document accessibility and content fixes** - `a09f2e3` (docs)

**Plan metadata:** committed with summary (docs: complete plan)

## Files Created/Modified
- `.planning/phases/02-navigation-product-discovery/URL-SLUG-CHANGES.md` - Manual instructions for renaming 9 WIX default slugs to descriptive SEO-friendly paths
- `.planning/phases/02-navigation-product-discovery/ACCESSIBILITY-FIXES.md` - Manual instructions for breadcrumb verification, image alt text, homepage H1, and footer navigation

## Decisions Made
- **WIX REST API cannot edit page slugs:** Searched WIX REST docs for "page URL slug update rename", "site pages list manage page properties", and "URL redirect 301 page SEO slug". Found member slugs and service slugs but zero page slug management endpoints. Confirmed limitation.
- **Breadcrumb order already correct in API:** Queried Big Barn, PreOrder, and LovelaceUNM collection products. Big Barn multi-collection products list Big Barn as first collectionId. PreOrder and LovelaceUNM products are only in their respective collection + All Products. The breadcrumb display issue (QW-6) is a WIX platform behavior based on navigation context, not collection order.
- **Homepage content editing not available via API:** WIX REST API has no endpoints for editing page text, heading levels, image alt text, or footer content. Documented all fixes with exact current values, recommended values, and WIX Editor steps.

## Deviations from Plan

### Limitations Encountered

**1. [Rule 3 - Blocking] WIX REST API cannot manage page URL slugs**
- **Found during:** Task 1 (URL slug renaming)
- **Issue:** No REST API endpoint exists for page slug editing. Searched WIX REST docs exhaustively.
- **Fix:** Created URL-SLUG-CHANGES.md with complete slug mapping table and WIX Editor instructions
- **Files modified:** `.planning/phases/02-navigation-product-discovery/URL-SLUG-CHANGES.md`
- **Verification:** Document includes verification checklist for all 9 slug changes
- **Committed in:** `dc48a0d`

**2. [Rule 3 - Blocking] WIX REST API cannot edit page content (headings, images, footer)**
- **Found during:** Task 2 (accessibility fixes)
- **Issue:** All 4 fix categories (breadcrumbs, alt text, H1, footer) require page content editing that WIX REST API does not support
- **Fix:** Created ACCESSIBILITY-FIXES.md with comprehensive documentation for all fixes
- **Files modified:** `.planning/phases/02-navigation-product-discovery/ACCESSIBILITY-FIXES.md`
- **Verification:** Used Playwright browser to verify current page state before documenting fixes
- **Committed in:** `a09f2e3`

---

**Total deviations:** 2 blocking issues (both WIX API limitations, same root cause as Plan 02-01)
**Impact on plan:** All planned changes documented as manual WIX Editor instructions. API investigation confirmed breadcrumb order is already correct. No scope creep.

## Issues Encountered
- WIX REST API limitation pattern continues from Plan 02-01: page-level editing (slugs, content, headings, images, footer) has no API support. This is now a well-established constraint for the project.
- Browser navigation to WIX dashboard requires user login credentials -- cannot automate dashboard operations via Playwright either.

## User Setup Required

**Manual WIX Editor changes required.** See:
- `URL-SLUG-CHANGES.md` for 9 page slug updates
- `ACCESSIBILITY-FIXES.md` for breadcrumb verification, alt text, H1, and footer changes

These are store-owner actions that must be performed in the WIX Editor.

## Next Phase Readiness
- URL slug changes documented and ready for manual execution (should be done before Plan 02-03 to avoid referencing old slugs)
- Accessibility fixes documented with exact current values and recommended replacements
- Footer navigation improvement documented (should reference new slugs after URL changes applied)
- WIX REST API limitations fully cataloged: product/collection management works, page content does not
- Ready for 02-03-PLAN.md (product page improvements and cross-selling)

---
*Phase: 02-navigation-product-discovery*
*Completed: 2026-01-30*
