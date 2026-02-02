# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-01)

**Core value:** Effortless product creation — enter a style number from any supported vendor and get a draft WIX product with pricing, variants, and images ready for review.
**Current focus:** v1.0 Visual Branding & Business Operations

## Current Position

Phase: 27 of 30 (Pipeline Automation)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-02-02 - Completed 27-02-PLAN.md

Progress: ████████░░ 87%

## Performance Metrics

**Velocity:**
- Total plans completed: 85 (34 v0.1 + 38 v0.2 + 13 v1.0)
- Average duration: ~1 session per plan
- v0.1: 34 plans across 3 days (2026-01-29 to 2026-01-31)
- v0.2: 38 plans across 4 days (2026-01-29 to 2026-02-01)

**By Phase (v0.1):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Site Audit | 3/3 | 3 sessions | 1 session |
| 2. Navigation | 5/5 | 5 sessions | 1 session |
| 3. Mobile | 3/3 | 3 sessions | 1 session |
| 4. Checkout | 3/3 | 3 sessions | 1 session |
| 5. SanMar API | 5/5 | 5 sessions | 1 session |
| 6. Product Pipeline | 5/5 | 5 sessions | 1 session |
| 7. Pricing & Variant | 3/3 | 3 sessions | 1 session |
| 8. Inventory Monitor | 2/2 | 2 sessions | 1 session |
| 9. Stock Sync | 2/2 | 2 sessions | 1 session |
| 10. Integration Polish | 3/3 | 3 sessions | 1 session |

**By Phase (v0.2):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 11. WIX Editor Fixes | 4/4 | 4 sessions | 1 session |
| 12. Collection Routing | 1/1 | 1 session | 1 session |
| 13. Template Presets | 2/2 | 2 sessions | 1 session |
| 14. Logo Overlay | 3/3 | 3 sessions | 1 session |
| 15. Cost/Sale Pricing | 4/4 | 4 sessions | 1 session |
| 16. Multi-warehouse | 5/5 | 5 sessions | 1 session |
| 17. S&S Activewear | 7/7 | 7 sessions | 1 session |
| 18. Order Management | 6/6 | 6 sessions | 1 session |
| 19. Cart Automation | 3/3 | 3 sessions | 1 session |
| 20. Testing & Polish | 3/3 | 3 sessions | 1 session |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
All v0.1 and v0.2 decisions marked with outcomes. See PROJECT.md for full list.

### Phase 25 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 25 | Single markup % per customer, not tiered | Per CONTEXT.md vision — simple B2B pricing model |
| 25 | logoKeys reference data/logos.json keys | Bridges logo system (phases 21-24) to customer accounts |
| 25 | Inline section layout (not tab-based) for customer UI | Matches existing dashboard where all sections are visible simultaneously |
| 25 | Logo chip picker for customer form | Visual thumbnail selection matching color-card selection pattern |
| 25 | Money rounding at each calculation step (not just final) | Prevents floating-point drift accumulation in multi-step pricing |
| 25 | Royalty calculated on retail price (not wholesale) | Standard royalty accounting practice |

### Phase 26 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 26 | Conservative discount heuristic: order.discount > 0 zeros all line items | Avoids royalty on staff/discount orders where markup was removed |
| 26 | Dynamic import for PDF module in API endpoint | Allows Plan 01 and 02 to run independently; 501 until module exists |
| 26 | Single-file royalty-statement.ts (template + generator combined) | Self-contained concern unlike invoices which separate for multi-order-type reuse |
| 26 | Static import replaces dynamic import after Plan 02 | Module now exists; cleaner code, better type checking |
| 26 | Actionable empty state for royalty dropdown when no customers exist | Better UX than silent empty dropdown; directs user to create customer first |

### Phase 27 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 27 | localStorage primary + server file fallback for preferences | Fast local reads with resilience to browser resets |
| 27 | angleOverlayState restored but overlay previews wait for product load | Prevents visual errors from stale image references |
| 27 | URL query params override saved preferences | Preserves deep-linking functionality |
| 27 | Sequential batch processing (not parallel) | Vendor APIs (SanMar SOAP, S&S REST) have rate limits; concurrent requests cause failures |
| 27 | SSE over WebSocket for progress streaming | Simpler protocol, EventSource-native, sufficient for unidirectional batch updates |
| 27 | 50-item batch limit | Prevents runaway long-running operations |
| 27 | Skip logo overlays in batch mode | Logo placement requires per-product visual positioning incompatible with automation |

### Blockers/Concerns

None

### Roadmap Evolution

- Milestone v0.1 created: storefront UX + SanMar pipeline, 10 phases (Phase 1-10)
- Milestone v0.1 shipped: 2026-01-31, 34 plans, 3 days
- Milestone v0.2 created: multi-brand operations, 10 phases (Phase 11-20)
- Milestone v0.2 shipped: 2026-02-01, 38 plans, 4 days
- Milestone v1.0 created: visual branding & business operations, 10 phases (Phase 21-30)

## Session Continuity

Last session: 2026-02-02
Stopped at: Completed 27-02-PLAN.md (batch processing engine with SSE)
Resume file: None
Note: Phase 27 in progress (2/3 plans). Next: 27-03 (batch creation UI).
