---
phase: 05-sanmar-api-foundation
plan: 05
subsystem: api
tags: [sanmar, soap, demo, barrel-export, promostandards, wsdl, xml-parsing, typescript]

# Dependency graph
requires:
  - phase: 05-03
    provides: Product data and media content services
  - phase: 05-04
    provides: Pricing and inventory services
provides:
  - Public API barrel export (scripts/sanmar/index.ts) for all consumer-facing functions
  - Integration demo script exercising all 5 service areas against live SanMar API
  - Validated end-to-end API client (product info, pricing, inventory, media content)
  - Bug fixes for pricing arg structure, media WSDL namespace collision, inventory endpoint selection
affects: [06-product-creation-pipeline, 07-pricing-variant-logic, 08-inventory-monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns: [XML fallback parser for WSDL namespace collisions, dual error field spelling check, PromoStandards style-level inventory queries]

key-files:
  created:
    - scripts/sanmar/index.ts
    - scripts/sanmar/demo.ts
  modified:
    - scripts/sanmar/services/pricing.ts
    - scripts/sanmar/services/inventory.ts
    - scripts/sanmar/services/media.ts
    - scripts/sanmar/services/index.ts
    - package.json

key-decisions:
  - "Pricing WSDL arg0 is array type (arg0[]) -- must wrap query in array unlike product info"
  - "Pricing response has pricing fields directly in listResponse items, not nested under productPriceInfo"
  - "Media WSDL has namespace collisions causing node-soap response parser to crash -- XML fallback parser extracts data from raw SOAP response"
  - "Media method is getMediaContent (lowercase g) not GetMediaContent (uppercase)"
  - "SanMar Standard inventory requires specific color+size -- switched getStyleInventory to PromoStandards getInventoryLevels v2.0.0 for style-level queries"
  - "Pricing and inventory WSDLs use errorOccurred (double-r) while product info uses errorOccured (single-r) -- check both"
  - "PromoStandards inventory returns actual counts (not capped at 1500) unlike SanMar Standard endpoint"

patterns-established:
  - "Pattern: XML fallback parser for WSDL namespace collision issues in node-soap"
  - "Pattern: Check both errorOccurred and errorOccured spellings across all SanMar services"
  - "Pattern: Use describeClient() and raw response inspection to discover actual WSDL method signatures"
  - "Pattern: PromoStandards endpoints use flat args (not wrapped in request objects)"

# Metrics
duration: 25min
completed: 2026-01-30
---

# Phase 5 Plan 05: Public API Export and Demo Summary

**Public API barrel export with curated imports, integration demo script validating all 5 SanMar service areas, and 3 critical WSDL bug fixes discovered via live API testing**

## Performance

- **Duration:** 25 min
- **Started:** 2026-01-30T16:00:00Z
- **Completed:** 2026-01-30T16:25:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created public API barrel export (index.ts) with curated imports for all consumer-facing functions, types, constants, and error handling
- Built comprehensive demo script that exercises all 5 service areas (product info, pricing, inventory, media, client debug)
- Fixed 3 critical WSDL bugs discovered via live API testing with real SanMar credentials
- All 5 demo sections now pass for both K420 (Port Authority Polo) and PC61 (Port & Company Essential Tee)
- Phase 5 SanMar API Foundation is complete -- ready for Phase 6 Product Creation Pipeline

## Task Commits

Each task was committed atomically:

1. **Task 1: Create public API barrel export and demo script** - `b1457c3` (feat) -- by previous agent
2. **Task 2: Fix WSDL bugs (pricing, media, inventory)** - `6cc3651` (fix)

**Plan metadata:** pending (docs commit)

## Bugs Fixed

### Bug 1: Pricing service -- arg structure and response parsing
- **Root cause:** WSDL defines `arg0` as array type (`arg0[]`), but code passed a single object. Also, pricing response has fields directly in `listResponse[]` items (not nested under `productPriceInfo`). Error field is `errorOccurred` (double-r), not `errorOccured`.
- **Fix:** Wrapped query in array for `arg0`, fixed response parsing to extract pricing from `listResponse[0]` directly, added dual error field check.
- **Verified:** K420 now returns $17.40 piece / $13.40 case. PC61 returns $4.53 piece with $2.95 active sale.

### Bug 2: Media content service -- method name and WSDL namespace collision
- **Root cause:** WSDL exposes `getMediaContent` (lowercase g), but code called `GetMediaContentAsync` (uppercase). Additionally, node-soap's response parser crashes due to namespace collisions in the Media WSDL ("Target-Namespace already in use").
- **Fix:** Changed method name to `getMediaContentAsync`. Added XML fallback parser that extracts media content from `client.lastResponse` raw XML when node-soap's auto-parser fails.
- **Verified:** K420 returns 180 images (20 each: Rear, Front, Primary, Swatch, High + 80 Custom). PC61 returns 496 images.

### Bug 3: Inventory service -- endpoint selection and error field spelling
- **Root cause:** SanMar Standard `getInventoryQtyForStyleColorSize` does NOT support style-only queries (returns "ERROR: Invalid product specified" with empty color/size). Error check used `errorOccured` (single-r) but WSDL uses `errorOccurred` (double-r), so errors were silently ignored and returned 0 SKUs.
- **Fix:** Switched `getStyleInventory` to use PromoStandards `getInventoryLevels` v2.0.0, which supports style-level queries and returns richer per-warehouse data. Fixed dual error field spelling check.
- **Verified:** K420 returns 207 SKUs (89 in stock). PC61 returns 560 SKUs (555 in stock, 207 well stocked).

## Files Created/Modified
- `scripts/sanmar/index.ts` - Public API barrel export with curated function, type, constant, and error imports
- `scripts/sanmar/demo.ts` - Integration demo script exercising all 5 service areas
- `scripts/sanmar/services/pricing.ts` - Fixed arg0 array structure, response parsing, error field spelling
- `scripts/sanmar/services/inventory.ts` - Switched to PromoStandards endpoint, fixed error field spelling, location qty parsing
- `scripts/sanmar/services/media.ts` - Fixed method name (lowercase g), added XML fallback parser for namespace collisions
- `scripts/sanmar/services/index.ts` - Updated barrel export for all services
- `package.json` - Added demo and demo:style npm scripts

## Decisions Made
- WSDL `describe()` output is the source of truth for method signatures -- SanMar's documentation shows XML request/response, but node-soap's arg mapping differs
- XML fallback parsing is acceptable for the media endpoint since node-soap's WSDL parser has a known limitation with duplicate namespace declarations
- PromoStandards `getInventoryLevels` is superior to SanMar Standard for inventory: supports style-level queries, returns actual counts (not capped), includes warehouse names
- Both `errorOccurred` (double-r) and `errorOccured` (single-r) must be checked because different SanMar WSDLs use different spellings

## Deviations from Plan

### Auto-fixed Issues

**1. Pricing WSDL arg structure mismatch**
- **Found during:** Live API testing (checkpoint)
- **Issue:** arg0 must be array type per WSDL, response format different from assumed structure
- **Fix:** Wrapped query in array, fixed response parsing path
- **Verified:** K420 and PC61 pricing queries return correct data

**2. Media WSDL namespace collision**
- **Found during:** Live API testing (checkpoint)
- **Issue:** node-soap response parser crashes on namespace collisions; method name case mismatch
- **Fix:** Changed method name, added XML fallback parser
- **Verified:** Both styles return full image sets with correct classification

**3. Inventory endpoint selection**
- **Found during:** Live API testing (checkpoint)
- **Issue:** SanMar Standard endpoint doesn't support style-only queries; error field spelling mismatch hid the real error
- **Fix:** Switched to PromoStandards endpoint, fixed error checking
- **Verified:** Both styles return complete per-SKU inventory with warehouse breakdown

---

**Total deviations:** 3 auto-fixed (all discovered via live API checkpoint)
**Impact on plan:** All fixes were necessary for correctness. No scope creep -- same functionality, correct implementation.

## Issues Encountered
- SanMar's error field spelling inconsistency (`errorOccured` in product info WSDL vs `errorOccurred` in pricing/inventory WSDLs) is a documented quirk that required defensive dual-checking
- Media WSDL namespace collision is a node-soap limitation, not a SanMar API issue -- the API returns valid data, but node-soap can't parse it

## User Setup Required

None - SanMar API credentials were configured in 05-01.

## Next Phase Readiness
- Phase 5 SanMar API Foundation is COMPLETE
- All 4 service modules validated against live SanMar API with real credentials
- Public API barrel export provides clean import surface for Phase 6
- Demo script serves as usage reference for all subsequent phases
- Ready for Phase 6: Product Creation Pipeline (SanMar style number -> WIX product draft)

---
*Phase: 05-sanmar-api-foundation*
*Completed: 2026-01-30*
