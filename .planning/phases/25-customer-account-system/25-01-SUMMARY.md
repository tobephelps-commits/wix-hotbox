---
phase: 25-customer-account-system
plan: 01
subsystem: api
tags: [customer-accounts, json-store, rest-api, crud, b2b, markup, royalty]

# Dependency graph
requires:
  - phase: 24-logo-upload-management
    provides: Logo registry system (data/logos.json) that customer logoKeys reference
provides:
  - CustomerAccount type with markup%, royalty%, and logoKeys
  - JSON-backed customer store with atomic writes
  - REST API endpoints for customer CRUD on preview server
affects: [25-02, 25-03, 26-royalty-calculation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Customer store follows order-store.ts pattern (JSON file, atomic .tmp writes, field normalization)"
    - "Customer API follows preview-server REST patterns (parseRoute, sendJson, readBody)"

key-files:
  created:
    - scripts/customers/types.ts
    - scripts/customers/store.ts
  modified:
    - scripts/pipeline/preview-server.ts

key-decisions:
  - "Single markup percentage per customer (not tiered or per-category) per CONTEXT.md"
  - "email is a string field, not a primary key or unique constraint"
  - "logoKeys stores references to data/logos.json keys, not file paths"

patterns-established:
  - "Customer CRUD: same load/save/atomic-write pattern as order store"

# Metrics
duration: 8min
completed: 2026-02-02
---

# Phase 25 Plan 01: Customer Account Types, Store & REST API Summary

**B2B customer account data model with JSON persistence and 5 REST endpoints for CRUD operations, including strict validation for money-related fields (markupPercent, royaltyPercent)**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-02T18:30:00Z
- **Completed:** 2026-02-02T18:38:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- CustomerAccount interface with markup%, royalty%, logoKeys linking to logo registry
- JSON-backed store with atomic .tmp writes following order-store.ts pattern
- Five REST endpoints: GET list, POST create, GET by ID, PATCH update, DELETE
- Strict validation rejects NaN, Infinity, and negative numbers for money fields

## Task Commits

Each task was committed atomically:

1. **Task 1: Create customer account types and JSON-backed store** - `1f282f7` (feat)
2. **Task 2: Add customer REST API endpoints to preview server** - `5013a05` (feat)

## Files Created/Modified
- `scripts/customers/types.ts` - CustomerAccount and CustomerStore interfaces
- `scripts/customers/store.ts` - CRUD operations with atomic JSON persistence
- `scripts/pipeline/preview-server.ts` - 5 REST endpoints for customer management

## Decisions Made
- Single markup percentage per customer (not tiered) per CONTEXT.md vision
- email field is a simple string, not unique-constrained (not a primary key)
- logoKeys stores logo registry key strings, bridging customer accounts to logo system
- No new dependencies introduced (uses only node:fs, node:path, node:crypto)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Customer data model and API complete, ready for 25-02 (dashboard UI)
- Store pattern matches orders module for consistency
- logoKeys field ready for 25-03 (customer-aware pricing and logo integration)

---
*Phase: 25-customer-account-system*
*Completed: 2026-02-02*
