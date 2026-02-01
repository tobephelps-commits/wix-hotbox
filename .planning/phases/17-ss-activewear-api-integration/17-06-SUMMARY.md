---
phase: 17-ss-activewear-api-integration
plan: 06
subsystem: monitoring
tags: [vendor-agnostic, monitor-refactor, sync-refactor, multi-vendor, backward-compatible, cli-flags]

# Dependency graph
requires:
  - phase: 17-03
    provides: SanMar vendor adapter (VendorAdapter implementation)
  - phase: 17-04
    provides: S&S Activewear vendor adapter (VendorAdapter implementation)
provides:
  - Vendor-agnostic inventory polling via VendorAdapter per tracked product
  - --vendor CLI flag on monitor add/warehouse and sync link commands
  - vendor field on TrackedProduct, InventorySnapshot, StockAlert, ProductMapping
  - WarehouseQuantity.warehouseId changed from number to string for cross-vendor support
affects: [17-07-preview-server]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-vendor credential validation via adapter.validateCredentials()"
    - "Adapter registration via import side-effects in poller.ts"
    - "extractVendorFlag() helper pattern: mutates args array, returns VendorId"
    - "Style+vendor pair as composite key for duplicate detection"

key-files:
  created: []
  modified:
    - scripts/monitor/types.ts
    - scripts/monitor/poller.ts
    - scripts/monitor/store.ts
    - scripts/monitor/alerts.ts
    - scripts/monitor/index.ts
    - scripts/monitor/manage.ts
    - scripts/sanmar/services/inventory.ts
    - scripts/pipeline/preview-server.ts
    - scripts/sync/types.ts
    - scripts/sync/sync-poller.ts
    - scripts/sync/manage.ts
    - scripts/sync/product-map.ts

key-decisions:
  - "WarehouseQuantity.warehouseId changed from number to string -- accommodates both SanMar numeric IDs and S&S abbreviation codes"
  - "Vendor field is optional everywhere for backward compatibility -- defaults to 'sanmar' when absent"
  - "Per-vendor credential checking via cached Set to avoid redundant validation"
  - "Product-map duplicate detection uses style+vendor pair as composite key"
  - "Alert warehouse detail building uses SanMar constant lookup for SanMar products, snapshot data for others"

patterns-established:
  - "extractVendorFlag() helper: mutates args array in-place, supports aliases, returns VendorId"
  - "vendorLabel() helper for human-readable vendor display"
  - "Style+vendor composite key pattern for deduplication"

# Metrics
duration: 12min
completed: 2026-02-01
---

# Phase 17 Plan 06: Monitor and Sync Vendor-Agnostic Refactor Summary

**Vendor-agnostic inventory monitoring and stock sync with per-product vendor routing, --vendor CLI flags, and backward-compatible string warehouse IDs**

## Performance

- **Duration:** 12 min
- **Started:** 2026-02-01
- **Completed:** 2026-02-01
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Monitor types (TrackedProduct, InventorySnapshot, StockAlert) now carry optional vendor field, defaulting to 'sanmar' for backward compatibility
- WarehouseQuantity.warehouseId changed from number to string, accommodating both SanMar numeric IDs ("1"-"9") and S&S abbreviation codes ("IL", "TX")
- Poller completely rewritten to be vendor-agnostic: routes through VendorAdapter per product, imports both adapter registrations, uses per-vendor credential caching
- Created unifiedInventoryToSnapshots() mapping function for converting adapter output to internal SkuSnapshot format
- Store duplicate detection updated to consider style+vendor pair (same style on different vendors = different products)
- Monitor CLI (manage.ts) fully updated: add, list, warehouse, and poll commands show vendor context with --vendor flag support
- Sync CLI (manage.ts) fully updated: link, list, and scan commands propagate vendor to ProductMapping with --vendor flag support
- Product-map duplicate detection updated to check style+vendor pairs
- Sync poller credential checks simplified: vendor-specific checks delegated to poller.ts, only WIX_API_KEY check remains
- Alert warehouse detail building handles both SanMar (WAREHOUSES constant lookup) and non-SanMar (snapshot data) vendors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add vendor field to monitor types and refactor poller** - `8b6c36f` (feat)
2. **Task 2: Add --vendor flag to monitor and sync CLI commands** - `df190f2` (feat)

## Files Created/Modified
- `scripts/monitor/types.ts` - Added VendorId import, vendor? on TrackedProduct/InventorySnapshot/StockAlert, warehouseId changed to string
- `scripts/monitor/poller.ts` - Complete rewrite: vendor-agnostic routing via VendorAdapter, unifiedInventoryToSnapshots(), per-vendor credential caching
- `scripts/monitor/store.ts` - addTrackedProduct checks style+vendor for duplicates, removeTrackedProduct accepts optional vendor
- `scripts/monitor/alerts.ts` - buildWarehouseDetail handles SanMar and non-SanMar vendors differently
- `scripts/monitor/index.ts` - Added unifiedInventoryToSnapshots export
- `scripts/monitor/manage.ts` - Full rewrite with extractVendorFlag(), vendorLabel(), --vendor on add/warehouse, vendor column in list
- `scripts/sanmar/services/inventory.ts` - warehouseId conversion: `w.whseID` to `String(w.whseID)`
- `scripts/pipeline/preview-server.ts` - warehouseMap changed from Map<number,...> to Map<string,...>
- `scripts/sync/types.ts` - Added VendorId import, vendor? on ProductMapping
- `scripts/sync/sync-poller.ts` - Removed hardcoded SANMAR_CUSTOMER_NUMBER checks (delegated to poller.ts)
- `scripts/sync/manage.ts` - Added extractVendorFlag(), vendorLabel(), --vendor on link, vendor column in list, vendor-aware scan
- `scripts/sync/product-map.ts` - addProductMapping duplicate detection uses style+vendor composite key

## Decisions Made
- WarehouseQuantity.warehouseId changed from number to string -- this is the cleanest approach since SanMar uses numeric IDs (1-9) that work fine as strings, and S&S uses abbreviation codes ("IL", "TX") that cannot be meaningfully converted to numbers
- Per-vendor credential checking uses a module-level Set cache to avoid redundant adapter.validateCredentials() calls during the same process lifetime
- Alert buildWarehouseDetail detects SanMar data by checking if warehouseIds match known SanMar numeric IDs from the WAREHOUSES constant, otherwise builds detail from snapshot data only
- Product-map and tracked-products both use style+vendor as a composite key for deduplication, allowing the same style number from different vendors to coexist

## Deviations from Plan

Minor scope expansion: the plan listed only 6 files_modified in frontmatter but the actual changes touched 12 files. The plan mentioned monitor/index.ts and sync/sync-poller.ts in Task 2 but the actual CLI work was primarily in monitor/manage.ts and sync/manage.ts. The plan's intent was correctly interpreted and executed.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required. Existing data files work without migration.

## Next Phase Readiness
- Monitor and sync systems fully vendor-agnostic
- `monitor add --vendor ss 2000 "Gildan Ultra Cotton"` tracks S&S products
- `sync link --vendor ss 2000 <wixId>` maps S&S products to WIX
- Poll cycle automatically routes through correct vendor adapter per product
- Ready for 17-07 (preview server vendor support) -- the final plan in Phase 17
- No blockers or concerns

---
*Phase: 17-ss-activewear-api-integration*
*Completed: 2026-02-01*
