# Plan 03-02 Summary: Mobile Product Page Audit & Documentation

**Phase:** 03 - Mobile Experience Optimization
**Plan:** 02 of 3
**Status:** Complete
**Duration:** 1 session
**Date:** 2026-01-30

---

## Objective

Audit mobile product browsing experience (collection galleries and product detail pages) via Playwright at mobile viewport, and document precise WIX Editor instructions for mobile product page optimization.

## Tasks Completed

### Task 1: Audit mobile product gallery and detail page experience
**Commit:** `de5c8f2` -- `docs(03-02): audit mobile product gallery and detail page experience`

**Part A: Collection Gallery Pages at 375x812**
- Audited all 6 collection pages: Big Barn, Fun Shirts, Artistry in Motion, Board 30, Fall PreOrder, UNMH
- ALL 6 pages have 606px horizontal overflow (body scroll width = 981px)
- Product cards are 980px wide -- each extends 605px beyond the visible mobile viewport
- Only 2-4 product images visible at any time (out of total catalog)
- Board 30 is the only page with Add to Cart buttons in the gallery (17 buttons)
- 5 of 6 pages have zero Add to Cart buttons -- customers must click into product detail to purchase
- Product images fail to render for items positioned off-screen (PT-1 lazy-loading confirmed)

**Part B: Product Detail Pages at 375x812**
- Audited 3 representative products:
  - Lifting Chakras (Fun Shirts, 32 color options): ATC at y=1477, x=350, swatches 32x32px
  - BELLA+CANVAS Triblend Tee (Big Barn, 4 colors): ATC at y=1540, x=350, swatches 32x32px
  - BELLA+CANVAS Muscle Tank (Board 30, 5 colors): ATC at y=1447, x=350, swatches 32x32px
- Add to Cart button at y=1447-1540px (nearly 2 full screen-heights below fold on 812px viewport)
- Add to Cart button at x=350px (only ~25px of the 280px button visible at 375px viewport)
- All color swatches 32x32px (27% below 44px WCAG 2.1 minimum)
- Product info column positioned at desktop x=350 coordinate -- almost entirely off-screen on mobile
- Product images render at 980px width, extending 605px beyond viewport

**Part C: Tablet Audit at 768x1024**
- Big Barn collection: 213px overflow, 13 visible images, 3-column grid at ~307px cards
- Lifting Chakras product: 213px overflow, options panel partially visible
- Collection galleries partially usable at tablet; product detail pages still overflow

### Task 2: Document mobile product page optimization instructions
**Commit:** `de5c8f2` (combined with Task 1 -- see Deviations)

Created MOBILE-PRODUCT-PAGES.md with 6 sections:
1. **Current State** -- Full audit measurements for all 6 collection pages, 3 product detail pages, and tablet spot-check
2. **Collection Gallery Optimization** -- WIX Editor instructions:
   - Switch to Mobile Editor View
   - Configure Product Gallery for mobile (1-2 column layout, full width)
   - Verify gallery card sizing
   - Enable Add to Cart on ALL collection galleries (matching Board 30)
3. **Product Detail Page Optimization** -- WIX Editor instructions:
   - Switch to mobile-optimized vertical stacked layout
   - Reposition Add to Cart button (within 1.5 viewport heights, full width, 44px+ height)
   - Increase color swatch tap targets to 44x44px minimum
   - Handle 32 color options (3 solutions: scrollable container, collapsible section, dropdown)
   - Optimize product image for mobile (full width, responsive)
   - Optimize size dropdown for mobile
4. **Image Loading Optimization** -- PT-1 root cause analysis and fix instructions:
   - Root cause: off-screen positioning prevents intersection observer from triggering
   - Primary fix: responsive layout repositions elements within viewport
   - Fallback: WIX Editor image loading settings
5. **Verification Checklist** -- 30+ checklist items across collection galleries, product detail pages, tablet, and cross-page consistency
6. **Expected Result** -- Before/after comparison with impact estimates for all 5 issues

## Issues Addressed

| Issue ID | Title | Resolution |
|----------|-------|------------|
| MC-2 | Product gallery empty on mobile | Documentation: mobile gallery 1-2 column layout |
| MC-3 | Add to Cart buried below fold | Documentation: reposition within 1.5 viewport heights, full width |
| MC-4 | Color swatches below tap target minimum | Documentation: increase to 44x44px minimum |
| MC-5 | 32 color options unusable on mobile | Documentation: 3 solutions (scrollable, collapsible, dropdown) |
| PT-1 | Lazy-loading failure | Documentation: root cause identified (off-screen positioning), fix via layout |

## Key Findings

1. **ALL product content is off-screen on mobile** -- Not just partially hidden; the entire product info column (name, price, options, Add to Cart) is positioned at x=350, placing it almost entirely outside the 375px viewport.
2. **Add to Cart is doubly inaccessible** -- Both vertically buried (y=1447-1540) AND horizontally off-screen (x=350). Only ~25px of the 280px button is visible.
3. **32-color swatches are densely packed** -- 280px container holds 32 radio buttons at 32x32px in ~8 rows of 4. At proper 44px size, this becomes 416px tall.
4. **Board 30 is the only functional mobile collection page** -- It is the only page with Add to Cart in the gallery, making it the reference for all other pages.
5. **Lazy-loading failure is a layout problem** -- PT-1 is not a WIX platform bug; it is caused by elements being positioned at desktop coordinates beyond the mobile viewport, preventing the intersection observer from firing.
6. **Side-by-side desktop layout does not reflow** -- The WIX product page template uses a two-column desktop layout that does not switch to stacked vertical on mobile.

## Output Files

| File | Description |
|------|-------------|
| `MOBILE-PRODUCT-PAGES.md` | Complete WIX Editor instructions for mobile product gallery and detail page optimization |

## Manual Fixes Added to Queue

From Plan 03-02:
21. Configure mobile product gallery layout (1-2 columns, full width) on all collection pages (see MOBILE-PRODUCT-PAGES.md)
22. Optimize product detail page for mobile (stacked layout, ATC repositioning, swatch sizing) (see MOBILE-PRODUCT-PAGES.md)
23. Verify product image lazy-loading works after mobile layout fixes (see MOBILE-PRODUCT-PAGES.md)

## Deviations

- **Combined commit:** Task 1 (audit) and Task 2 (documentation) were written to the same output file (MOBILE-PRODUCT-PAGES.md) in a single pass and committed together as `de5c8f2`. The plan specified separate atomic commits, but since both tasks output to the same file and the documentation sections rely on inline audit data, creating them separately would have required artificial splitting. The single commit contains all 429 lines covering both tasks' complete deliverables.

## Decisions

- **Decision:** Document product page mobile optimization as WIX Editor instructions (consistent with Phase 2 and Plan 03-01 pattern)
  - **Rationale:** WIX REST API confirmed to have zero mobile/responsive capabilities. All product page mobile optimization is exclusively a WIX Editor operation.
- **Decision:** Provide 3 alternative solutions for the 32-color option problem (scrollable, collapsible, dropdown)
  - **Rationale:** The available solution depends on which options the WIX Editor exposes for the product options widget. Store owner should try options in order of preference.

## Next Steps

- Plan 03-03: Mobile performance optimization (lazy loading, image rendering, page speed)
- **Recommendation:** Store owner should complete these documents in order:
  1. NAVIGATION-RESTRUCTURE.md (Phase 2) -- prerequisite for all mobile work
  2. GALLERY-STANDARDIZATION.md (Phase 2) -- prerequisite for mobile product pages
  3. MOBILE-NAV-OPTIMIZATION.md (Phase 3, Plan 03-01) -- mobile menu must be active first
  4. MOBILE-PRODUCT-PAGES.md (Phase 3, Plan 03-02) -- this plan's output
