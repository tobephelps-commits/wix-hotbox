---
phase: 09-automated-stock-sync
plan: 01
subsystem: api
tags: [wix-api, inventory, stock-sync, variant-visibility, sku-parsing]

# Dependency graph
requires:
  - phase: 08-inventory-monitoring
    provides: Inventory polling, snapshots, stock level classification, alert detection
  - phase: 06-product-creation-pipeline
    provides: WIX API service, product types, variant update endpoint
provides:
  - WIX product query API (queryProducts, listAllProducts)
  - Product mapping store (SanMar style -> WIX product ID)
  - Stock sync engine (variant visibility updates based on inventory)
  - SKU parser for SanMar -> WIX variant matching
affects: [09-02-notifications, 10-integration-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "SKU format parsing: {style}-{catalogColor}-{size} for SanMar/WIX matching"
    - "Product mapping JSON persistence following monitor/store.ts pattern"
    - "Visibility-only variant updates to minimize WIX API calls"

key-files:
  created:
    - scripts/sync/types.ts
    - scripts/sync/product-map.ts
    - scripts/sync/stock-sync.ts
    - scripts/sync/index.ts
  modified:
    - scripts/pipeline/wix-api.ts
    - scripts/pipeline/index.ts

key-decisions:
  - "SKU parsing extracts catalogColor from middle segments, size from last segment"
  - "Only variants with actual visibility changes trigger WIX API updates"
  - "Product mappings stored as JSON array in data/sync/product-map.json"

patterns-established:
  - "scripts/sync/ module structure mirrors scripts/monitor/ for consistency"
  - "Barrel export pattern for clean import surface"

# Metrics
duration: 8min
completed: 2026-01-31
---

# Phase 9 Plan 01: WIX Stock Sync Service Summary

**WIX product query API, SanMar-to-WIX product mapping store, and stock sync engine that updates variant visibility based on SanMar inventory levels**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-31
- **Completed:** 2026-01-31
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Added queryProducts and listAllProducts to WIX API service with automatic pagination
- Built product mapping store (SanMar style -> WIX product ID) with JSON persistence and CRUD operations
- Created stock sync engine that parses variant SKUs, matches against SanMar inventory, and updates only changed variant visibility
- SKU parser correctly handles multi-segment catalog colors (e.g., "Ath. Maroon-2XL")
- Barrel export provides clean import surface for Phase 9 Plan 02 and beyond

## Task Commits

Each task was committed atomically:

1. **Task 1: Add WIX product query API + build product mapping store** - `360ad82` (feat)
2. **Task 2: Build stock sync service** - `dc17030` (feat)

## Files Created/Modified
- `scripts/pipeline/wix-api.ts` - Added queryProducts and listAllProducts with pagination
- `scripts/pipeline/index.ts` - Exported new query functions from barrel
- `scripts/sync/types.ts` - ProductMapping, SyncResult, SyncConfig interfaces
- `scripts/sync/product-map.ts` - JSON persistence for SanMar -> WIX product mappings
- `scripts/sync/stock-sync.ts` - Core sync engine: SKU parsing, visibility sync, batch summary
- `scripts/sync/index.ts` - Barrel export for all sync module types and functions

## Decisions Made
- SKU parsing strategy: strip known style prefix, last dash-segment is size, middle is catalogColor -- handles multi-part colors like "Ath. Maroon"
- Visibility-only updates: carry over all existing variant data (price, weight, SKU) and only change the visible field to minimize API side effects
- Product mappings follow monitor/store.ts pattern: JSON file in configurable data directory with recursive mkdir on first use
- WIX V1 product query uses stringified filter (V1 API quirk) with automatic pagination for large catalogs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Stock sync module complete with clean API surface
- Ready for Plan 09-02: notification system for stock alerts
- syncAllProducts and buildSyncSummary ready for integration with monitor polling loop

---
*Phase: 09-automated-stock-sync*
*Completed: 2026-01-31*
