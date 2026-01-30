# Related Products / Cross-Selling Setup

**Created:** 2026-01-30
**Plan:** 02-05 (Cross-Selling & Gallery Standardization)
**Status:** Manual WIX Editor Action Required

---

## Overview

Product detail pages currently end at social sharing icons with zero suggestions for other products. No "You Might Also Like", "Frequently Bought Together", or "Customers Also Viewed" sections exist. Adding related products is proven to increase average order value and time on site.

## API Investigation Results

### Recommendation Algorithms Available

The WIX Recommendations API confirmed **4 built-in algorithms** are active on this site:

| # | Algorithm | ID | Best Used On | Description |
|---|-----------|-----|-------------|-------------|
| 1 | **From Similar Categories** | `68ebce04-b96a-4c52-9329-08fc9d8c1253` | Product page, cart, thank you page | Shows products from similar categories; fills remaining slots with other products (up to 16 items) |
| 2 | **Frequently Bought Together** | `d5aac1e1-2e53-4d11-85f7-7172710b4783` | Product page | Shows products frequently bought together; falls back to related products if insufficient data |
| 3 | **Frequently Viewed Together** | `5dd69f67-9ab9-478e-ba7c-10c6c6e7285f` | Product page | Shows products frequently viewed together; falls back to related products if insufficient data |
| 4 | **Best Sellers** | `ba491fd2-b172-4552-9ea6-7202e01d1d3c` | Any page | Shows store's best selling products; falls back to All Products if insufficient data |

**API test result:** The "From Similar Categories" algorithm successfully returned 16 product recommendations when queried. The recommendation engine is functional and ready to serve data.

### What the API CAN Do
- Retrieve recommendation data (product IDs) from any of the 4 algorithms
- Filter by minimum number of recommended items
- Chain multiple algorithms (fallback if first doesn't meet threshold)

### What the API CANNOT Do
- Add the "Related Products" widget to the product page template
- Configure widget layout, position, or display settings
- Modify the product page template structure

**Conclusion:** The recommendation engine is fully functional in the backend. The only missing piece is the **visual widget** on the product page to display these recommendations. This requires the WIX Editor.

---

## Manual WIX Editor Instructions

### Step 1: Open Product Page Template

1. Go to **WIX Dashboard** > **Site Editor**
2. Navigate to any **product page** (e.g., click a product from the store)
3. The product page is a **template** -- changes apply to ALL product pages

### Step 2: Add Related Products Widget

1. Click the **"+"** (Add) button in the left panel
2. Search for **"Related Products"** or navigate to:
   - **Add Elements** > **Store** > **Related Products**
   - OR **Add Elements** > **Gallery** > **Product Gallery** (then configure with recommendations)
3. WIX Stores includes a built-in **"Related Products"** widget specifically designed for product pages

### Step 3: Position the Widget

1. Drag the Related Products widget to **below the product description / social sharing icons**
2. Position it **above the footer**
3. Ensure it spans the full width of the content area

### Step 4: Configure the Widget

1. Click the Related Products widget to select it
2. Open widget settings (gear icon or "Settings" in the panel)
3. Configure:
   - **Algorithm:** Select "From Similar Categories" (recommended as primary)
     - This ensures related products come from the same collection (e.g., a Big Barn product shows other Big Barn items)
   - **Number of products:** Set to **4-6 products** (4 recommended for clean grid layout)
   - **Layout:** Grid or Slider (grid recommended for desktop; slider for mobile-friendly scrolling)
   - **Show:** Product image, name, price
   - **Section title:** "You Might Also Like" or "Related Products"

### Step 5: Optional - Add "Frequently Bought Together" Widget

For even better cross-selling, consider adding a second recommendation section:

1. Add another Related Products widget (or duplicate the first)
2. Position it **between** the product info and the "You Might Also Like" section
3. Configure with the **"Frequently Bought Together"** algorithm
4. Title: "Frequently Bought Together"
5. Show **3-4 products** in a horizontal row

**Note:** "Frequently Bought Together" requires purchase history data. For a newer store with limited order history, this may fall back to showing related products instead. The "From Similar Categories" algorithm is more reliable as a starting point.

### Step 6: Mobile Optimization

1. Switch to **mobile view** in the editor
2. Verify the Related Products widget:
   - Displays as a scrollable horizontal slider (preferred) or stacked vertical grid
   - Product images are appropriately sized
   - Product names and prices are readable
   - Tap targets are large enough for mobile interaction

---

## Verification Checklist

After adding the widget in the WIX Editor:

- [ ] Navigate to a Big Barn product page -- Related Products section visible below product info
- [ ] Related products show other Big Barn items (from similar categories)
- [ ] Navigate to an Artistry in Motion product -- Related Products show AIM items
- [ ] Navigate to a Fun Shirts product -- Related Products show Fun Shirts items
- [ ] Click a related product -- navigates to that product's detail page
- [ ] Section title "You Might Also Like" (or chosen title) displays correctly
- [ ] 4-6 products displayed in the widget
- [ ] Product images, names, and prices all visible
- [ ] Mobile view: Widget scrolls horizontally or stacks vertically without breaking layout
- [ ] No console errors or broken images

---

## Algorithm Recommendation

For HotBox Clothing, the recommended algorithm priority order is:

1. **From Similar Categories** (primary) -- Most reliable, shows products from the same collection/category
2. **Frequently Bought Together** (secondary, if adding a second section) -- Improves with purchase history over time
3. **Best Sellers** (for non-product pages like cart/thank you) -- Good for general recommendations
4. **Frequently Viewed Together** (tertiary) -- Requires sufficient traffic data

The "From Similar Categories" algorithm is the best starting choice because it works immediately with the existing collection structure (Big Barn, Board 30, AIM, UNMH, Fun Shirts). As the store accumulates more order and browsing data, "Frequently Bought Together" and "Frequently Viewed Together" will become increasingly accurate.

---

## Technical Reference

**WIX Stores App ID:** `215238eb-22a5-4c36-9e7b-e7c08025e04e`
**Recommendations API Endpoint:** `POST https://www.wixapis.com/v1/recommendations/get`
**List Algorithms Endpoint:** `GET https://www.wixapis.com/v1/recommendations/algorithms`

These API endpoints can be used programmatically if a custom implementation is ever needed (e.g., via Wix Velo for a custom Related Products section with more control over layout and filtering).

---
*Plan: 02-05 Task 1*
*Created: 2026-01-30*
