# Mobile Optimization Master Guide

**Phase:** 03 - Mobile Experience Optimization
**Date:** 2026-01-30
**Status:** Ready for execution
**Audience:** Store owner -- follow this guide to fix all mobile issues
**Estimated Total Effort:** 2-3 hours in WIX Editor

---

## Executive Summary

Phase 3 audited the complete mobile experience across three browser-automated sessions at 375x812 (iPhone) and 768x1024 (iPad) viewports. The findings are severe:

- **The site has ZERO mobile-responsive design.** Every page serves a fixed 980px desktop layout regardless of viewport size.
- **No mobile navigation exists.** No hamburger menu was ever added to the site.
- **Product galleries are invisible on mobile.** Product cards render at 980px width; only 2-4 images are partially visible out of 105 products.
- **Add to Cart is unreachable on mobile.** The purchase button is off-screen horizontally AND buried 2 screens below the fold vertically.
- **All 10 mobile issues** identified in Phase 1 are confirmed and documented with precise measurements.

### What Can Be Automated

| Capability | API Available? | Method |
|-----------|---------------|--------|
| Mobile layout configuration | NO | WIX Editor only |
| Navigation menu management | NO | WIX Editor only |
| Product gallery settings | NO | WIX Editor only |
| Touch target sizing | NO | WIX Editor only |
| Responsive breakpoints | NO | WIX Editor only |

**Conclusion:** ZERO aspects of mobile optimization can be automated via the WIX REST API. All fixes require manual work in the WIX Editor Mobile view. This guide provides step-by-step instructions.

### Effort Summary by Priority

| Priority | Fixes | Estimated Time |
|----------|-------|---------------|
| Priority 1: Critical | 3 fixes | 45-90 minutes |
| Priority 2: High-Impact | 5 fixes | 45-75 minutes |
| Priority 3: Checkout | 2 fixes | 15-30 minutes |
| **Total** | **10 fixes** | **2-3 hours** |

---

## Pre-Requisites

**IMPORTANT:** Several Phase 2 manual changes MUST be completed before starting mobile optimization. The mobile layout should be built on top of the corrected navigation and gallery structure.

### Required Before Starting (Phase 2 Changes)

Complete these Phase 2 guides **in this order** before starting any Phase 3 work:

| # | Guide | Phase | Why Required | Effort |
|---|-------|-------|-------------|--------|
| 1 | **SHOP-ALL-PAGE.md** | 02-03 | Shop All page must exist for navigation | Medium (15-30 min) |
| 2 | **NAVIGATION-RESTRUCTURE.md** | 02-03 | 6-item nav must be live before mobile menu inherits it | Involved (30-60 min) |
| 3 | **GALLERY-STANDARDIZATION.md** | 02-05 | Add to Cart must be on all galleries before mobile gallery layout | Medium (15-30 min) |

### Recommended Before Starting (Phase 2 Changes)

These are not strictly required but will ensure the best mobile experience:

| # | Guide | Phase | Why Recommended | Effort |
|---|-------|-------|----------------|--------|
| 4 | URL-SLUG-CHANGES.md | 02-02 | Clean URLs for mobile sharing | Medium (15-30 min) |
| 5 | ACCESSIBILITY-FIXES.md | 02-02 | H1, alt text, footer nav | Medium (15-30 min) |
| 6 | SITE-SEARCH-SETUP.md | 02-04 | Search bar for mobile | Medium (15-30 min) |
| 7 | PRODUCT-FILTERS-SORTING.md | 02-04 | Filters for mobile browsing | Medium (15-30 min) |
| 8 | RELATED-PRODUCTS.md | 02-05 | Related products on mobile | Medium (15-30 min) |

### How to Access WIX Mobile Editor

All mobile optimization steps require the WIX Mobile Editor:

1. Open WIX Dashboard: `https://manage.wix.com/dashboard/c744cbdb-46f8-4c66-ac76-eb31bd0d52c1`
2. Click **Edit Site** to open the WIX Editor
3. Click the **mobile phone icon** in the top toolbar to switch to Mobile Editor view
4. The editor canvas will display a phone-shaped mobile preview

**Key Rule:** Changes in Mobile Editor only affect mobile views. Desktop layout remains unchanged.

---

## Priority 1: Critical Fixes (Do These First)

These 3 fixes address the most severe mobile issues. Without them, the site is essentially unusable on mobile devices.

**Estimated Effort:** 45-90 minutes total

### Fix 1.1: Activate Mobile-Responsive Layout (CR-1)

**Issue:** No mobile-responsive layout -- 981px fixed width on all viewports
**Impact:** Every mobile visitor sees a broken layout with horizontal scrolling
**Effort:** Involved (30-60 min)
**Affects:** ALL pages sitewide

**Root Cause:** The site was built in WIX Editor using fixed-width desktop elements that do not participate in responsive behavior. While WIX has responsive infrastructure (meta viewport tag, CSS media queries at 749/750px), the page elements override it with fixed-width positioning.

**Steps:**

1. Open the WIX Editor and switch to **Mobile Editor view** (phone icon in top toolbar)
2. WIX may prompt you to **optimize for mobile** or **create a mobile layout** -- accept this if offered
3. For **each page type** (homepage, collection pages, product pages):
   a. Select the **page background/container**
   b. Check for a **Layout** or **Stretch** option
   c. Set all containers to **Full Width** or **Fit to Screen**
   d. Verify that no element has a fixed width greater than 375px
4. For the **header section:**
   a. Select the header
   b. Set width to **Full Width** or **100%**
   c. Ensure the header collapses to a mobile-friendly height (60-70px)
5. For the **footer section:**
   a. Select the footer
   b. Set width to **Full Width**
   c. Stack footer elements vertically

**Verify:** After saving, preview the site at 375px. The body scroll width should equal the viewport width (375px) with zero horizontal scrolling.

**Detailed Instructions:** See MOBILE-NAV-OPTIMIZATION.md, Section 3, Step 1.

---

### Fix 1.2: Enable Mobile Navigation / Hamburger Menu (MC-1)

**Issue:** No hamburger menu exists -- site was built without any mobile navigation component
**Impact:** Mobile users cannot access the majority of navigation items (only 4 of 13 visible)
**Effort:** Medium (15-30 min)
**Affects:** ALL pages (header)

**Steps:**

1. In Mobile Editor, look at the **header area**
2. If a hamburger menu icon (three horizontal lines) is NOT visible:
   a. Click on the header section to select it
   b. Click **Add Elements** (the "+" icon in left panel)
   c. Navigate to **Menu** > **Mobile Menu** or **Hamburger Menu**
   d. Add the mobile menu component to the header
3. Configure the mobile menu with the **6-item navigation structure:**

   | Position | Item | Type |
   |----------|------|------|
   | 1 | Home | Page link |
   | 2 | Shop All | Page link |
   | 3 | Fun Shirts | Page link |
   | 4 | Our Teams | Dropdown (5 sub-items) |
   | 5 | Gift Card | Page link |
   | 6 | Contact | Page link |

4. Under "Our Teams" dropdown, add sub-items:
   - Big Barn Crossfit
   - Artistry in Motion
   - Board 30
   - UNMH
   - Pre-Order
5. Remove Support and Store Policies from mobile menu (footer only)
6. Set **header layout** to: `[ Logo (left) ] [ Cart Icon ] [ Hamburger (right) ]`
7. Set header height to 60-70px

**Verify:** Tap hamburger icon -- full menu should open with all 6 items. Each link navigates to the correct page.

**Detailed Instructions:** See MOBILE-NAV-OPTIMIZATION.md, Section 3, Steps 2-4.

---

### Fix 1.3: Enable Mobile Product Gallery Layout (MC-2)

**Issue:** Product galleries render at 980px fixed width -- only 2-4 of 105 products visible on mobile
**Impact:** Mobile visitors cannot browse products on any collection page
**Effort:** Medium (15-30 min)
**Affects:** All 7 collection pages (Big Barn, Fun Shirts, Artistry in Motion, Board 30, Fall PreOrder, UNMH, Shop All)

**Steps:**

For **each collection page** in Mobile Editor:

1. Navigate to the collection page
2. Click on the **Product Gallery** widget
3. Open **Settings** (gear icon)
4. Under **Layout** settings:
   - Set **Products per row** to **1** (single-column) or **2** (two-column grid)
   - Set gallery width to **Full Width** or **100%**
5. Under **Display** settings:
   - Verify Product Name is visible
   - Verify Price is visible
   - Verify **Add to Cart** button is **ON** (must be enabled on all pages -- currently only Board 30 has it)
6. Under **Image** settings:
   - Set image ratio to **Square (1:1)** or **Portrait (3:4)**
   - Ensure images are at least 300px wide on mobile

**Pages to update:** Big Barn (`/shop`), Fun Shirts (`/fun-shirts`), Artistry in Motion (`/shop-1`), Board 30 (`/shop-4`), Fall PreOrder (`/shop-2`), UNMH (`/shop-3`), Shop All (if created)

**Verify:** All product images visible when scrolling. No horizontal scrolling. Add to Cart button appears on all product cards.

**Detailed Instructions:** See MOBILE-PRODUCT-PAGES.md, Section 2, Steps 1-4.

---

## Priority 2: High-Impact Improvements

These 5 fixes address significant usability problems. They should be done after Priority 1 fixes are in place.

**Estimated Effort:** 45-75 minutes total

### Fix 2.1: Reposition Add to Cart Button (MC-3)

**Issue:** Add to Cart at y=1447-1540 (2 full screens below fold) AND x=350 (off-screen horizontally)
**Impact:** Customers must scroll extensively and horizontally to find the purchase button
**Effort:** Medium (15-30 min)
**Affects:** ALL product detail pages (template change)

**Steps:**

1. In Mobile Editor, navigate to any product page
2. The product page template should use a **stacked vertical layout** on mobile:
   ```
   [  Product Image (full width)  ]
   [  Product Name (H1)           ]
   [  Price                       ]
   [  Sezzle BNPL info            ]
   [  Color Options               ]
   [  Size Dropdown               ]
   [  Quantity Selector           ]
   [  [ ADD TO CART button ]      ]
   [  Product Description         ]
   ```
3. Select the product info section and set to **stacked/vertical** layout
4. Ensure Add to Cart button is:
   - **Within first 1.5 viewport heights** (within ~1200px from page top)
   - **Full width** on mobile (375px minus padding)
   - **44px minimum height** (currently 40px)
   - Centered horizontally
5. Consider enabling a **sticky Add to Cart** at the bottom of the screen (if WIX supports it)

**Verify:** Add to Cart button visible after one scroll (no more than 1.5x screen height from top). Full width, easy to tap.

**Detailed Instructions:** See MOBILE-PRODUCT-PAGES.md, Section 3, Steps 1-2.

---

### Fix 2.2: Increase Color Swatch Tap Targets (MC-4)

**Issue:** All color swatches are 32x32px -- 27% below WCAG 2.1 minimum of 44x44px
**Impact:** All products with color options are difficult to use on mobile
**Effort:** Quick (5 min) -- if WIX Editor exposes swatch sizing
**Affects:** ALL product detail pages with color options

**Steps:**

1. In Mobile Editor, navigate to a product page with color options
2. Click on the **color picker** section
3. Look for **Swatch Size**, **Option Size**, or **Design** settings
4. Increase swatch size to **44x44px minimum** (ideally 48x48px)
5. Set spacing between swatches to at least **8px**
6. With 44px swatches and 8px gaps, 4 swatches fit per row in 375px viewport

**If swatch sizing is not configurable:** Document as a WIX platform limitation. The swatches will still be functional but harder to tap accurately.

**Verify:** Swatches are visually larger and easy to tap on a real mobile device.

**Detailed Instructions:** See MOBILE-PRODUCT-PAGES.md, Section 3, Step 3.

---

### Fix 2.3: Handle 32-Color Products on Mobile (MC-5)

**Issue:** Fun Shirts have 32 color options -- densely packed 32px swatches in a 280px container
**Impact:** Fun Shirts products are essentially unpurchasable on mobile
**Effort:** Medium (15-30 min)
**Affects:** Fun Shirts collection products (and any future products with many color options)

**Try these solutions in order of preference:**

**Option A: Scrollable Color Container (preferred)**
1. In product page template settings, look for **Container Height** for the color options area
2. Set to a **fixed height** (e.g., 200px) with **vertical scrolling**
3. Add a visual indicator showing more options exist below

**Option B: Collapsible Color Section**
1. Configure the color section as **collapsible/expandable**
2. Show 8-12 colors by default
3. Add a "Show All Colors" button to expand

**Option C: Color Dropdown**
1. Switch from **swatch view** to **dropdown view** for the Color option
2. This collapses 32 options into a single 44px dropdown
3. Trade-off: Users cannot see all colors at a glance

**Verify:** Can select any of 32 colors on a Fun Shirts product without extreme difficulty. Add to Cart remains accessible without excessive scrolling.

**Detailed Instructions:** See MOBILE-PRODUCT-PAGES.md, Section 3, Step 4.

---

### Fix 2.4: Fix Tablet Experience (MC-6)

**Issue:** 768px (iPad) viewport still has 213px horizontal overflow
**Impact:** Tablet users have a degraded experience with horizontal scrolling
**Effort:** Quick (5 min) -- should be resolved by Fix 1.1
**Affects:** ALL pages at tablet viewport

**Steps:**

1. After completing Fix 1.1 (responsive layout activation), test at 768px viewport
2. In WIX Editor, check that the responsive breakpoint at 750px functions correctly
3. Verify:
   - No horizontal scrolling at 768px
   - Navigation is accessible (either hamburger or full nav bar fits)
   - Product galleries display in 2-3 column layout
   - Content headings are not clipped

**Note:** This fix should be automatically resolved by Fix 1.1. WIX has existing CSS media queries at 749/750px that should activate once the fixed-width elements are replaced with responsive ones.

**Verify:** Zero horizontal scrolling at 768px. All content visible.

**Detailed Instructions:** See MOBILE-NAV-OPTIMIZATION.md, Section 3, Step 6.

---

### Fix 2.5: Resolve Image Lazy-Loading Failure (PT-1)

**Issue:** Product images fail to render below the fold -- WIX lazy-loading does not trigger for off-screen elements
**Impact:** Product images are invisible on mobile collection pages
**Effort:** Quick (5 min) -- should be auto-resolved by Priority 1 fixes
**Affects:** ALL collection pages and product detail pages

**Root Cause:** Images are positioned at desktop X/Y coordinates (e.g., x=350, y=1200). The WIX lazy-loading system uses viewport intersection detection, but elements positioned outside the mobile viewport horizontally never intersect. This is a direct consequence of the fixed-width layout (CR-1).

**Steps:**

1. **Primary Fix:** Complete Priority 1 fixes (responsive layout, gallery layout)
   - Once elements are positioned within the mobile viewport, intersection observer will trigger
   - Images should load correctly on scroll
2. **If images still fail after layout fix:**
   a. Check WIX Editor > **Site Settings** > **Performance** or **SEO**
   b. Look for **Image Loading** or **Lazy Load** options
   c. Ensure "Load images on scroll" is enabled
   d. Consider enabling "Preload" for the first 6-8 product images

**Verify:** Scroll through a collection page on mobile -- all product images should load as you scroll down. No blank spaces or broken images.

**Detailed Instructions:** See MOBILE-PRODUCT-PAGES.md, Section 4.

---

## Priority 3: Checkout Flow

These 2 fixes address the cart and checkout experience on mobile. They should be done after Priority 1 and 2 fixes.

**Estimated Effort:** 15-30 minutes total

### Fix 3.1: Optimize Cart Page for Mobile

**Issue:** Cart page has 981px fixed layout -- all dollar amounts and remove button off-screen
**Impact:** Customers cannot see order totals or remove items on mobile
**Effort:** Medium (15-30 min) -- may auto-resolve with Fix 1.1
**Affects:** Cart page (`/cart-page`)

**Positive Finding:** The side cart (mini-cart drawer) already works well on mobile. It fills the viewport correctly and shows product details, options, quantity, and total. The main cart page is the problem.

**Steps:**

1. In Mobile Editor, navigate to the Cart Page
2. Click on the **Cart widget**
3. Configure for mobile:
   - Cart item layout should **stack vertically** (image + info on one line, controls below)
   - Set to **full width** within the mobile viewport
   - Order summary values (Subtotal, Delivery, Total) must be visible -- not at x=930+
4. Ensure "Checkout" button is:
   - **Full width** within viewport
   - **44px minimum height** (currently 42px)
5. Express checkout buttons (Apple Pay, PayPal, Venmo, Google Pay):
   - Should be **full width** within viewport
   - All payment logos visible and not clipped
6. Increase tap target sizes:
   - Quantity buttons: 24x26px -> 44x44px
   - Remove button: 24x27px -> 44x44px
   - Promo code: height 24px -> 44px

**Verify:** All cart information visible without horizontal scrolling. Can see subtotal, delivery, and total amounts. Checkout button is prominent and tappable.

**Detailed Instructions:** See MOBILE-CHECKOUT-FLOW.md, Section 2.

---

### Fix 3.2: Verify Checkout Page on Mobile

**Issue:** Checkout page could not be fully audited without completing a purchase
**Impact:** Unknown -- checkout may already be functional on mobile
**Effort:** Quick (5 min) -- verification only
**Affects:** Checkout page (`/checkout`)

**Positive Finding:** The WIX checkout page uses its **own separate responsive layout** independent of the site template. During audit, the checkout header (logo, heading, Continue Browsing link) rendered correctly within the 375px viewport. The checkout form likely handles responsive layout on its own.

**Steps:**

1. After completing all other fixes, add a product to cart on mobile
2. Navigate to checkout via "Checkout" button on cart page
3. Verify at 375px viewport:
   - [ ] Email field: full-width, 44px+ height, 16px+ font
   - [ ] Shipping address fields: full-width, accessible
   - [ ] Payment method section: visible within viewport
   - [ ] Sezzle BNPL widget: displays correctly with readable text (CK-5)
   - [ ] Order summary: visible (expandable OK)
   - [ ] "Place Order" button: full-width, prominent, 44px+ height
   - [ ] No horizontal scrolling
4. If any issues found, adjust in WIX Editor:
   - Checkout page has its own settings under WIX Dashboard > eCommerce > Checkout Settings
   - Form field sizing may need separate mobile configuration

**Do NOT complete an actual purchase.** Navigate up to the Place Order button only.

**Verify:** Complete checkout flow is accessible on mobile without horizontal scrolling.

**Detailed Instructions:** See MOBILE-CHECKOUT-FLOW.md, Section 4.

---

## Verification Steps

### How to Test on Mobile

**Option 1: Chrome DevTools (Recommended for testing)**
1. Open Chrome browser
2. Navigate to `https://www.hotboxclothing.shop`
3. Press **F12** to open DevTools
4. Click the **Toggle Device Toolbar** icon (phone/tablet icon) or press **Ctrl+Shift+M**
5. Select **iPhone SE** (375x667) or set custom size to **375x812**
6. Refresh the page after changing viewport

**Option 2: Real Mobile Device**
1. Open Safari (iPhone) or Chrome (Android)
2. Navigate to `https://www.hotboxclothing.shop`
3. Test all pages and interactions

### Key Breakpoints to Test

| Viewport | Device | What to Check |
|----------|--------|---------------|
| **375x812** | iPhone (standard) | All Priority 1-3 fixes |
| **768x1024** | iPad (tablet) | No overflow, gallery columns, nav |
| **1024x768** | iPad landscape / small laptop | Transition between mobile and desktop |

### Verification Checklist by Priority Group

#### After Priority 1 Fixes

- [ ] **CR-1:** Body scroll width = viewport width at 375px (ZERO horizontal scrolling)
- [ ] **CR-1:** Body scroll width = viewport width at 768px
- [ ] **MC-1:** Hamburger menu icon visible in mobile header
- [ ] **MC-1:** Tapping hamburger opens full menu with 6 items
- [ ] **MC-1:** "Our Teams" expands to show 5 sub-items
- [ ] **MC-1:** Each menu link navigates correctly
- [ ] **MC-1:** Menu closes after selecting a link
- [ ] **MC-2:** Product galleries display in 1-2 column grid on all pages
- [ ] **MC-2:** Product images load correctly when scrolling
- [ ] **MC-2:** Add to Cart button visible on all gallery product cards

#### After Priority 2 Fixes

- [ ] **MC-3:** Add to Cart button within 1.5 viewport heights on product pages
- [ ] **MC-3:** Add to Cart button is full-width and 44px+ height
- [ ] **MC-4:** Color swatches are 44x44px or larger
- [ ] **MC-4:** Swatches have 8px+ spacing between them
- [ ] **MC-5:** 32-color products are usable (scrollable, collapsible, or dropdown)
- [ ] **MC-6:** Zero horizontal scrolling at 768px tablet viewport
- [ ] **MC-6:** Gallery shows 2-3 columns on tablet
- [ ] **PT-1:** All product images load when scrolling collection pages
- [ ] **PT-1:** No blank spaces or broken images

#### After Priority 3 Fixes

- [ ] Cart page: All values (Subtotal, Delivery, Total) visible without horizontal scroll
- [ ] Cart page: Checkout button is full-width and 44px+ height
- [ ] Cart page: Express checkout buttons fully visible
- [ ] Cart page: Quantity and remove controls accessible
- [ ] Checkout page: All form fields accessible on mobile
- [ ] Checkout page: Sezzle BNPL widget visible (CK-5)
- [ ] Checkout page: Place Order button prominent and tappable

#### Complete Flow Test (Final Verification)

- [ ] Browse to Shop All page on mobile
- [ ] Products visible in gallery grid
- [ ] Tap a product to view details
- [ ] Product image, name, price visible without horizontal scroll
- [ ] Select color and size options
- [ ] Tap "Add to Cart"
- [ ] Side cart opens with correct product details
- [ ] Tap "View Cart" to go to cart page
- [ ] Cart page shows item details and totals within viewport
- [ ] Tap "Checkout" button
- [ ] Checkout form fields accessible
- [ ] Can reach "Place Order" button (do NOT complete purchase)

---

## Cross-Reference: All Phase 3 Documents

### Phase 1 Mobile Issues (10 total) -- All Addressed

| # | Issue ID | Title | Severity | Document | Priority |
|---|----------|-------|----------|----------|----------|
| 1 | CR-1 | No mobile-responsive layout | Critical | MOBILE-NAV-OPTIMIZATION.md | Priority 1 |
| 2 | MC-1 | No hamburger menu | Critical | MOBILE-NAV-OPTIMIZATION.md | Priority 1 |
| 3 | MC-2 | Product gallery empty on mobile | Critical | MOBILE-PRODUCT-PAGES.md | Priority 1 |
| 4 | MC-3 | Add to Cart buried below fold | High | MOBILE-PRODUCT-PAGES.md | Priority 2 |
| 5 | MC-4 | Color swatches below tap target | High | MOBILE-PRODUCT-PAGES.md | Priority 2 |
| 6 | MC-5 | 32 color options unusable | High | MOBILE-PRODUCT-PAGES.md | Priority 2 |
| 7 | MC-6 | Tablet experience broken | Medium | MOBILE-NAV-OPTIMIZATION.md | Priority 2 |
| 8 | PT-1 | Lazy-loading failure | High | MOBILE-PRODUCT-PAGES.md | Priority 2 |
| 9 | AC-4 | Keyboard navigation broken | Medium | MOBILE-NAV-OPTIMIZATION.md | Partial (WIX limitation) |
| 10 | CK-5 | Sezzle BNPL inconsistent | Low | MOBILE-CHECKOUT-FLOW.md | Priority 3 |

### Detailed Document Index

| Document | Plan | Content | Fixes Covered |
|----------|------|---------|---------------|
| **MOBILE-NAV-OPTIMIZATION.md** | 03-01 | Mobile menu, touch targets, header layout, responsive navigation | CR-1, MC-1, MC-6, AC-4 |
| **MOBILE-PRODUCT-PAGES.md** | 03-02 | Product gallery layout, product detail page, swatch sizing, image loading | MC-2, MC-3, MC-4, MC-5, PT-1 |
| **MOBILE-CHECKOUT-FLOW.md** | 03-03 | Cart page, side cart, checkout page, Sezzle BNPL, payment methods | CK-5, cart layout |
| **MOBILE-OPTIMIZATION-MASTER.md** | 03-03 | This document -- consolidated guide with all fixes prioritized | All 10 issues |

### Execution Order

For the best results, complete all mobile fixes in this order:

```
Phase 2 Prerequisites:
  1. SHOP-ALL-PAGE.md (02-03)
  2. NAVIGATION-RESTRUCTURE.md (02-03)
  3. GALLERY-STANDARDIZATION.md (02-05)

Phase 3 Mobile Optimization:
  4. Fix 1.1: Responsive layout (CR-1)          -- MOBILE-NAV-OPTIMIZATION.md
  5. Fix 1.2: Hamburger menu (MC-1)              -- MOBILE-NAV-OPTIMIZATION.md
  6. Fix 1.3: Product gallery layout (MC-2)      -- MOBILE-PRODUCT-PAGES.md
  7. Fix 2.1: Add to Cart position (MC-3)        -- MOBILE-PRODUCT-PAGES.md
  8. Fix 2.2: Swatch tap targets (MC-4)          -- MOBILE-PRODUCT-PAGES.md
  9. Fix 2.3: 32-color handling (MC-5)           -- MOBILE-PRODUCT-PAGES.md
  10. Fix 2.4: Tablet verification (MC-6)        -- MOBILE-NAV-OPTIMIZATION.md
  11. Fix 2.5: Image lazy-loading (PT-1)         -- MOBILE-PRODUCT-PAGES.md
  12. Fix 3.1: Cart page layout                  -- MOBILE-CHECKOUT-FLOW.md
  13. Fix 3.2: Checkout verification (CK-5)      -- MOBILE-CHECKOUT-FLOW.md
```

**Note on AC-4 (Keyboard Navigation):** The WIX product options use custom dropdown elements rather than native `<select>` elements. This is a WIX platform limitation that cannot be fully resolved through the WIX Editor. The hamburger menu keyboard accessibility (Enter/Space to open, Escape to close) should be supported by WIX's built-in mobile menu component. Product option keyboard support remains a known limitation.

---

## Additional Findings

### Side Cart is a Bright Spot

The WIX side cart (mini-cart drawer) that appears after adding an item to cart is the best mobile component on the site:
- Fills the entire 375x812 viewport correctly
- Shows product image, name, price, options, quantity, and total
- "View Cart" button meets the 44px tap target minimum
- Only improvements needed: increase close/remove/quantity button tap targets to 44px

### WIX Checkout Has Its Own Responsive Layout

The checkout page (`/checkout`) uses a separate layout system from the main site template:
- The checkout header renders correctly at 375px
- Content appears centered and responsive
- Main mobile layout fixes should NOT break checkout
- Checkout should be verified after all other fixes are complete

### Root Cause Analysis

All 10 mobile issues trace back to a single root cause: **the site was built entirely in WIX's desktop editor without any mobile layout configuration.** The WIX platform supports responsive design through its Mobile Editor, but the Mobile Editor was never used for this site. Activating the Mobile Editor view and configuring mobile-specific layouts (Fix 1.1) should resolve or significantly improve 8 of the 10 issues.

---

*Generated by Plan 03-03 execution (Task 2). This is the consolidated Phase 3 master guide.*
*Start with Pre-Requisites, then follow Priority 1 > 2 > 3 order.*
*For detailed step-by-step instructions, see the referenced document for each fix.*
