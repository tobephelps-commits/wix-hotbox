# Plan 02-01: Quick-Win Fixes Change Log

Records WIX MCP API changes made to the live store during plan execution.

## Task 1: Chat Widget + LMNT Products

**Date:** 2026-01-30

### 1. Chat Widget Disabled (CR-2, QW-1)
- **Action:** Uninstalled Wix Inbox app (appDefId: `141fbfae-511e-6817-c9f0-48993a7547d1`) via Apps Installer API
- **API:** `POST https://www.wixapis.com/apps-installer-service/v1/app-instance/uninstall`
- **Effect:** "Let's Chat!" widget removed from all pages; no longer intercepts pointer events on product option selectors
- **Reversible:** Yes -- reinstall via Apps Installer API with same appDefId

### 2. LMNT Products Hidden (CR-4, QW-5)
- **Action:** Set `visible: false` on both LMNT products via Catalog V1 Update Product API
- **API:** `PATCH https://www.wixapis.com/stores/v1/products/{id}`
- **Products:**
  - `9891edf3-1732-b0e2-a2bb-d913bf471b9e` -- LMNT Drink Mix Box (was $45.00)
  - `4a104a14-0c87-7176-ad5a-53c47b57d1e2` -- LMNT Drink Case (was $32.99)
- **Effect:** Products no longer appear on storefront or in search; remain accessible via API for future restoration
- **Reversible:** Yes -- set `visible: true` via same API

### 3. "Shop" Nav Link to /shop-5 (Limitation)
- **Action:** COULD NOT remove via API -- WIX does not expose a REST API for site navigation menus
- **Status:** Flagged for manual removal via WIX Editor
- **Note:** The `/shop-5` page still exists but now shows 0 products (both hidden). The "Shop" link in the More dropdown still points there.

## Task 2: Content Errors

**Date:** 2026-01-30

### 1. Big Barn Team Hat Description Added (CL-4, QW-4)
- **Action:** Added product description via Catalog V1 Update Product API
- **API:** `PATCH https://www.wixapis.com/stores/v1/products/c3f7d701-c5fd-d734-a90e-40c404638ef9`
- **Before:** Empty description, zero content
- **After:** "Custom Big Barn CrossFit team hat. Show your gym pride with this embroidered hat featuring the Big Barn logo. One size fits most. Contact us for customization options or questions about fit."
- **Note:** Product still has zero images -- image upload flagged for manual action by store owner

### 2. UNMH Page Heading (CL-1, QW-2) -- REQUIRES MANUAL ACTION
- **Action:** COULD NOT fix via API -- WIX does not expose a REST API for page content editing
- **Status:** Flagged for manual fix via WIX Editor
- **Issue:** Page `/shop-3` displays "Fall Pre-Order" heading; should say "UNMH Apparel" or similar
- **Also:** Wildflower image should be replaced with appropriate UNMH/medical branding

### 3. Fall PreOrder Typo (CL-2, QW-3) -- REQUIRES MANUAL ACTION
- **Action:** COULD NOT fix via API -- WIX does not expose a REST API for page content editing
- **Status:** Flagged for manual fix via WIX Editor
- **Issue:** Page `/shop-2` description reads "March 1st 20256" -- should be "2026"; double period ".." should be "."
- **Also:** Nav label "Fall PreOrder" vs page heading "Winter 2026 Pre-order" mismatch

### 4. Copyright Year (QW-7) -- REQUIRES MANUAL ACTION
- **Action:** COULD NOT fix via API -- WIX does not expose a REST API for footer content editing
- **Status:** Flagged for manual fix via WIX Editor
- **Issue:** Footer says "(c)2022 by Hot Box Clothing" -- should be updated to 2026

### 5. External CompanyCasuals Link (CL-5) -- REQUIRES MANUAL ACTION
- **Action:** COULD NOT fix via API -- WIX does not expose a REST API for page content editing
- **Status:** Flagged for manual fix via WIX Editor
- **Issue:** Big Barn page `/shop` subheading links to www.CompanyCasuals.com -- should be removed or changed to internal link

## Summary of API Limitations

WIX REST API can modify:
- Product data (name, description, price, visibility, options, variants, media)
- Collections / categories
- App installations (install/uninstall)
- Site properties (business info, contact, schedule)
- Checkout settings

WIX REST API CANNOT modify:
- Page content (headings, text blocks, images on pages)
- Navigation menus (menu items, ordering, labels)
- Footer content (copyright text, links)
- Page layout or design elements
- Widget positioning or configuration

These require the WIX visual editor (Wix Editor or Wix Studio).
