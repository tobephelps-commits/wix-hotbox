# Product Catalog: Hot Box Clothing

**Audit Date:** 2026-01-29
**Plan:** 01-02 (Product Catalog Audit)

---

## Catalog Overview

| Metric | Value |
|--------|-------|
| **Total Products** | 105 |
| **All Visible** | Yes (100% visible, 0 hidden/draft) |
| **All In Stock** | Yes (100% in-stock, 0 out-of-stock) |
| **Inventory Tracking** | Disabled on all products (none track quantity) |
| **Product Type** | All physical goods |
| **Price Range** | $1.00 - $85.00 |
| **Discounted Products** | 2 (both in Graphics collection, 75% off clearance) |
| **Products with SKU** | ~35 (33%) -- remaining 70 products have blank SKU |
| **Products with Cost Data** | ~60 (57%) -- remaining have $0.00 cost |
| **Total Collections** | 10 (1 system, 4 client, 3 product-type, 1 status, 1 beverage) |
| **Duplicate Products** | 1 confirmed -- "Stanley/Stella Women's Stella Nora Hooded Sweatshirt" exists twice (different collections) |
| **Products with No Description** | ~15 (14%) -- mostly Graphics add-on items |
| **Products with No Images** | 1 -- "Big Barn Team Hat" has zero media |
| **Products with Custom Text Fields** | ~20 -- mostly Graphics/embroidery items requiring placement instructions |

### Price Distribution

| Price Tier | Count | Percentage | Examples |
|------------|-------|------------|---------|
| $1 - $5 | ~15 | 14% | Graphics logos, patches, flags ($1-$4) |
| $5 - $10 | ~10 | 10% | Graphics embroidery items ($7-$10), base t-shirts ($8.50) |
| $12 - $20 | ~30 | 29% | T-shirts, tanks, basic clothing ($12.50-$19) |
| $20 - $35 | ~25 | 24% | Premium tees, pullovers, leggings, beanies, bags ($20-$33) |
| $35 - $50 | ~20 | 19% | Hoodies, fleece jackets, quarter-zips, Yeti ($36-$48) |
| $50+ | ~5 | 5% | North Face jackets, Adidas quarter-zips ($55-$85) |

### Image Analysis

| Image Type | Count | Percentage | Description |
|------------|-------|------------|-------------|
| **Mockup images** (primary) | ~55 | 52% | Custom designs rendered on garment templates -- the store's preferred approach |
| **Manufacturer product photos** | ~35 | 33% | SanMar/supplier catalog images (webp/jpg from manufacturer) |
| **Real product photos** | ~10 | 10% | Actual photographs of finished products (phone photos, studio shots) |
| **Logo/graphic files** | ~5 | 5% | PNG/SVG graphics displayed as the product (Graphics collection) |
| **No images** | 1 | 1% | Big Barn Team Hat -- completely missing media |

Most products have 2-3 images. A few premium items (Stanley/Stella, North Face) have 3-5 images including model shots.

---

## Category Structure

### Collection Map (from API)

| # | Collection | Collection ID | Products | Price Range | Purpose |
|---|-----------|--------------|----------|-------------|---------|
| 1 | **All Products** | `00000000-...0001` | 105 (auto) | $1-$85 | System default (every product assigned) |
| 2 | **Big Barn Crossfit** | `1cfcc768-...a204` | ~22 | $8.50-$50 | Client: CrossFit gym apparel + accessories |
| 3 | **Board30** | `8c9af299-...87f1` | ~17 | $18-$63 | Client: Board30 fitness studio apparel |
| 4 | **LovelaceUNM** | `06629fe4-...676e` | ~15 | $15-$85 | Client: UNM Hospital/Lovelace branded items |
| 5 | **Artistry In Motion** | `ff87cc5b-...775f` | ~6 | $30-$50 | Client: Dance/studio apparel |
| 6 | **LMNT** | `aea8845e-...3fbb` | 2 | $33-$45 | Beverage: LMNT drink mixes (pickup only) |
| 7 | **PreOrder** | `bea296e5-...939a` | 2 | $45-$47 | Status: Pre-order items (Stanley/Stella) |
| 8 | **Clothing** | `17b07b2e-...9b0e` | ~30 | $8.50-$50 | Product-type: General clothing catalog |
| 9 | **Fun Shirts** | `ff656bb9-...856e` | ~14 | $16.50-$25.50 | Product-type: Novelty/humor CrossFit shirts |
| 10 | **Graphics** | `9db0b456-...43d3` | ~22 | $1-$10 | Product-type: Logo graphics, patches, embroidery add-ons |

### Collection Overlap Analysis

Products belong to multiple collections simultaneously:
- **Big Barn + Clothing:** ~18 products are in both (most Big Barn clothing also tagged as general Clothing)
- **Big Barn + Graphics:** Big Barn page shows both clothing and graphics sections
- **Board30 only:** Board30 products are NOT also in Clothing collection (siloed)
- **LovelaceUNM only:** UNMH products are NOT also in Clothing (siloed)
- **Artistry In Motion only:** AIM products are NOT also in Clothing (siloed)
- **Fun Shirts only:** Fun Shirts are NOT in Clothing collection (separate category)
- **1 product in no client collection:** "New Era Sueded Cotton Blend 1/4-Zip Pullover" is only in "All Products" -- orphan product not assigned to any collection beyond system default

### Collection Issues

1. **No "Shop All" browsable collection page** -- the "All Products" system collection has no page displaying it
2. **Inconsistent cross-tagging** -- Big Barn products are dual-tagged (Big Barn + Clothing), but Board30, UNMH, and AIM products are NOT in Clothing. This creates an incomplete "Clothing" collection.
3. **Graphics is not really clothing** -- 22 add-on items (logos, patches, flags) priced $1-$10 are mixed into the same store as $85 North Face jackets. These are decoration services, not standalone products.
4. **LMNT is not clothing** -- 2 drink products in a clothing store, pickup only, no shipping. Completely different product category.
5. **1 orphan product** -- "New Era Sueded Cotton Blend 1/4-Zip Pullover" exists only in All Products, not visible on any landing page.
6. **PreOrder collection holds products from different clients** -- 2 Stanley/Stella hoodies for PreOrder, both also tagged to PreOrder collection, appearing separate from their client pages.

---

## Product Inventory

### Client Collection: Big Barn Crossfit (~22 products)

| # | Product Name | Price | Options | Images | Has Description | SKU | Notes |
|---|-------------|-------|---------|--------|----------------|-----|-------|
| 1 | BB Open Team Shirt | $18.00 | Size (7), Color (3) | 2 | Yes | -- | Next Level 6010 tri-blend |
| 2 | Big Barn Team Hat | $28.00 | None | **0** | **No** | -- | **NO IMAGES, NO DESCRIPTION** |
| 3 | Columbia Ale Creek Beanie w/ Leather Patch | $20.00 | Color (3) | 2 | Yes | -- | Real product photo |
| 4 | Gemline Wave Sling Bag w/ Leather Patch | $15.00 | Color (4) | 2 | Yes | -- | Real product photo |
| 5 | New Era Sueded Cotton 1/4-Zip | $30.00 | Size (8), Color (4), Logo (2) | 5 | Yes | NEA123 | Has custom text field for name |
| 6 | TriDri Women's Performance Legging Short | $25.00 | Size (6) | 1 | Yes | -- | Mockup image |
| 7-22 | (Additional ~16 products including graphics) | $1-$50 | Various | 1-2 | Mixed | -- | Mix of clothing and graphic add-ons |

### Client Collection: Board30 (~17 products)

| # | Product Name | Price | Options | Images | Has Description | Notes |
|---|-------------|-------|---------|--------|----------------|-------|
| 1 | BELLA+CANVAS Jersey Muscle Tank 3483 | $18.00 | Color (5), Size (6) | 2 | Yes | Board30 branding |
| 2 | BELLA+CANVAS Women's Racerback Cropped Tank | $18.00 | Color (5), Size (5) | 2 | Yes | Board30 branding |
| 3 | BELLA+CANVAS Women's Triblend Crop Hoodie | $36.00 | Color (3), Size (5) | 1 | Yes | Board30 branding |
| 4 | Sport-Tek Ultimate Performance Crew | $25.00 | Color (4), Size (8) | 2 | Yes | Board30 branding |
| 5 | Sport-Tek Women's Ultimate Performance V-Neck | $25.00 | Color (3), Size (8) | 2 | Yes | Board30 branding |
| 6 | NL Women's Festival Muscle Tank | $19.00 | Color (6), Size (6) | 2 | Yes | Board30 branding |
| 7 | NL Women's Tri-Blend Racerback Tank | $19.00 | Color (5), Size (6) | 2 | Yes | Board30 branding |
| 8 | BC6008 Women's Jersey Racerback Tank | $19.00 | Color (4), Size (5) | 2 | Yes | Board30 branding |
| 9 | BC3001 Unisex Jersey Short Sleeve Tee | $19.00 | Color (4), Size (9) | 2 | Yes | Board30 branding |
| 10 | Stanley/Stella Women's Nora Hoodie (Board30) | $45.00 | Color (10), Size (6) | 3 | Yes | Premium sustainable |
| 11 | Allmade Women's Tri-Blend Muscle Tank | $18.00 | Color (6), Size (6) | 3 | Yes | Sustainable C-FREE |
| 12 | District Women's Perfect Tri Fleece 1/2-Zip | $45.00 | Color (6), Size (8) | 3 | Yes | Premium fleece |
| 13-17 | (Additional ~5 products) | $18-$63 | Various | 1-3 | Yes | Various fitness apparel |

**Board30 Pattern:** All product descriptions start with "6 inch B logo on front chest with Board 30 ABQ vertical on the back" -- consistent branding language.

### Client Collection: LovelaceUNM (~15 products)

| # | Product Name | Price | Options | Images | Has Description | Notes |
|---|-------------|-------|---------|--------|----------------|-------|
| 1 | North Face Women's Glacier Full-Zip Fleece | $85.00 | Color (4), Size (8) | 3 | Yes | **Most expensive product** |
| 2 | Adidas Quarter-Zip Pullover | $55.00 | Color (4), Size (7) | 3 | Yes | Premium brand |
| 3 | District Bleach Wash Tee | $17.00 | Color (5), Size (10) | 2 | Yes | Casual |
| 4 | District Perfect Tri Fleece Hoodie | $50.00 | Color (6), Size (9) | 3 | Yes | Premium |
| 5 | District Fleece Crew | $42.00 | Color (3), Size (8) | 2 | Yes | |
| 6 | Port Authority Ladies Pique Fleece Jacket | $55.00 | Color (4), Size (7) | 1 | Yes | |
| 7 | Mercer+Mettle Women's Stretch Polo | $35.00 | Color (5), Size (7) | 2 | Yes | Professional |
| 8 | Bring Your Own Jacket | $15.00 | Embroidered Logo (2) | 2 | Yes | Custom text: "Optional Name" |
| 9 | 18oz Yeti Hotshot Rambler | $37.00 | Color (2), Engraved Logo (2) | 4 | Yes | Drinkware, not clothing |
| 10-15 | (Additional ~5 products) | $17-$55 | Various | 1-3 | Yes | Mix of professional clothing |

**LovelaceUNM Pattern:** Professional/workplace clothing (North Face, Adidas, Port Authority, polos). Embroidered logos. Includes a Yeti drinkware item and a "Bring Your Own Jacket" embroidery service.

### Client Collection: Artistry In Motion (~6 products)

| # | Product Name | Price | Options | Images | Has Description | Notes |
|---|-------------|-------|---------|--------|----------------|-------|
| 1 | B+C Unisex Triblend Long Sleeve Tee - Black | $30.00 | Size (7) | 2 | Yes | Single color variant |
| 2 | B+C Women's Relaxed Triblend Tee - Mustard | $30.00 | Size (5) | 2 | Yes | Single color variant |
| 3 | B+C Unisex Triblend Short Sleeve V-Neck - Gray | $30.00 | Size (6) | 2 | Yes | Single color variant |
| 4 | B+C Unisex Triblend Tee - Black | $30.00 | Size (7) | 2 | Yes | Single color variant |
| 5 | Allmade Unisex V-Neck - White | $30.00 | Size (6) | 2 | Yes | Single color variant |
| 6 | NL Unisex CVC Tee - Heather Cool Gray | $30.00 | Size (8) | 2 | Yes | Single color variant |

**Artistry Pattern:** All $30.00, all Bella+Canvas or similar brands, all have single color locked in (color in product name). Clean, consistent collection. Mockup images with AIM logo.

### Collection: LMNT (2 products)

| # | Product Name | Price | Options | Images | Has Description | Notes |
|---|-------------|-------|---------|--------|----------------|-------|
| 1 | LMNT Drink Mix Box (Pickup ONLY no Shipping) | $45.00 | Flavor (11) | 4 | Yes (minimal) | **Not clothing** |
| 2 | LMNT Drink Case (Pickup ONLY no Shipping) | $32.99 | Flavor (5) | 4 | Yes (minimal) | **Not clothing** |

### Collection: PreOrder (2 products)

| # | Product Name | Price | Options | Images | Has Description | Notes |
|---|-------------|-------|---------|--------|----------------|-------|
| 1 | Stanley/Stella Unisex Cultivator 2.0 Full-Zip Hoodie | $47.00 | Size (10), Color (10), Silicone Logo Color (2) | 3 | Yes (detailed) | 3 option types |
| 2 | Stanley/Stella Women's Nora Hoodie (PreOrder copy) | $45.00 | Color (10), Size (6), Silicone Logo Color (2) | 3 | Yes (detailed) | 3 option types, **DUPLICATE of Board30 version** |

### Collection: Fun Shirts (~14 products)

All fun shirts follow an identical pattern:
- **Base garment:** Gildan 8000 DryBlend T-Shirt
- **Price:** $16.50-$25.50
- **Options:** Size (8 sizes S-5XL) + Color (30+ colors)
- **Images:** Real product photo + Gildan catalog images (2-3 per product)
- **Content:** Humorous CrossFit/fitness themed designs

| # | Product Name | Price |
|---|-------------|-------|
| 1 | Lifting Chakras | $25.50 |
| 2 | Sloth Running Team | $16.50 |
| 3 | Lowering Expectations | $16.50 |
| 4 | I've been Assaulted | $16.50 |
| 5 | Suns Out Guns Out | $16.50 |
| 6 | 1 Star Review | $16.50 |
| 7 | Do Not Disturb | $16.50 |
| 8 | Hit It and Quit It | $16.50 |
| 9 | Does this shirt make my muscles look big? | $16.50 |
| 10 | You had me at WOD | $16.50 |
| 11 | I'm in a Relationship with WOD | $16.50 |
| 12 | 0.0 Not Running | $16.50 |
| 13 | She lifts bro | $16.50 |
| 14 | My warm up is your WOD | $16.50 |

### Collection: Graphics (~22 products)

All graphics are add-on items -- logos, patches, flags, and embroidery services sold separately from garments:

| # | Product Name | Price | Type |
|---|-------------|-------|------|
| 1 | Big Barn Logo Large (12x12) | $4.00 | Heat transfer |
| 2 | Big Barn Logo Small (3x3) | $2.00 | Heat transfer |
| 3 | Big Barn Block Logo Large (9x12.75) | $4.00 | Heat transfer |
| 4 | Big Barn Arrow Logo (Large) | $4.00 | Heat transfer |
| 5 | ICWA Logo Large (9x12.75) | $4.00 | Heat transfer |
| 6 | ICWA Embroidered Logo Small (4x6) | $10.00 | Machine embroidery |
| 7 | Embroidered Applique Big Barn Logo Medium (7x7) | $10.00 | Applique embroidery |
| 8 | Embroidered Rooster and Logo Large (8x14) | $8.00 | Machine embroidery |
| 9 | United States Flag Black Medium (2.5x4) | $2.00 | Patch/print |
| 10 | United States Flag Color Small (2x3) | $2.00 | Patch/print |
| 11 | New Mexico State Flag Small (2.25x3.5) | $2.00 | Patch/print |
| 12 | Shenanigans Logo Large Metallic Gold (12x12) | ~~$4.00~~ $1.00 | **75% off clearance** |
| 13 | Fortis Weightlifting Club Logo Large (12x12) | ~~$7.00~~ $1.75 | **75% off clearance** |
| 14-22 | (Additional graphics items) | $1-$10 | Various |

**Graphics Pattern:** These are not standalone products -- they require a garment to apply to. Many have mandatory custom text fields ("Garment and Location", "Thread colors"). This is a unique product model: customers order a garment + separately order the graphic(s) to put on it.

### Collection: Clothing (~30 products)

The "Clothing" collection overlaps heavily with Big Barn Crossfit. Products in this collection include basic garments (t-shirts, tanks, hoodies, joggers, vests) without specific client branding. This is the "general catalog" but it is incomplete -- Board30, UNMH, and AIM products are excluded.

---

## Variant & Option Patterns

### Option Types Used

| Option Type | Count | Implementation |
|-------------|-------|---------------|
| **Size** (dropdown) | ~85 products | Standard sizes, varies XS-5XL per product |
| **Color** (color swatch) | ~75 products | Hex color values with text names |
| **Flavor** (dropdown) | 2 products | LMNT drink mixes only |
| **Logo** (dropdown) | ~3 products | "Big Barn" / "MiLEO" brand selection |
| **Silicone Logo Color** (dropdown) | 2 products | Stanley/Stella PreOrder items only |
| **Embroidered Logo** (dropdown) | 2 products | LovelaceUNM logo selection |
| **Engraved Logo** (dropdown) | 1 product | Yeti rambler logo choice |

### Variant Management

**Critical finding:** `manageVariants: false` on ALL 105 products. This means:
- WIX is NOT tracking per-variant inventory (e.g., no tracking of "Size M, Black" separately)
- All variants share the same price (no per-variant pricing)
- All variants show as "in stock" regardless of actual availability
- There is no way to mark specific sizes/colors as out-of-stock without manual intervention

### Size Range Patterns

| Category | Typical Sizes | Size Count |
|----------|--------------|------------|
| Unisex tees/tanks | XS - 3XL | 7 |
| Women's tops | XS - 2XL | 6 |
| Performance wear | XS - 4XL | 8-9 |
| Fun Shirts (Gildan) | S - 5XL | 8 |
| Premium outerwear | XS - 3XL | 7-8 |

### Color Variety

- **Highest color count:** Gildan 8000 / Fun Shirts with 30+ colors per product
- **Lowest color count:** Artistry In Motion products with single locked color
- **Board30 average:** 3-6 colors per product
- **LovelaceUNM average:** 2-5 colors per product (professional palette)

---

## Product Data Quality Assessment

### Good Quality (Score: 7-10/10)

These products have complete data and professional presentation:

| Product | Score | Strengths |
|---------|-------|-----------|
| Stanley/Stella Cultivator 2.0 Full-Zip | 10/10 | Detailed specs, 3 model photos, proper SKU, cost data, 10 sizes + 10 colors |
| Stanley/Stella Women's Nora Hoodie | 9/10 | Same high quality, duplicate product is only issue |
| North Face Women's Glacier Fleece | 9/10 | Professional description, proper SKU mention, 3 images |
| Adidas Quarter-Zip Pullover | 9/10 | Brand consistency, good specs, proper images |
| District Perfect Tri Fleece Hoodie | 8/10 | Good description, multiple images |
| Board30 products (general) | 7/10 | Consistent branding text, mockup images, complete options |

### Medium Quality (Score: 4-6/10)

| Product | Score | Issues |
|---------|-------|--------|
| Fun Shirts (all 14) | 5/10 | Real product photos are casual phone shots, descriptions are one-liners, massive color options never used |
| Big Barn clothing items | 5/10 | Descriptions are copy-pasted from SanMar catalog (starts with "Description of [manufacturer] [SKU]") |
| LovelaceUNM items | 6/10 | Decent quality but inconsistent -- some have "Logo Embroidered" prefix, others don't |
| Graphics items | 4/10 | Many have no description at all, images are logo files not product mockups |

### Poor Quality (Score: 1-3/10)

| Product | Score | Issues |
|---------|-------|--------|
| **Big Barn Team Hat** | 1/10 | **NO IMAGES, NO DESCRIPTION, NO SKU, NO OPTIONS** -- product exists but has zero useful data |
| Shenanigans Logo Large Metallic Gold | 2/10 | No description, 75% clearance, looks abandoned |
| Fortis Weightlifting Club Logo Large | 2/10 | No description, 75% clearance, looks abandoned |
| Various small graphics ($2) | 3/10 | Minimal descriptions, single low-quality images |

### Description Quality Analysis

| Description Pattern | Count | Issue |
|--------------------|-------|-------|
| **SanMar catalog copy-paste** | ~40 | Starts with "Description of [Brand] [SKU] / #[SKU]" -- looks automated and impersonal |
| **Board30 custom intro** | ~12 | "6 inch B logo on front chest with Board 30 ABQ vertical on the back" -- good but repeated |
| **Stanley/Stella original** | 2 | Well-written, premium feel |
| **LovelaceUNM mixed** | ~15 | Some have "Logo Embroidered on Right Chest in 3x3", others don't |
| **Fun shirt one-liners** | ~14 | "Always be the best amongst your peers" / "One WOD at a time" -- thin |
| **Empty descriptions** | ~15 | Graphics add-ons with zero description |
| **Beverage descriptions** | 2 | "30 pack box of individual flavors" -- minimal |

---

## Pricing Analysis

### Cost Data & Margins (where available)

| Product Category | Avg Price | Avg Cost | Margin |
|-----------------|-----------|----------|--------|
| Stanley/Stella hoodies | $46.00 | $30.00 | 35% |
| North Face jacket | $85.00 | (unknown) | -- |
| Adidas quarter-zip | $55.00 | $32.00 | 42% |
| Board30 tanks/tees | $19.00 | $5.50 | 71% |
| District fleece | $45.00 | $30.00 | 33% |
| Fun Shirts (Gildan) | $16.50 | $4.00 | 76% |
| Graphics (heat transfer) | $4.00 | $0.50 | 88% |
| Graphics (embroidery) | $10.00 | $3.00 | 70% |
| LMNT drinks | $39.00 | $0.00 | -- (no cost data) |
| Fleece vests | $48.00 | $41.00 | 15% |

**Notable:** Devon & Jones fleece vests ($48) have a cost of $40-$42, yielding only 15% margin. This is the lowest margin in the store.

### Pricing Inconsistencies

1. **Board30 vs Big Barn for same base garment:** Both collections sell the Next Level 6010 tri-blend, but Board30 prices at $19 while Big Barn at $18. Small but inconsistent.
2. **Artistry In Motion flat pricing:** All 6 products are exactly $30.00 -- clean but potentially leaving money on the table for premium items.
3. **Fun Shirts mixed pricing:** Most are $16.50 but "Lifting Chakras" is $25.50 with no apparent reason for the premium.
4. **Graphics pricing not volume-friendly:** Small logos $2, large logos $4, embroidery $8-$10. No bundle pricing or quantity discounts.

---

## Inventory & Stock Status

### Critical Finding: No Real Inventory Tracking

**Every single product has `trackInventory: false` and `inStock: true`.** This means:
- The store never shows "Out of Stock" for any product
- There is no per-variant stock tracking (individual sizes/colors)
- Customers can order any product in any size/color combination regardless of actual availability
- The owner must manually update stock status or handle backorders outside the system

This is the **biggest operational risk** in the catalog. When SanMar blanks go out of stock, customers can still order them. This creates:
- Order fulfillment delays
- Customer service issues
- Potential refund requests
- Poor customer experience

### Stock Management Implications for SanMar Integration (Phase 8-9)

The current "everything always in stock" approach makes Phases 8-9 (inventory monitoring and automated stock sync) even more critical. The store has zero stock intelligence today.

---

## Duplicate Products

### Confirmed Duplicate

**Stanley/Stella Women's Stella Nora Hooded Sweatshirt** exists twice:

| Attribute | Version 1 (Board30) | Version 2 (PreOrder) |
|-----------|---------------------|---------------------|
| ID | `5fdacb3b-...` | `af2c3695-...` |
| Slug | `...hooded-sweatshirt` | `...hooded-sweatshirt-1` |
| Collection | Board30 | PreOrder |
| Price | $45.00 | $45.00 |
| SKU | SXW035 | SXW035 |
| Options | Color (10) + Size (6) | Color (10) + Size (6) + **Silicone Logo Color (2)** |
| Created | 2025-11-26 | 2026-01-29 |

The PreOrder version has an additional "Silicone Logo Color" option (black/red) that the Board30 version lacks. This appears intentional -- the PreOrder version is a newer offering with an extra customization option.

---

## Catalog Issues (Brutally Honest)

### Critical Issues

1. **No inventory tracking on any product** -- the store blindly accepts orders without knowing if SanMar blanks are available. This is the #1 operational risk.

2. **Big Barn Team Hat has no images and no description** -- a $28 product with literally zero content. A customer cannot see what they're buying.

3. **SanMar catalog descriptions copied verbatim** -- ~40 products start with "Description of [Brand] [SKU] / #[SKU]". This looks lazy and unprofessional. A customer doesn't need to know the internal SKU reference format.

4. **Graphics products mixed with clothing** -- 22 add-on items ($1-$10) that are decoration services, not standalone products, appear alongside clothing. A customer browsing the Big Barn page sees $50 hoodies next to $2 flag patches with no context for why.

5. **Drink products in a clothing store** -- LMNT drink mixes ($33-$45) are pickup-only items that have nothing to do with custom apparel. They dilute the brand.

### Moderate Issues

6. **Duplicate product** -- Stanley/Stella Women's Nora Hoodie exists in both Board30 and PreOrder collections. Confusing for customers who might encounter both.

7. **No variant inventory management** -- `manageVariants: false` on everything. Even if tracking were enabled, individual sizes/colors couldn't be tracked separately.

8. **15 products with no description** -- mostly Graphics items, but still 14% of the catalog with zero product information.

9. **Inconsistent description formatting** -- some products have bullet-pointed specs, some have paragraphs, some have nothing. No standard template.

10. **70% of products missing SKU** -- makes inventory management and SanMar integration mapping harder.

11. **2 clearance items at 75% off** -- Shenanigans Logo and Fortis Logo are on deep discount with no context about why. If they're discontinued, they should be hidden.

### Minor Issues

12. **Cost data missing on ~40% of products** -- makes margin analysis incomplete.

13. **Fun Shirts offer 30+ colors but most will never be ordered** -- the Gildan 8000 color palette is the full manufacturer catalog, not a curated selection. This creates decision paralysis for customers.

14. **Mixed image quality** -- ranges from professional 1200x1800 model shots to 300x375 webp thumbnails to phone photos. No consistent image standard.

15. **Some products have custom text fields that are mandatory** -- Graphics items require "Garment and Location" text, creating friction for customers who don't understand the workflow.

---

## Product Page UX (from API Data Perspective)

### Observations Before Browser Inspection

Based on API data structure:
- **No cross-selling data** -- products have no "related products" or "recommended" metadata
- **No product badges/ribbons** -- all `ribbons: []`, no "New", "Popular", "Sale" badges
- **No additional info sections** -- all `additionalInfoSections: []`, no size guides, care instructions, or shipping info as structured sections
- **Custom text fields** -- ~20 products have them, mostly for Graphics placement instructions and optional name embroidery. These require user input before adding to cart.
- **Product URLs** -- all follow `/product-page/{slug}` format, slugs are manufacturer-style (e.g., `district-women-s-perfect-tri-fleece-1-2-zip-pullover`) rather than customer-friendly

---

*API data extraction complete. 105 products cataloged across 10 collections. Browser inspection (Task 2) will add visual evidence, product page UX assessment, and client-product mapping from live site.*
