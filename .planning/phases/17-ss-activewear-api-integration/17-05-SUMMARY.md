---
phase: 17-ss-activewear-api-integration
plan: 05
subsystem: api
tags: [vendor-agnostic, pipeline-refactor, multi-vendor, backward-compatible, bridge-mapping]

# Dependency graph
requires:
  - phase: 17-03
    provides: SanMar vendor adapter (VendorAdapter implementation)
  - phase: 17-04
    provides: S&S Activewear vendor adapter (VendorAdapter implementation)
provides:
  - Vendor-agnostic fetchProductData() accepting optional vendorId parameter
  - unifiedToProductData() bridge mapping unified types back to ProductData shape
  - --vendor CLI flag on both fetch-product and create-product commands
  - vendor field on CuratedProduct and ProductPreview interfaces
affects: [17-06-monitor-refactor, 17-07-preview-server]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Bridge pattern: unifiedToProductData converts vendor-agnostic types to legacy ProductData shape"
    - "Dual-path routing: SanMar uses direct API path, other vendors use VendorAdapter"
    - "Adapter registration via import side-effects: import both adapters at module load"

key-files:
  created: []
  modified:
    - scripts/pipeline/fetch-product.ts
    - scripts/pipeline/create-product.ts
    - scripts/pipeline/types.ts

key-decisions:
  - "SanMar path unchanged for zero-risk backward compatibility; only non-SanMar vendors go through adapter"
  - "Bridge mapping (unifiedToProductData) constructs SanMar-shaped objects from unified types to avoid rewriting mapper.ts"
  - "vendor field is optional on CuratedProduct and ProductPreview for backward compatibility"

patterns-established:
  - "Vendor-agnostic CLI pattern: --vendor flag parsed before style positional arg"
  - "Transitional bridge: unified types mapped back to legacy shapes for pipeline consumers"

# Metrics
duration: 8min
completed: 2026-02-01
---

# Phase 17 Plan 05: Pipeline Vendor-Agnostic Refactor Summary

**Vendor-agnostic product pipeline with dual-path routing (SanMar direct / VendorAdapter bridge), --vendor CLI flag on fetch-product and create-product, and backward-compatible unifiedToProductData bridge mapping**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-01
- **Completed:** 2026-02-01
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- fetchProductData() now accepts optional vendorId parameter, routing to VendorAdapter for non-SanMar vendors
- Created unifiedToProductData() bridge that converts UnifiedProductData to legacy ProductData shape (ProductInfo[], PricingInfo, SkuInventory[], MediaContent[])
- Both fetch-product.ts and create-product.ts CLIs accept --vendor flag (sanmar|ss)
- Added vendor? field to CuratedProduct and ProductPreview interfaces for vendor tracking
- Zero breaking changes: all existing callers (preview-server, validate-pipeline) work unchanged
- Both adapters auto-register via import side-effects at module load time

## Task Commits

Each task was committed atomically:

1. **Task 1: Add vendor field to pipeline types and refactor fetchProductData** - `efb4004` (feat)
2. **Task 2: Add --vendor flag to create-product CLI** - `80dbaf5` (feat)

## Files Created/Modified
- `scripts/pipeline/types.ts` - Added VendorId import, vendor? field to CuratedProduct and ProductPreview
- `scripts/pipeline/fetch-product.ts` - Refactored for dual-path vendor routing, added unifiedToProductData bridge, --vendor CLI flag
- `scripts/pipeline/create-product.ts` - Added --vendor flag parsing, vendor logging, updated help text and examples

## Decisions Made
- SanMar direct API path preserved exactly as-is for backward compatibility; only non-SanMar vendors route through VendorAdapter -- this means zero risk of regression for existing SanMar workflow
- Bridge mapping constructs SanMar-shaped objects (ProductInfo, PricingInfo, etc.) from unified types rather than rewriting all pipeline consumers (mapper.ts, create-product.ts) -- this is an intentional transitional design
- Smart positional arg detection: CLI parses all flags first, then finds style as first non-flag arg, supporting `--vendor ss 2000` and `2000 --vendor ss` both

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Pipeline fully vendor-agnostic: `fetchProductData('PC61')` for SanMar, `fetchProductData('2000', 'ss')` for S&S
- CLI fully vendor-agnostic: `npx tsx create-product.ts --vendor ss 2000 --template "bigbarn-tee"`
- Ready for 17-06 (monitor/sync vendor-agnostic refactor) and 17-07 (preview server vendor support)
- No blockers or concerns

---
*Phase: 17-ss-activewear-api-integration*
*Completed: 2026-02-01*
