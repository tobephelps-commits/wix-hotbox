---
phase: 16-realtime-stock-sync-multi-warehouse
plan: 01
subsystem: inventory
tags: [sanmar, inventory, warehouse, monitor, polling]

# Dependency graph
requires:
  - phase: 08-inventory-monitoring
    provides: SkuSnapshot type, monitor store, poller engine
  - phase: 05-sanmar-api-foundation
    provides: SkuInventory type with per-warehouse whse array
provides:
  - WarehouseQuantity type for per-warehouse inventory data
  - SkuSnapshot.warehouses optional field with warehouse breakdown
  - getWarehouseBreakdown() helper in inventory service
affects: [16-02-warehouse-alerts, 16-04-warehouse-cli, 16-05-warehouse-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional field extension for backward compatibility (warehouses? on SkuSnapshot)"
    - "Filtering zero-quantity warehouses in breakdown for concise data"

key-files:
  created: []
  modified:
    - scripts/monitor/types.ts
    - scripts/sanmar/services/inventory.ts
    - scripts/monitor/poller.ts
    - scripts/monitor/index.ts
    - scripts/sanmar/index.ts

key-decisions:
  - "WarehouseQuantity uses warehouseId/warehouseName instead of whseID/whseName for cleaner API"
  - "Zero-quantity warehouses filtered out of breakdown to keep snapshot JSON concise"
  - "warehouses field is optional for backward compatibility with existing snapshots"

patterns-established:
  - "Optional field extension: add new optional fields to existing types for non-breaking changes"

# Metrics
duration: 5min
completed: 2026-01-31
---

# Phase 16 Plan 01: Warehouse Breakdown Summary

**WarehouseQuantity type and per-warehouse inventory breakdown in SkuSnapshot, with getWarehouseBreakdown() helper mapping SanMar warehouse data**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-31T12:00:00Z
- **Completed:** 2026-01-31T12:05:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added WarehouseQuantity type to monitor types with warehouseId, warehouseName, qty fields
- Extended SkuSnapshot with optional warehouses field for backward compatibility
- Created getWarehouseBreakdown() helper that maps raw warehouse data and filters zero-qty entries
- Updated poller to populate warehouses field during snapshot creation
- Exported new types and functions through barrel modules

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend SkuSnapshot with per-warehouse breakdown** - `ab3fda8` (feat)
2. **Task 2: Update poller to populate warehouse data in snapshots** - `f48b5db` (feat)

## Files Created/Modified
- `scripts/monitor/types.ts` - Added WarehouseQuantity interface, extended SkuSnapshot with optional warehouses field
- `scripts/sanmar/services/inventory.ts` - Added getWarehouseBreakdown() helper function
- `scripts/monitor/poller.ts` - Updated pollOnce to populate warehouses field in snapshots
- `scripts/monitor/index.ts` - Added WarehouseQuantity to barrel exports
- `scripts/sanmar/index.ts` - Added getWarehouseBreakdown to barrel exports

## Decisions Made
- WarehouseQuantity uses warehouseId/warehouseName instead of SanMar's whseID/whseName for a cleaner consumer-facing API
- Zero-quantity warehouses are filtered out of the breakdown to keep snapshot JSON concise and avoid noise
- The warehouses field is optional on SkuSnapshot to maintain backward compatibility with existing snapshot files

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Warehouse data now flows into snapshots, ready for Phase 16-02 (warehouse-aware alerts)
- All existing consumers (alert detection, sync) continue working unchanged via totalQty
- No blockers for next plans

---
*Phase: 16-realtime-stock-sync-multi-warehouse*
*Completed: 2026-01-31*
