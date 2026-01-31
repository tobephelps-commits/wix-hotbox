# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** Effortless product creation -- enter a SanMar style number and get a draft WIX product with pricing, variants, and images ready for review.
**Current focus:** Phase 9 IN PROGRESS -- Automated Stock Sync. Plan 01 complete, Plan 02 next.

## Current Position

Phase: 9 of 10 (Automated Stock Sync)
Plan: 1 of 2 in current phase
Status: In progress
Last activity: 2026-01-31 -- Completed 09-01-PLAN.md

Progress: █████████░ 91%

## Performance Metrics

**Velocity:**
- Total plans completed: 30
- Average duration: ~1 session
- Total execution time: 30 sessions

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Site Audit | 3/3 | 3 sessions | 1 session |
| 2. Navigation | 5/5 | 5 sessions | 1 session |
| 3. Mobile | 3/3 | 3 sessions | 1 session |
| 4. Checkout | 3/3 | 3 sessions | 1 session |
| 5. SanMar API | 5/5 | 5 sessions | 1 session |
| 6. Product Pipeline | 5/5 | 5 sessions | 1 session |
| 7. Pricing & Variant | 3/3 | 3 sessions | 1 session |
| 8. Inventory Monitor | 2/2 | 2 sessions | 1 session |

**Recent Trend:**
- Last 5 plans: 07-03, 08-01, 08-02, 09-01
- Trend: Consistent 1-session execution

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- UX improvements first, SanMar integration second (store is live, losing conversions)
- Draft-first product publishing (owner reviews before going live)
- Phase order confirmed: Navigation (P2) before Mobile (P3) to avoid rework
- Uninstalled Wix Inbox app to remove chat widget (chat was #1 conversion blocker)
- Hidden LMNT products (reversible) rather than deleting -- owner can restore if needed
- WIX page content changes require WIX Editor -- documented 4 manual fixes needed
- WIX REST API confirmed unable to manage page slugs -- documented 9 slug changes for manual execution
- Repurpose /shop-5 as Shop All page (has existing Product Gallery widget)
- 6-item nav bar: Home | Shop All | Fun Shirts | Our Teams dropdown | Gift Card | Contact
- WIX Site Search app requires WIX Editor installation
- Category filter on Shop All, Price + Product Options filters on all client collection pages
- WIX Recommendations API has 4 active algorithms; "From Similar Categories" recommended for Related Products
- Board 30 is the only collection page with Add to Cart in gallery; all others need enabling
- Mobile optimization is exclusively a WIX Editor operation -- zero REST API endpoints for layout/responsive/mobile
- Side cart (mini-cart drawer) is best mobile cart component -- fills viewport correctly
- WIX checkout page has its own responsive layout -- likely already mobile-optimized
- Master mobile guide organized in 3 priority tiers: Critical (3), High-Impact (5), Checkout (2)
- WIX customPolicy slot used as "Shipping Policy" (no dedicated shipping policy field exists)
- Digital Item Policy kept hidden -- HotBox sells physical apparel only
- Checkout policies are live immediately via API -- no WIX Editor needed
- V1 additionalInfoSections used for size guides (site is Catalog V1, not V3)
- Non-apparel products excluded from size guides (Graphics, LMNT, accessories)
- Abandoned cart recovery emails identified as #1 ROI conversion optimization (0 abandoned checkouts recorded)
- CK-3 variant image switching requires both media upload AND WIX Editor gallery-to-variant linking
- 7 remaining manual checkout/conversion fixes documented in CHECKOUT-CONVERSION-GUIDE.md
- ESM module system (type: module) for SanMar API client project
- NodeNext module resolution with .js extensions in TypeScript imports
- Interface over type alias for all API response shapes (extensibility)
- Separate auth objects for SanMar Standard vs PromoStandards API families
- Preserved SanMar API typo "errorOccured" in types to match actual responses
- Module-level Map singleton for SOAP client caching (not class-based)
- 8 error types covering all documented SanMar failure modes (credentials, style, color, size, timeout, connection, SOAP fault, unknown)
- Non-retryable user errors vs retryable transient errors for retry logic
- Default retry: 3 attempts, 1s base delay, 10s max with exponential backoff
- catalogColor parameter naming in service functions prevents #1 SanMar API pitfall
- getProductVariant returns null for not-found (expected case, not error)
- Media service uses PromoStandards v1.1.0 for GetMediaContent
- services/ subdirectory pattern for domain-specific API wrappers
- getEffectivePrice returns sale price when active, regular piecePrice otherwise
- Batch inventory chunks at 200 partIds sequentially (not parallel) for SanMar server load
- Inventory cap 1500 treated as "well stocked" indicator (actual qty is higher)
- Dozen pricing completely ignored per deprecation notice
- Pricing WSDL arg0 is array type -- must wrap query in array unlike product info
- Pricing response has fields directly in listResponse items (not nested under productPriceInfo)
- Media WSDL has namespace collisions -- XML fallback parser extracts data from raw SOAP response
- Media method is getMediaContent (lowercase g), not GetMediaContent
- SanMar Standard inventory requires specific color+size -- switched to PromoStandards getInventoryLevels for style-level queries
- errorOccurred (double-r) in pricing/inventory WSDLs vs errorOccured (single-r) in product info WSDL
- PromoStandards inventory returns actual counts (not capped at 1500) unlike Standard endpoint
- describeClient() + raw response inspection are essential for discovering actual WSDL method signatures
- WIX V1 types enforce draft-first at type level: visible: false, manageVariants: true as literal types
- displayColor ALWAYS in WIX-facing data; catalogColor ONLY for SanMar API queries
- Media payload: 1 front image per color + primary/high-res, capped at 15 (WIX limit)
- Variant SKU format: {style}-{catalogColor}-{size} for SanMar traceability
- Uniform pricing across variants in Phase 6; variable pricing deferred to Phase 7
- Native fetch over axios for WIX API calls -- Node.js 18+ built-in, no extra dependency
- WIX site ID hardcoded as constant (single-site deployment), not env var
- wix-site-id header included in all WIX API requests for V1 compatibility
- Function-export module pattern for WIX API service (not class-based), matching SanMar service pattern
- 4 SanMar queries in parallel (Promise.all) for fetchProductData -- independent endpoints
- fileURLToPath + path.resolve for CLI guard (import.meta.url encodes spaces as %20 on Windows)
- ProductData includes pre-computed imagesByColor and ProductPreview to avoid recomputation
- create-product CLI auto-selects ALL colors/sizes for quick-create testing mode
- Zero external dependencies for preview server -- Node.js built-in http module only
- Self-contained preview HTML -- no CDN, no build tools, no React, pure vanilla JS
- In-memory style cache reuses ProductData between GET /api/product and POST /api/create
- Port fallback (try next port if default 3456 in use) for developer convenience
- Pure-function pricing engine with no SanMar API dependencies (scripts/pipeline/pricing-rules.ts)
- Size upcharges applied AFTER rounding as flat dollar add-ons (not percentages)
- 7 category pricing presets: standard-tee (100%), premium-tee (120%), hoodie-fleece (80%), polo-woven (90%), outerwear (70%), headwear (100%), custom (100%)
- nearest-99 rounding as default across all presets
- Outerwear has higher extended-size upcharges ($4-$10) vs standard tees ($2-$6)
- CuratedProduct.pricingConfig replaces basePrice -- all pipeline modules use PricingConfig for pricing
- Base product listing price = calculateRetailPrice (standard size, no upcharges) for WIX product-level display
- CLI --price flag derives markup from wholesale with no rounding; default is standard-tee preset
- Client-side pricing presets duplicated in preview.html (self-contained HTML, no build tools or API endpoint needed)
- Color cards sorted in-stock first, then alphabetical by displayColor for curation efficiency
- Color filter uses CSS display:none toggling (no DOM removal) for performance with 40+ color styles
- Preview UI preset dropdown auto-populates controls; manual edits switch to "Custom" preset automatically
- Only latest inventory snapshot persisted per style (overwrite, not append) for simple change detection
- data/ directory gitignored -- monitor state is runtime data, not source control
- Style numbers normalized to uppercase on CLI add/remove for SanMar API consistency
- Transition-only alerting: only alert on stock level CHANGES, not every poll where stock is low
- First-poll flood prevention: skip low-stock alerts on initial poll (only critical/out-of-stock)
- 1000-entry alert log cap with FIFO trimming to prevent unbounded growth
- Barrel export (index.ts) provides clean import surface for Phase 9 consumption
- SKU parsing for sync: strip style prefix, last dash-segment is size, middle is catalogColor
- Visibility-only variant updates: carry over existing price/weight/SKU, change only visible field
- Product mapping store (data/sync/product-map.json) links SanMar styles to WIX product IDs
- WIX V1 product query endpoint uses stringified filter object (V1 API quirk)

### Key Findings (Phase 1)

- **Site ID:** `c744cbdb-46f8-4c66-ac76-eb31bd0d52c1`
- **105 products** across **10 collections**, **13 static pages**, **6 client landing pages**
- **35 total UX issues identified** -- 7 critical, 12 high, 12 medium, 4 low
- **Top 5 Conversion Killers:** (1) Broken mobile, (2) Chat widget blocks purchasing, (3) No catalog browsing, (4) No inventory tracking, (5) Zero trust signals at checkout
- **WIX REST API limitations:** No API for page content, navigation menus, footer, widget config, page slugs, or page creation

### Key Findings (Phase 3)

- **No hamburger menu** -- site built without mobile navigation component
- **Fixed 950px nav bar** -- does not collapse or respond to viewport size
- **0/15 header tap targets** meet 44px WCAG minimum (all 30px height)
- **Body scroll width = 981px** at all viewports (606px overflow on mobile)
- **ALL product content off-screen on mobile** -- Product info at x=350, Add to Cart at x=350 AND y=1447
- **Color swatches 32x32px** -- 27% below 44px WCAG 2.1 minimum; 32-color Fun Shirts unusable
- **Board 30 only functional mobile collection page** -- Only page with Add to Cart in gallery
- **Side-by-side product layout does not reflow** to stacked vertical on mobile
- **Cart page dollar amounts off-screen** (x=918-930, 555px past 375px viewport)
- **Cart icon unreachable on mobile** (x=946)
- **6 payment methods detected** (Standard, Apple Pay, PayPal, Pay Later, Venmo, Google Pay)
- **Sezzle BNPL widget partially off-screen** on mobile (CK-5 confirmed)

### Key Fixes Applied (Phase 2, Plan 02-01)

- **Chat widget REMOVED** -- Uninstalled Wix Inbox app; product interaction now unblocked
- **LMNT products HIDDEN** -- Both broken 404 pages no longer reachable via storefront
- **Big Barn Team Hat** -- Added product description (still needs images from owner)

### Key Fixes Applied (Phase 4, Plan 04-01)

- **5 checkout policies CONFIGURED** -- Terms, Privacy, Return, Contact Us, Shipping Policy all visible at checkout
- **CK-1 RESOLVED** -- Zero checkout policies was top-5 conversion killer; now 5 policies in checkout footer
- **Verified via Playwright** -- All 5 policy links confirmed on live checkout page with popup content

### Key Fixes Applied (Phase 4, Plan 04-02)

- **Size guide info sections ADDED** -- 15 brand-specific size charts + "How to Measure" on all clothing products
- **CK-2 RESOLVED** -- No size guide was HIGH severity issue; now all apparel has brand-specific sizing info
- **15 brands identified** -- Bella+Canvas, Next Level, Gildan, Sport-Tek, District, Stanley/Stella, Allmade, North Face, Adidas, Port & Company, Port Authority, Columbia, New Era, TriDri, Mercer+Mettle, Devon & Jones
- **Verified via API** -- Multiple sample products confirmed across different brands

### Documentation Created (Phase 2)

- **URL-SLUG-CHANGES.md** (02-02) -- 9 WIX default slugs to SEO-friendly paths
- **ACCESSIBILITY-FIXES.md** (02-02) -- Homepage H1, image alt text, footer nav, breadcrumbs
- **SHOP-ALL-PAGE.md** (02-03) -- Create Shop All page (repurpose /shop-5)
- **NAVIGATION-RESTRUCTURE.md** (02-03) -- Customer-centric navigation hierarchy
- **SITE-SEARCH-SETUP.md** (02-04) -- Wix Site Search app installation and config
- **PRODUCT-FILTERS-SORTING.md** (02-04) -- Product filters and sorting on 7 collection pages
- **RELATED-PRODUCTS.md** (02-05) -- Related Products widget with algorithm recommendations
- **GALLERY-STANDARDIZATION.md** (02-05) -- Add to Cart on all collection page galleries

### Documentation Created (Phase 3)

- **MOBILE-NAV-OPTIMIZATION.md** (03-01) -- Mobile menu, touch targets, header layout, responsive navigation
- **MOBILE-PRODUCT-PAGES.md** (03-02) -- Mobile gallery layout, product detail page, swatch sizing, image loading
- **MOBILE-CHECKOUT-FLOW.md** (03-03) -- Mobile cart/checkout audit and WIX Editor instructions
- **MOBILE-OPTIMIZATION-MASTER.md** (03-03) -- Consolidated master guide with all Phase 3 fixes prioritized

### Documentation Created (Phase 4)

- **CHECKOUT-POLICIES-LOG.md** (04-01) -- Full API change log for checkout policy configuration
- **CHECKOUT-CONVERSION-GUIDE.md** (04-03) -- All remaining checkout/conversion optimizations (7 manual fixes)

### Manual Fixes Pending (Require WIX Editor)

From Phase 2 (Plans 02-01 through 02-05): 17 fixes
See individual SUMMARY files for complete lists: 02-01 through 02-05

From Plan 03-01:
18. Enable mobile menu and configure hamburger navigation (see MOBILE-NAV-OPTIMIZATION.md)
19. Configure mobile header layout with proper touch targets (see MOBILE-NAV-OPTIMIZATION.md)
20. Test and verify responsive behavior at 375px, 768px, and 1024px (see MOBILE-NAV-OPTIMIZATION.md)

From Plan 03-02:
21. Configure mobile product gallery layout on all collection pages (see MOBILE-PRODUCT-PAGES.md)
22. Optimize product detail page for mobile (stacked layout, ATC, swatches) (see MOBILE-PRODUCT-PAGES.md)
23. Verify product image lazy-loading after mobile layout fixes (see MOBILE-PRODUCT-PAGES.md)

From Plan 03-03:
24. Configure side cart as primary mobile cart experience (see MOBILE-CHECKOUT-FLOW.md)
25. Verify Sezzle BNPL widget visibility on mobile checkout (see MOBILE-CHECKOUT-FLOW.md)

From Plan 04-03:
26. Enable abandoned cart recovery emails (see CHECKOUT-CONVERSION-GUIDE.md)
27. CK-3: Configure variant image switching -- upload color-specific mockups + enable gallery-variant linking (see CHECKOUT-CONVERSION-GUIDE.md)
28. Customize order confirmation and shipping notification emails (see CHECKOUT-CONVERSION-GUIDE.md)
29. Review shipping settings and consider free shipping threshold (see CHECKOUT-CONVERSION-GUIDE.md)
30. Add trust signals to product pages (see CHECKOUT-CONVERSION-GUIDE.md)
31. Add cart page upsell/cross-sell suggestions (see CHECKOUT-CONVERSION-GUIDE.md)
32. Configure free shipping threshold messaging (see CHECKOUT-CONVERSION-GUIDE.md)

### Blockers/Concerns

- ~~SanMar API credentials not yet provisioned~~ -- RESOLVED: credentials active, all endpoints verified
- WIX page content editing requires WIX Editor -- 32 manual fixes pending for store owner
- **Recommendation:** Store owner should execute all pending WIX Editor/Dashboard changes before Phase 6
- **Dependency:** MOBILE-NAV-OPTIMIZATION.md requires NAVIGATION-RESTRUCTURE.md first
- **Dependency:** MOBILE-PRODUCT-PAGES.md requires GALLERY-STANDARDIZATION.md and MOBILE-NAV-OPTIMIZATION.md first

## Session Continuity

Last session: 2026-01-31
Stopped at: Completed 09-01-PLAN.md (WIX stock sync service)
Resume file: .planning/phases/09-automated-stock-sync/09-02-PLAN.md
Next: Execute 09-02 (notification system for stock alerts)
