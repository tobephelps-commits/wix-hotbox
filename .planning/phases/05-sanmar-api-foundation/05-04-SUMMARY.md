---
phase: 05-sanmar-api-foundation
plan: 04
subsystem: api
tags: [sanmar, soap, pricing, inventory, promostandards, typescript]

# Dependency graph
requires:
  - phase: 05-02
    provides: SOAP client factory with caching, error classification, retry utility
provides:
  - Pricing service with sale-aware wholesale cost queries
  - Inventory service with per-item and batch stock queries
  - Stock status utilities (inStock, wellStocked, totalQuantity)
  - Suggested retail price calculation from SanMar pricing codes
  - Services barrel export for single import point
affects: [05-05-public-api-export, 06-product-creation-pipeline, 07-pricing-variant-logic, 08-inventory-monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns: [sale date window detection, inventory cap handling (1500+), PromoStandards batch chunking (200 max), positional SOAP args for inventory service]

key-files:
  created:
    - scripts/sanmar/services/pricing.ts
    - scripts/sanmar/services/inventory.ts
    - scripts/sanmar/services/index.ts
  modified: []

key-decisions:
  - "getEffectivePrice returns sale price when active, regular price otherwise -- HotBox applies markup in Phase 7"
  - "getSuggestedRetail uses PRICING_CODES lookup, falls back to piecePrice if code unknown"
  - "Batch inventory chunks at 200 partIds sequentially (not parallel) to respect SanMar server load"
  - "Inventory 1500 cap treated as 'well stocked' indicator per RESEARCH.md pitfall 3"
  - "Dozen pricing completely ignored per deprecation notice (SOTA)"
  - "Barrel export includes only pricing and inventory; product/media added by 05-03"

patterns-established:
  - "Pattern: normalizeArray() helper in each service for SOAP single-item vs array responses"
  - "Pattern: SOAP response parsed via Record<string, unknown> with typed assertions"
  - "Pattern: positional args (arg0-arg5) for SanMar Standard inventory vs named object args for other services"
  - "Pattern: formatXxxSummary() function in each service for CLI output"

# Metrics
duration: 8min
completed: 2026-01-30
---

# Phase 5 Plan 04: Pricing and Inventory Services Summary

**Sale-aware pricing queries with suggested retail calculation, per-warehouse inventory lookups with PromoStandards batch support, and services barrel export**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-30T15:00:00Z
- **Completed:** 2026-01-30T15:08:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Built pricing service with 7 exported functions covering price queries, sale detection, effective pricing, suggested retail, and formatting
- Built inventory service with 7 exported functions covering per-item queries, batch queries, stock utilities, and formatting
- Created services barrel export (index.ts) for single import point
- Sale pricing correctly checks date windows (updates Mon/Wed per RESEARCH.md)
- Batch inventory auto-chunks at 200 partIds with sequential processing
- Inventory cap (1500) properly flagged as "1500+" in formatted output

## Task Commits

Each task was committed atomically:

1. **Task 1: Build pricing service** - `defb392` (feat)
2. **Task 2: Build inventory service and barrel export** - `07ff1fd` (feat)

## Files Created/Modified
- `scripts/sanmar/services/pricing.ts` - Pricing queries, sale detection, effective/suggested retail, formatting
- `scripts/sanmar/services/inventory.ts` - Per-item and batch inventory queries, stock utilities, formatting
- `scripts/sanmar/services/index.ts` - Barrel re-export of pricing and inventory modules

## Decisions Made
- Used `Record<string, unknown>` with typed assertions for SOAP response parsing (consistent with product.ts pattern from 05-03)
- getEffectivePrice() returns sale price when sale is active and pieceSalePrice > 0, otherwise regular piecePrice
- getSuggestedRetail() applies PRICING_CODES markup percentage; returns piecePrice if code is unknown
- Inventory batch queries execute sequentially (not Promise.all) to respect SanMar server load
- Barrel export only includes pricing and inventory; product and media re-exports will be added by 05-03
- Dozen pricing field completely ignored (deprecated per RESEARCH.md SOTA -- dozenPrice now equals piecePrice)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required. (SanMar API credentials still needed from 05-01 for live testing.)

## Next Phase Readiness
- Pricing and inventory services ready for public API export (Plan 05-05)
- All services accessible through barrel export at services/index.ts
- TypeScript compiles with zero errors (excluding product.ts from incomplete 05-03)
- No blockers for next plan

---
*Phase: 05-sanmar-api-foundation*
*Completed: 2026-01-30*
