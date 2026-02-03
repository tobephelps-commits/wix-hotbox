# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** Effortless product creation — enter a style number from any supported vendor and get a draft WIX product with pricing, variants, and images ready for review.
**Current focus:** All milestones shipped. Planning next milestone or operational use.

## Current Position

Phase: 30 of 30 (all phases complete)
Plan: All plans complete
Status: v1.0 milestone archived
Last activity: 2026-02-02 - v1.0 milestone complete, tagged, archived

Progress: ██████████ 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 96 (34 v0.1 + 38 v0.2 + 24 v1.0)
- Average duration: ~1 session per plan
- v0.1: 34 plans across 3 days (2026-01-29 to 2026-01-31)
- v0.2: 38 plans across 4 days (2026-01-29 to 2026-02-01)
- v1.0: 24 plans across 1 day (2026-02-02)

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

**By Phase (v1.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 21. Multi-Angle Images | 1/1 | 1 session | 1 session |
| 22. Multi-Angle Logo Overlay | 2/2 | 2 sessions | 1 session |
| 23. Visual Logo Placement UI | 2/2 | 2 sessions | 1 session |
| 24. Logo Upload & Management | 2/2 | 2 sessions | 1 session |
| 25. Customer Account System | 3/3 | 3 sessions | 1 session |
| 26. Royalty Calculation & PDF | 3/3 | 3 sessions | 1 session |
| 27. Pipeline Automation | 3/3 | 3 sessions | 1 session |
| 28. Order Mgmt Hardening | 2/2 | 2 sessions | 1 session |
| 29. Inventory Sync Reliability | 3/3 | 3 sessions | 1 session |
| 30. Integration Testing & Polish | 3/3 | 3 sessions | 1 session |

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
| 27 | Fetch + ReadableStream for SSE (not EventSource) | POST method required for batch create; EventSource only supports GET |
| 27 | Vertical card stack for batch progress queue | Better readability than horizontal scroll for multi-item status display |

### Phase 28 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 28 | on-hold transitions bidirectional (new <-> on-hold, ordered <-> on-hold) | Allows pausing and resuming orders from the same lifecycle point |
| 28 | Only WIX API fetch retried, not per-order errors | Per-order errors are data issues, not transient; retry would re-process all orders |
| 28 | errored as cross-cutting count, not a real status | Orders with errors still need their actual lifecycle status for workflow progression |
| 28 | CSS custom properties for timeline dot colors | Allows pseudo-element coloring from JS without inline styles |
| 28 | Session-only banner dismiss (no persistent state) | Error banner is transient UI; re-shows on next page load if errors persist |

### Phase 29 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 29 | snapshotMaxAgeMinutes defaults to 180 (3 hours) | Generous to avoid false staleness positives on normal poll intervals |
| 29 | Per-product thresholds fully optional | Backward compatible with existing TrackedProduct JSON files |
| 29 | Color matching lowercased, size matching kept exact | Sizes are always uppercase; colors have vendor-specific casing |
| 29 | NotificationResult return type for sendSyncNotification | Enables delivery tracking without silently swallowing errors |
| 29 | Cumulative moving average for tick duration | Lower memory than sliding window, sufficient for operational alerting |
| 29 | 200ms rate limit between WIX API calls during audit | Prevents rate limit hits during full product mapping validation |
| 29 | 30-day default retention for alert log pruning | Applied before count cap for dual retention strategy |
| 29 | Health cards hidden when daemon not running | Avoids empty/misleading zero metrics in dashboard |
| 29 | Server-side alert filtering via query params | Accurate results from full alert log, not client-side truncated set |
| 29 | Hover tooltip for threshold badges (not click popover) | Read-only display of override values; simpler UX |

### Blockers/Concerns

None

### Roadmap Evolution

- Milestone v0.1 created: storefront UX + SanMar pipeline, 10 phases (Phase 1-10)
- Milestone v0.1 shipped: 2026-01-31, 34 plans, 3 days
- Milestone v0.2 created: multi-brand operations, 10 phases (Phase 11-20)
- Milestone v0.2 shipped: 2026-02-01, 38 plans, 4 days
- Milestone v1.0 created: visual branding & business operations, 10 phases (Phase 21-30)
- Milestone v1.0 shipped: 2026-02-02, 24 plans, 1 day

### Phase 30 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 30 | Multi-file import strategy for customers module test | No barrel export exists; sentinel path triggers custom script generation |

## Session Continuity

Last session: 2026-02-02
Stopped at: v1.0 milestone archived and tagged
Resume file: None
Note: All 3 milestones shipped (v0.1, v0.2, v1.0). 30 phases, 96 plans. Next: /gsd:discuss-milestone or operational use.
