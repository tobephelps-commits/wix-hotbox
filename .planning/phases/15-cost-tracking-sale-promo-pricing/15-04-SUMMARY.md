---
phase: 15-cost-tracking-sale-promo-pricing
plan: 04
subsystem: ui
tags: [preview-server, margin-dashboard, sale-management, api-endpoints, profitability]

# Dependency graph
requires:
  - phase: 15-cost-tracking-sale-promo-pricing
    provides: cost-tracker.ts (getAllProductCosts, getProductCost, getCostHistory), sale-pricing.ts (listSales, createSale, applySale, revertSale, cancelSale, checkAndProcessSales)
provides:
  - 8 new API endpoints on preview server (2 margin, 6 sale) for cost/margin queries and sale lifecycle management
  - Margin dashboard UI with color-coded profitability table and expandable cost history timeline
  - Sale management UI with inline create form, status badges, and apply/revert/cancel action buttons
affects: [16-real-time-stock-sync]

# Tech tracking
tech-stack:
  added: []
  patterns: [preview server API endpoint pattern extended for cost/sale modules, inline form with fetch API for CRUD operations]

key-files:
  created: []
  modified:
    - scripts/pipeline/preview-server.ts
    - scripts/pipeline/preview.html

key-decisions:
  - "API endpoints follow existing preview server patterns: try/catch, JSON responses, proper HTTP status codes"
  - "Margin table color-coding thresholds: green >40%, yellow 20-40%, red <20%"
  - "Sale form uses datetime-local inputs with smart defaults (now + 7 days)"

patterns-established:
  - "Cost/margin API endpoints grouped under // Cost/Margin API (Phase 15) comment"
  - "Sale API endpoints grouped under // Sale Pricing API (Phase 15) comment"
  - "Expandable row pattern for table detail views (click row to show history)"

# Metrics
duration: 5min
completed: 2026-01-31
---

# Phase 15 Plan 04: Cost/Margin Dashboard & Sale Controls in Preview UI Summary

**Preview server extended with 8 API endpoints for cost/margin and sale management, plus margin dashboard with color-coded profitability table and sale management UI with inline create/apply/revert/cancel controls**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-31T00:20:00Z
- **Completed:** 2026-01-31T00:25:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- 8 new API endpoints on preview server: GET /api/margins, GET /api/margins/:style, GET /api/sales, POST /api/sales, POST /api/sales/:id/apply, POST /api/sales/:id/revert, POST /api/sales/:id/cancel, POST /api/sales/check
- Margin dashboard shows all tracked products with wholesale, decoration, total cost, retail price, margin dollars, margin percent, and pricing preset
- Color-coded margin column (green >40%, yellow 20-40%, red <20%) for instant profitability visibility
- Click-to-expand cost history timeline per product showing timestamps, reasons, costs, and margin changes
- Sale management UI with table listing all sales by name, discount, products, dates, status, and action buttons
- Status badges: Active (green), Scheduled (blue), Ended (gray), Cancelled (red)
- Inline sale creation form with discount type dropdown (% Off, $ Off, Fixed Price), product targeting, and date pickers
- Check Sales button processes scheduled/expired sales and refreshes the display

## Task Commits

Each task was committed atomically:

1. **Task 1: Add cost/margin and sale API endpoints to preview server** - `f11e3f4` (feat)
2. **Task 2: Add margin dashboard and sale controls to preview UI** - `eb1be7e` (feat)

**Plan metadata:** see below (docs: complete plan)

## Files Created/Modified
- `scripts/pipeline/preview-server.ts` - Added 8 API endpoints (2 margin, 6 sale) with route parsing, imports from cost-tracker.ts and sale-pricing.ts, proper error handling
- `scripts/pipeline/preview.html` - Added Margin Dashboard section with profitability table and cost history expansion, Sales & Promotions section with create form and action controls

## Decisions Made
- API endpoints follow existing preview server patterns with try/catch, JSON responses, and proper HTTP status codes (400, 404, 405, 500)
- Margin table color-coding uses 40% and 20% thresholds matching common retail benchmarks
- Sale form defaults start date to "now" and end date to 7 days ahead for convenience
- Sale creation auto-applies if start date is in the past (sends to applySale after createSale)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 15 complete: cost tracking, sale pricing, coupon management, and preview UI all operational
- Preview server is the single interface for product curation, profitability analysis, and promotion management
- Ready for Phase 16 (Real-time Stock Sync & Multi-warehouse)

---
*Phase: 15-cost-tracking-sale-promo-pricing*
*Completed: 2026-01-31*
