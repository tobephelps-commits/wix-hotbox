# UX Issues: Hot Box Clothing

**Audit Date:** 2026-01-29
**Plan:** 01-03 (UX Issues Identification)
**Method:** Playwright browser automation at three viewport sizes + WIX API data
**Sources:** Plans 01-01 (Site Structure), 01-02 (Product Catalog), 01-03 (UX Testing)

---

## 1. Critical Issues

*Conversion killers that must be fixed first -- these are actively losing sales.*

### CR-1: No Mobile-Responsive Layout (CRITICAL)

**Severity:** Critical | **Target Phase:** 3
**Viewport:** 375x812, 768x1024

The site has ZERO mobile-responsive design. It serves a fixed ~980px desktop layout at every viewport. There are no media queries, no breakpoints, no mobile adaptations.

**Evidence:**
- 375px: Body scroll width = 981px. Forced horizontal scrolling on every page.
- 768px: Body scroll width = 981px. Still overflows tablet by 213px.
- 1440px: No overflow. The site was designed for widescreen desktop only.
- Navigation bar is 950px fixed width. Does not collapse or reflow.
- "Hot Box Clothing" heading clips on tablet, invisible on mobile.

**Impact:** 50% of traffic is mobile. Every mobile visitor sees a broken layout. This alone could be driving 80%+ of mobile bounce rate.

### CR-2: Chat Widget Blocks Product Interaction (CRITICAL)

**Severity:** Critical | **Target Phase:** 2 (Quick fix)

The "Let's Chat!" Wix Chat widget intercepts click events on product option selectors, preventing customers from choosing colors, sizes, and completing purchases.

**Evidence:**
- Playwright click on "Denim Triblend" color radio: TIMEOUT -- `<div class="sZLWK8K" data-hook="popover-element">` intercepts pointer events.
- After removing chat widget via JS, another overlay element `<div class="s__9sWe1b" aria-busy="false">` still intercepts.
- On mobile, the chat button covers the bottom-center of every page, overlapping product controls.
- Confirmed in Plan 01-02: users must close or scroll past the chat widget to select any variant option.

**Impact:** Customers literally cannot purchase products without fighting the chat widget. This is the most direct conversion blocker on the site.

### CR-3: Zero Inventory Tracking (CRITICAL)

**Severity:** Critical | **Target Phase:** 8-9
**Source:** Plan 01-02 API data

ALL 105 products have `trackInventory: false` and `manageVariants: false`. The store accepts orders for any product in any size/color without knowing if SanMar blanks are available.

**Evidence:**
- 105/105 products: `trackInventory: false`, `inStock: true`
- No per-variant stock tracking (cannot mark individual sizes/colors as out-of-stock)
- No connection to SanMar inventory data

**Impact:** Orders placed for out-of-stock blanks lead to fulfillment delays, customer service issues, refund requests, and reputation damage.

### CR-4: Both LMNT Product Pages Return 404 (CRITICAL)

**Severity:** Critical | **Target Phase:** 2 (Quick fix)
**Source:** Plan 01-02

Products exist in API but storefront pages are broken.

**Evidence:**
- `/product-page/element-electrolyte-drink-mix-sample-pack` -- 404
- `/product-page/lmnt-zero-sugar-electrolytes-30-count-citrus-salt` -- 404
- "Continue Shopping" link on 404 page points to `/blank` (wrong)

**Impact:** Any visitor reaching these products sees a dead end with no recovery path.

### CR-5: No "Shop All" Page (CRITICAL)

**Severity:** Critical | **Target Phase:** 2
**Source:** Plan 01-01

There is no page displaying all 105 products. Every shop page is siloed by client. A first-time visitor has no path to browse the full catalog.

**Evidence:**
- The "All Products" system collection exists in WIX but has no associated page.
- The only link labeled "Shop" (in the "More" dropdown) shows 2 LMNT drink products.
- Navigation lists 5 client businesses and 1 product category. A new visitor does not know which to click.

**Impact:** A new visitor who wants to browse the store cannot. There is no general shopping experience.

---

## 2. Navigation Issues

*Feeds Phase 2: Navigation & Product Discovery*

### NV-1: Client-Centric Navigation Confuses New Visitors (HIGH)

**Severity:** High | **Target Phase:** 2
**Source:** Plan 01-01

The nav bar lists business client names (Big Barn Crossfit, Artistry in Motion, UNMH, Board 30) that mean nothing to new visitors. The navigation reads like an internal directory, not a shopping experience.

**Evidence:**
- Nav items: Home, Contact, Support, Store Policies, Big Barn Crossfit, Fun Shirts, Artistry in Motion, Fall PreOrder, UNMH, Board 30, More > (Gift Card, Shop)
- 4 of 10 visible nav items are client business names
- "Store Policies" and "Support" occupy prime nav real estate alongside product categories

### NV-2: Zero Search Functionality (HIGH)

**Severity:** High | **Target Phase:** 2

There is no search input anywhere on the site -- no search icon, no search bar, no search page.

**Evidence:**
- Playwright JS check: `searchInputs: 0, searchButtons: 0, hasSearch: false`
- No search element found on homepage, category pages, or product pages
- 105 products across 10 collections with no way to search by keyword

**Impact:** A customer looking for a specific item (e.g., "hoodie" or "tank top") has no way to find it except scrolling through every page.

### NV-3: No Product Filtering or Sorting (HIGH)

**Severity:** High | **Target Phase:** 2
**Source:** Plans 01-01, 01-02

Zero category pages have any filtering or sorting capability.

**Evidence:**
- All 7 product listing pages tested: zero filter controls, zero sort options
- Big Barn has 42 items (20 clothing + 22 graphics) with no way to filter by garment type, price, size, or color

### NV-4: "Shop" Link Is Misleading and Buried (MEDIUM)

**Severity:** Medium | **Target Phase:** 2
**Source:** Plan 01-01

The only link labeled "Shop" is hidden in the "More" dropdown and leads to 2 LMNT drink products -- not a general shop page.

### NV-5: URL Slugs Are WIX Defaults (MEDIUM)

**Severity:** Medium | **Target Phase:** 2
**Source:** Plan 01-01

All page URLs use meaningless WIX default slugs: `/shop`, `/shop-1`, `/shop-2`, `/shop-3`, `/shop-4`, `/shop-5`, `/blank-2`, `/blank-3`, `/blank-4`.

**Impact:** Hurts SEO. Looks unprofessional. Users cannot understand page content from the URL.

### NV-6: No Related Products or Cross-Selling (MEDIUM)

**Severity:** Medium | **Target Phase:** 2
**Source:** Plan 01-02

Every product page ends at social sharing icons. Zero "You might also like" or "Customers also bought" sections.

**Impact:** Missed upsell/cross-sell opportunities on every product view. No way to discover related items without going back to navigation.

---

## 3. Mobile Concerns

*Feeds Phase 3: Mobile Experience Optimization*
*Tested at: 375x812 (iPhone), 768x1024 (iPad), 1440x900 (Desktop)*

### MC-1: No Hamburger Menu / Mobile Navigation (CRITICAL)

**Severity:** Critical | **Target Phase:** 3

The navigation does not collapse at any viewport size. The full 12-item horizontal nav bar renders at 950px width on mobile.

**Evidence:**
- At 375px: Nav shows "Home Contact Support Store Policies Big Bar..." -- remaining items off-screen.
- A hamburger icon button exists in the header but does not function as a mobile menu toggle.
- All nav tap targets: 30px height (below 44px minimum).
- "More" dropdown (Gift Card, Shop) completely invisible on mobile.

**Impact:** Mobile users cannot access the majority of navigation items.

### MC-2: Product Gallery Empty on Mobile (CRITICAL)

**Severity:** Critical | **Target Phase:** 3

Category/collection pages show zero product images at mobile viewport due to fixed-width layout.

**Evidence:**
- Big Barn at 375px: Heading "Welcome to" (clipped) + massive white space. Zero products visible.
- Product images are positioned at desktop coordinates beyond the visible area.

### MC-3: Add to Cart Buried Below Fold on Mobile (HIGH)

**Severity:** High | **Target Phase:** 3

The "Add to Cart" button is at y=1477-1540 on mobile (viewport is 812px).

**Evidence:**
- BELLA+CANVAS Triblend Tee: Add to Cart at y=1540
- Lifting Chakras Fun Shirt: Add to Cart at y=1477
- Requires scrolling nearly 2 full screens to reach the buy button.

### MC-4: Color Swatches Below Tap Target Minimum (HIGH)

**Severity:** High | **Target Phase:** 3

Color radio buttons are 32x32px -- below 44x44px WCAG minimum.

### MC-5: 32 Color Options Unusable on Mobile (HIGH)

**Severity:** High | **Target Phase:** 3
**Source:** Plan 01-02

Fun Shirts display all 32 Gildan 8000 colors as radio buttons. At 32x32px each on a 375px screen, this creates 5-6 rows of tiny, tightly-packed color swatches that are nearly impossible to select accurately.

### MC-6: Tablet Experience Also Broken (MEDIUM)

**Severity:** Medium | **Target Phase:** 3

At 768px (iPad), the site still overflows horizontally by 213px.

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

## 4. Checkout & Conversion Issues

*Feeds Phase 4: Checkout & Conversion Optimization*

### CK-1: Zero Checkout Policies Configured (HIGH)

**Severity:** High | **Target Phase:** 4

No checkout policies are displayed at checkout -- no terms and conditions, no privacy policy, no return policy, no shipping policy.

**Evidence (WIX API `checkoutSettings`):**
- `termsAndConditions.visible: false, content: ""`
- `privacyPolicy.visible: false, content: ""`
- `returnPolicy.visible: false, content: ""`
- `digitalItemPolicy.visible: false, content: ""`
- `contactUs.visible: false, content: ""`
- `customPolicy.visible: false, content: ""`
- Policy agreement checkbox IS visible but auto-checked with no policies to agree to.
- Created: 2024-01-17, last updated: 2024-12-21

**Impact:** No trust signals at checkout. Customers cannot review return/shipping policies before purchasing. Violates e-commerce best practices and may violate legal requirements in some jurisdictions.

### CK-2: No Size Guide on Any Product (HIGH)

**Severity:** High | **Target Phase:** 4
**Source:** Plan 01-02

A clothing store with multiple brands and fits has zero size chart information. Customers must guess their size across Bella+Canvas, Next Level, Gildan, North Face, Adidas, and others -- each with different sizing.

**Impact:** Size uncertainty is a top reason for cart abandonment in apparel e-commerce. Also increases return rate.

### CK-3: Variant Selection Does Not Update Product Image (MEDIUM)

**Severity:** Medium | **Target Phase:** 4
**Source:** Plan 01-02

Selecting a different color does not change the product photo. Customers cannot preview their color choice.

### CK-4: Only Board 30 Has Direct "Add to Cart" on Gallery (MEDIUM)

**Severity:** Medium | **Target Phase:** 4
**Source:** Plan 01-02

Only Board 30's page shows "Add to Cart" buttons on the product gallery. All other pages require clicking into the product detail page first -- adding an extra step to purchase.

### CK-5: Sezzle (Buy Now Pay Later) Loads Inconsistently (LOW)

**Severity:** Low | **Target Phase:** 4
**Source:** Plan 01-02

The Sezzle payment option ("4 interest-free payments of $X.XX") appears on some product pages but not others. It loads asynchronously and may not render before the customer scrolls past.

---

## 5. Client Experience Issues

*Multi-client landing page problems from all plans*

### CL-1: UNMH Page Has Wrong Heading (HIGH)

**Severity:** High | **Target Phase:** 2 (Quick fix)
**Source:** Plans 01-01, 01-02

The UNMH page (`/shop-3`) displays "Fall Pre-Order" as its heading with a wildflower image. But the nav says "UNMH" and the products are professional workplace clothing (North Face, Adidas, polos).

**Impact:** Complete identity crisis. A visitor clicking "UNMH" in the nav sees "Fall Pre-Order" content with no explanation.

### CL-2: Fall PreOrder Typo -- "March 1st 20256" (MEDIUM)

**Severity:** Medium | **Target Phase:** 2 (Quick fix)
**Source:** Plans 01-01, 01-02, 01-03

The Fall PreOrder page description reads "You can pre-order until March 1st 20256 Delivery will be periodic based on number of orders.."

**Evidence:** Confirmed still present on 2026-01-29 via Playwright. Also has double period at end and seasonal name mismatch (nav says "Fall PreOrder", page says "Winter 2026 Pre-order").

### CL-3: Inconsistent Product Gallery Layouts (MEDIUM)

**Severity:** Medium | **Target Phase:** 2
**Source:** Plan 01-02

Each client page uses a different gallery component with different layouts, different hover behaviors, and different cart integration.

### CL-4: Big Barn Team Hat -- $28 Product with Zero Content (HIGH)

**Severity:** High | **Target Phase:** 2 (Quick fix)
**Source:** Plan 01-02

A visible, purchasable $28 product has no images, no description, and no options. The product image on the homepage carousel shows a placeholder icon.

### CL-5: External Link Sends Customers Away (LOW)

**Severity:** Low | **Target Phase:** 2
**Source:** Plan 01-01

Big Barn's subheading links to www.CompanyCasuals.com (SanMar's retail portal), sending customers away from the store to buy from a competitor.

---

## 6. Performance & Technical Issues

### PT-1: Severe Lazy-Loading Failure (HIGH)

**Severity:** High | **Target Phase:** 3
**Source:** Plans 01-02, 01-03

Product images fail to render below the fold in full-page views. The WIX lazy-loading mechanism does not fire correctly.

**Evidence:**
- Big Barn: Only 2/20 product images rendered in full-page screenshot
- Board 30: Only 3/17 rendered
- Artistry in Motion: Only logo visible, zero products
- On mobile, the problem is even worse -- zero images render on category pages

### PT-2: Firebase Errors on Chat Widget (LOW)

**Severity:** Low | **Target Phase:** N/A (WIX platform issue)
**Source:** Plans 01-01, 01-02

`ErrorOnConnectToRealtime FirebaseError: Firebase: A network AuthError` appears on some pages. The chat widget's Firebase connection times out intermittently.

### PT-3: Duplicate Firebase Initialization (LOW)

**Severity:** Low | **Target Phase:** N/A
**Source:** All plans

Console warning: `@firebase/app-compat: Warning: Firebase is already defined` on every page load. WIX platform loads Firebase twice.

### PT-4: Resource Loading Warnings (LOW)

**Severity:** Low | **Target Phase:** N/A

Multiple warnings about resources from `parastorage.com` (WIX CDN) on every page load. Not blocking but indicates suboptimal resource delivery.

---

## 7. Accessibility Issues

### AC-1: 89% of Images Missing Alt Text (HIGH)

**Severity:** High | **Target Phase:** 2

25 out of 28 images on the homepage have empty alt text. Product images, the hero logo, and decorative images all lack descriptive alt attributes.

**Evidence:**
- Homepage: `totalImages: 28, imagesWithEmptyAlt: 25`
- Only images with alt text: the Hotbox_edited.jpg logo (filename as alt) and "Elliptical Machine" (stock photo alt)
- Product gallery images have no alt text despite being the primary content

**Impact:** Screen reader users cannot identify any product on the site. Fails WCAG 2.1 Level A (1.1.1 Non-text Content).

### AC-2: No H1 on Homepage (MEDIUM)

**Severity:** Medium | **Target Phase:** 2

The homepage has no H1 element. Heading hierarchy starts at H2 ("Hot Box Clothing") and skips to H5 ("Subscribe Form").

**Evidence:**
- Homepage headings: H2 "Hot Box Clothing", H2 "$30 - $50", H2 "CONTACT US", H5 "Subscribe Form"
- Product pages DO have proper H1 (product name)
- Category pages have H2 for client headings

### AC-3: Footer Has Zero Navigation Links (MEDIUM)

**Severity:** Medium | **Target Phase:** 2

The footer contains only an email link and copyright text. No secondary navigation, no sitemap links, no social media links, no policy links.

**Evidence:**
- `footerLinks: [{ text: "admin@hotboxclothing.shop", href: "mailto:..." }]`
- Footer text: "(c)2022 by Hot Box Clothing. Proudly created with Wix.com"
- The copyright date (2022) is outdated

### AC-4: Keyboard Navigation Not Functional for Product Options (MEDIUM)

**Severity:** Medium | **Target Phase:** 3

WIX custom dropdowns (Size, Screen Print Logo) use custom elements rather than native `<select>` -- they do not respond to standard keyboard interactions. There are zero native `<select>` elements for product options.

---

## 8. Quick Wins

*Easy fixes with high impact -- can be done immediately.*

### QW-1: Remove or Reposition Chat Widget

**Effort:** 5 minutes | **Impact:** High
Disable the "Let's Chat!" widget or move it to a non-blocking position. Currently the #1 direct conversion blocker.

### QW-2: Fix UNMH Page Heading

**Effort:** 5 minutes | **Impact:** Medium
Change "Fall Pre-Order" heading to proper UNMH branding. Replace wildflower image.

### QW-3: Fix "20256" Typo on Fall PreOrder

**Effort:** 1 minute | **Impact:** Low
Change "March 1st 20256" to "March 1st 2026". Fix double period. Consider updating seasonal name.

### QW-4: Add Images and Description to Big Barn Team Hat

**Effort:** 15 minutes | **Impact:** Medium
A $28 product with zero content is actively hurting credibility. Add product photos and basic description.

### QW-5: Remove or Hide LMNT Products

**Effort:** 5 minutes | **Impact:** Medium
Both LMNT product pages are broken (404). Either fix the product pages or remove them from the catalog to eliminate dead ends.

### QW-6: Fix Breadcrumb Collection Assignment

**Effort:** 10 minutes | **Impact:** Low
Products show incorrect collection names in breadcrumbs (e.g., Big Barn product shows "Fall PreOrder" breadcrumb). Adjust collection assignment order.

### QW-7: Update Copyright Year

**Effort:** 1 minute | **Impact:** Low
Footer says "(c)2022". Update to 2026.

### QW-8: Rename Default URL Slugs

**Effort:** 15 minutes | **Impact:** Medium
Change `/shop-1` to `/artistry-in-motion`, `/blank-2` to `/contact`, etc. Improves SEO and professionalism.

---

## Issue Count Summary

| Severity | Count |
|----------|-------|
| Critical | 7 |
| High | 12 |
| Medium | 12 |
| Low | 4 |
| **Total** | **35** |

| Target Phase | Issue Count |
|-------------|-------------|
| Phase 2: Navigation & Discovery | 15 |
| Phase 3: Mobile Experience | 10 |
| Phase 4: Checkout & Conversion | 5 |
| Phase 8-9: Inventory | 1 |
| N/A (Platform) | 3 |
| Quick Wins (immediate) | 8 |

---

*Document complete. 35 issues identified across 8 categories with severity ratings, target phases, and specific evidence from three plans of browser + API testing.*
