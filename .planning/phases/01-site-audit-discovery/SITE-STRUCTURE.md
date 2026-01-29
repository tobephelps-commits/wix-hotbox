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
- **LMNT** -- confirmed via browser: this is a product line (electrolyte drink mixes) sold as pickup-only, with its own page at `/shop-5` labeled "Shop" in nav.

---

## Page Inventory (from Sitemap + Browser Verification)

Pages discovered via `pages-sitemap.xml` and verified via Playwright browser inspection (13 static pages + 105 product pages):

| # | URL Path | Page Title | Actual Purpose | Products Visible | Gallery Layout |
|---|----------|-----------|----------------|-----------------|----------------|
| 1 | `/` | Home | Homepage -- hero, product carousel, contact form, subscribe | ~15 (carousel) | Slider/carousel |
| 2 | `/shop` | Big Barn Crossfit | Client landing: Big Barn CrossFit gym | 20 clothing + 22 graphics | Grid + slider |
| 3 | `/shop-1` | Artistry in Motion | Client landing: Artistry in Motion studio | 6 | Grid |
| 4 | `/shop-2` | Fall PreOrder | Seasonal pre-order page | 2 | Grid |
| 5 | `/shop-3` | UNMH | Client landing: UNM Hospital | 15 | Grid |
| 6 | `/shop-4` | Board 30 | Client landing: Board 30 fitness studio | 17 | Grid w/ Add to Cart |
| 7 | `/shop-5` | Shop | LMNT product page (mislabeled "Shop") | 2 (pickup only) | Grid |
| 8 | `/fun-shirts` | Fun Shirts | Novelty/humor CrossFit shirts | 14 | Grid |
| 9 | `/blank-2` | Contact | Contact Us form | 0 | N/A |
| 10 | `/blank-3` | Support | Support ticket form (with issue dropdown) | 0 | N/A |
| 11 | `/blank-4` | Store Policies | Returns/refunds policy | 0 | N/A |
| 12 | `/payment-request-page` | Payment Request | Custom payment request (not in nav) | 0 | N/A |
| 13 | `/gift-card` | Gift Card | Gift card purchase (in More dropdown) | 0 | N/A |

**Product pages:** 105 dynamic product pages at `/product-page/{slug}` (from `store-products-sitemap.xml`).

**Critical findings from browser verification:**
- **Every "shop-N" page is a client landing page** -- not a generic shop variant. The URL slugs are meaningless (`/shop`, `/shop-1`, `/shop-2`, etc.) and tell the visitor nothing about what they will find.
- **The "blank-N" pages are real utility pages** -- Contact, Support, and Store Policies are all functional but have unprofessional URL slugs that were never renamed from their WIX defaults.
- **`/shop-5` is mislabeled** -- the nav calls it "Shop" but it only sells 2 LMNT drink products. A customer clicking "Shop" expecting to see all products would be confused.
- **No "All Products" shop page exists** -- there is no page showing all 105 products. Each page is a silo.
- **`/shop-3` (UNMH) has mismatched heading** -- the page heading says "Fall Pre-Order" with a wildflower image, but the nav says "UNMH" and the products are professional workplace clothing (North Face jackets, Adidas, polos). This is confusing.
- **`/shop-2` (Fall PreOrder) has a typo** -- the description reads "March 1st 20256" instead of "2026".

---

## Navigation Hierarchy (from Live Browser Inspection)

### Header Navigation (left to right)

The site uses a single horizontal navigation bar with a "More" overflow dropdown.

```
[Logo: Hotbox_edited.jpg -> /]                    [Cart] [Log In]

Home | Contact | Support | Store Policies | Big Barn Crossfit | Fun Shirts | Artistry in Motion | Fall PreOrder | UNMH | Board 30 | More v
                                                                                                                                    |-- Gift Card
                                                                                                                                    |-- Shop
```

**Navigation Link Mapping:**

| Nav Label | Target URL | Actual Page Content |
|-----------|-----------|-------------------|
| Home | `/` | Homepage |
| Contact | `/blank-2` | Contact form |
| Support | `/blank-3` | Support ticket form |
| Store Policies | `/blank-4` | Returns/refunds policy |
| Big Barn Crossfit | `/shop` | Big Barn CrossFit products |
| Fun Shirts | `/fun-shirts` | Novelty CrossFit shirts |
| Artistry in Motion | `/shop-1` | Artistry in Motion products |
| Fall PreOrder | `/shop-2` | Pre-order items (2 products) |
| UNMH | `/shop-3` | UNM Hospital branded clothing |
| Board 30 | `/shop-4` | Board 30 fitness products |
| **More** (dropdown) | | |
| -- Gift Card | `/gift-card` | Gift card purchase |
| -- Shop | `/shop-5` | LMNT drink mixes only |

### Footer

Minimal footer with:
- Email link: admin@hotboxclothing.shop
- Copyright: "(c)2022 by Hot Box Clothing. Proudly created with Wix.com"
- No navigation links, no social media, no additional pages

### Other UI Elements

- **"Let's Chat!" button** -- Wix Chat widget (iframe) on all pages
- **Subscribe Form** -- Email subscription form on homepage only
- **Contact form** -- Duplicated on homepage AND on `/blank-2` (Contact page)

---

## Client Landing Pages (Detailed Assessment)

### 1. Big Barn Crossfit (`/shop` -- page title: "Big Barn Crossfit")

| Attribute | Detail |
|-----------|--------|
| **URL** | `/shop` (generic, not descriptive) |
| **Heading** | "Welcome to the Big Barn Store" |
| **Subheading** | "Choose Your Garment or go to www.CompanyCasuals.com to find the clothing you want and send an email requesting a quote." |
| **Products (clothing)** | 20 items (shirts, hoodies, tanks, vests, joggers, jackets, leggings) |
| **Products (graphics)** | 22 items in a "Choose your Graphics" section (logos, flags, patches, $1-$10 each) |
| **Price range** | $8.50 - $50.00 (clothing), $1.00 - $10.00 (graphics) |
| **Layout** | Two-section: product gallery grid + graphics slider carousel |
| **External link** | Links to www.CompanyCasuals.com (SanMar's retail portal) |
| **Issues** | URL gives no brand identity; external link sends customers away from the store; 2 graphics items on clearance ($1) |

### 2. Artistry in Motion (`/shop-1` -- page title: "Artistry in Motion")

| Attribute | Detail |
|-----------|--------|
| **URL** | `/shop-1` (generic) |
| **Logo** | Large circular black logo displayed prominently |
| **Products** | 6 items (hoodies, tanks, long sleeve tees, v-necks) |
| **Price range** | $30.00 - $50.00 |
| **Layout** | Logo header + product gallery grid |
| **Issues** | Small product selection; URL is meaningless; all products are Bella+Canvas brand |

### 3. Fall PreOrder (`/shop-2` -- page title: "Fall PreOrder")

| Attribute | Detail |
|-----------|--------|
| **URL** | `/shop-2` (generic) |
| **Heading** | "Winter 2026 Pre-order" |
| **Description** | "You can pre-order until March 1st **20256** Delivery will be periodic based on number of orders.." |
| **Products** | 2 items (Stanley/Stella hooded sweatshirts) |
| **Price range** | $45.00 - $47.00 |
| **Issues** | TYPO in description ("20256" instead of "2026"); only 2 products; nav says "Fall PreOrder" but page says "Winter 2026 Pre-order" -- seasonal mismatch; double period at end of description |

### 4. UNMH (`/shop-3` -- page title: "UNMH")

| Attribute | Detail |
|-----------|--------|
| **URL** | `/shop-3` (generic) |
| **Image** | "Wildflowers 01.png" header image |
| **Heading** | "Fall Pre-Order" (WRONG -- should be UNMH or UNM Hospital) |
| **Products** | 15 items (North Face jackets, Adidas quarter-zips, District hoodies/crews, fleece vests, polos, bleach wash tees, Yeti rambler) |
| **Price range** | $17.00 - $85.00 |
| **Issues** | Page heading says "Fall Pre-Order" but nav says "UNMH" -- identity crisis; maps to LovelaceUNM collection; professional clothing mixed with casual items; wildflower image doesn't match medical/hospital branding; this is the most confusing page on the site |

### 5. Board 30 (`/shop-4` -- page title: "Board 30")

| Attribute | Detail |
|-----------|--------|
| **URL** | `/shop-4` (generic) |
| **Logo** | "board30logotypeblack.png" displayed at top |
| **Products** | 17 items (tanks, crop tops, hoodies, leggings, shorts, performance tees, zip hoodies, sweatshirts) |
| **Price range** | $18.00 - $63.00 |
| **Layout** | Logo + product grid with **"Add to Cart" buttons visible** (different from other pages which only show Quick View) |
| **Issues** | URL is meaningless; different product gallery component/layout than other client pages (inconsistent UX); fitness-focused product selection is well-curated |

### 6. LMNT / "Shop" (`/shop-5` -- page title: "Shop")

| Attribute | Detail |
|-----------|--------|
| **URL** | `/shop-5` (generic) |
| **Nav Label** | "Shop" (misleading -- not a general shop) |
| **Products** | 2 items (LMNT Drink Mix Box $45.00, LMNT Drink Case $32.99) |
| **Special note** | Both products are **pickup only, no shipping** |
| **Issues** | Labeled "Shop" but only has 2 drink products; hidden behind "More" dropdown; pickup-only products mixed into online store; worst-named page on the site |

---

## Structural Observations (Brutally Honest)

### Critical Issues

1. **No general "Shop All" page** -- There is no way for a customer to browse all 105 products. Every shop page is siloed by client or collection. A first-time visitor has no path to see the full catalog.

2. **URL slugs are unprofessional garbage** -- `/shop`, `/shop-1`, `/shop-2`, `/shop-3`, `/shop-4`, `/shop-5`, `/blank-2`, `/blank-3`, `/blank-4` are all WIX default slugs that were never renamed. This hurts SEO, looks amateurish in the browser address bar, and makes navigation impossible by URL alone.

3. **Navigation is client-centric, not customer-centric** -- The nav bar lists 5 specific businesses (Big Barn, Artistry in Motion, UNMH, Board 30) alongside utility pages and a "Fun Shirts" collection. A new visitor does not know what Big Barn Crossfit is or why they should click it. The navigation reads like an internal org chart, not a shopping experience.

4. **"Shop" link is buried and misleading** -- The only page labeled "Shop" (in the "More" dropdown) shows just 2 LMNT drink mixes. This is the worst possible experience for someone expecting to browse products.

5. **UNMH page has wrong heading** -- The nav says "UNMH" but the page says "Fall Pre-Order". This is a copy-paste error from another page setup and was never corrected.

6. **Fall PreOrder has a typo** -- "March 1st 20256" is visible to customers. Minor but unprofessional.

7. **Inconsistent product gallery layouts** -- Board 30 shows "Add to Cart" buttons directly; Big Barn has a two-section layout with a separate graphics slider; other pages use a simple grid. There is no consistent shopping UX across client pages.

### Navigation Dead Ends and Orphan Pages

- **`/payment-request-page`** -- exists in sitemap but has NO navigation link anywhere on the site. Orphan page (accessible only by direct URL).
- **No dead links found** -- all navigation links point to valid, loading pages.
- **Homepage has duplicate contact form** -- the homepage contains a full contact form section identical to `/blank-2`, creating redundancy.

### Console Errors

- **Warning:** "Unrecognized feature: 'vr'" on every page (harmless VR API feature detection).
- **Warning:** Firebase already defined (Wix Chat widget conflict).
- **Error (intermittent):** "ErrorOnConnectToRealtime FirebaseError" on `/shop-5` (Firebase network timeout for chat widget).
- **No critical JavaScript errors** affecting store functionality.

---

## Screenshots Index

All screenshots captured via Playwright browser automation (stored in `/tmp/playwright-output/`):

| # | Filename | Page | Description |
|---|----------|------|-------------|
| 1 | `homepage-full.png` | `/` (Homepage) | Full-page screenshot showing hero section, product carousel, custom team shirts section, contact form, and subscribe form |
| 2 | `big-barn-crossfit.png` | `/shop` (Big Barn) | Viewport screenshot showing navigation bar, page heading, and beginning of product section |
| 3 | `artistry-in-motion.png` | `/shop-1` (Artistry in Motion) | Viewport screenshot showing navigation bar and large circular logo |

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

*Document complete. Both API extraction (Task 1) and live browser inspection (Task 2) data integrated.*
