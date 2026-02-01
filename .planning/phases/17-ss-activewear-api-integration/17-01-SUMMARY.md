---
phase: 17-ss-activewear-api-integration
plan: 01
subsystem: api
tags: [vendor-adapter, multi-vendor, typescript, types, registry]

# Dependency graph
requires:
  - phase: 16-realtime-stock-sync
    provides: inventory monitoring types and warehouse breakdown patterns
provides:
  - VendorId type ('sanmar' | 'ss')
  - UnifiedProduct, UnifiedPricing, UnifiedInventory, UnifiedMedia, UnifiedProductData types
  - VendorAdapter interface with async methods
  - Vendor registry with registerVendor/getVendor/parseVendorFlag
  - Barrel export from scripts/vendor/index.ts
affects: [17-02, 17-03, 17-04, 17-05, 17-06, 17-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Adapter pattern: VendorAdapter interface abstracts vendor-specific APIs"
    - "Registry pattern: module-level Map for adapter lookup by VendorId"
    - "CLI flag parsing: parseVendorFlag normalizes vendor aliases to VendorId"

key-files:
  created:
    - scripts/vendor/types.ts
    - scripts/vendor/registry.ts
    - scripts/vendor/index.ts
  modified: []

key-decisions:
  - "String warehouse IDs to accommodate both SanMar numeric and S&S abbreviation formats"
  - "Optional vendor-specific pricing fields (priceCode for SanMar, customerPrice/mapPrice for S&S)"
  - "parseVendorFlag defaults to sanmar for backward compatibility"

patterns-established:
  - "VendorAdapter: all vendor-specific code implements this interface"
  - "Unified types: pipeline/monitor/sync consume only these vendor-agnostic shapes"
  - "Vendor registry: central lookup for adapter selection"

# Metrics
duration: 5min
completed: 2026-02-01
---

# Phase 17 Plan 01: Vendor Abstraction Types & Registry Summary

**VendorAdapter interface, unified types (Product/Pricing/Inventory/Media), and vendor registry with CLI flag parsing -- the multi-vendor foundation all adapters implement**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-01
- **Completed:** 2026-02-01
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created vendor-agnostic type system covering products, pricing, inventory, media, and warehouses
- Defined VendorAdapter interface with 7 async methods for full vendor lifecycle
- Built vendor registry with registration, lookup, default vendor, and CLI flag parsing
- Barrel export enables clean single-import access to entire vendor abstraction layer

## Task Commits

Each task was committed atomically:

1. **Task 1: Create unified vendor types** - `60ba3af` (feat)
2. **Task 2: Create VendorAdapter interface and vendor registry** - `01aac57` (feat)

## Files Created/Modified
- `scripts/vendor/types.ts` - VendorId, UnifiedProduct, UnifiedPricing, UnifiedWarehouse, UnifiedInventory, UnifiedMedia, UnifiedProductData
- `scripts/vendor/registry.ts` - VendorAdapter interface, registerVendor, getVendor, getDefaultVendor, listVendors, isVendorRegistered, parseVendorFlag
- `scripts/vendor/index.ts` - Barrel export re-exporting types.ts and registry.ts

## Decisions Made
- Used string type for UnifiedWarehouse.id to accommodate both SanMar numeric IDs ("1", "31") and S&S state abbreviations ("IL", "TX") without conversion
- Made priceCode, customerPrice, and mapPrice optional fields on UnifiedPricing since they are vendor-specific
- parseVendorFlag defaults to 'sanmar' when undefined/empty for backward compatibility with existing CLI usage
- SS_ALIASES array accepts 'ss', 'ss-activewear', and 's&s' as valid inputs for the S&S vendor

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Vendor abstraction layer complete and importable: `import { VendorAdapter, UnifiedProduct, getVendor } from '../vendor/index.js'`
- Ready for 17-02 (S&S API client) and 17-03 (SanMar adapter) which both depend on these types
- No blockers or concerns

---
*Phase: 17-ss-activewear-api-integration*
*Completed: 2026-02-01*
