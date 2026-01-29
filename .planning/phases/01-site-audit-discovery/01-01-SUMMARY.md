# Plan Summary: 01-01 Site Structure Mapping

**Phase:** 01 - Site Audit & Discovery
**Plan:** 01-01
**Status:** Complete
**Date:** 2026-01-29

---

## What Was Done

Mapped the complete site structure of hotboxclothing.shop using both WIX REST API data extraction and live Playwright browser inspection.

### Task 1: WIX API Data Extraction
- Connected to WIX API, identified site ID: `c744cbdb-46f8-4c66-ac76-eb31bd0d52c1`
- Extracted site properties (business info, location, currency, timezone)
- Cataloged 68+ installed app instances, identified 8 key Wix first-party apps
- Queried product catalog: 105 products across 10 collections
- Discovered all 13 static pages via sitemap.xml (no REST API for page listing)
- Confirmed premium domain at hotboxclothing.shop

### Task 2: Live Browser Inspection
- Navigated to every page on the site using Playwright
- Captured full accessibility tree snapshots for navigation mapping
- Took 3 screenshots (homepage, Big Barn Crossfit, Artistry in Motion)
- Mapped complete navigation hierarchy (12 nav items + More dropdown)
- Individually assessed all 6 client landing pages with product counts, price ranges, and issues
- Audited all internal links (28 unique URLs found, 0 dead links, 1 orphan page)
- Checked console errors (warnings only, no critical JS errors)

---

## Key Findings

### Critical Issues Identified

1. **No "Shop All" page** -- customers cannot browse the full 105-product catalog anywhere on the site
2. **URL slugs are WIX defaults** -- `/shop-1`, `/shop-2`, `/blank-2`, `/blank-3` etc. hurt SEO and look unprofessional
3. **Navigation is client-centric, not customer-centric** -- nav bar lists business names (Big Barn, UNMH, Board 30) that mean nothing to new visitors
4. **"Shop" link is misleading** -- hidden in "More" dropdown, shows only 2 LMNT drink products
5. **UNMH page has wrong heading** -- says "Fall Pre-Order" instead of UNMH content
6. **Fall PreOrder has typo** -- "March 1st 20256" visible to customers
7. **Inconsistent product gallery layouts** -- Board 30 uses Add to Cart buttons, Big Barn has two sections, others use simple grids

### Structural Facts

| Metric | Value |
|--------|-------|
| Total products | 105 |
| Total collections | 10 |
| Static pages | 13 |
| Client landing pages | 6 (Big Barn, Artistry in Motion, Fall PreOrder, UNMH, Board 30, LMNT) |
| Orphan pages | 1 (`/payment-request-page`) |
| Dead links | 0 |
| Console errors | 0 critical (warnings only) |

### Site Identity

- **Site ID:** `c744cbdb-46f8-4c66-ac76-eb31bd0d52c1`
- **Business:** Hot Box Clothing, Albuquerque NM
- **Model:** Multi-client landing pages with curated product selections per business client
- **Notable apps:** Wix Bookings, Video, and Subscriptions installed on a clothing store (unusual, possibly unnecessary)

---

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | `3bbf3b5` | `audit(01-01): extract WIX API site data and create SITE-STRUCTURE.md` |
| 2 | `e042e8f` | `audit(01-01): browser inspection of live site navigation and pages` |

---

## Output Files

- `.planning/phases/01-site-audit-discovery/SITE-STRUCTURE.md` -- Complete site structure document (primary deliverable)

---

## Deviations

- **No WIX REST API for page listing:** WIX does not expose a pages/routes API. Worked around by fetching and parsing `sitemap.xml` and `pages-sitemap.xml`.
- **No WIX REST API for navigation menus:** Used Playwright browser snapshot to capture accessibility tree and map navigation from live DOM.
- **Categories V3 API failed:** Returned `APP_NOT_INSTALLED` error. Fell back to V1 Collections API which worked successfully.
- **Products sitemap too large to parse in-context:** Used partial fetch with `start_index` to verify product URL structure and count.

---

*Plan 01-01 complete. Site structure mapped. Ready for Plan 01-02 (Product Catalog Audit).*
