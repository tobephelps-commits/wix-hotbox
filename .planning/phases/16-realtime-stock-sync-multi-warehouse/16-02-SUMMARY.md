---
phase: 16-realtime-stock-sync-multi-warehouse
plan: 02
subsystem: inventory
tags: [sanmar, inventory, warehouse, alerts, email, notifications]

# Dependency graph
requires:
  - phase: 16-01
    provides: WarehouseQuantity type, SkuSnapshot.warehouses field
  - phase: 09-automated-stock-sync
    provides: buildSyncEmailBody, notifySyncResults, email notification system
provides:
  - AlertWarehouseDetail type for per-alert warehouse context
  - Warehouse-enriched stock alerts with per-warehouse breakdown
  - Email notifications with per-alert warehouse detail and per-product warehouse inventory
affects: [16-04-warehouse-cli, 16-05-warehouse-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Supplementary context pattern: warehouseDetail enriches alerts without changing trigger logic"
    - "Graceful degradation: warehouse sections render conditionally based on data availability"
    - "Async email builder: buildSyncEmailBody loads snapshots for warehouse inventory aggregation"

key-files:
  created: []
  modified:
    - scripts/monitor/types.ts
    - scripts/monitor/alerts.ts
    - scripts/monitor/index.ts
    - scripts/sync/notifications.ts

key-decisions:
  - "AlertWarehouseDetail as separate type from WarehouseQuantity for alert-specific shape"
  - "buildSyncEmailBody made async to load snapshots for WAREHOUSE INVENTORY section"
  - "Warehouse sections are additive -- all existing email format preserved"

patterns-established:
  - "Supplementary context on alerts: enrich without changing trigger logic"
  - "Conditional email sections: graceful degradation when data unavailable"

# Metrics
duration: 6min
completed: 2026-01-31
---

# Phase 16 Plan 02: Warehouse-Aware Alerts Summary

**AlertWarehouseDetail type enriching stock alerts with per-warehouse breakdown, and email notifications showing warehouse inventory context per alert and per product**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-31T19:00:00Z
- **Completed:** 2026-01-31T19:06:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Added AlertWarehouseDetail type with warehousesWithStock/warehousesOutOfStock arrays
- Stock alerts now include warehouse breakdown context from SkuSnapshot data
- Alert formatting shows one-line warehouse summary (top 3 with stock, 2 out-of-stock + more)
- Email notifications include per-alert warehouse detail lines below each alert
- Email includes WAREHOUSE INVENTORY section aggregating per-product warehouse totals
- Fully backward compatible -- alerts without warehouseDetail render identically to before

## Task Commits

Each task was committed atomically:

1. **Task 1: Add warehouse context to stock alerts** - `16e306d` (feat)
2. **Task 2: Update email notifications with warehouse breakdown** - `932807e` (feat)

## Files Created/Modified
- `scripts/monitor/types.ts` - Added AlertWarehouseDetail interface, extended StockAlert with optional warehouseDetail field
- `scripts/monitor/alerts.ts` - Added buildWarehouseDetail() and formatWarehouseSummary() helpers, enriched detectAlerts() and formatAlert()
- `scripts/monitor/index.ts` - Added AlertWarehouseDetail to barrel exports
- `scripts/sync/notifications.ts` - Added formatAlertWarehouseLines(), buildWarehouseInventorySection(), made buildSyncEmailBody() async with snapshot loading

## Decisions Made
- AlertWarehouseDetail defined as its own type separate from WarehouseQuantity, with alert-specific shape (simplified id/name/qty objects)
- buildSyncEmailBody changed from sync to async to load latest snapshots for the WAREHOUSE INVENTORY section
- Warehouse detail is supplementary context on existing alerts -- no new alert triggers added

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Warehouse-aware alerts and email notifications complete
- Ready for Phase 16-04 (warehouse inventory CLI commands)
- All existing consumers continue working unchanged
- No blockers for next plans

---
*Phase: 16-realtime-stock-sync-multi-warehouse*
*Completed: 2026-01-31*
