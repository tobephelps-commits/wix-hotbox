# WIX Editor & Dashboard Fixes: Master Checklist

**Generated:** 2026-01-31
**Phase:** 11 - Automate WIX Editor Fixes
**Plan:** 11-01 (Consolidation)
**Source:** All Phase 2, 3, 4 guide documents + Phase 1 UX-ISSUES.md
**Dashboard URL:** https://manage.wix.com/dashboard/c744cbdb-46f8-4c66-ac76-eb31bd0d52c1

---

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total fixes identified** | 38 |
| **Already completed (v0.1 API)** | 8 |
| **Pending manual fixes** | 30 |
| **Automatable via API (Plan 11-03)** | 3 |
| **WIX Editor only** | 20 |
| **WIX Dashboard only** | 5 |
| **Verification only** | 2 |

### Breakdown by Category

| Category | Pending | Editor | Dashboard | API | Verify |
|----------|---------|--------|-----------|-----|--------|
| Navigation | 5 | 4 | 0 | 1 | 0 |
| Mobile | 10 | 9 | 0 | 0 | 1 |
| Checkout & Conversion | 7 | 3 | 4 | 0 | 0 |
| Accessibility & Content | 6 | 5 | 0 | 1 | 0 |
| Client Experience | 2 | 1 | 0 | 1 | 0 |
| **Total** | **30** | **22** | **4** | **3** | **1** |

### Breakdown by Priority

| Priority | Count | Estimated Effort |
|----------|-------|-----------------|
| Critical | 5 | 2-3.5 hours |
| High | 13 | 3.5-6.5 hours |
| Medium | 9 | 2-4 hours |
| Low | 3 | 0.5-1 hour |
| **Total** | **30** | **8-15 hours** |

---

## Already Completed (v0.1 API Automation)

These fixes were resolved by automated API work during v0.1. No manual action needed.

| # | Fix ID | Title | Method | Plan | Date |
|---|--------|-------|--------|------|------|
| 1 | CK-1a | Terms & Conditions policy | API | 04-01 | 2026-01-30 |
| 2 | CK-1b | Privacy Policy | API | 04-01 | 2026-01-30 |
| 3 | CK-1c | Return Policy | API | 04-01 | 2026-01-30 |
| 4 | CK-1d | Contact Us policy | API | 04-01 | 2026-01-30 |
| 5 | CK-1e | Shipping Policy (custom slot) | API | 04-01 | 2026-01-30 |
| 6 | CK-2 | Size guides for all 105 products (15 brands) | API | 04-02 | 2026-01-30 |
| 7 | CR-2 | Chat widget blocking product interaction (hidden) | API | 02-01 | 2026-01-30 |
| 8 | CR-4 | LMNT product pages returning 404 (products hidden) | API | 02-01 | 2026-01-30 |

**Note:** CL-4 (Big Barn Team Hat with zero content) was identified in Phase 1 but not resolved via API -- it requires product media/description upload by the store owner. CR-3 (Zero Inventory Tracking) was addressed by the Inventory Monitor and Stock Sync systems in Phases 8-9.

---

## Execution Order

Complete fixes in this recommended order. Dependencies are respected -- prerequisite fixes are listed first.

```
WAVE 1: Foundation (Phase 2 Prerequisites) -- Do these first
  1.  CR-5:  Create Shop All page                    [Editor, 15-30 min]
  2.  NV-1:  Navigation restructure                  [Editor, 30-60 min]  (needs Shop All page)
  3.  CK-4:  Gallery standardization + Add to Cart   [Editor, 15-30 min]
  4.  NV-5:  URL slug changes (9 pages)              [Editor, 15-30 min]

WAVE 2: Accessibility & Content -- No dependencies
  5.  AC-2:  Homepage H1 heading                     [Editor, 5 min]
  6.  AC-1:  Homepage image alt text                 [Editor, 10-15 min]
  7.  AC-3:  Footer navigation + copyright year      [Editor, 15-30 min]  (needs slug changes for links)
  8.  CL-1:  Fix UNMH page heading                   [Editor, 5 min]
  9.  CL-2:  Fix "20256" typo on PreOrder            [Editor/API, 1 min]

WAVE 3: Discovery & Engagement
  10. NV-2:  Install site search                     [Editor, 15-30 min]
  11. NV-3:  Product filters and sorting (7 pages)   [Editor, 30-45 min]
  12. NV-6:  Related products on product pages       [Editor, 15-30 min]

WAVE 4: Mobile Optimization (Phase 3) -- Needs Waves 1-3 complete
  13. CR-1:  Activate mobile-responsive layout       [Editor, 30-60 min]
  14. MC-1:  Enable hamburger menu / mobile nav      [Editor, 15-30 min]
  15. MC-2:  Mobile product gallery layout            [Editor, 15-30 min]
  16. MC-3:  Reposition Add to Cart on mobile         [Editor, 15-30 min]
  17. MC-4:  Increase color swatch tap targets        [Editor, 5 min]
  18. MC-5:  Handle 32-color products on mobile       [Editor, 15-30 min]
  19. MC-6:  Fix tablet experience                    [Editor, 5 min] (may auto-resolve with CR-1)
  20. PT-1:  Resolve image lazy-loading               [Editor, 5 min] (may auto-resolve with CR-1)

WAVE 5: Checkout & Conversion (Phase 4)
  21. CK-3:  Variant image switching                  [Dashboard+Editor, 30-60 min]
  22. CK-AB: Abandoned cart recovery emails           [Dashboard, 15-20 min]
  23. CK-OC: Order confirmation email branding        [Dashboard, 10-15 min]
  24. CK-SH: Shipping settings + free shipping        [Dashboard, 10-15 min]
  25. CK-TS: Trust signals on product pages           [Editor, 15-30 min]

WAVE 6: Low Priority / Nice-to-Have
  26. CK-UP: Cart page upsell/cross-sell              [Editor, 15-30 min]
  27. CK-FS: Free shipping threshold messaging        [Dashboard/Editor, 5-10 min]
  28. CL-5:  Remove external CompanyCasuals link      [Editor/API, 5 min]

WAVE 7: Verification Only
  29. CK-5:  Verify Sezzle BNPL on mobile checkout    [Verify, 5 min]
  30. QW-6:  Verify breadcrumb display on live site    [Verify, 5 min]
```

---

## Master Checklist by Priority

### Critical (5 fixes)

- [ ] **CR-5: Create Shop All Page** (WIX Editor, 15-30 min)
  - Source: SHOP-ALL-PAGE.md
  - Dependencies: None
  - Repurpose empty `/shop-5` page: rename to "Shop All", change slug to `/shop-all`, link gallery to "All Products" collection. Add H1 heading "Shop All Products".

- [ ] **CR-1: Activate Mobile-Responsive Layout** (WIX Editor, 30-60 min)
  - Source: MOBILE-OPTIMIZATION-MASTER.md (Fix 1.1)
  - Dependencies: Waves 1-3 recommended before mobile work
  - Open Mobile Editor view. Set all containers to Full Width / Fit to Screen. No element should exceed 375px fixed width. Verify zero horizontal scrolling.

- [ ] **MC-1: Enable Mobile Navigation / Hamburger Menu** (WIX Editor, 15-30 min)
  - Source: MOBILE-OPTIMIZATION-MASTER.md (Fix 1.2)
  - Dependencies: CR-1 (responsive layout), NV-1 (navigation restructure)
  - Add hamburger menu component to mobile header. Configure with 6-item nav structure: Home, Shop All, Fun Shirts, Our Teams (dropdown), Gift Card, Contact.

- [ ] **MC-2: Enable Mobile Product Gallery Layout** (WIX Editor, 15-30 min)
  - Source: MOBILE-OPTIMIZATION-MASTER.md (Fix 1.3)
  - Dependencies: CR-1 (responsive layout), CK-4 (gallery standardization)
  - In Mobile Editor, set Product Gallery to 1-2 column layout on all 7 collection pages. Verify Add to Cart button visible on all product cards.

- [ ] **NV-1: Navigation Restructure** (WIX Editor, 30-60 min)
  - Source: NAVIGATION-RESTRUCTURE.md
  - Dependencies: CR-5 (Shop All page must exist)
  - Create "Our Teams" dropdown folder. Move 5 client pages into it. Reorder: Home > Shop All > Fun Shirts > Our Teams > Gift Card > Contact. Remove Support and Store Policies from main nav (footer only).

### High (13 fixes)

- [ ] **CK-4: Gallery Standardization -- Enable Add to Cart on All Pages** (WIX Editor, 15-30 min)
  - Source: GALLERY-STANDARDIZATION.md
  - Dependencies: None (but best done early so mobile can inherit it)
  - Enable "Add to Cart" button on gallery widgets for: Big Barn, Artistry in Motion, Fun Shirts, UNMH, Fall PreOrder, Shop All. Match Board 30's settings (already has Add to Cart). Standardize grid layout settings.

- [ ] **NV-5: URL Slug Changes (9 pages)** (WIX Editor, 15-30 min)
  - Source: URL-SLUG-CHANGES.md
  - Dependencies: None
  - Change slugs: `/shop` to `/big-barn-crossfit`, `/shop-1` to `/artistry-in-motion`, `/shop-2` to `/pre-order`, `/shop-3` to `/unmh`, `/shop-4` to `/board-30`, `/shop-5` to `/shop-all` (or `/lmnt`), `/blank-2` to `/contact`, `/blank-3` to `/support`, `/blank-4` to `/store-policies`. WIX auto-creates 301 redirects.

- [ ] **NV-2: Install Wix Site Search** (WIX Editor, 15-30 min)
  - Source: SITE-SEARCH-SETUP.md
  - Dependencies: None
  - Add Wix Site Search app from App Market. Configure search bar in header (icon-only, right side). Configure Search Results page to show Products first, then Pages.

- [ ] **NV-3: Product Filtering & Sorting (7 pages)** (WIX Editor, 30-45 min)
  - Source: PRODUCT-FILTERS-SORTING.md
  - Dependencies: CR-5 (Shop All page for category filter)
  - Enable on Shop All: Category + Price + Product Options filters, all 4 sort options. Enable on each client page: Price + Product Options filters (hide Category), all 4 sort options.

- [ ] **AC-1: Homepage Image Alt Text** (WIX Editor, 10-15 min)
  - Source: ACCESSIBILITY-FIXES.md
  - Dependencies: None
  - Update alt text: Logo to "Hot Box Clothing Logo", Elliptical Machine to "Custom Team Shirts - Starting at $30", product carousel images to product names.

- [ ] **AC-3: Footer Navigation + Copyright Year** (WIX Editor, 15-30 min)
  - Source: ACCESSIBILITY-FIXES.md
  - Dependencies: NV-5 (slug changes for correct link targets)
  - Add footer nav links: Home, Contact, Support, Store Policies, Gift Card. Update copyright from "(c)2022" to "(c)2026". Remove "Proudly created with Wix.com" (optional).

- [ ] **MC-3: Reposition Add to Cart Button on Mobile** (WIX Editor, 15-30 min)
  - Source: MOBILE-OPTIMIZATION-MASTER.md (Fix 2.1)
  - Dependencies: CR-1 (responsive layout)
  - In Mobile Editor, ensure product page uses stacked vertical layout. Add to Cart button within 1.5 viewport heights from top. Full width, 44px minimum height. Consider sticky Add to Cart.

- [ ] **MC-4: Increase Color Swatch Tap Targets** (WIX Editor, 5 min)
  - Source: MOBILE-OPTIMIZATION-MASTER.md (Fix 2.2)
  - Dependencies: CR-1 (responsive layout)
  - Increase swatch size from 32x32px to 44x44px minimum. Set 8px spacing between swatches. May be a WIX limitation if not configurable.

- [ ] **MC-5: Handle 32-Color Products on Mobile** (WIX Editor, 15-30 min)
  - Source: MOBILE-OPTIMIZATION-MASTER.md (Fix 2.3)
  - Dependencies: MC-4 (swatch sizing)
  - Try in order: (A) Scrollable color container with fixed height, (B) Collapsible color section, (C) Color dropdown instead of swatches.

- [ ] **CK-3: Variant Image Switching** (WIX Dashboard + Editor, 30-60 min)
  - Source: CHECKOUT-CONVERSION-GUIDE.md (Section 1.2)
  - Dependencies: Need color-specific mockup images per product
  - Part A (Dashboard): Upload variant-specific images, link each to its color variant. Part B (Editor): Enable "Link gallery images to product options" on Product Page template.

- [ ] **CK-AB: Abandoned Cart Recovery Emails** (WIX Dashboard, 15-20 min)
  - Source: CHECKOUT-CONVERSION-GUIDE.md (Section 1.1)
  - Dependencies: None
  - Dashboard > eCommerce > Abandoned Checkouts or Automations. Create automation: trigger "Abandoned Checkout Created", timing 1 hour, include product image + checkout link. Optional 24h follow-up.

- [ ] **CL-1: Fix UNMH Page Heading** (WIX Editor, 5 min)
  - Source: UX-ISSUES.md (QW-2)
  - Dependencies: None
  - Change page heading from "Fall Pre-Order" to proper UNMH branding. Replace wildflower image with UNMH-relevant imagery.

- [ ] **CK-TS: Trust Signals on Product Pages** (WIX Editor, 15-30 min)
  - Source: CHECKOUT-CONVERSION-GUIDE.md (Section 2.3)
  - Dependencies: None
  - Add below Add to Cart: text-based trust signals ("Secure Checkout | Free Returns on Defective Items | Custom Made to Order") or visual badges (lock icon, payment logos). Consider installing WIX product reviews app.

### Medium (9 fixes)

- [ ] **AC-2: Homepage H1 Heading** (WIX Editor, 5 min)
  - Source: ACCESSIBILITY-FIXES.md
  - Dependencies: None
  - Change "Hot Box Clothing" from H2 to H1 on homepage. Verify visual appearance after change.

- [ ] **NV-6: Related Products on Product Pages** (WIX Editor, 15-30 min)
  - Source: RELATED-PRODUCTS.md
  - Dependencies: None
  - Add Related Products widget to product page template. Position below product description/social icons. Use "From Similar Categories" algorithm. Show 4-6 products. Title: "You Might Also Like".

- [ ] **MC-6: Fix Tablet Experience** (WIX Editor, 5 min)
  - Source: MOBILE-OPTIMIZATION-MASTER.md (Fix 2.4)
  - Dependencies: CR-1 (should auto-resolve with responsive layout)
  - Verify zero horizontal scrolling at 768px after CR-1. Check gallery shows 2-3 columns on tablet.

- [ ] **PT-1: Resolve Image Lazy-Loading Failure** (WIX Editor, 5 min)
  - Source: MOBILE-OPTIMIZATION-MASTER.md (Fix 2.5)
  - Dependencies: CR-1, MC-2 (should auto-resolve with layout fixes)
  - After responsive layout is active, verify images load on scroll. If still failing, check Site Settings > Performance > Image Loading.

- [ ] **CK-OC: Order Confirmation Email Branding** (WIX Dashboard, 10-15 min)
  - Source: CHECKOUT-CONVERSION-GUIDE.md (Section 2.1)
  - Dependencies: None
  - Dashboard > eCommerce > Email Notifications. Customize order confirmation with HotBox logo, branding, production timeline note ("5-10 business days"). Customize shipping confirmation.

- [ ] **CK-SH: Shipping Settings & Free Shipping Threshold** (WIX Dashboard, 10-15 min)
  - Source: CHECKOUT-CONVERSION-GUIDE.md (Section 2.2)
  - Dependencies: None
  - Dashboard > eCommerce > Shipping & Fulfillment. Review rates. Consider free shipping threshold ($75-$100). Consider economy shipping option ($5.95 USPS First Class). Verify tax settings.

- [ ] **CK-CT: Cart Page Mobile Layout** (WIX Editor, 15-30 min)
  - Source: MOBILE-OPTIMIZATION-MASTER.md (Fix 3.1)
  - Dependencies: CR-1 (responsive layout)
  - In Mobile Editor, configure cart page: stacked vertical layout, full-width controls. Checkout button full-width + 44px height. Increase quantity/remove button tap targets to 44px.

- [ ] **CL-2: Fix "20256" Typo on Fall PreOrder** (WIX Editor, 1 min)
  - Source: UX-ISSUES.md (QW-3)
  - Dependencies: None
  - Change "March 1st 20256" to "March 1st 2026". Fix double period. Consider updating seasonal name to match nav ("Fall PreOrder" vs "Winter 2026 Pre-order").

- [ ] **AC-4: Keyboard Navigation for Product Options** (WIX Limitation, N/A)
  - Source: MOBILE-OPTIMIZATION-MASTER.md
  - Dependencies: None
  - WIX uses custom dropdown elements instead of native `<select>`. This is a platform limitation. Hamburger menu keyboard support should work with WIX's built-in mobile menu component. Document as known limitation.

### Low (3 fixes)

- [ ] **CK-UP: Cart Page Upsell / Cross-Sell** (WIX Editor, 15-30 min)
  - Source: CHECKOUT-CONVERSION-GUIDE.md (Section 3.1)
  - Dependencies: NV-6 (Related Products setup)
  - Add Related Products or Best Sellers widget below cart items on Cart Page. Check WIX App Market for cart upsell apps.

- [ ] **CK-FS: Free Shipping Threshold Messaging** (WIX Dashboard/Editor, 5-10 min)
  - Source: CHECKOUT-CONVERSION-GUIDE.md (Section 3.2)
  - Dependencies: CK-SH (shipping threshold must be configured first)
  - Add "Free shipping on orders over $X" text to product pages, cart page, and/or site-wide announcement bar.

- [ ] **CL-5: Remove External CompanyCasuals Link** (WIX Editor, 5 min)
  - Source: UX-ISSUES.md (CL-5)
  - Dependencies: None
  - Remove or replace the www.CompanyCasuals.com link on Big Barn page subheading. This link sends customers to SanMar's retail portal (competitor).

---

## Automatable Fixes (Plan 11-03 Candidates)

These fixes MAY be addressable via WIX REST API or WIX Velo scripting. Plan 11-03 will investigate and automate what is possible.

| # | Fix ID | Title | API Approach | Notes |
|---|--------|-------|-------------|-------|
| 1 | CL-2 | Fix "20256" typo on Fall PreOrder | WIX Stores Product API -- update product description | If typo is in product description field, API can fix. If in page content, requires Editor. |
| 2 | CL-5 | Remove CompanyCasuals external link | Possibly page content API or Velo | Depends on where the link is stored. |
| 3 | QW-6 | Breadcrumb collection assignment | Already verified correct at API level | No fix needed -- WIX platform behavior. |

**Note:** The vast majority of fixes (27/30) require WIX Editor or WIX Dashboard access. The WIX REST API does not support: page content editing, navigation menu management, product gallery widget settings, page URL slug changes, mobile layout configuration, email template customization, or app installation.

---

## Dashboard-Only Fixes

These require the WIX Dashboard (not the visual Editor). Navigate to:
`https://manage.wix.com/dashboard/c744cbdb-46f8-4c66-ac76-eb31bd0d52c1`

### 1. Abandoned Cart Recovery Emails
- **Fix ID:** CK-AB | **Priority:** HIGH | **Effort:** 15-20 min
- **Path:** Dashboard > eCommerce > Abandoned Checkouts (or Automations)
- **Action:** Create automation triggered by "Abandoned Checkout Created". Set 1-hour delay. Include product image, name, and checkout link. Optional: 24h follow-up email.
- **Source:** CHECKOUT-CONVERSION-GUIDE.md, Section 1.1

### 2. Order Confirmation Email Branding
- **Fix ID:** CK-OC | **Priority:** MEDIUM | **Effort:** 10-15 min
- **Path:** Dashboard > eCommerce > Settings > Email Notifications (or Email > Automated Emails)
- **Action:** Customize order confirmation and shipping confirmation with HotBox logo, brand colors, production timeline note.
- **Source:** CHECKOUT-CONVERSION-GUIDE.md, Section 2.1

### 3. Shipping Settings & Display
- **Fix ID:** CK-SH | **Priority:** MEDIUM | **Effort:** 10-15 min
- **Path:** Dashboard > eCommerce > Settings > Shipping & Fulfillment
- **Action:** Review rates, consider free shipping threshold ($75-$100), consider adding economy option, verify tax settings.
- **Source:** CHECKOUT-CONVERSION-GUIDE.md, Section 2.2

### 4. Variant Image Linking (Part A)
- **Fix ID:** CK-3a | **Priority:** HIGH | **Effort:** 20-40 min
- **Path:** Dashboard > Store Products > [Product] > Media
- **Action:** Upload color-specific mockup images for each variant. Link each image to its corresponding color option.
- **Source:** CHECKOUT-CONVERSION-GUIDE.md, Section 1.2 (Part A)

### 5. Free Shipping Messaging (if threshold configured)
- **Fix ID:** CK-FS | **Priority:** LOW | **Effort:** 5-10 min
- **Path:** Dashboard > eCommerce > Shipping rules / Site-wide banner
- **Action:** After configuring free shipping threshold in CK-SH, verify messaging appears or add manually.
- **Source:** CHECKOUT-CONVERSION-GUIDE.md, Section 3.2

---

## Editor-Only Fixes

Organized by page/area for efficient batch editing in the WIX Editor.

### Homepage Fixes (3 fixes, ~20-30 min)

| # | Fix ID | Title | Priority | Effort |
|---|--------|-------|----------|--------|
| 1 | AC-2 | Change "Hot Box Clothing" from H2 to H1 | Medium | 5 min |
| 2 | AC-1 | Update image alt text (logo, Elliptical Machine, carousel) | High | 10-15 min |
| 3 | AC-3 | Add footer navigation links + update copyright to 2026 | High | 15-30 min |

**Instructions:**
1. Open WIX Editor > Navigate to Homepage
2. Click "Hot Box Clothing" text > Change heading level from H2 to H1
3. Click each image > Update alt text per table in ACCESSIBILITY-FIXES.md
4. Click footer section > Add nav links (Home, Contact, Support, Store Policies, Gift Card) > Update "(c)2022" to "(c)2026"

### Navigation Fixes (2 fixes, ~45-90 min)

| # | Fix ID | Title | Priority | Effort |
|---|--------|-------|----------|--------|
| 1 | CR-5 | Create Shop All page (repurpose /shop-5) | Critical | 15-30 min |
| 2 | NV-1 | Restructure navigation menu | Critical | 30-60 min |

**Instructions:**
1. Pages & Menu > Find "Shop" page (/shop-5) > Rename to "Shop All" > Change slug to `/shop-all` > Link gallery to "All Products" collection
2. Pages & Menu > Site Menu > Create "Our Teams" dropdown folder > Move 5 client pages into it > Reorder to: Home, Shop All, Fun Shirts, Our Teams, Gift Card, Contact > Remove Support + Store Policies from nav

### Collection Page Fixes (4 fixes, ~1-2 hours)

| # | Fix ID | Title | Priority | Effort |
|---|--------|-------|----------|--------|
| 1 | CK-4 | Enable Add to Cart on all gallery pages (6 pages) | High | 15-30 min |
| 2 | NV-3 | Enable filters and sorting (7 pages) | High | 30-45 min |
| 3 | NV-5 | Change URL slugs (9 pages) | High | 15-30 min |
| 4 | CL-1 | Fix UNMH page heading (wrong branding) | High | 5 min |

**Instructions:**
1. On each collection page: Click Product Gallery > Settings > Enable "Add to Cart" button (match Board 30)
2. On each collection page: Settings > Display > Enable Filters + Sorting. Shop All gets Category + Price + Options; client pages get Price + Options only
3. For each page: Three-dot menu > SEO Basics > Change URL slug (see URL-SLUG-CHANGES.md for full mapping)
4. Navigate to UNMH page > Change heading from "Fall Pre-Order" to UNMH branding > Replace wildflower image

### Product Page Fixes (4 fixes, ~45-90 min)

| # | Fix ID | Title | Priority | Effort |
|---|--------|-------|----------|--------|
| 1 | NV-6 | Add Related Products widget | Medium | 15-30 min |
| 2 | CK-3b | Enable gallery-variant image linking | High | 10-15 min |
| 3 | CK-TS | Add trust signals below Add to Cart | High | 15-30 min |
| 4 | CL-2 | Fix "20256" typo on PreOrder description | Medium | 1 min |

**Instructions:**
1. On product page template: Add Related Products widget below social icons. Algorithm: "From Similar Categories". Show 4-6 products.
2. Product Gallery widget > Settings > Enable "Link gallery images to product options" (requires variant-specific images uploaded in Dashboard)
3. Below Add to Cart: Add text element "Secure Checkout | Free Returns on Defective Items | Custom Made to Order" or install trust badge app
4. Navigate to a PreOrder product page > Edit description > Fix "March 1st 20256" to "March 1st 2026" and remove double period

### Mobile Fixes (9 fixes, ~2-3 hours)

**IMPORTANT:** Switch to Mobile Editor view (phone icon in top toolbar) before making these changes.

| # | Fix ID | Title | Priority | Effort |
|---|--------|-------|----------|--------|
| 1 | CR-1 | Activate mobile-responsive layout | Critical | 30-60 min |
| 2 | MC-1 | Enable hamburger menu | Critical | 15-30 min |
| 3 | MC-2 | Mobile product gallery layout (7 pages) | Critical | 15-30 min |
| 4 | MC-3 | Reposition Add to Cart on mobile | High | 15-30 min |
| 5 | MC-4 | Increase color swatch tap targets to 44px | High | 5 min |
| 6 | MC-5 | Handle 32-color products (Fun Shirts) | High | 15-30 min |
| 7 | MC-6 | Fix tablet experience (768px) | Medium | 5 min |
| 8 | PT-1 | Resolve image lazy-loading | Medium | 5 min |
| 9 | CK-CT | Cart page mobile layout | Medium | 15-30 min |

**Instructions:**
1. Mobile Editor > Set all containers to Full Width. No fixed widths > 375px. All pages.
2. Header > Add hamburger menu component > Configure with 6-item nav (Home, Shop All, Fun Shirts, Our Teams, Gift Card, Contact)
3. Each collection page > Product Gallery > Settings > 1-2 products per row, full width, Add to Cart ON
4. Product page template > Stack layout vertically > Add to Cart within 1.5 viewports from top, full width, 44px height
5. Product page > Color picker settings > Swatch size 44x44px, 8px spacing
6. Fun Shirts products > Try scrollable container (200px height) or collapsible section or color dropdown
7. Verify at 768px after CR-1 -- should auto-resolve
8. Verify images load on scroll after CR-1 -- should auto-resolve
9. Cart page > Stack vertically, full-width controls, 44px tap targets for buttons

### Cart/Checkout Fixes (1 fix + 1 optional, ~20-40 min)

| # | Fix ID | Title | Priority | Effort |
|---|--------|-------|----------|--------|
| 1 | CK-UP | Cart page upsell/cross-sell | Low | 15-30 min |
| 2 | CL-5 | Remove CompanyCasuals external link | Low | 5 min |

**Instructions:**
1. Cart page > Add Related Products widget below cart items. Use "Best Sellers" or "From Similar Categories" algorithm.
2. Big Barn page > Find subheading with www.CompanyCasuals.com link > Remove or replace with internal store link.

---

## Verification-Only Items

These require checking the live site but no code/editor changes.

### QW-6: Breadcrumb Collection Assignment
- **Status:** Verified correct at API level (Plan 02-02)
- **Action:** Check product breadcrumbs on live site by navigating from different pages. If breadcrumbs show incorrect collection, this is a WIX platform behavior (uses page context, not collection order).

### CK-5: Sezzle BNPL on Mobile Checkout
- **Status:** Sezzle works on desktop product pages. Needs mobile verification.
- **Action:** After all mobile fixes complete, verify Sezzle widget displays correctly on mobile checkout page at 375px.

### AC-4: Keyboard Navigation (Known Limitation)
- **Status:** WIX uses custom dropdown elements, not native `<select>`. Platform limitation.
- **Action:** No fix possible. Hamburger menu should support keyboard via WIX's built-in component.

---

## Cross-Reference: Fix to Source Guide

| Fix ID | Title | Source Document | Phase | Plan |
|--------|-------|----------------|-------|------|
| CR-5 | Shop All page | SHOP-ALL-PAGE.md | 02 | 02-03 |
| NV-1 | Navigation restructure | NAVIGATION-RESTRUCTURE.md | 02 | 02-03 |
| CK-4 | Gallery standardization | GALLERY-STANDARDIZATION.md | 02 | 02-05 |
| NV-5 | URL slug changes | URL-SLUG-CHANGES.md | 02 | 02-02 |
| AC-2 | Homepage H1 | ACCESSIBILITY-FIXES.md | 02 | 02-02 |
| AC-1 | Image alt text | ACCESSIBILITY-FIXES.md | 02 | 02-02 |
| AC-3 | Footer nav + copyright | ACCESSIBILITY-FIXES.md | 02 | 02-02 |
| CL-1 | UNMH page heading | UX-ISSUES.md (QW-2) | 01 | 01-03 |
| CL-2 | PreOrder typo | UX-ISSUES.md (QW-3) | 01 | 01-03 |
| NV-2 | Site search | SITE-SEARCH-SETUP.md | 02 | 02-04 |
| NV-3 | Filters & sorting | PRODUCT-FILTERS-SORTING.md | 02 | 02-04 |
| NV-6 | Related products | RELATED-PRODUCTS.md | 02 | 02-05 |
| CR-1 | Mobile responsive layout | MOBILE-OPTIMIZATION-MASTER.md | 03 | 03-01 |
| MC-1 | Hamburger menu | MOBILE-OPTIMIZATION-MASTER.md | 03 | 03-01 |
| MC-2 | Mobile gallery layout | MOBILE-OPTIMIZATION-MASTER.md | 03 | 03-02 |
| MC-3 | Add to Cart position | MOBILE-OPTIMIZATION-MASTER.md | 03 | 03-02 |
| MC-4 | Swatch tap targets | MOBILE-OPTIMIZATION-MASTER.md | 03 | 03-02 |
| MC-5 | 32-color handling | MOBILE-OPTIMIZATION-MASTER.md | 03 | 03-02 |
| MC-6 | Tablet experience | MOBILE-OPTIMIZATION-MASTER.md | 03 | 03-01 |
| PT-1 | Image lazy-loading | MOBILE-OPTIMIZATION-MASTER.md | 03 | 03-02 |
| CK-CT | Cart page mobile | MOBILE-OPTIMIZATION-MASTER.md | 03 | 03-03 |
| CK-3 | Variant image switching | CHECKOUT-CONVERSION-GUIDE.md | 04 | 04-03 |
| CK-AB | Abandoned cart emails | CHECKOUT-CONVERSION-GUIDE.md | 04 | 04-03 |
| CK-OC | Order confirmation emails | CHECKOUT-CONVERSION-GUIDE.md | 04 | 04-03 |
| CK-SH | Shipping settings | CHECKOUT-CONVERSION-GUIDE.md | 04 | 04-03 |
| CK-TS | Trust signals | CHECKOUT-CONVERSION-GUIDE.md | 04 | 04-03 |
| CK-UP | Cart upsell | CHECKOUT-CONVERSION-GUIDE.md | 04 | 04-03 |
| CK-FS | Free shipping messaging | CHECKOUT-CONVERSION-GUIDE.md | 04 | 04-03 |
| CL-5 | CompanyCasuals link | UX-ISSUES.md (CL-5) | 01 | 01-03 |
| CK-5 | Sezzle mobile verify | MOBILE-OPTIMIZATION-MASTER.md | 03 | 03-03 |
| QW-6 | Breadcrumb verify | ACCESSIBILITY-FIXES.md | 02 | 02-02 |
| AC-4 | Keyboard nav (limitation) | MOBILE-OPTIMIZATION-MASTER.md | 03 | 03-01 |

---

*Generated by Plan 11-01 execution. Single-source master checklist for all pending WIX Editor and Dashboard fixes.*
*Start at Wave 1 and work through in order. Reference source documents for detailed step-by-step instructions.*
