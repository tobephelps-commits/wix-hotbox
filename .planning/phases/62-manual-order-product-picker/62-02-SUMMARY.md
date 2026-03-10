---
phase: 62-manual-order-product-picker
plan: 02
status: complete
completed: 2026-03-10
tasks_completed: 2
tasks_total: 2
---

# Plan 62-02 Summary: ProductPicker Integration into OrderCreateForm

## What was built

### Task 1: Integrate ProductPicker into OrderCreateForm
- Extended `FormLineItem` interface with optional `vendor` and `imageUrl` fields
- Added `showPicker` state and `handlePick` callback for ProductPicker integration
- Added "Browse Catalog" button (solid accent style) alongside existing "+ Add Item" button (dashed outline style) in a flex row
- Picker-sourced items display:
  - 48x48 rounded thumbnail on the left side of the item card
  - Vendor badge pill (blue for SanMar, amber for S&S) next to item number
  - All fields remain fully editable
- Manual items display unchanged (no thumbnail, no badge) -- zero regressions
- Submission body now includes `vendor` and `imageUrl` in item payloads
- ProductPicker modal renders lazily only when `showPicker` is true

### Task 2: Verify API persistence
- Confirmed `createOrder()` in `order-service.ts` already includes `vendor` and `image_url` columns in the INSERT INTO order_items query
- Confirmed `CreateOrderInput.items` type includes both fields via `Omit<OrderLineItem, 'id' | 'orderId' | 'createdAt'>`
- No code changes needed -- existing implementation handles all fields

## Verification
- `cd ui && npx tsc --noEmit` -- passes
- `npx tsc --noEmit` (backend) -- passes
- "Browse Catalog" button visible in Line Items section
- ProductPicker opens on click, closes on product selection
- Selected product creates line item with thumbnail, vendor badge, and all fields populated
- Manual "Add Item" still works identically to before

## Files Modified
- `ui/src/components/orders/OrderCreateForm.tsx` -- ProductPicker integration, enhanced line item display
- `ui/src/components/orders/OrderCreateForm.css` -- Thumbnail, vendor badge, browse button, item actions layout
