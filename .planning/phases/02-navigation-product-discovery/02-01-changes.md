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
