# Site Search Setup Instructions

**Created:** 2026-01-30
**Plan:** 02-04 (Search & Product Discovery)
**Issue:** NV-2 (Zero Search Functionality)
**Priority:** HIGH

---

## Overview

The store has 105 products across 10 collections with zero search functionality. Customers have no way to find specific products by keyword. This document provides step-by-step instructions for adding Wix Site Search to the store.

## What Gets Added

When you add Wix Site Search:
- A **search bar** is added to your site's header (appears on every page)
- A **Search Results** page is automatically created
- Products, pages, and other content become searchable by visitors

---

## Prerequisites

- Access to the WIX Editor for hotboxclothing.shop
- Site must be saved and published after changes

---

## Step 1: Install Wix Site Search App

### In Wix Editor:
1. Open the site in the Wix Editor
2. Click **"Add Apps"** on the left sidebar
3. Search for **"Wix Site Search"**
4. Click **"Add to Site"**

### In Studio Editor:
1. Open the site in the Studio Editor
2. Click **"App Market"** on the left sidebar
3. Search for **"Wix Site Search"**
4. Click **"Add to Site"**

**Result:** A search bar appears in your site header, and a "Search Results" page is added to your site.

> **Note:** The app is free (made by Wix). Do NOT install the third-party "Site Search" app by Fast Simon -- that is a different paid app.

---

## Step 2: Configure the Search Bar

1. Click the **search bar** in the header
2. Click **Settings**
3. Update the placeholder text:
   - Change default text to: **"Search products..."** or **"Search our store"**
4. Adjust layout/design to match the site's look:
   - Icon style: magnifying glass icon (recommended -- clean, minimal)
   - Position: right side of header (near cart/login icons)

### Design Recommendations for HotBox:
- **Style:** Icon-only (expands on click) -- saves header space
- **Color:** Match the site's existing header color scheme
- **Font:** Match the site's navigation font

---

## Step 3: Configure Search Results

1. Navigate to the **Search Results** page (automatically created)
2. Click the search results widget
3. Click **Settings**
4. Under **"Show on Search"**, ensure these are enabled:
   - [x] **Products** (most important for a store)
   - [x] **Pages** (so customers can find collection/landing pages)
   - [ ] Blog posts (not applicable -- no blog)
   - [ ] Events (not applicable)
   - [ ] Forum (not applicable)
   - [ ] Bookings (not applicable)
5. **Reorder results:** Drag **Products** to the top so product results appear first
6. **Optional:** Enable "Add to Cart" button on product results for faster purchasing

### Search Suggestions Configuration:
1. In Search Bar settings, look for **"Search Suggestions"** options
2. Enable **trending items** display if available
3. Configure which suggestion elements to show (product names, categories)

---

## Step 4: Customize Search Results Page Design

1. Click the search results display area
2. Customize to match site branding:
   - Product card layout: Grid (consistent with other gallery pages)
   - Show product price
   - Show product image
   - "No results" message: "No products found. Try a different search term or browse our collections."

---

## Step 5: Verify Search Works

After saving and publishing, test the following:

| Test | Action | Expected Result |
|------|--------|-----------------|
| Search icon visible | Visit homepage | Search icon/bar visible in header |
| Search on every page | Visit any page | Search icon/bar appears consistently |
| Product search | Search "hoodie" | Hoodie products appear in results |
| Product search | Search "tank" | Tank top products appear in results |
| Brand search | Search "Big Barn" | Big Barn products or page appears |
| Category search | Search "Fun Shirts" | Fun Shirts products or page appears |
| No results | Search "xyznotfound" | Graceful "no results" message |
| Search results page | Click a search result | Navigates to correct product page |

---

## Why This Cannot Be Done Via API

- The WIX REST API has a **Site Search API** for querying search results programmatically
- However, the Site Search **app installation** and **search bar widget placement** require the WIX Editor
- The search bar is a frontend widget that must be positioned in the site header via the visual editor
- The Search Results page is automatically created when the app is installed via the editor
- There is no REST API endpoint for installing the Wix Site Search app (its appDefId is not in the documented app installation API)

---

## Additional Notes

- **Indexing:** Wix Site Search indexes content near-instantly after updates
- **Products indexed automatically:** Product names, descriptions, and collection names are indexed
- **Page content indexed:** Page titles and text content are searchable
- **Mobile:** The search bar adapts to mobile layout automatically when placed in the header
- **SEO benefit:** Site search improves user engagement metrics, which indirectly helps SEO

---

*This document was created because the WIX REST API cannot install the Site Search app or configure the search bar widget. These are WIX Editor-only operations.*
