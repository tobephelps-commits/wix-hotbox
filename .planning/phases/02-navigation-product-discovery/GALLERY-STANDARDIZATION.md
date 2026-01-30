# Gallery Standardization Across Collection Pages

**Created:** 2026-01-30
**Plan:** 02-05 (Cross-Selling & Gallery Standardization)
**Status:** Manual WIX Editor Action Required

---

## Overview

Product gallery layouts are inconsistent across collection pages. Board 30 has "Add to Cart" buttons visible on each product in the gallery, but all other collection pages require customers to click into the product detail page before they can add to cart. This creates a friction-heavy UX on most pages and a better experience on Board 30 only.

## Current State (Verified via Playwright Browser Inspection)

| Page | URL | Gallery Type | Add to Cart | Quick View | Notes |
|------|-----|-------------|-------------|------------|-------|
| **Board 30** | `/shop-4` | Product Gallery grid | **YES** | YES | Best UX -- customers can add to cart directly from listing |
| **Big Barn** | `/shop` | Product Gallery grid + Graphics slider | NO | YES | Two sections: clothing grid + "Choose your Graphics" horizontal carousel |
| **Artistry in Motion** | `/shop-1` | Product Gallery grid | NO | YES | Simple grid, must click into product to add to cart |
| **Fun Shirts** | `/fun-shirts` | Product Gallery grid | NO | YES | Simple grid, must click into product to add to cart |
| **UNMH** | `/shop-3` | Product Gallery grid | NO | YES | Simple grid, must click into product to add to cart |
| **Fall PreOrder** | `/shop-2` | Product Gallery grid | NO | YES | Simple grid, must click into product to add to cart |

### Key Findings

1. **Board 30 is the only page with "Add to Cart" in the gallery** -- this is a per-widget setting in the WIX Editor
2. **All pages have "Quick View"** -- this is enabled across all gallery widgets
3. **Big Barn has two distinct sections:**
   - A standard Product Gallery grid for clothing (~20 items)
   - A horizontal slider/carousel section titled "Choose your Graphics" for graphics add-on items (~22 items, $1-$10 each)
4. **Gallery widget settings cannot be modified via WIX REST API** -- confirmed by searching WIX REST docs and testing available endpoints

## API Investigation Results

### What Was Searched
- WIX REST API docs for "product gallery widget configuration"
- WIX REST API docs for "store page layout grid settings"
- WIX Pro Gallery API (manages image/video galleries, NOT product galleries)

### Conclusion
The Product Gallery widget is a WIX Stores visual component whose settings (Add to Cart visibility, Quick View, layout, columns, etc.) are configured per-widget in the WIX Editor. There is no REST API endpoint to modify these settings. This is consistent with all prior findings in Plans 02-01 through 02-04.

---

## Manual WIX Editor Instructions

### Part A: Enable "Add to Cart" on All Collection Page Galleries

The goal is to replicate the Board 30 gallery behavior (Add to Cart button visible on each product) across all other collection pages.

#### Step 1: Open Board 30 Page to Reference Settings

1. Go to **WIX Dashboard** > **Site Editor**
2. Navigate to the **Board 30** page (`/shop-4`)
3. Click on the **Product Gallery** widget to select it
4. Open widget settings (click "Settings" or the gear icon)
5. Note the following settings:
   - **Layout:** Grid / List / Slider (likely Grid)
   - **Show Add to Cart button:** Enabled
   - **Show Quick View:** Enabled
   - **Products per row:** Count the columns (likely 3-4)
   - **Product info shown:** Name, Price, Add to Cart
   - **Image ratio:** Note the aspect ratio

#### Step 2: Update Big Barn Page (`/shop`)

1. Navigate to the **Big Barn** page in the editor
2. Click on the **Product Gallery** widget (the clothing grid, NOT the graphics section)
3. Open widget settings
4. Enable **"Add to Cart" button** (toggle ON)
5. Verify other settings match Board 30:
   - Quick View: ON
   - Product name: Visible
   - Price: Visible
6. Save changes

**Graphics section:** Leave the "Choose your Graphics" carousel section as-is. These are add-on decoration items, not standalone clothing products. The slider format works well for browsing graphics options. See Part C below for labeling recommendation.

#### Step 3: Update Artistry in Motion Page (`/shop-1`)

1. Navigate to the **Artistry in Motion** page
2. Click on the **Product Gallery** widget
3. Open widget settings
4. Enable **"Add to Cart" button** (toggle ON)
5. Match other settings to Board 30
6. Save changes

#### Step 4: Update Fun Shirts Page (`/fun-shirts`)

1. Navigate to the **Fun Shirts** page
2. Click on the **Product Gallery** widget
3. Open widget settings
4. Enable **"Add to Cart" button** (toggle ON)
5. Match other settings to Board 30
6. Save changes

#### Step 5: Update UNMH Page (`/shop-3`)

1. Navigate to the **UNMH** page
2. Click on the **Product Gallery** widget
3. Open widget settings
4. Enable **"Add to Cart" button** (toggle ON)
5. Match other settings to Board 30
6. Save changes

#### Step 6: Update Fall PreOrder Page (`/shop-2`)

1. Navigate to the **Fall PreOrder** page
2. Click on the **Product Gallery** widget
3. Open widget settings
4. Enable **"Add to Cart" button** (toggle ON)
5. Match other settings to Board 30
6. Save changes

#### Step 7: Update Shop All Page (if created per SHOP-ALL-PAGE.md)

1. If the Shop All page has been created (see `SHOP-ALL-PAGE.md`), navigate to it
2. Click on the **Product Gallery** widget
3. Open widget settings
4. Enable **"Add to Cart" button** (toggle ON)
5. Match other settings to Board 30
6. Save changes

---

### Part B: Verify Consistent Layout Settings

After enabling Add to Cart on all pages, verify these settings are consistent across all gallery widgets:

| Setting | Target Value | Notes |
|---------|-------------|-------|
| **Add to Cart button** | Enabled (ON) | Primary change -- enables quick purchasing |
| **Quick View** | Enabled (ON) | Already enabled on all pages |
| **Product name** | Visible | Already visible on all pages |
| **Price** | Visible | Already visible on all pages |
| **Image ratio** | Match Board 30 | Ensure consistent product image sizing |
| **Products per row** | Match Board 30 (likely 3-4) | Consistent grid density |
| **Spacing** | Match Board 30 | Consistent visual spacing between products |

---

### Part C: Big Barn Graphics Section Labeling

The Big Barn page has a separate "Choose your Graphics" section below the clothing gallery. These 22 graphics items ($1-$10 each) are add-on decoration services (logos, patches, flags, embroidery), not standalone products.

**Current state:**
- Section heading: "Choose your Graphics" (H3)
- Layout: Horizontal slider/carousel with Previous/Next navigation buttons
- No "Add to Cart" buttons (these are add-on items that require a garment to be applied to)

**Recommendation:**
1. **Keep the current slider layout** -- it works well for browsing small graphic items
2. **Update the heading** to make the purpose clearer:
   - Change: "Choose your Graphics"
   - To: "Add-On Graphics & Embroidery" or "Customize Your Order - Add Graphics"
3. **Add a brief description** below the heading:
   - "These graphics are add-on decoration options. Choose a garment above, then select graphics to customize your order."
4. **Optional:** Add a visual separator (horizontal line) between the clothing gallery and graphics section to make the distinction clear

**Why not add "Add to Cart" to graphics:**
- Graphics are decoration services, not standalone products
- Adding them to cart without a garment could confuse customers
- The current Quick View approach lets customers read the details before adding

---

## Verification Checklist

After completing all gallery updates:

- [ ] **Board 30** (`/shop-4`): Add to Cart visible (reference -- should already be working)
- [ ] **Big Barn** (`/shop`): Add to Cart visible on clothing gallery products
- [ ] **Big Barn** (`/shop`): Graphics section retains slider layout (no Add to Cart needed here)
- [ ] **Artistry in Motion** (`/shop-1`): Add to Cart visible on all products
- [ ] **Fun Shirts** (`/fun-shirts`): Add to Cart visible on all products
- [ ] **UNMH** (`/shop-3`): Add to Cart visible on all products
- [ ] **Fall PreOrder** (`/shop-2`): Add to Cart visible on all products
- [ ] **Shop All** (if created): Add to Cart visible on all products
- [ ] All pages show consistent product info: image, name, price, Add to Cart button
- [ ] All pages have same grid layout (products per row, spacing, image ratio)
- [ ] No broken layouts or overlapping elements
- [ ] Mobile view: Add to Cart buttons accessible on all gallery pages
- [ ] Quick View still works on all pages

### Cross-Page Consistency Check

Visit 3+ collection pages in sequence and verify:
- [ ] Gallery grid looks identical across pages (same columns, spacing, card style)
- [ ] Add to Cart button appears in the same position on each product card
- [ ] Quick View button appears in the same position
- [ ] Product info (name, price) is formatted consistently
- [ ] No page has a noticeably different layout or missing elements

---

## Technical Notes

### Why Board 30 Has Add to Cart But Others Don't

This is a per-widget configuration in the WIX Editor. When the store owner created each collection page, they used the Product Gallery widget but configured it differently on Board 30 (likely the most recently created or most actively managed page). The other pages were set up without the Add to Cart option enabled.

### WIX Product Gallery Widget Settings Location

In the WIX Editor:
1. Click on the Product Gallery widget on any page
2. Click **"Settings"** (or gear icon)
3. Under **"Product Page"** or **"Display"** section, find the "Add to Cart" toggle
4. This is a boolean on/off setting per widget instance

### Products With Variants

Some products have size/color variants. When "Add to Cart" is clicked from the gallery:
- **If product has no variants:** Adds directly to cart
- **If product has variants:** Opens a Quick Add dialog where customer selects size/color, then adds to cart
- This is standard WIX Stores behavior and works automatically

---
*Plan: 02-05 Task 2*
*Created: 2026-01-30*
