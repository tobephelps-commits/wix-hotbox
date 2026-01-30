# Shop All Page: Manual Instructions

**Plan:** 02-03 (Task 1)
**Date:** 2026-01-30
**Status:** Pending manual execution
**MCP Limitation:** WIX REST API does not support creating new site pages, modifying page content, or changing which collection a product gallery displays. All page creation and configuration must be done through the WIX Editor.

---

## Why This Page Is Needed

Currently there is **no way to browse all 103 products**. Every shop page is siloed by client or collection. A first-time visitor has no path to see the full catalog. This is UX issue CR-5 (no catalog browsing) and NV-1 (navigation is client-centric, not customer-centric).

The "Shop All" page becomes the **primary shopping entry point** for new visitors who don't know which client they're looking for.

## What to Create

| Property | Value |
|----------|-------|
| **Page Name** | Shop All |
| **URL Slug** | `/shop-all` |
| **Page Type** | Store Page (with Product Gallery widget) |
| **Linked Collection** | All Products |
| **H1 Heading** | "Shop All Products" or "Browse Our Collection" |
| **Products Displayed** | All 103 visible products (grid layout) |

## Recommended Approach: Repurpose `/shop-5` (Easiest)

The existing `/shop-5` page (formerly "Shop" / LMNT products) is **already empty** -- both LMNT products were hidden in Plan 02-01. It already has a Product Gallery widget on it. Repurposing it avoids creating a new page from scratch.

### Steps:

1. **Open WIX Editor** for the site
   - Go to https://manage.wix.com/dashboard/c744cbdb-46f8-4c66-ac76-eb31bd0d52c1
   - Click **Edit Site** to open the WIX Editor

2. **Navigate to the `/shop-5` page**
   - In the left panel, click **Pages & Menu**
   - Find and click the page named "Shop" (currently at `/shop-5`)

3. **Rename the page**
   - Right-click or click the three-dot menu (...) next to "Shop"
   - Select **Rename** and change to "Shop All"

4. **Change the URL slug**
   - Click the three-dot menu (...) next to "Shop All"
   - Select **SEO Basics** (or Page Settings > SEO)
   - Change the URL slug from `shop-5` to `shop-all`
   - Click **Done**

5. **Change the linked collection**
   - Click on the Product Gallery widget on the page
   - In the settings panel that appears, look for **Collection** or **Products to Display**
   - Change from "LMNT" to "All Products"
   - This will make the gallery show all 103 visible products

6. **Add an H1 heading** (optional but recommended)
   - Add a text element above the product gallery
   - Type "Shop All Products" or "Browse Our Collection"
   - Set the text style to **Heading 1** (H1)
   - This improves SEO and gives visitors context

7. **Configure gallery layout** (optional)
   - Set grid layout with 3-4 columns (desktop)
   - Enable product images, names, and prices
   - Enable pagination or infinite scroll for all 103 products
   - Match the style of other store pages (e.g., Big Barn, Board 30)

8. **Save and Publish**

## Alternative Approach: Create New Page

If you prefer to keep the `/shop-5` page for LMNT (in case products are restored later):

1. In WIX Editor, go to **Pages & Menu** > **Add Page**
2. Select **Store Page** or **Shop Page** template
3. Name it "Shop All" with slug `/shop-all`
4. Add a Product Gallery widget linked to "All Products" collection
5. Add H1 heading "Shop All Products"
6. Configure grid layout
7. Save and Publish

## Verification Checklist

After creating the page:

- [ ] Navigate to `https://www.hotboxclothing.shop/shop-all` -- page loads
- [ ] Product grid displays products with images, names, and prices
- [ ] Products from ALL clients are visible (Big Barn, Artistry, Board 30, UNMH, Fun Shirts, PreOrder)
- [ ] Product count is approximately 103 (all visible products)
- [ ] Clicking a product navigates to its detail page (`/product-page/{slug}`)
- [ ] Page has an H1 heading ("Shop All Products" or similar)
- [ ] No console errors
- [ ] Page is accessible from navigation (see NAVIGATION-RESTRUCTURE.md for nav changes)
- [ ] Site published with changes live

## MCP Limitation Details

**Investigated:** 2026-01-30
**APIs searched:**
- WIX REST API -- no endpoint for creating site pages (only "Add Store Pages to Site" which adds cart/checkout, not custom pages)
- Pro Gallery API -- manages image/media galleries, not store product galleries
- WIX Stores API -- manages products and collections, not store page layout or product gallery configuration
- WIX Site Properties API -- no page creation capability
- WIX CMS API -- manages data collections, not site pages

**Conclusion:** WIX REST API can manage product data and collections but cannot create new site pages, add widgets to pages, or configure product gallery settings. This is a WIX Editor-only operation.

**Verified current state:**
- `/shop-5` page exists and displays "We don't have any products to show here right now." (empty product gallery after LMNT products hidden)
- "All Products" collection exists with ID `00000000-000000-000000-000000000001` containing all products
- 103 visible products in the store (2 LMNT products hidden)

---
*Generated by Plan 02-03 execution. Requires manual completion in WIX Editor.*
