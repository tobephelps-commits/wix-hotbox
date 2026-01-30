# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** Effortless product creation — enter a SanMar style number and get a draft WIX product with pricing, variants, and images ready for review.
**Current focus:** Phase 1 — Site Audit & Discovery

## Current Position

Phase: 1 of 10 (Site Audit & Discovery)
Plan: 01-02 complete, ready for 01-03
Status: In progress
Last activity: 2026-01-29 — Plan 01-02 (Product Catalog Audit) complete

Progress: █░░░░░░░░░ ~7%

## Performance Metrics

**Velocity:**
- Total plans completed: 2
- Average duration: ~1 session
- Total execution time: 2 sessions

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Site Audit | 2/3 | 2 sessions | 1 session |

**Recent Trend:**
- Last 5 plans: 01-01, 01-02
- Trend: Consistent 1-session execution

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- UX improvements first, SanMar integration second (store is live, losing conversions)
- Draft-first product publishing (owner reviews before going live)

### Key Findings (Phase 1, Plan 01-01)

- **Site ID:** `c744cbdb-46f8-4c66-ac76-eb31bd0d52c1`
- **105 products** across **10 collections**, **13 static pages**, **6 client landing pages**
- **No "Shop All" page** -- customers cannot browse full catalog
- **URL slugs are WIX defaults** (`/shop-1`, `/blank-2`, etc.) -- hurts SEO, looks unprofessional
- **Navigation is client-centric** -- lists business names meaningless to new visitors
- **"Shop" link misleading** -- hidden in More dropdown, shows only 2 LMNT drink products
- **UNMH page has wrong heading** (says "Fall Pre-Order"), **Fall PreOrder has typo** ("20256")
- **Inconsistent product gallery layouts** across client pages
- **1 orphan page** (`/payment-request-page`), **0 dead links**
- **Unusual apps installed:** Bookings, Video, Subscriptions on a clothing store
- **WIX has no REST API for page listing or navigation menus** -- requires sitemap.xml and browser inspection

### Key Findings (Phase 1, Plan 01-02)

- **Zero inventory tracking** -- ALL 105 products have `trackInventory: false`, `manageVariants: false`. The store blindly accepts orders regardless of SanMar blank availability. Biggest operational risk.
- **2 broken product pages** -- Both LMNT drink product pages return 404 "This product couldn't be found". Products exist in API but storefront pages are broken.
- **No filtering, sorting, or search** on any category/product listing page
- **Chat widget blocks product interaction** -- "Let's Chat!" popover intercepts clicks on color swatches and option controls
- **No cross-selling** -- Zero related products, "you might also like", or upsell sections on any product page
- **No size guides** -- Clothing store with multiple brands but no size chart anywhere
- **32 color radio buttons on Fun Shirts** -- Full Gildan 8000 palette creates decision paralysis
- **Variant selection does not update product image** -- No visual preview when changing colors
- **Incorrect breadcrumbs** -- Products show wrong collection in breadcrumb navigation
- **SanMar catalog descriptions copy-pasted** -- ~40 products have raw manufacturer descriptions
- **Big Barn Team Hat: $28 with zero images, zero description, zero options**
- **1 duplicate product** -- Stanley/Stella Nora Hoodie in Board30 + PreOrder
- **1 orphan product** -- New Era 1/4-Zip not in any client collection
- **Only Board 30 has "Add to Cart" buttons** in gallery; all others require clicking into detail page
- **Severe lazy-loading issue** -- Product images fail to render below fold, making store appear empty

### Pending Todos

None yet.

### Blockers/Concerns

- SanMar API credentials not yet provisioned — Phase 5 blocked until enabled (contact sanmarintegrations@sanmar.com)

## Session Continuity

Last session: 2026-01-29
Stopped at: Plan 01-02 complete. Ready for Plan 01-03 (UX Issues Identification).
Resume file: .planning/phases/01-site-audit-discovery/01-02-SUMMARY.md
