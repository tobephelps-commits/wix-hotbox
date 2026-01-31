---
phase: 12-multi-collection-product-routing
plan: 01
subsystem: api
tags: [wix-collections, product-routing, pipeline, wix-stores-v1]

# Dependency graph
requires:
  - phase: 06-product-creation-pipeline
    provides: createWixProduct orchestrator, CuratedProduct type, wix-api.ts service
  - phase: 11-automate-wix-editor-fixes
    provides: Phase 11 complete, ready for Phase 12
provides:
  - listCollections() and getCollectionByName() for WIX collection discovery
  - Multi-collection routing in createWixProduct (Step 5)
  - --collection CLI flag for ergonomic product-to-collection assignment
  - data/collections.json local cache with all 10 store collections
affects: [13-template-presets, 14-logo-overlay-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Collection name-to-ID resolution via case-insensitive match"
    - "Per-collection try/catch graceful degradation in pipeline"
    - "Repeatable CLI flag pattern (--collection can appear multiple times)"

key-files:
  created:
    - scripts/pipeline/validate-collections.ts
    - data/collections.json (gitignored, generated from live API)
  modified:
    - scripts/pipeline/wix-api.ts
    - scripts/pipeline/types.ts
    - scripts/pipeline/create-product.ts
    - scripts/pipeline/index.ts

key-decisions:
  - "Collection names preferred over UUIDs in CLI for ergonomics; UUID fallback supported"
  - "data/collections.json gitignored as local cache, regenerated via --list-collections"
  - "Step 5 placement after Step 4 verify to ensure product exists before collection assignment"

patterns-established:
  - "Repeatable CLI flag: --collection 'Name' can be specified multiple times"
  - "Collection name resolution: case-insensitive with descriptive error listing available options"

# Metrics
duration: 8min
completed: 2026-01-31
---

# Phase 12 Plan 01: Multi-Collection Product Routing Summary

**Added listCollections/getCollectionByName APIs and integrated Step 5 collection routing into createWixProduct pipeline with --collection CLI flag**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-31T21:52:00Z
- **Completed:** 2026-01-31T22:00:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- listCollections() queries WIX Stores V1 collections/query endpoint with pagination, returns all 10 store collections
- getCollectionByName() resolves human-readable names to UUIDs (case-insensitive) with descriptive error on miss
- createWixProduct() now executes Step 5: assigns product to specified collections after variant setup
- CLI supports `--collection "Big Barn Crossfit"` flag (repeatable) for ergonomic collection assignment
- data/collections.json populated with all 10 live collections as local reference cache
- Full backward compatibility: no collections specified = same behavior as before

## Task Commits

Each task was committed atomically:

1. **Task 1: Add listCollections API and build collection registry** - `2e1ab50` (feat)
2. **Task 2: Integrate collection routing into pipeline** - `673c9d6` (feat)
3. **Task 3: End-to-end validation with dry-run test** - `6c3c270` (test)

## Files Created/Modified
- `scripts/pipeline/wix-api.ts` - Added WixCollection interface, listCollections(), getCollectionByName(), CLI runner with --list-collections
- `scripts/pipeline/types.ts` - Added optional `collections?: string[]` to CuratedProduct
- `scripts/pipeline/create-product.ts` - Added collectionsAssigned to CreationResult, Step 5 collection assignment, --collection CLI flag
- `scripts/pipeline/index.ts` - Updated barrel exports with listCollections, getCollectionByName, WixCollection
- `scripts/pipeline/validate-collections.ts` - Collection routing validation script (7 tests, all pass)
- `data/collections.json` - Local cache of 10 WIX store collections (gitignored, regenerated via CLI)

## Decisions Made
- Collection names preferred over UUIDs in CLI for ergonomics; UUID fallback supported via regex detection
- data/collections.json is gitignored as a local cache file, regenerated via `--list-collections`
- Step 5 placed after Step 4 (verify) to ensure product fully exists before collection assignment

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 12 complete (1/1 plans) -- collection routing fully integrated
- Pipeline now supports multi-collection product assignment via CLI and programmatic API
- Ready for Phase 13: Template Presets & Pipeline Speed

---
*Phase: 12-multi-collection-product-routing*
*Completed: 2026-01-31*
