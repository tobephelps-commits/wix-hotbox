# Site Structure: Hot Box Clothing

**Audit Date:** 2026-01-29
**Plan:** 01-01 (Site Structure Mapping)

---

## Site Overview

| Property | Value |
|----------|-------|
| **Site Name** | Hot Box Clothing |
| **Site ID** | `c744cbdb-46f8-4c66-ac76-eb31bd0d52c1` |
| **Primary URL** | https://www.hotboxclothing.shop/ |
| **URL Type** | Premium (custom domain) |
| **Business Name** | Hot Box Clothing |
| **Business Type** | Online Custom T-shirt Store |
| **Category** | online-store |
| **Location** | Albuquerque, NM, USA |
| **Email** | admin@hotboxclothing.shop |
| **Currency** | USD |
| **Timezone** | America/Denver |
| **Language** | English (en) |
| **Logo** | 4050b0_962edc3f22f541acbf9e7f7c8b8968e9~mv2.jpg |
| **Click Tracking** | Disabled |
| **Site Properties Version** | 31 |

---

## Installed Apps

The site has a large number of installed apps (68+ app instances). Below are the **identified Wix first-party apps**:

| App | App Def ID | Status |
|-----|-----------|--------|
| **Wix eCommerce** | `1380b703-ce81-ff05-f115-39571d94dfcd` | Enabled |
| **Wix Stores** | `215238eb-22a5-4c36-9e7b-e7c08025e04e` | Enabled |
| **Wix Subscriptions** | `8725b255-2aa2-4a53-b76d-7d3c363aaeea` | Enabled |
| **Wix Inbox** | `141fbfae-511e-6817-c9f0-48993a7547d1` | Enabled |
| **Wix Video** | `14409595-f076-4753-8303-9a86f9f71469` | Enabled |
| **Wix Bookings** | `13d21c63-b5ec-5912-8397-c3a5ddb27a97` | Enabled |
| **Wix Forms** | `14ce1214-b278-a7e4-1373-00cebd1bef7c` | Enabled |
| **Wix Invoices** | `13ee94c1-b635-8505-3391-97919052c16f` | Enabled |

**Notable observations:**
- **Wix Bookings is installed** on a clothing store -- this is unusual and may be unnecessary overhead or used for custom appointment-based services (e.g., custom order consultations).
- **Wix Video is installed** -- unclear if actively used for product content.
- **Wix Subscriptions is installed** -- could be used for recurring orders or membership plans.
- **68+ total app instances** -- significantly more than a typical store, suggesting accumulated installs over time. Many are likely internal Wix platform apps (analytics, SEO tools, site management).

---

## Product Catalog Summary

| Metric | Value |
|--------|-------|
| **Total Products** | 105 |
| **Total Collections** | 10 |
| **Product Type** | Physical goods |
| **Inventory Tracking** | Varies per product (some tracked, some not) |

### Collections (Product Groups)

| # | Collection Name | Slug | Visible | Likely Purpose |
|---|----------------|------|---------|----------------|
| 1 | All Products | `all-products` | Yes | Default collection (auto-assigned) |
| 2 | Artistry In Motion | `artistry-in-motion` | Yes | Client landing page |
| 3 | Big Barn Crossfit | `big-barn-crossfit` | Yes | Client landing page (CrossFit gym) |
| 4 | Board30 | `board30` | Yes | Client landing page |
| 5 | Clothing | `clothing` | Yes | General category |
| 6 | Fun Shirts | `fun-shirts` | Yes | Novelty/humor shirt category |
| 7 | Graphics | `graphics` | Yes | Print/graphic products |
| 8 | LMNT | `lmnt` | Yes | Client landing page |
| 9 | LovelaceUNM | `lovelaceunm` | Yes | Client landing page (Lovelace/UNM medical) |
| 10 | PreOrder | `preorder` | Yes | Pre-order products |

**Collection Analysis:**
- **Client-specific collections (4):** Artistry In Motion, Big Barn Crossfit, Board30, LovelaceUNM -- these map directly to the multi-client landing page model described in the project context.
- **Product-type collections (3):** Clothing, Fun Shirts, Graphics
- **Status collections (1):** PreOrder
- **System collections (1):** All Products
- **LMNT** -- unclear if this is a client or a product line; needs browser verification.

---

## Page Inventory (from Sitemap)

Pages discovered via `pages-sitemap.xml` (13 static pages):

| # | URL Path | Likely Type | Notes |
|---|----------|-------------|-------|
| 1 | `/` | Homepage | Main entry point |
| 2 | `/shop` | Store page | Primary shop view |
| 3 | `/shop-1` | Store page | Variant shop page |
| 4 | `/shop-2` | Store page | Variant shop page |
| 5 | `/shop-3` | Store page | Variant shop page |
| 6 | `/shop-4` | Store page | Variant shop page |
| 7 | `/shop-5` | Store page | Variant shop page |
| 8 | `/fun-shirts` | Collection page | Maps to Fun Shirts collection |
| 9 | `/blank-2` | Unknown/Blank | Placeholder or client landing page |
| 10 | `/blank-3` | Unknown/Blank | Placeholder or client landing page |
| 11 | `/blank-4` | Unknown/Blank | Placeholder or client landing page |
| 12 | `/payment-request-page` | Payment | Custom payment request page |
| 13 | `/gift-card` | Gift Card | Gift card purchase page |

**Product pages:** 105 dynamic product pages at `/product-page/{slug}` (from `store-products-sitemap.xml`).

**Immediate red flags from page inventory:**
- **Six "shop" pages** (`/shop`, `/shop-1` through `/shop-5`) -- why are there six variants of the shop page? These are likely the client-specific landing pages or represent duplicated/abandoned page iterations. This is confusing for navigation.
- **Three "blank" pages** (`/blank-2`, `/blank-3`, `/blank-4`) -- pages with default/placeholder names that were never renamed. These could be unused, in-progress, or hidden client pages.
- **No clear client page naming** -- if Artistry In Motion, Big Barn, Board30, and LovelaceUNM have dedicated pages, they are likely hiding behind the generic `/shop-N` or `/blank-N` URLs. There is no URL like `/big-barn-crossfit` or `/board30` -- customers cannot tell from the URL which client page they are on.

---

## API Data Extraction Notes

### What the WIX REST API Provided
- Site properties (name, URL, location, email, currency, timezone)
- Published site URLs (primary domain confirmed)
- Installed apps (68+ instances, key apps identified)
- Product catalog summary (105 products via Catalog V1 Query)
- Collections list (10 collections with names, slugs, visibility)
- Product detail structure (options, variants, pricing, media)

### What the WIX REST API Did NOT Provide
- **Page listing API** -- WIX does not expose a REST API to list all site pages. The page inventory was obtained via the public `sitemap.xml` files.
- **Navigation menu structure** -- No REST API for site menus/navigation hierarchy. Must be determined via live browser inspection (Task 2).
- **Page content/layout** -- Cannot read page content or structure via REST API. Requires browser inspection.
- **Categories V3 API** -- Returned `APP_NOT_INSTALLED` error for app `f534c0d3-dd59-4047-a86a-be3234d4591f`. The V1 Collections API worked as an alternative.

---

*Task 1 complete. Task 2 will add: Navigation Hierarchy, Client Landing Pages deep dive, Structural Observations, and Screenshots Index via live browser inspection.*
