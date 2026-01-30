# UX Issues: Hot Box Clothing

**Audit Date:** 2026-01-29
**Plan:** 01-03 (UX Issues Identification)
**Method:** Playwright browser automation at three viewport sizes + WIX API data

---

## Mobile Concerns

*Feeds Phase 3: Mobile Experience Optimization*
*Tested at: 375x812 (iPhone), 768x1024 (iPad), 1440x900 (Desktop)*

### MC-1: No Mobile-Responsive Layout (CRITICAL)

**Severity:** Critical
**Target Phase:** 3
**Viewport:** 375x812, 768x1024

The site has NO mobile-responsive design. It serves the same fixed-width desktop layout at every viewport size. The site is built at ~980px width and does not adapt.

**Evidence:**
- **375px viewport:** Body scroll width = 981px. Horizontal scrollbar present. All content clips at right edge.
- **768px viewport:** Body scroll width = 981px. Still overflows tablet by 213px. Text and headings clip.
- **1440px viewport:** Body scroll width = 1440px. No overflow. The site was designed for this width only.
- Navigation bar is 950px wide and does not collapse or reflow at any breakpoint.
- "Hot Box Clothing" heading on homepage clips to "Hot Box" on tablet, invisible on mobile.
- Product page breadcrumbs clip off-screen on mobile ("Home / Big Barn Crossfit / BELLA+CANVAS..." runs off right edge).

**Impact:** 50% of traffic is mobile (per PROJECT.md). Every single mobile visitor sees a broken layout with horizontal scrolling, clipped text, and content hidden off-screen. This is the single biggest UX failure on the site.

### MC-2: No Hamburger Menu / Mobile Navigation (CRITICAL)

**Severity:** Critical
**Target Phase:** 3

The navigation does not collapse to a hamburger/mobile menu at any viewport size. The full 12-item horizontal nav bar renders at 950px width regardless of screen size.

**Evidence:**
- At 375px: Nav shows "Home Contact Support Store Policies Big Bar..." with remaining items scrolled off-screen to the right.
- There IS a button in the header (ref e37) with an image -- it appears to be a hamburger icon -- but it does not function as a mobile menu toggle. The full desktop nav renders below it.
- All nav tap targets are 30px tall (Apple recommends minimum 44px). Every single nav link fails minimum tap target size.
- "More" dropdown (Gift Card, Shop) is completely invisible on mobile -- scrolled off the right edge.

**Impact:** Mobile users cannot navigate the site. They can see Home, Contact, Support, Store Policies, and the beginning of "Big Bar..." but cannot reach Fun Shirts, Artistry in Motion, Fall PreOrder, UNMH, Board 30, Gift Card, or Shop.

### MC-3: Product Images Fail to Render on Mobile (CRITICAL)

**Severity:** Critical
**Target Phase:** 3

Category/collection pages show zero product images at mobile viewport. The lazy-loading mechanism fails completely.

**Evidence:**
- Big Barn page at 375px: Shows heading "Welcome to" (clipped) and massive white space below. Zero products visible.
- Product detail page at 375px: Shows breadcrumb (clipped) and white space, with product image barely appearing at the very bottom of the viewport.
- The issue is the fixed-width layout -- product grid elements are positioned for desktop coordinates and fall outside the visible area.

**Impact:** A mobile visitor landing on any category page sees an empty page with a heading. There is literally nothing to buy visible on the screen.

### MC-4: Add to Cart Button Not Visible Without Extensive Scrolling (HIGH)

**Severity:** High
**Target Phase:** 3

On product detail pages at mobile viewport, the "Add to Cart" button is positioned far below the fold.

**Evidence:**
- BELLA+CANVAS Triblend Tee: Add to Cart at y=1540 (viewport is 812px tall -- requires scrolling nearly 2 full screens)
- Lifting Chakras (Fun Shirt): Add to Cart at y=1477
- Product image takes 551px of vertical space, then options/variants push the buy button far down
- The 32-color swatch grid on Fun Shirts adds ~200px of vertical space before reaching Add to Cart

**Impact:** Mobile users must scroll past the product image, all option selectors, and variant controls to find the purchase button. Many will give up before finding it.

### MC-5: Color Swatches Below Minimum Tap Target Size (HIGH)

**Severity:** High
**Target Phase:** 3

Color selection radio buttons are 32x32px -- below the WCAG/Apple 44x44px minimum tap target size.

**Evidence:**
- All color swatches across all products: label size 32x32px
- On Fun Shirts with 32 color options, this creates a dense grid of undersized targets that is extremely difficult to use on mobile
- Touch accuracy on a 32px target on mobile requires precision that most users cannot achieve

**Impact:** Users will mis-tap colors, select wrong options, and experience frustration. On products with many color options, this is unusable.

### MC-6: "Let's Chat!" Widget Covers Content on Mobile (HIGH)

**Severity:** High
**Target Phase:** 3

The Wix Chat widget "Let's Chat!" button is positioned at the bottom center of the viewport on mobile, directly overlapping product content and interactive elements.

**Evidence:**
- Screenshot shows "Let's Chat!" button covering the bottom portion of every page at 375px
- On product pages, the chat widget overlaps color swatches, option controls, and the Add to Cart button area
- The widget cannot be dismissed -- it persists on every page
- Previously confirmed in Plan 01-02: chat widget intercepts clicks on color swatches

**Impact:** The chat widget actively prevents purchasing on mobile. Users cannot select product options without first trying to work around the chat button.

### MC-7: Tablet Experience Equally Broken (MEDIUM)

**Severity:** Medium
**Target Phase:** 3

At 768px (iPad), the site still overflows horizontally and clips content.

**Evidence:**
- Body scroll width: 981px (overflows by 213px)
- Navigation still renders as desktop horizontal bar, final items clipped
- Homepage heading "Hot Box Clothing" clips at right edge
- Product carousel shows products partially but text truncates

**Impact:** iPad users (a significant segment of tablet traffic) get a degraded experience with horizontal scrolling and clipped content.

### Cross-Viewport Summary

| Feature | Mobile (375px) | Tablet (768px) | Desktop (1440px) |
|---------|---------------|----------------|------------------|
| Horizontal scroll | YES (981px body) | YES (981px body) | No |
| Nav collapses | No | No | N/A (fits) |
| Nav tap targets | 30px (FAIL) | 30px (FAIL) | N/A |
| Products visible on category page | 0 | Partial | Full |
| Add to Cart visible | No (y=1540) | Partially | Yes |
| Chat widget blocking | Yes | Yes | Partially |
| Content clips | Severe | Moderate | None |

---

*Additional sections (Critical Issues, Navigation Issues, Checkout & Conversion, Client Experience, Performance & Technical, Accessibility, Quick Wins) will be added in Task 2.*
