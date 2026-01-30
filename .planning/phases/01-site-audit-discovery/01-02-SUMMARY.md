# Plan Summary: 01-02 Product Catalog Audit

**Phase:** 01 - Site Audit & Discovery
**Plan:** 01-02
**Status:** Complete
**Date:** 2026-01-29

---

## What Was Done

Audited the complete product catalog of hotboxclothing.shop using WIX REST API data extraction and live Playwright browser inspection of category pages and product detail pages.

### Task 1: WIX API Product Catalog Extraction
- Queried all 105 products via WIX Stores V1 API with paginated calls (offset 0-100, 100-105)
- Extracted full product data: name, price, cost, SKU, variants, options, images, descriptions, collections
- Queried all 10 collections and mapped collection IDs to product assignments
- Analyzed pricing, margins, variant patterns, description quality, and data completeness
- Identified 1 duplicate product (Stanley/Stella Nora Hoodie in Board30 + PreOrder)
- Identified 1 orphan product (New Era 1/4-Zip only in All Products)
- Discovered ALL 105 products have inventory tracking disabled

### Task 2: Live Browser Product Page Inspection
- Navigated to 6 category pages (Big Barn, Board 30, AIM, UNMH, Fun Shirts, Fall PreOrder) + homepage
- Captured accessibility tree snapshots of each page for structural analysis
- Took 5 screenshots documenting layout issues and product detail UX
- Inspected 6 product detail pages sampling different product types:
  - Big Barn clothing (BELLA+CANVAS Triblend Tee): 3 option types, 6 images, Sezzle payments
  - Board 30 apparel (Sport-Tek Women's Short): SKU visible, color + size options
  - Fun Shirt (Lifting Chakras): 32 color radio buttons, massive UX problem
  - Drinkware (Yeti Hotshot Rambler): Custom text field for name engraving
  - No-data product (Big Barn Team Hat): Zero images, zero description, zero options
  - Broken product (LMNT Drink Mix): 404 error on both LMNT products
- Tested color variant selection via JavaScript (chat widget blocked normal clicks)
- Checked console errors across pages (Firebase errors on PreOrder, 404s on LMNT)

---

## Key Findings

### Critical Issues Identified

1. **No inventory tracking on any product** -- ALL 105 products have `trackInventory: false`. The store blindly accepts orders without knowing if SanMar blanks are available. Biggest operational risk.

2. **Both LMNT product pages return 404** -- Products exist in the API catalog but their storefront pages are broken. Customers navigating to these products see "This product couldn't be found."

3. **No filtering, sorting, or search on any page** -- Zero product discovery tools. Customers must scroll through every product to find what they want.

4. **Chat widget blocks product interaction** -- The "Let's Chat!" popover intercepts clicks on color swatches and option controls. Users must close it before selecting variants. Conversion killer.

5. **Big Barn Team Hat has no images, no description, no options** -- A $28 product with zero content. Customers cannot see what they are buying.

6. **UNMH page has wrong heading** -- Says "Fall Pre-Order" instead of UNMH content. Already flagged in plan 01-01, confirmed still present.

7. **Fall PreOrder page has typo** -- "March 1st 20256" visible to customers. Already flagged in plan 01-01, confirmed still present.

### Moderate Issues

8. **Inconsistent gallery layouts** -- Board 30 has "Add to Cart" buttons in the gallery; all other pages require clicking into product detail first.

9. **Severe lazy-loading rendering issue** -- Product images fail to render below the fold in full-page screenshots, making the store appear empty or broken.

10. **No cross-selling or related products** -- Every product page ends at social sharing icons. Zero "You might also like" or "Customers also bought."

11. **No size guides** -- Clothing store with multiple brands and fits, but zero size chart information.

12. **32 color options on Fun Shirts** -- Full Gildan 8000 color palette displayed as radio buttons. Decision paralysis on desktop, unusable on mobile.

13. **Variant selection does not update product image** -- Changing color shows no visual preview.

14. **Incorrect breadcrumbs** -- Products show wrong collection in breadcrumb navigation (e.g., Big Barn product shows "Fall PreOrder" breadcrumb).

15. **SanMar catalog descriptions copy-pasted** -- ~40 products have raw manufacturer descriptions starting with "Description of [Brand] [SKU]".

### Structural Facts

| Metric | Value |
|--------|-------|
| Total products | 105 |
| Total collections | 10 |
| Products with inventory tracking | 0 (0%) |
| Products with no description | ~15 (14%) |
| Products with no images | 1 (Big Barn Team Hat) |
| Broken product pages | 2 (both LMNT drinks) |
| Duplicate products | 1 (Stanley/Stella Nora Hoodie) |
| Products with SKU | ~35 (33%) |
| Discount/clearance items | 2 (75% off, likely abandoned) |
| Category pages with filters | 0 |
| Category pages with search | 0 |
| Product pages with cross-selling | 0 |
| Product pages with size guide | 0 |

---

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | `def55b5` | `audit(01-02): extract complete product catalog via WIX API` |
| 2 | `b646fa6` | `audit(01-02): browser inspection of live product pages and catalog UX` |

---

## Output Files

- `.planning/phases/01-site-audit-discovery/PRODUCT-CATALOG.md` -- Complete product catalog document (primary deliverable)

---

## Deviations

- **API response truncation:** First product query (limit 100, includeVariants true) exceeded context limits at ~50K characters. Resolved by making additional paginated queries with limit 25 and includeVariants false.
- **Collection numberOfProducts always 0:** WIX Collections API returns `numberOfProducts: 0` for all collections -- a known API quirk. Computed product counts by cross-referencing `collectionIds` arrays on each product instead.
- **Chat widget blocked clicks:** The "Let's Chat!" Wix chat popover intercepted all click events on color radio buttons during browser testing. Used JavaScript `evaluate()` to remove the widget and force-click elements.
- **LMNT product pages broken:** Both LMNT product URLs return 404. Could not inspect these product detail pages. Documented as a critical finding.
- **Fun Shirts count discrepancy:** API data shows 14 Fun Shirts, browser shows 13 on the live page. One product may be hidden or miscounted.

---

*Plan 01-02 complete. Product catalog fully audited. Ready for Plan 01-03 (UX Issues Identification).*
