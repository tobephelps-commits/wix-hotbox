# Audit Summary: Hot Box Clothing

**Date:** 2026-01-29
**Phase:** 01 - Site Audit & Discovery
**Plans:** 01-01 (Site Structure), 01-02 (Product Catalog), 01-03 (UX Issues)
**Site:** https://www.hotboxclothing.shop

---

## Store Snapshot

| Metric | Value |
|--------|-------|
| Total pages | 13 static + 105 product |
| Total products | 105 (all visible, all "in stock") |
| Collections | 10 (4 client, 3 product-type, 1 status, 1 beverage, 1 system) |
| Client landing pages | 6 (Big Barn, AIM, Fall PreOrder, UNMH, Board 30, LMNT) |
| Installed apps | 68+ instances (8 key: Stores, eCommerce, Bookings, Video, Subscriptions, Inbox, Forms, Invoices) |
| Inventory tracking | 0% (zero products track stock) |
| Search functionality | None |
| Filtering/sorting | None |
| Mobile responsiveness | None (fixed 980px layout) |
| Products with no description | ~15 (14%) |
| Products with no images | 1 |
| Broken product pages | 2 (both LMNT) |
| Checkout policies configured | 0 |

---

## Top 5 Conversion Killers

These are the five issues most likely to cause a visitor to leave without purchasing, ranked by estimated impact.

### 1. The Entire Mobile Experience Is Broken

The site has zero responsive design. At 375px (iPhone), the body is 981px wide -- forced horizontal scrolling on every page. The nav does not collapse. Products do not render on category pages. The Add to Cart button is 2 screen-heights below the fold. 50% of traffic is mobile.

**Evidence:** Body scroll width 981px at 375px viewport. Zero products visible on category pages at mobile width. Add to Cart at y=1540 (viewport height 812px).

**Estimated revenue impact:** This single issue likely drives the majority of mobile abandonment. If mobile is 50% of traffic and nearly 100% of mobile visitors bounce due to broken layout, the store is losing roughly half its potential sales.

### 2. Chat Widget Blocks Purchasing

The "Let's Chat!" Wix Chat popover intercepts click events on product option selectors (color swatches, dropdowns). Customers physically cannot select options to add products to cart without fighting a floating overlay. This was reproducibly confirmed via Playwright automation -- the chat widget's DOM element intercepts pointer events.

**Evidence:** Playwright click timeout on color radio -- chat widget's `popover-element` div intercepts pointer events. Confirmed on desktop and mobile.

**Estimated revenue impact:** Even desktop customers who find the right product hit a wall when trying to configure their order. Some will persist; many will leave.

### 3. No Way to Browse the Full Catalog

There is no "Shop All" page. No search. No filtering. No sorting. The only navigation paths are client-specific pages that mean nothing to new visitors. A customer who wants to browse t-shirts, hoodies, or any product category has no path forward.

**Evidence:** Zero search inputs found. Zero filter controls on any page. "All Products" collection exists in WIX but has no page. Nav lists business names (Big Barn Crossfit, UNMH) not product categories.

**Estimated revenue impact:** First-time visitors who don't know the client names have no way to find products. This eliminates discovery-based purchasing entirely.

### 4. No Inventory Tracking

All 105 products blindly accept orders regardless of SanMar blank availability. When a customer orders a size/color combination that SanMar is out of, the store cannot fulfill the order. This creates refund requests, customer service burden, and reputation damage.

**Evidence:** 105/105 products: `trackInventory: false`, `manageVariants: false`.

**Estimated revenue impact:** Not a direct conversion loss, but every unfulfillable order costs money (refund processing, customer time, reputation) and may lose a customer permanently.

### 5. Zero Trust Signals at Checkout

No return policy, no shipping policy, no privacy policy, no terms and conditions are displayed at checkout. The policy agreement checkbox is visible and auto-checked, but there are no policies to agree to. A clothing store asking for payment with zero visible policies is a red flag for cautious shoppers.

**Evidence:** WIX API `checkoutSettings`: All 6 policy fields have `visible: false, content: ""`. No size guide anywhere on a multi-brand clothing store.

**Estimated revenue impact:** Cart abandonment at the payment step. Cautious shoppers (especially first-time visitors) will not complete purchase without return/shipping information.

---

## Phase 2 Priorities (Navigation & Product Discovery)

Phase 2 should address these issues first, roughly in this order:

1. **Remove or reposition the chat widget** -- 5-minute fix that unblocks purchasing (Quick Win)
2. **Create a "Shop All" page** with the full 105-product catalog
3. **Add search functionality** (WIX has a built-in site search app)
4. **Restructure navigation** -- replace client business names with product categories (Shirts, Hoodies, Accessories, etc.). Keep client pages accessible via a secondary path.
5. **Add product filtering and sorting** on all category pages (size, color, price, garment type)
6. **Fix content errors** -- UNMH wrong heading, PreOrder typo, Big Barn Team Hat missing content, broken LMNT pages
7. **Rename URL slugs** from WIX defaults to descriptive paths
8. **Add related products** to product detail pages (cross-selling)
9. **Fix breadcrumb collection assignments** so products show their correct category

---

## Phase 3 Priorities (Mobile Experience)

Phase 3 should address these issues:

1. **Enable WIX mobile editor** and create a proper mobile layout with responsive breakpoints
2. **Implement hamburger menu** for mobile navigation
3. **Fix product gallery rendering** so products are visible on mobile
4. **Ensure Add to Cart button** is visible within one scroll on product pages
5. **Increase color swatch tap targets** to minimum 44x44px
6. **Optimize the 32-color Fun Shirts** -- either use a dropdown instead of radio buttons on mobile, or curate to the 8-10 most popular colors
7. **Ensure the chat widget** (if kept) does not overlap interactive elements on mobile
8. **Test tablet experience** at 768px to ensure it does not overflow

---

## Phase 4 Priorities (Checkout & Conversion)

Phase 4 should address these issues:

1. **Configure checkout policies** -- add return policy, shipping policy, privacy policy, and terms
2. **Add size guides** for each brand/garment type (Bella+Canvas, Next Level, Gildan, etc.)
3. **Enable variant image switching** so color selection updates the product photo
4. **Add "Add to Cart" buttons** to all product gallery pages (not just Board 30)
5. **Ensure Sezzle BNPL** loads consistently on all eligible products
6. **Add urgency/scarcity signals** where appropriate (limited stock, pre-order deadlines)

---

## Architectural Observations

### Multi-Client Model
The store operates as a custom apparel provider for multiple business clients (gyms, studios, hospitals). Each client gets a dedicated landing page with curated products. This is a legitimate business model but the current implementation makes it the ONLY way to browse products, which alienates all non-client visitors.

**Recommendation:** Maintain client pages as one navigation path, but add a parallel category-based path (by garment type) for general visitors. Both paths should coexist.

### Catalog Organization
- **Graphics collection is not clothing** -- 22 add-on items ($1-$10) that are decoration services, not standalone products. They should be presented differently (as an add-on step) rather than mixed into product galleries.
- **LMNT drinks are not clothing** -- 2 beverage products (pickup only, no shipping) dilute the brand. Consider removing from the main store.
- **Duplicate product** -- Stanley/Stella Nora Hoodie exists in both Board30 and PreOrder collections. Consolidate.
- **Orphan product** -- New Era 1/4-Zip exists only in "All Products" and is not visible on any page.

### Technical State
- WIX platform is stable -- zero critical JavaScript errors
- Firebase warnings from chat widget are cosmetic
- No performance-blocking issues beyond lazy-loading on category pages
- WIX API is fully functional for all product/collection/checkout operations
- 68+ installed apps is excessive -- Bookings, Video, and Subscriptions are likely unnecessary for a clothing store

### Store Health
The store is functional on desktop for users who already know which client page to visit. For everyone else -- mobile users, new visitors, shoppers who want to browse -- the store is effectively broken. The combination of no mobile design, no search/filter, client-centric navigation, and a chat widget that blocks purchasing creates a death spiral of friction.

---

## Recommendations

### Should the roadmap change?
The current phase order (2: Navigation, 3: Mobile, 4: Checkout) is correct. However:

1. **Quick Wins should be executed immediately** -- before Phase 2 starts. Disabling the chat widget, fixing the UNMH heading, fixing the typo, and adding content to Big Barn Team Hat are 30-minute fixes that improve the store today.

2. **Phase 3 (Mobile) may need to be elevated** -- mobile responsiveness is arguably more urgent than navigation restructuring because 50% of traffic sees a completely broken site. However, enabling mobile in WIX may require re-doing navigation work, so the current order (nav first, then mobile) avoids rework.

3. **Phase 5 (SanMar API) should start in parallel** once API credentials are obtained. It has no dependency on Phases 2-4 and the inventory gap (finding #4) is a ticking time bomb.

4. **No new phases needed.** All 35 issues map to existing phases. The roadmap coverage is comprehensive.

### Bottom Line

The store is losing significant revenue from:
- ~50% of traffic (mobile) seeing a completely broken experience
- Desktop users fighting the chat widget to complete purchases
- New visitors unable to browse or discover products
- Zero trust signals at checkout

Fixing the Quick Wins + completing Phases 2-4 will transform this from a barely-functional client portal into a proper e-commerce storefront.

---

*Audit complete. 3 plans, 35 issues identified, all mapped to target phases with evidence and severity ratings.*
