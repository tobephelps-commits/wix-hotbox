---
phase: 15-cost-tracking-sale-promo-pricing
plan: 01
subsystem: pricing
tags: [cost-tracking, margin, decoration, cli, profitability]

# Dependency graph
requires:
  - phase: 14-logo-overlay-engine
    provides: pipeline infrastructure, CuratedProduct type, create-product CLI
provides:
  - ProductCostRecord and CostHistoryEntry types for cost tracking
  - cost-tracker.ts module for recording and querying product costs
  - margin-report.ts CLI for viewing product profitability
  - calculateFullMargin and calculateTotalCost functions including decoration costs
  - --decoration-cost and --decoration-type CLI flags on create-product
affects: [15-cost-tracking-sale-promo-pricing, 16-real-time-stock-sync]

# Tech tracking
tech-stack:
  added: []
  patterns: [cost history persistence to local JSON, margin calculation with decoration costs]

key-files:
  created:
    - scripts/pipeline/cost-tracker.ts
    - scripts/pipeline/margin-report.ts
  modified:
    - scripts/pipeline/types.ts
    - scripts/pipeline/pricing-rules.ts
    - scripts/pipeline/create-product.ts
    - package.json

key-decisions:
  - "Cost history stored in data/cost-history.json following existing local data pattern"
  - "Decoration cost added as optional fields on CuratedProduct and ProductTemplate for backward compatibility"
  - "calculateFullMargin kept separate from calculateMargin to avoid breaking existing code"

patterns-established:
  - "Cost recording as post-creation hook in create-product pipeline"
  - "History entry appended on cost or price change with reason tracking"

# Metrics
duration: 8min
completed: 2026-01-31
---

# Phase 15 Plan 01: Cost Tracking Data Model Summary

**Cost tracking types, decoration cost support, historical cost recording via cost-tracker.ts, and margin-report.ts CLI for viewing product profitability across all tracked products**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-31T00:00:00Z
- **Completed:** 2026-01-31T00:08:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- ProductCostRecord, CostHistoryEntry, and CostHistoryFile types defined for cost tracking data model
- calculateTotalCost and calculateFullMargin functions in pricing-rules.ts centralize cost math including decoration
- cost-tracker.ts module persists product cost data to data/cost-history.json with upsert and history tracking
- create-product.ts now records cost data after WIX creation and supports --decoration-cost/--decoration-type flags
- margin-report.ts CLI displays formatted product profitability table with --style, --sort, and --below filtering
- ProductTemplate extended with optional decorationCost and decorationType for template-driven decoration defaults

## Task Commits

Each task was committed atomically:

1. **Task 1: Add cost tracking types and decoration cost to pricing model** - `81fa5f3` (feat)
2. **Task 2: Build cost tracker module and margin report CLI** - `91e868c` (feat)

## Files Created/Modified
- `scripts/pipeline/types.ts` - Added ProductCostRecord, CostHistoryEntry, CostHistoryFile interfaces; extended CuratedProduct and ProductTemplate with decoration fields
- `scripts/pipeline/pricing-rules.ts` - Added calculateTotalCost and calculateFullMargin functions
- `scripts/pipeline/cost-tracker.ts` - New module: load/save cost history, record/query product costs
- `scripts/pipeline/margin-report.ts` - New CLI: product profitability table with sorting and filtering
- `scripts/pipeline/create-product.ts` - Added --decoration-cost/--decoration-type flags, cost recording after creation, margin display in output
- `package.json` - Added margin-report script

## Decisions Made
- Cost history stored in data/cost-history.json following the same local-data gitignored pattern as collections.json and templates.json
- Decoration cost/type added as optional fields on CuratedProduct and ProductTemplate to maintain full backward compatibility
- calculateFullMargin kept as a new function separate from existing calculateMargin to preserve backward compatibility
- Template precedence for decoration: --decoration-cost > template.decorationCost > 0 (consistent with existing pricing precedence chain)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Cost tracking foundation complete, ready for sale/promo pricing features in subsequent plans
- All existing pipeline behavior preserved (no breaking changes)
- margin-report CLI operational for immediate profitability visibility

---
*Phase: 15-cost-tracking-sale-promo-pricing*
*Completed: 2026-01-31*
