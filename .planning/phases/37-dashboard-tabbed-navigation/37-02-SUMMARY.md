# Plan 37-02 Summary: Move Sections into Tab Panels

**Status:** Complete (pending human verification)
**Date:** 2026-02-04

## Objective

Move existing dashboard sections into their appropriate tab panels and verify the complete tabbed layout.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Move Products-related sections to Products tab | d6250b4 | scripts/pipeline/preview.html |
| 2 | Move Orders section to Orders tab | d6250b4 | scripts/pipeline/preview.html |
| 3 | Move Inventory section to Inventory tab | d6250b4 | scripts/pipeline/preview.html |
| 4 | Move Customer sections to Customers tab | d6250b4 | scripts/pipeline/preview.html |
| 5 | Clean up layout and fix spacing issues | d6250b4 | scripts/pipeline/preview.html |
| 6 | Human verification checkpoint | PENDING | - |

## Changes Made

### CSS Updates
- Added padding (24px) to `.tab-panel` containers
- Added section spacing (margin-bottom: 24px) for sections within tab panels
- Added `.tab-panel-extra` styles for content outside main tab-panel divs:
  - margin-left: 200px to account for sidebar width
  - background: #f8f9fa for consistency
  - Responsive margin-left: 60px at 768px breakpoint

### HTML Structure
- Operations Dashboard moved to top of main-content (always visible)
- Products tab (productsPanel) contains: initial prompt, batch section, wizard section
- Additional Products content wrapped in `.tab-panel-extra.products-extra`:
  - Migration section, product info, colors, sizes
  - Logo library, logo overlay, margin dashboard, sales section
- Inventory content wrapped in `.tab-panel-extra.inventory-extra`:
  - Inventory section with daemon badge, health cards, audit, alerts
- Orders content wrapped in `.tab-panel-extra.orders-extra`:
  - Orders section with list view and detail view
- Customers content wrapped in `.tab-panel-extra.customers-extra`:
  - Customer management and royalty reports sections

### JavaScript Updates
- Added `updateOrdersNavBadge()` call in `loadOrders()` function
- Added `updateInventoryNavBadge()` call in `renderInventoryTable()` function
- `switchTab()` already handles `.tab-panel-extra` elements via `data-tab-panel` attribute

## Verification Checklist

- [x] CSS tab panel padding and section spacing added
- [x] Products-related sections in Products tab
- [x] Orders section in Orders tab
- [x] Inventory section in Inventory tab
- [x] Customer sections in Customers tab
- [x] Nav badges wired up for orders and inventory
- [ ] Human verification pending

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Use `.tab-panel-extra` wrapper divs | Content outside main tab-panel divs needed visibility control |
| CSS margin-left for sidebar offset | Extra panels at document level need layout alignment |
| Single commit for all tasks | Work resumed from prior session, changes intertwined |

## Next Steps

- Human verification checkpoint required
- Verify all functionality works after tab restructuring
- Confirm nav badges update correctly
