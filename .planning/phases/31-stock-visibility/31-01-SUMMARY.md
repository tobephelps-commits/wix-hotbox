---
phase: 31-stock-visibility
plan: 01
subsystem: sync
tags: [wix-api, inventory, stock-visibility, variants]

# Dependency graph
requires:
  - phase: 09-automated-stock-sync
    provides: stock sync infrastructure
  - phase: 16-realtime-stock-sync-multi-warehouse
    provides: multi-warehouse inventory tracking
provides:
  - WIX Inventory V2 API integration
  - Inventory-based stock visibility (vs hidden variants)
  - buildInventoryUpdate mapper function
affects: [product-creation, stock-sync, notifications]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Inventory API for stock visibility instead of variant hiding"

key-files:
  created: []
  modified:
    - scripts/pipeline/wix-api.ts
    - scripts/pipeline/types.ts
    - scripts/pipeline/mapper.ts
    - scripts/pipeline/index.ts
    - scripts/sync/stock-sync.ts
    - scripts/sync/types.ts
    - scripts/sync/notifications.ts

key-decisions:
  - "Use WIX Inventory V2 API to set trackQuantity and per-variant quantities"
  - "Keep all variants visible (visible: true) regardless of stock status"
  - "Rename sync result fields from hidden/restored to outOfStock/restocked"

patterns-established:
  - "Inventory API updates: trackQuantity + per-variant inStock/quantity"

# Metrics
duration: 5min
completed: 2026-02-03
---

# Phase 31 Plan 01: WIX Inventory API Integration Summary

**WIX Inventory V2 API integration for stock visibility -- variants remain visible but display "Out of Stock" when quantity is 0.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-03T22:40:01Z
- **Completed:** 2026-02-03T22:44:57Z
- **Tasks:** 3
- **Files modified:** 7

## Accomplishments

- Added WIX Inventory V2 API service functions (getInventory, updateInventory)
- Updated product creation to keep all variants visible (no more hiding out-of-stock)
- Changed stock sync from visibility toggle to inventory quantity updates
- Updated notifications and summary formatting with new terminology

## Task Commits

Each task was committed atomically:

1. **Task 1: Add WIX Inventory API service** - `4bda4dd` (feat)
2. **Task 2: Update product creation for inventory tracking** - `5b73524` (feat)
3. **Task 3: Update stock sync to use inventory API** - `0e0f896` (feat)

## Files Created/Modified

- `scripts/pipeline/wix-api.ts` - Added getInventory() and updateInventory() functions
- `scripts/pipeline/types.ts` - Added WixInventoryVariant and WixInventoryUpdate types
- `scripts/pipeline/mapper.ts` - Changed visible: true for all variants, added buildInventoryUpdate()
- `scripts/pipeline/index.ts` - Exported new types and functions
- `scripts/sync/stock-sync.ts` - Changed from visibility toggle to inventory quantity updates
- `scripts/sync/types.ts` - Renamed fields to variantsOutOfStock/variantsRestocked
- `scripts/sync/notifications.ts` - Updated to use new field names

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use Inventory V2 API path format `/product/{productId}` | WIX Inventory V2 uses product ID directly, not inventory item ID |
| Keep all variants visible regardless of stock | Customers can see all color/size options even when some are out of stock |
| Rename hidden/restored to outOfStock/restocked | More accurate terminology for inventory-based approach |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated notifications.ts for new field names**
- **Found during:** Task 3 (stock sync update)
- **Issue:** TypeScript compilation failed because notifications.ts still used old field names
- **Fix:** Updated all references from variantsHidden/variantsRestored to variantsOutOfStock/variantsRestocked
- **Files modified:** scripts/sync/notifications.ts
- **Verification:** TypeScript compiles successfully
- **Committed in:** 0e0f896 (part of Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix was necessary for TypeScript compilation. No scope creep.

## Issues Encountered

None - all tasks completed successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- WIX Inventory API integration complete
- Stock sync now uses inventory quantities instead of visibility toggle
- Ready for testing with live WIX products
- Product creation pipeline updated to keep all variants visible

---
*Phase: 31-stock-visibility*
*Completed: 2026-02-03*
