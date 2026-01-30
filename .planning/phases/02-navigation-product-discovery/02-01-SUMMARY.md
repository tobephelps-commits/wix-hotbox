---
phase: 02-navigation-product-discovery
plan: 01
subsystem: ui
tags: [wix-mcp, product-visibility, chat-widget, content-fixes, api-limitations]

# Dependency graph
requires:
  - phase: 01-site-audit-discovery
    provides: UX issues list, product catalog, site structure audit
provides:
  - Chat widget removed (no longer blocks product interaction)
  - LMNT broken products hidden from storefront
  - Big Barn Team Hat product description added
  - WIX REST API limitations documented for page content editing
affects: [02-navigation-product-discovery, 03-mobile-experience-optimization]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "WIX MCP API-first changes: product visibility, app management"
    - "Change log pattern for tracking live site API modifications"

key-files:
  created:
    - .planning/phases/02-navigation-product-discovery/02-01-changes.md
  modified: []

key-decisions:
  - "Uninstall Wix Inbox app to remove chat widget (preferred over repositioning)"
  - "Hide LMNT products (reversible) rather than delete"
  - "Document WIX Editor-required fixes as manual action items rather than skipping"

patterns-established:
  - "02-01-changes.md: Track all WIX MCP API changes with reversibility notes"
  - "API limitation documentation for future planning"

# Metrics
duration: 15min
completed: 2026-01-30
---

# Phase 2 Plan 01: Quick-Win Content Fixes Summary

**Disabled chat widget blocking product purchases, hidden broken LMNT product pages, added Big Barn Team Hat description, and documented 4 page-content fixes requiring WIX Editor (no REST API for page text/headings/footer)**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-01-30T15:10:00Z
- **Completed:** 2026-01-30T15:25:00Z
- **Tasks:** 2
- **API calls made:** 5 (1 uninstall, 2 product hide, 1 product query, 1 product update)

## Accomplishments
- Removed the #1 direct conversion blocker: "Let's Chat!" widget no longer intercepts clicks on product color swatches and size dropdowns
- Hidden both broken LMNT product pages (were returning 404) from storefront -- reversible via API
- Added product description to Big Barn Team Hat ($28 product that had zero content)
- Cataloged WIX REST API capabilities vs limitations, establishing a reference for what can and cannot be changed programmatically

## Task Commits

Each task was committed atomically:

1. **Task 1: Disable chat widget and hide LMNT products** - `a66ebd9` (feat)
2. **Task 2: Fix content errors across client pages** - `c7189b6` (feat)

## Files Created/Modified
- `.planning/phases/02-navigation-product-discovery/02-01-changes.md` - Detailed change log of all WIX MCP API calls with reversibility notes

## Decisions Made
- **Uninstalled Wix Inbox entirely** rather than repositioning the chat widget. The store already has email contact + support form, making the chat widget redundant. Uninstalling is the cleanest fix and completely eliminates the pointer-event interception problem.
- **Hidden LMNT products** (set `visible: false`) rather than deleting them. This is reversible -- the owner can restore them via the WIX Dashboard or API if they want to sell drinks again.
- **Documented manual fixes needed** rather than silently skipping them. Four content fixes (UNMH heading, Fall PreOrder typo, copyright year, external link) require the WIX visual editor. These are tracked in the changes log for the store owner to address.

## Deviations from Plan

### Limitations Encountered

**1. [Rule 3 - Blocking] WIX REST API cannot edit page content**
- **Found during:** Task 2 (content error fixes)
- **Issue:** 4 of 5 content fixes in Task 2 require editing page text, headings, and footer content. WIX does not expose REST APIs for these operations.
- **Fix:** Documented all required manual changes in `02-01-changes.md` with exact issue descriptions and locations
- **Files modified:** `.planning/phases/02-navigation-product-discovery/02-01-changes.md`
- **Verification:** Change log created with clear manual action items
- **Impact:** 4 quick-win issues deferred to manual WIX Editor action

**2. [Rule 3 - Blocking] WIX REST API cannot modify navigation menus**
- **Found during:** Task 1 (removing "Shop" nav link to /shop-5)
- **Issue:** The "Shop" link in the More dropdown still points to `/shop-5` (now empty). No API to remove navigation items.
- **Fix:** Documented as manual action; the page now shows 0 products since both LMNT products are hidden
- **Impact:** Minor -- the empty page is a dead end but not a 404

---

**Total deviations:** 2 blocking issues (both WIX API limitations)
**Impact on plan:** 3 of 7 quick-win issues fully resolved via API. 4 issues documented as requiring WIX Editor manual action. No scope creep -- limitations are inherent to the WIX platform.

## Issues Encountered
- WIX does not expose REST APIs for page content editing (headings, text, images, footer). This is a fundamental platform limitation that affects all future plans involving page content changes. Structural changes (navigation, page layout, footer) will always require either the WIX Editor or Wix Velo (custom code).
- Big Barn Team Hat still needs product images -- the API supports media upload but requires the actual image files which we don't have. Flagged for manual upload by store owner.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Chat widget removed -- product interaction now works correctly
- LMNT broken pages handled -- no more 404 dead ends from storefront navigation
- 4 manual WIX Editor fixes documented and ready for store owner action:
  1. UNMH page heading: Change "Fall Pre-Order" to UNMH branding
  2. Fall PreOrder typo: Fix "20256" to "2026", fix double period
  3. Copyright year: Update "(c)2022" to "(c)2026"
  4. CompanyCasuals link: Remove external link from Big Barn page
  5. "Shop" nav link: Remove from More dropdown (points to empty /shop-5)
  6. Big Barn Team Hat: Upload product image(s)
- Ready for 02-02-PLAN.md (filtering and search improvements)

---
*Phase: 02-navigation-product-discovery*
*Completed: 2026-01-30*
