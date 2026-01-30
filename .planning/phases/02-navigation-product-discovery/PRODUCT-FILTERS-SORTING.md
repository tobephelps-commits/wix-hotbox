# Product Filtering & Sorting Setup Instructions

**Created:** 2026-01-30
**Plan:** 02-04 (Search & Product Discovery)
**Issue:** NV-3 (No Product Filtering or Sorting)
**Priority:** HIGH

---

## Overview

All 7 product listing pages currently have zero filter controls and zero sort options. A customer browsing 42 Big Barn items or 103 products on Shop All has no way to narrow results by price, category, or product type. This document provides step-by-step instructions for enabling filtering and sorting on all collection/gallery pages.

## What Gets Added

- **Filter controls** on product gallery pages (price, category, product options)
- **Sort options** on product gallery pages (price low-to-high, price high-to-low, newest, name A-Z)
- Customers can narrow and reorder product listings to find what they want

---

## Prerequisites

- Access to the WIX Editor for hotboxclothing.shop
- Shop All page created (see SHOP-ALL-PAGE.md -- should be done first)
- Site must be saved and published after changes

---

## Important Limitation

> **Filter and sorting options are NOT available for slider galleries.** They only work on **grid galleries** and **category pages**. If any collection page uses a slider gallery, it must be changed to a grid gallery first.

---

## Step 1: Enable Filters on Shop All Page

The Shop All page is the highest-priority page for filters since it displays all 103 products.

### Enable Built-in Filters:

1. Open the site in the WIX Editor
2. Navigate to the **Shop All page** (repurposed /shop-5, see SHOP-ALL-PAGE.md)
3. Click the **Product Gallery** widget on the page
4. Click **Settings** (or the Settings icon)
5. Go to the **Display** tab
6. Check the box next to **"Filters"**
7. Optionally check **"Filters title"** to show "Filter by" heading
8. Optionally check **"Applied filters"** to show active filter tags

### Configure Filter Types:

1. In Settings, go to the **Filters** tab
2. Configure each preset filter:

| Filter | Action | Notes |
|--------|--------|-------|
| **Category** | SHOW | Essential for Shop All -- lets customers filter by collection (Big Barn, Fun Shirts, etc.) |
| **Price** | SHOW | Lets customers filter by price range |
| **Product Options** | SHOW | Displays color/size filters (shows all options -- cannot select individually) |

### Customize Category Filter:

1. Click the **More Actions** icon (three dots) next to "Category"
2. Click **Edit**
3. Click **"Choose categories"**
4. Select the relevant categories customers should filter by:
   - [x] Big Barn Crossfit
   - [x] Fun Shirts
   - [x] Artistry in Motion (AIM)
   - [x] UNMH (Lovelace UNM)
   - [x] Board 30
   - [x] Fall PreOrder
5. Click **Done**

---

## Step 2: Enable Sorting on Shop All Page

1. Still in the Product Gallery **Settings**
2. Go to the **Display** tab
3. Check the box next to **"Sorting options"**
4. Go to the **Sorting** tab
5. Enable the following sorting options:

| Sort Option | Enable? | Notes |
|-------------|---------|-------|
| **Price (low to high)** | YES | Most common sort for price-conscious shoppers |
| **Price (high to low)** | YES | For customers looking for premium items |
| **Newest** | YES | Shows most recently added products first |
| **Name (A-Z)** | YES | Alphabetical sorting for browsing |

6. Optionally edit the sorting title (default: "Sort by")

---

## Step 3: Enable Filters and Sorting on Client Collection Pages

Repeat the filter/sort setup for each client collection page. The configuration is slightly different per page since they show products from a single collection.

### Big Barn Crossfit Page (42 products)

1. Navigate to the Big Barn page
2. Click the Product Gallery widget
3. Settings > Display > Enable **Filters** and **Sorting options**
4. Filters tab:
   - **Category:** HIDE (single collection page -- not needed)
   - **Price:** SHOW
   - **Product Options:** SHOW (helps filter 42 items by color/size)
5. Sorting tab: Enable all 4 sort options

### Fun Shirts Page (14 products, 32 color options each)

1. Navigate to the Fun Shirts page
2. Click the Product Gallery widget
3. Settings > Display > Enable **Filters** and **Sorting options**
4. Filters tab:
   - **Category:** HIDE (single collection)
   - **Price:** SHOW
   - **Product Options:** SHOW (IMPORTANT: helps manage the 32-color overwhelm)
5. Sorting tab: Enable all 4 sort options

> **Special note for Fun Shirts:** The Product Options filter is especially valuable here. Each of the 14 products has 32 Gildan 8000 color options. Enabling filtering by product options lets customers narrow by color at the gallery level before entering a product page.

### Artistry in Motion (AIM) Page

1. Navigate to the AIM page
2. Click the Product Gallery widget
3. Settings > Display > Enable **Filters** and **Sorting options**
4. Filters tab:
   - **Category:** HIDE
   - **Price:** SHOW
   - **Product Options:** SHOW
5. Sorting tab: Enable all 4 sort options

### UNMH (Lovelace UNM) Page

1. Navigate to the UNMH page
2. Click the Product Gallery widget
3. Settings > Display > Enable **Filters** and **Sorting options**
4. Filters tab:
   - **Category:** HIDE
   - **Price:** SHOW
   - **Product Options:** SHOW
5. Sorting tab: Enable all 4 sort options

### Board 30 Page

1. Navigate to the Board 30 page
2. Click the Product Gallery widget
3. Settings > Display > Enable **Filters** and **Sorting options**
4. Filters tab:
   - **Category:** HIDE
   - **Price:** SHOW
   - **Product Options:** SHOW
5. Sorting tab: Enable all 4 sort options

### Fall PreOrder Page

1. Navigate to the Fall PreOrder page
2. Click the Product Gallery widget
3. Settings > Display > Enable **Filters** and **Sorting options**
4. Filters tab:
   - **Category:** HIDE
   - **Price:** SHOW
   - **Product Options:** SHOW
5. Sorting tab: Enable all 4 sort options

---

## Step 4: Customize Filter/Sort Design (All Pages)

After enabling filters and sorting on all pages, customize the visual appearance to match the site:

1. On any page with filters enabled, click the Product Gallery
2. Go to the **Design** tab
3. Scroll to the **"Filters & sorting"** section
4. Customize:
   - **Background color:** Match the page background
   - **Text color:** Match the site's text color
   - **Font:** Match the site's body font
   - **Border/dividers:** Keep subtle to not overwhelm the product display

Apply consistent design across all pages for a unified look.

---

## Step 5: Verify Filters and Sorting Work

After saving and publishing, test the following:

### Shop All Page

| Test | Action | Expected Result |
|------|--------|-----------------|
| Filters visible | Visit Shop All | Filter controls visible (Category, Price, Product Options) |
| Category filter | Select "Big Barn" category | Only Big Barn products shown |
| Price filter | Set price range | Products outside range hidden |
| Sort by price (low) | Select "Price: Low to High" | Products reorder by ascending price |
| Sort by price (high) | Select "Price: High to Low" | Products reorder by descending price |
| Sort by name | Select "Name: A-Z" | Products reorder alphabetically |
| Clear filters | Remove all filters | All products shown again |

### Client Collection Pages

| Test | Action | Expected Result |
|------|--------|-----------------|
| Big Barn filters | Visit Big Barn page | Price and Product Options filters visible |
| Fun Shirts filters | Visit Fun Shirts page | Price and Product Options filters visible |
| Sorting works | Apply sort on any collection page | Products reorder correctly |

---

## Why This Cannot Be Done Via API

- Product gallery **widget settings** (filters, sorting, display options) are configured in the WIX Editor
- The WIX REST API provides product filtering/sorting for **programmatic queries** (Catalog V3 API) but NOT for **frontend widget configuration**
- There is no REST API endpoint to enable/disable filter controls on a product gallery widget
- Gallery display settings, filter toggles, and sort option checkboxes are all WIX Editor visual configuration

---

## Summary of Changes Per Page

| Page | Filters to Enable | Sorting | Notes |
|------|-------------------|---------|-------|
| **Shop All** | Category + Price + Product Options | All 4 options | Highest priority -- 103 products |
| **Big Barn** | Price + Product Options | All 4 options | 42 products -- filters very helpful |
| **Fun Shirts** | Price + Product Options | All 4 options | Product Options filter helps with 32-color display |
| **AIM** | Price + Product Options | All 4 options | Standard setup |
| **UNMH** | Price + Product Options | All 4 options | Standard setup |
| **Board 30** | Price + Product Options | All 4 options | Standard setup |
| **Fall PreOrder** | Price + Product Options | All 4 options | Standard setup |

**Total pages to configure:** 7

---

*This document was created because the WIX REST API cannot configure product gallery widget settings (filters, sorting, display). These are WIX Editor-only operations.*
