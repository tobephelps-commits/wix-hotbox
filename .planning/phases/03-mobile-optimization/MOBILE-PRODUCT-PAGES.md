# Mobile Product Page Optimization: Manual Instructions

**Plan:** 03-02
**Date:** 2026-01-30
**Status:** Pending manual execution
**MCP Limitation:** WIX REST API does not expose any endpoints for mobile layout, product gallery configuration, variant selector sizing, or responsive design. All product page optimization must be performed through the WIX Editor Mobile view.
**Prerequisite:** Complete Phase 2 GALLERY-STANDARDIZATION.md first (Add to Cart must be enabled on all gallery pages). Complete Phase 3 MOBILE-NAV-OPTIMIZATION.md (mobile menu must be active before testing product pages).

---

## 1. Current State (Audit Results)

**Audit Date:** 2026-01-30
**Method:** Playwright browser automation at 375x812 (iPhone), 768x1024 (iPad tablet)

### Issues Addressed

| Issue ID | Title | Severity |
|----------|-------|----------|
| MC-2 | Product gallery empty on mobile (content beyond visible area) | Critical |
| MC-3 | Add to Cart buried below fold (y=1477-1540 on 812px viewport) | High |
| MC-4 | Color swatches below tap target minimum (32px vs 44px) | High |
| MC-5 | 32 color options unusable on mobile | High |
| PT-1 | Lazy-loading failure (images don't render below fold) | High |

### Collection Gallery Audit (375x812 Mobile)

| Page | URL | Products | Visible Images | Add to Cart | Product Width | Gallery Y | Overflow |
|------|-----|----------|---------------|-------------|---------------|-----------|----------|
| **Big Barn** | `/shop` | 45 (20 clothing + 22 graphics + 3 other) | 3 of 63 | 0 buttons | 980px | 439px | 606px |
| **Fun Shirts** | `/fun-shirts` | 13 | 3 of 27 | 0 buttons | 980px | 164px | 606px |
| **Artistry in Motion** | `/shop-1` | 6 | 2 of 14 | 0 buttons | 980px | 811px | 606px |
| **Board 30** | `/shop-4` | 17 | 4 of 33 | **17 buttons** | 980px | 365px | 606px |
| **Fall PreOrder** | `/shop-2` | 2 | 3 | 0 buttons | 980px | 485px | 606px |
| **UNMH** | `/shop-3` | 15 | 2 | 0 buttons | 980px | 871px | 606px |

**Key Findings:**
- **ALL 6 collection pages** have 606px horizontal overflow (body scroll width = 981px on 375px viewport)
- **Product cards are 980px wide** -- each card extends 605px beyond the visible mobile viewport
- **Only 2-4 product images** are visible at any time (out of total catalog) due to fixed-width layout
- **Board 30 is the only page** with Add to Cart buttons in the gallery (17 buttons present)
- **5 of 6 pages** have zero Add to Cart buttons in their gallery -- customers must click into product detail to purchase
- **Product images fail to render** for items positioned off-screen (WIX lazy-loading does not trigger for elements beyond the visible area -- PT-1 confirmed)

### Product Detail Page Audit (375x812 Mobile)

| Product | Collection | Colors | Swatch Size | Add to Cart Y | ATC Width | ATC Height | ATC X | Image Width |
|---------|-----------|--------|-------------|---------------|-----------|------------|-------|-------------|
| **Lifting Chakras** | Fun Shirts | 32 | 32x32px | 1477px | 280px | 40px | 350px | 980px |
| **BELLA+CANVAS Triblend Tee** | Big Barn | 4 | 32x32px | 1540px | 280px | 40px | 350px | 980px |
| **BELLA+CANVAS Muscle Tank** | Board 30 | 5 | 32x32px | 1447px | 280px | 40px | 350px | 980px |

**Key Findings:**
- **Add to Cart button position:** y=1447-1540px -- nearly 2 full screen-heights below the viewport top (812px viewport). Users must scroll approximately 1.8x the screen height to reach the purchase button.
- **Add to Cart button X position:** x=350px -- positioned 350px from left edge, which is largely off-screen at 375px viewport width. Only the leftmost ~25px of the 280px-wide button is visible without horizontal scrolling.
- **Color swatch dimensions:** All products use 32x32px swatches -- 27% below the WCAG 2.1 minimum of 44x44px. This applies to all product pages, not just Fun Shirts.
- **32 color options (Fun Shirts):** The color picker container is 280px wide x 150px tall, holding 32 radio buttons in approximately 8 rows of 4. At 32x32px each with minimal spacing, the swatches are densely packed and extremely difficult to tap accurately on mobile.
- **Product images:** All products render at 980px width, extending 605px beyond the visible viewport. The product image carousel/gallery is positioned at desktop coordinates.
- **Size dropdown:** 280px wide x 44px tall, positioned at x=350. Like the Add to Cart button, it is mostly off-screen.
- **H1 heading:** Product name rendered at y=940px (below the fold), 940px wide.
- **Option selectors use custom WIX dropdowns** -- not native `<select>` elements. Limited keyboard/assistive technology support (AC-4).

### Layout Analysis

The WIX product page uses a **side-by-side desktop layout** that does not reflow on mobile:

```
Desktop (1440px):
[   Product Image (left)   ] [  Product Info (right)  ]
[        980px wide        ] [ Name, Price, Options,   ]
                              [ Add to Cart - 280px    ]

Mobile (375px) - CURRENT BROKEN STATE:
[   Product Image starts at x=0, extends to x=980   ]
[  Everything positioned at desktop coordinates      ]
[  Options panel starts at x=350, only 25px visible  ]
[  Add to Cart at y=1447-1540, x=350                 ]
```

The entire product info column (name, price, options, Add to Cart) is positioned at its desktop X coordinate (~350px from left), placing it almost entirely outside the 375px mobile viewport.

### Tablet Audit (768x1024)

| Page | Type | Overflow | Products Visible | Product Width | Notes |
|------|------|----------|-----------------|---------------|-------|
| **Big Barn** | Collection | 213px | 13 images visible | 307px per card (3-col grid) | Gallery partially usable; heading visible |
| **Lifting Chakras** | Product Detail | 213px | N/A | 980px image | Options panel partially visible at 768px |

**Tablet Findings:**
- Body scroll width remains 981px (213px overflow at 768px viewport)
- Collection galleries are **partially usable** at tablet -- products display in a 3-column grid with ~307px cards, most content within viewport
- Product detail pages still use the desktop side-by-side layout; options panel starts at x=350 and is largely visible at 768px but still overflows
- Horizontal scrolling still required on all pages

---

## 2. Collection Gallery Optimization

### WIX Editor Instructions for Mobile Gallery Layout

These steps configure the Product Gallery widget for proper mobile display on all collection pages.

#### Step 1: Switch to Mobile Editor View

1. Open WIX Dashboard: `https://manage.wix.com/dashboard/c744cbdb-46f8-4c66-ac76-eb31bd0d52c1`
2. Click **Edit Site** to open the WIX Editor
3. Click the **mobile phone icon** in the top toolbar to switch to Mobile Editor view
4. The canvas will switch to a mobile-width preview

**Important:** Changes in Mobile Editor only affect mobile views. Desktop layout remains unchanged.

#### Step 2: Configure Product Gallery for Mobile (All Collection Pages)

Repeat these steps for EACH collection page: Big Barn, Fun Shirts, Artistry in Motion, Board 30, Fall PreOrder, UNMH, and Shop All (if created).

1. In the Mobile Editor, navigate to the collection page
2. Click on the **Product Gallery** widget to select it
3. Click **Settings** (gear icon) on the widget
4. Under **Layout** settings:
   - Set **Products per row** to **1** for mobile (single-column layout)
   - Alternatively, set to **2** if the widget supports it and images remain large enough to be useful
   - Ensure the gallery width is set to **Full Width** or **100%** of the container
5. Under **Display** settings:
   - Verify **Product Name** is visible
   - Verify **Price** is visible
   - Verify **Add to Cart** button is enabled (per GALLERY-STANDARDIZATION.md)
6. Under **Image** settings:
   - Set image ratio to **Square (1:1)** or **Portrait (3:4)** for mobile
   - Ensure images are large enough to see product details (minimum 300px wide)
7. Save changes

**Big Barn Special Case:** The Big Barn page has TWO gallery sections:
- **Clothing gallery** (main grid) -- Apply steps above
- **"Choose your Graphics" carousel** -- This horizontal slider needs separate attention:
  1. Click on the graphics slider widget
  2. In Mobile Editor, check if it reflows to a vertical layout
  3. If still horizontal, ensure the slider arrows/navigation are touch-friendly (44px+ tap targets)
  4. Consider changing the slider to a grid layout on mobile for easier browsing

#### Step 3: Verify Gallery Card Sizing

After setting columns, verify each product card:
- [ ] Product image fills the card width
- [ ] Product name is fully readable (not truncated)
- [ ] Price is visible below the product name
- [ ] Add to Cart button (if enabled) is fully visible and tappable
- [ ] Quick View button is accessible

#### Step 4: Enable Add to Cart on ALL Collection Galleries

Per Phase 2 GALLERY-STANDARDIZATION.md, only Board 30 currently has Add to Cart buttons in its gallery. Enable this on all other collection pages:

1. Navigate to each collection page in the WIX Editor (desktop or mobile view)
2. Click on the Product Gallery widget
3. Open **Settings** > **Display** or **Product Info**
4. Toggle **"Add to Cart" button** to **ON**
5. Match settings to Board 30's reference configuration:
   - Add to Cart: ON
   - Quick View: ON
   - Product Name: Visible
   - Price: Visible

**Pages needing this change:** Big Barn, Fun Shirts, Artistry in Motion, UNMH, Fall PreOrder, Shop All (if created)

See `GALLERY-STANDARDIZATION.md` for detailed page-by-page instructions.

---

## 3. Product Detail Page Optimization

### WIX Editor Instructions for Mobile Product Pages

The product detail page uses a WIX Stores template. Changes here apply to ALL product pages sitewide.

#### Step 1: Switch Product Page to Mobile-Optimized Layout

1. In the Mobile Editor, navigate to any product page (e.g., `/product-page/lifting-chakras`)
2. The WIX Editor should show the product page template
3. Look for the **product page layout** settings:
   - The page should stack **vertically** on mobile: Image on top, info below
   - If the layout is side-by-side (desktop), click on the product section
   - Look for a **Layout** option that provides a **stacked/vertical** mobile arrangement
4. Ensure the product image section is set to **Full Width** on mobile

**Target mobile layout:**
```
[     Product Image (full width)     ]
[     Image dots/carousel nav        ]
[     Product Name (H1)              ]
[     Price                          ]
[     Sezzle payment info            ]
[     Color Options                  ]
[     Size Dropdown                  ]
[     Other Options (if any)         ]
[     Quantity Selector              ]
[     [ ADD TO CART button ]         ]
[     Product Description            ]
[     Social Share Icons             ]
```

#### Step 2: Reposition Add to Cart Button (MC-3)

The Add to Cart button is currently at y=1447-1540px, requiring nearly 2 full screen scrolls to reach.

1. In the Mobile Editor, locate the **Add to Cart button**
2. Move it to appear **immediately below the last product option selector** (Size, Color, Quantity)
3. Target position: Within the first 1.5 viewport heights (within ~1200px from top)
4. If the WIX product page template supports it:
   - Consider a **sticky Add to Cart button** at the bottom of the mobile screen
   - This keeps the purchase action always visible regardless of scroll position
5. Ensure the button is:
   - **Full width** on mobile (375px minus padding)
   - **44px minimum height** (currently 40px -- increase to 44px+ for WCAG compliance)
   - Centered horizontally within the viewport

#### Step 3: Increase Color Swatch Tap Targets (MC-4)

All color swatches are currently 32x32px. WCAG 2.1 requires minimum 44x44px tap targets.

1. In the Mobile Editor, click on the **color picker** section of the product page
2. Look for swatch/option sizing settings:
   - Under **Design** or **Style** settings for the color picker
   - Look for **Swatch Size**, **Option Size**, or **Touch Target** settings
   - Increase swatch size to **44x44px minimum** (ideally 48x48px for comfortable tapping)
3. If the WIX Editor does not expose swatch sizing:
   - This may be a WIX Stores widget limitation
   - Check if there is a **Custom CSS** or **Advanced Settings** option
   - If no resize option exists, document as a WIX platform limitation
4. Ensure adequate spacing between swatches:
   - Minimum 8px gap between swatches to prevent mis-taps
   - With 44px swatches and 8px gaps, 4 swatches per row requires ~200px (fits in 375px with padding)

#### Step 4: Handle 32 Color Options on Mobile (MC-5)

The Lifting Chakras and other Fun Shirts products have 32 color options. At 44x44px per swatch with 8px gaps, this creates:
- 4 swatches per row (at 375px viewport with padding)
- 8 rows of color swatches
- ~416px total height for the color section alone

**Recommended solutions (in order of preference):**

**Option A: Scrollable Color Container**
1. In the product page template settings, look for **Scrollable Options** or **Container Height** settings
2. Set the color options container to a **fixed height** (e.g., 200px) with **vertical scrolling**
3. This keeps the Add to Cart button visible sooner while still providing access to all colors
4. Add a visual indicator (e.g., fade or scroll arrow) showing more options exist below

**Option B: Collapsible/Expandable Color Section**
1. If the WIX widget supports it, configure the color section as **collapsible**
2. Show the first 8-12 colors by default
3. Add a **"Show All Colors"** or **"View More"** button to expand
4. This reduces initial page height and keeps Add to Cart closer to the fold

**Option C: Color Dropdown Instead of Swatches**
1. If the WIX product options allow switching from **swatch view** to **dropdown view**:
   - Change the Color option from radio buttons/swatches to a native dropdown
   - This collapses 32 options into a single 44px-tall dropdown
   - Trade-off: Users cannot see all colors at a glance, but the interface is far more usable on mobile
2. Consider keeping swatches for desktop (visual) and dropdown for mobile (usable)

**Note:** The ideal solution depends on which options the WIX Editor exposes for the product options widget. Try Option A first, fall back to Option C if container sizing is not available.

#### Step 5: Optimize Product Image for Mobile

1. In the Mobile Editor, select the **product image** area
2. Configure for mobile:
   - Image should fill the **full viewport width** (375px)
   - Maintain aspect ratio (do not stretch)
   - Image carousel dots should be visible and tappable (44px+ tap area)
   - Swipe gesture should work for image navigation
3. If the image is fixed at 980px:
   - Look for responsive/fluid width settings in the image container
   - Set width to **100%** of the parent container
   - Ensure the container itself is full-width on mobile

#### Step 6: Optimize Size Dropdown for Mobile

1. The size dropdown is currently 280px wide at x=350 (off-screen on mobile)
2. In the Mobile Editor, set the size dropdown to:
   - **Full width** within the content area
   - **44px minimum height** for tap target compliance
   - Left-aligned within the content column
3. If the product page uses custom WIX dropdowns (not native `<select>`):
   - Verify the dropdown opens correctly on mobile
   - Ensure the dropdown options list is scrollable if many sizes exist
   - Note: Custom dropdown keyboard accessibility is a known WIX platform limitation (AC-4)

---

## 4. Image Loading Optimization

### Addressing PT-1: Lazy-Loading Failure

**Problem:** Product images fail to render below the fold. The WIX lazy-loading mechanism does not fire correctly for elements positioned at desktop coordinates beyond the mobile viewport.

**Root Cause:** Images are positioned at their desktop X/Y coordinates (e.g., x=350, y=1200). The WIX lazy-loading system uses viewport intersection detection, but because the images are positioned off-screen horizontally (beyond 375px), the intersection observer never triggers. This is a direct consequence of the fixed-width desktop layout being served to mobile.

**Solution:** Fixing the mobile layout (Steps 1-2 in Section 2 and Section 3) should resolve the lazy-loading issue automatically. When elements are positioned within the mobile viewport width, the intersection observer will detect them as the user scrolls vertically.

### WIX Editor Steps

1. **Primary Fix:** Complete the Collection Gallery Optimization (Section 2) and Product Detail Page Optimization (Section 3). Setting the gallery to 1-column mobile layout and the product page to stacked vertical layout will bring all elements within the viewport width, allowing lazy-loading to function correctly.

2. **Verification:** After applying mobile layout changes:
   - In the WIX Editor Mobile Preview, scroll through a collection page
   - Verify that product images load as you scroll down
   - Check that all images in the gallery eventually render (not just the first 2-4)

3. **If images still fail to load after layout fix:**
   - Check WIX Editor settings for **Image Loading** or **Lazy Load** options
   - Look under **Site Settings** > **Performance** or **SEO** for image loading behavior
   - WIX may have a **"Load images on scroll"** toggle -- ensure it is enabled
   - If a **"Preload images"** option exists, consider enabling it for the first 6-8 product images on collection pages

4. **Image Optimization Settings:**
   - In the WIX Editor, check if image quality/compression settings exist under **Site Settings**
   - WIX automatically serves WebP format and responsive image sizes -- this is handled by the platform
   - Ensure product images are uploaded at adequate resolution (minimum 800x800px) for mobile display

---

## 5. Verification Checklist

After completing all optimization steps, verify the following:

### Collection Gallery Pages (375px Mobile)

- [ ] **Big Barn** (`/shop`): Products display in 1-2 column grid
- [ ] **Big Barn**: All clothing product images load when scrolling
- [ ] **Big Barn**: Graphics carousel section is usable on mobile
- [ ] **Fun Shirts** (`/fun-shirts`): Products display in 1-2 column grid
- [ ] **Artistry in Motion** (`/shop-1`): Products display in 1-2 column grid
- [ ] **Board 30** (`/shop-4`): Products with Add to Cart buttons visible
- [ ] **Fall PreOrder** (`/shop-2`): Products display in 1-2 column grid
- [ ] **UNMH** (`/shop-3`): Products display in 1-2 column grid
- [ ] **Shop All** (if created): Products display in 1-2 column grid
- [ ] All pages: Zero horizontal scrolling (body width = viewport width)
- [ ] All pages: Add to Cart buttons visible on all gallery product cards
- [ ] All pages: Product images load correctly when scrolling (no blank spaces)
- [ ] All pages: Quick View works on mobile

### Product Detail Pages (375px Mobile)

- [ ] Product image displays full-width (not 980px overflow)
- [ ] Product name (H1) visible within first viewport
- [ ] Price visible within first viewport
- [ ] Color swatches are at least 44x44px
- [ ] Color swatches have 8px+ spacing between them
- [ ] 32-color products (Fun Shirts): Options are usable (scrollable container, dropdown, or collapsible)
- [ ] Size dropdown is full-width and tappable (44px+ height)
- [ ] Add to Cart button within 1.5 viewport heights from top (within ~1200px)
- [ ] Add to Cart button is full-width and 44px+ height
- [ ] Product description is readable on mobile
- [ ] Image carousel swipe navigation works
- [ ] Sezzle payment info displays correctly

### Tablet (768px)

- [ ] Collection pages: Zero horizontal scrolling
- [ ] Collection pages: Products display in 2-3 column grid
- [ ] Product detail pages: Zero horizontal scrolling
- [ ] Product detail pages: Layout stacks vertically or side-by-side within viewport
- [ ] All interactive elements accessible without horizontal scroll

### Cross-Page Consistency

- [ ] All collection pages use the same mobile gallery layout
- [ ] All product detail pages use the same mobile template
- [ ] Add to Cart button appears in the same relative position on all products
- [ ] Color swatch sizing is consistent across all products
- [ ] Price formatting is consistent on mobile

---

## 6. Expected Result

After completing these optimizations, the mobile product browsing experience should transform from:

**Before (Current State):**
- 981px fixed desktop layout forced on all viewports
- Product galleries render at 980px width; only 2-4 images partially visible on mobile
- Add to Cart button at y=1447-1540 (nearly 2 screens below top) and at x=350 (off-screen)
- Color swatches 32x32px (27% below WCAG minimum)
- 32-color products completely unusable on mobile
- Product images fail to lazy-load due to off-screen positioning
- 5 of 6 collection pages have no Add to Cart in gallery
- All product info (name, price, options) positioned off-screen at desktop coordinates

**After (Target State):**
- Responsive layout that adapts to viewport width
- Product galleries in 1-2 column mobile grid with full-width product cards
- Add to Cart button within first 1.5 viewport heights, full-width, 44px+ tall
- Color swatches 44x44px+ with adequate spacing
- 32-color products usable via scrollable container, collapsible section, or dropdown
- Product images lazy-load correctly as user scrolls
- ALL collection pages have Add to Cart in gallery (matching Board 30)
- All product info visible within the mobile viewport

### Impact Estimates

| Issue | Before | After | Impact |
|-------|--------|-------|--------|
| MC-2 (Gallery empty) | 0 usable products on mobile | All products visible in mobile grid | **Critical fix** -- enables mobile shopping |
| MC-3 (ATC buried) | y=1477-1540, x=350 (off-screen) | Within 1200px from top, full-width | **High impact** -- reduces friction to purchase |
| MC-4 (Swatches too small) | 32x32px (FAIL) | 44x44px+ (PASS) | **WCAG compliance** -- accessible for all users |
| MC-5 (32 colors unusable) | 32 tiny swatches, densely packed | Scrollable/collapsible/dropdown | **Usability fix** -- Fun Shirts become purchasable on mobile |
| PT-1 (Lazy-load failure) | Images don't render off-screen | Images load on scroll | **Performance fix** -- all product images visible |

### Revenue Impact

With approximately 50% of traffic on mobile:
- **MC-2 resolution** alone could recover significant mobile conversion -- currently mobile visitors see zero products on collection pages
- **MC-3 resolution** removes the 2-screen-scroll barrier to purchase
- Combined mobile product page fixes address 5 of the 35 total UX issues identified in Phase 1

---

## Reference Documents

- **GALLERY-STANDARDIZATION.md** (Phase 2, Plan 02-05) -- Add to Cart button settings for collection galleries
- **MOBILE-NAV-OPTIMIZATION.md** (Phase 3, Plan 03-01) -- Mobile menu and responsive navigation instructions
- **UX-ISSUES.md** (Phase 1, Plan 01-03) -- Original issue identification with measurements
- **Board 30** (`/shop-4`) -- Reference collection page (has Add to Cart in gallery, best current configuration)

---

*Generated by Plan 03-02 execution (Tasks 1-2). Requires manual completion in WIX Editor.*
*Must be done AFTER completing Phase 2 GALLERY-STANDARDIZATION.md and Phase 3 MOBILE-NAV-OPTIMIZATION.md.*
*References: UX-ISSUES.md (MC-2, MC-3, MC-4, MC-5, PT-1), GALLERY-STANDARDIZATION.md (Add to Cart settings)*
