---
phase: 29-inventory-sync-reliability
plan: 01
subsystem: inventory
tags: [monitor, sync, thresholds, sku-parsing, staleness]

# Dependency graph
requires:
  - phase: 8-inventory-monitoring
    provides: Monitor types, alerts, store, poller, CLI
  - phase: 9-automated-stock-sync
    provides: Stock sync engine, SyncResult, SKU parsing
  - phase: 17-ss-activewear
    provides: Vendor-agnostic monitor and sync architecture
provides:
  - Per-product threshold overrides (TrackedProduct.thresholds)
  - Effective threshold merging (getEffectiveThresholds)
  - Snapshot staleness detection (isSnapshotStale)
  - Case-insensitive SKU color matching
  - Parse error tracking in SyncResult
  - CLI threshold management (monitor threshold)
affects: [29-02, 29-03, inventory-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Per-product override merging with global config fallback
    - Staleness guard before sync to prevent stale-data decisions

key-files:
  created: []
  modified:
    - scripts/monitor/types.ts
    - scripts/monitor/alerts.ts
    - scripts/monitor/store.ts
    - scripts/monitor/manage.ts
    - scripts/monitor/poller.ts
    - scripts/sync/stock-sync.ts
    - scripts/sync/types.ts

key-decisions:
  - "snapshotMaxAgeMinutes defaults to 180 (3 hours) — generous to avoid false positives"
  - "Per-product thresholds are fully optional — backward compatible with existing JSON"
  - "Color matching lowercased but size matching kept exact (sizes are always uppercase)"

patterns-established:
  - "Per-product override object merged with global config via getEffectiveThresholds"
  - "Staleness check as a guard clause before sync operations"

# Metrics
duration: 8min
completed: 2026-02-02
---

# Phase 29 Plan 01: Per-Product Thresholds, Case-Insensitive SKU, and Snapshot Staleness Summary

**Per-product threshold overrides, case-insensitive SKU color matching, and snapshot staleness guards integrated across monitor and sync systems**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-02T21:25:00Z
- **Completed:** 2026-02-02T21:35:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- TrackedProduct now supports optional per-product threshold overrides that merge with global config defaults
- classifyStockLevel and detectAlerts use effective thresholds (per-product > global fallback)
- Snapshot staleness detection prevents sync from acting on stale inventory data
- SKU color matching is now case-insensitive while preserving exact size matching
- Parse errors are tracked and counted in SyncResult for observability
- CLI `monitor threshold` command enables per-product threshold management
- `monitor list` displays per-product thresholds when present

## Task Commits

Each task was committed atomically:

1. **Task 1: Add per-product threshold overrides and snapshot staleness tracking** - `c0060a1` (feat)
2. **Task 2: Harden SKU parsing with case-insensitive color matching and snapshot staleness in sync** - `7545fa1` (feat)

## Files Created/Modified
- `scripts/monitor/types.ts` - Added thresholds field to TrackedProduct, snapshotMaxAgeMinutes to MonitorConfig
- `scripts/monitor/alerts.ts` - Added getEffectiveThresholds helper, updated classifyStockLevel with overrides, detectAlerts accepts TrackedProduct
- `scripts/monitor/store.ts` - Added isSnapshotStale function, snapshotMaxAgeMinutes in defaults
- `scripts/monitor/manage.ts` - Added threshold CLI command, threshold display in list output
- `scripts/monitor/poller.ts` - Passes TrackedProduct to detectAlerts, logs fresh snapshot with SKU/warehouse counts
- `scripts/sync/stock-sync.ts` - Case-insensitive color matching, trim on parseSku, stale snapshot guard, parseErrors counter
- `scripts/sync/types.ts` - Added parseErrors field to SyncResult

## Decisions Made
- snapshotMaxAgeMinutes defaults to 180 minutes (3 hours) to avoid false staleness on normal poll intervals
- Per-product thresholds are entirely optional (backward compatible with all existing data files)
- Color matching lowercased for case-insensitive comparison; size matching kept exact since sizes are always uppercase

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Per-product thresholds ready for use via CLI and flowing through to alert detection
- Snapshot staleness guard active in sync pipeline
- Case-insensitive color matching eliminates silent SKU mismatch failures
- Ready for 29-02 (sync health timing, notification delivery tracking, mapping audit, alert log retention)

---
*Phase: 29-inventory-sync-reliability*
*Completed: 2026-02-02*
