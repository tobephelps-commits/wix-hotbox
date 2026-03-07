---
phase: 53-customer-royalty-system
plan: 02
subsystem: api
tags: [pricing, royalty, pdfkit, pdf, b2b, customers]

# Dependency graph
requires:
  - phase: 53-customer-royalty-system
    provides: Customer types (CustomerAccount, RoyaltyLineItem, RoyaltyReport, CustomerPricingSummary)
  - phase: 49-order-management-core
    provides: Order and OrderWithDetails types for royalty calculation
  - phase: 50-order-management-advanced
    provides: PDF template brand constants and layout patterns
  - phase: 48-logo-system
    provides: Logo registry for customer logo resolution
provides:
  - Pure pricing functions (calculateCustomerRetailPrice, calculateCustomerPricingSummary, etc.)
  - Royalty calculation engine (matchOrdersToCustomer, generateRoyaltyReport, etc.)
  - PDFKit-based royalty statement generator (generateRoyaltyStatement)
  - Complete barrel exports for customer module
affects: [customer-api-routes, royalty-reporting-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [setDataDir init pattern for PDF logo resolution, OrderWithDetails for line-item access]

key-files:
  created:
    - src/customers/pricing.ts
    - src/customers/royalty.ts
    - src/customers/royalty-statement.ts
  modified:
    - src/customers/index.ts

key-decisions:
  - "OrderWithDetails used instead of Order for royalty calculation -- v2.0 line items are on `items` property"
  - "RoyaltyLineItem.orderNumber is string in v2.0 types (was number in v1.x)"
  - "Logo resolution via registry.ts functions instead of direct file reads"
  - "setDataDir() init pattern matching pdf-template.ts convention"

patterns-established:
  - "Pure pricing functions with round2() at each step for money precision"
  - "Discount-aware royalty: order.discount > 0 zeroes all line items in that order"

# Metrics
duration: 5min
completed: 2026-03-07
---

# Phase 53, Plan 02: Pricing, Royalty & PDF Statement Summary

**Pure pricing functions, discount-aware royalty calculation engine, and PDFKit-based branded royalty statement generator with logo embedding and pagination**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-07
- **Completed:** 2026-03-07
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Ported all 5 pricing functions (calculateCustomerRetailPrice, calculateCustomerVariantPrice, calculateCustomerMargin, calculateCustomerRoyalty, calculateCustomerPricingSummary)
- Ported royalty calculation engine with order matching, date filtering, discount detection, and per-line-item royalty computation using v2.0 OrderWithDetails types
- Ported PDFKit royalty statement generator with customer logo, 7-column line-item table, discount notation, auto-pagination, and branded totals section
- Updated barrel exports with all pricing, royalty, and statement functions

## Task Commits

Each task was committed atomically:

1. **Task 1: Port pricing functions and royalty calculation engine** - `5f9aac3` (feat)
2. **Task 2: Port royalty statement PDF generator with barrel exports** - `ca3e07a` (feat)

## Files Created/Modified
- `src/customers/pricing.ts` - Pure pricing calculation functions with rounding modes
- `src/customers/royalty.ts` - Royalty calculation engine with order matching and discount awareness
- `src/customers/royalty-statement.ts` - PDFKit royalty statement with logo, table, pagination, totals
- `src/customers/index.ts` - Updated barrel exports for complete module API

## Decisions Made
- Used OrderWithDetails instead of Order for royalty calculation (v2.0 line items on `items` property)
- RoyaltyLineItem.orderNumber converted to string via String() to match v2.0 type definition
- Logo resolution delegated to registry.ts functions (loadLogoRegistry, resolveLogoPath) instead of direct file reads
- setDataDir() init pattern for logo path resolution, matching pdf-template.ts convention from phase 50

## Deviations from Plan
None - plan executed exactly as written

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Pricing, royalty, and PDF generation ready for API routes
- All functions are pure (no DB, no side effects) except PDF generator which reads logo files
- Complete barrel exports enable clean imports from consumer modules

---
*Phase: 53-customer-royalty-system*
*Completed: 2026-03-07*
