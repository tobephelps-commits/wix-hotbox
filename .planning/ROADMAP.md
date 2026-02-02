# Roadmap: HotBox Clothing Store Enhancement

## Overview

Transform HotBox Clothing from a manually-managed WIX store into a streamlined operation with optimized storefront UX and automated SanMar product pipeline. The first half focuses on conversion -- fixing navigation, mobile experience, and checkout on the live store. The second half builds the SanMar integration that eliminates manual product creation, adds inventory monitoring, and automates stock-level responses. v0.2 extends into multi-brand operations with secondary vendor fallback, order fulfillment automation, and advanced pricing/inventory capabilities. v1.0 adds multi-angle branded product imagery with visual placement tools, customer royalty tracking with PDF reporting, and pipeline/operations hardening.

## Domain Expertise

None

## Milestones

- ✅ **v0.1 MVP** -- Phases 1-10 (shipped 2026-01-31)
- ✅ **v0.2 Multi-Brand Operations** -- Phases 11-20 (shipped 2026-02-01)
- 🚧 **v1.0 Visual Branding & Business Operations** -- Phases 21-30 (in progress)

## Completed Milestones

- [v0.1 MVP](milestones/v0.1-ROADMAP.md) (Phases 1-10) -- SHIPPED 2026-01-31
- [v0.2 Multi-Brand Operations](milestones/v0.2-ROADMAP.md) (Phases 11-20) -- SHIPPED 2026-02-01

## Phases

<details>
<summary>✅ v0.1 MVP (Phases 1-10) -- SHIPPED 2026-01-31</summary>

- [x] Phase 1: Site Audit & Discovery (3/3 plans) -- completed 2026-01-29
- [x] Phase 2: Navigation & Product Discovery (5/5 plans) -- completed 2026-01-30
- [x] Phase 3: Mobile Experience Optimization (3/3 plans) -- completed 2026-01-30
- [x] Phase 4: Checkout & Conversion Optimization (3/3 plans) -- completed 2026-01-30
- [x] Phase 5: SanMar API Foundation (5/5 plans) -- completed 2026-01-30
- [x] Phase 6: Product Creation Pipeline (5/5 plans) -- completed 2026-01-30
- [x] Phase 7: Pricing & Variant Logic (3/3 plans) -- completed 2026-01-30
- [x] Phase 8: Inventory Monitoring (2/2 plans) -- completed 2026-01-30
- [x] Phase 9: Automated Stock Sync (2/2 plans) -- completed 2026-01-31
- [x] Phase 10: Integration Polish (3/3 plans) -- completed 2026-01-31

</details>

<details>
<summary>✅ v0.2 Multi-Brand Operations (Phases 11-20) -- SHIPPED 2026-02-01</summary>

- [x] Phase 11: Automate WIX Editor Fixes (4/4 plans) -- completed 2026-01-31
- [x] Phase 12: Multi-Collection Product Routing (1/1 plans) -- completed 2026-01-31
- [x] Phase 13: Template Presets & Pipeline Speed (2/2 plans) -- completed 2026-01-31
- [x] Phase 14: Logo Overlay Engine (3/3 plans) -- completed 2026-01-31
- [x] Phase 15: Cost Tracking & Sale/Promo Pricing (4/4 plans) -- completed 2026-01-31
- [x] Phase 16: Real-time Stock Sync & Multi-warehouse (5/5 plans) -- completed 2026-01-31
- [x] Phase 17: S&S Activewear API Integration (7/7 plans) -- completed 2026-02-01
- [x] Phase 18: Order Management — Invoice & Label Printing (6/6 plans) -- completed 2026-02-01
- [x] Phase 19: Order Management — SanMar Cart Automation (3/3 plans) -- completed 2026-02-01
- [x] Phase 20: Integration Testing & Polish (3/3 plans) -- completed 2026-02-01

</details>

### 🚧 v1.0 Visual Branding & Business Operations (In Progress)

**Milestone Goal:** Multi-angle branded product imagery with visual placement tools, customer royalty tracking with PDF reporting, and pipeline/operations hardening.

#### Phase 21: Multi-Angle Image Support

**Goal**: Extend product pipeline to fetch and store back and left-side product images from vendors
**Depends on**: Previous milestone complete
**Research**: Unlikely (extending existing vendor API clients)
**Plans**: 1

Plans:
- [x] 21-01: Multi-angle image pipeline and preview UI -- completed 2026-02-02

#### Phase 22: Multi-Angle Logo Overlay

**Goal**: Extend logo overlay engine to composite logos on all 3 angles with per-angle placement configuration
**Depends on**: Phase 21
**Research**: Unlikely (extending existing Sharp-based engine)
**Plans**: 2

Plans:
- [x] 22-01: Per-angle overlay types, engine, and CLI integration -- completed 2026-02-02
- [x] 22-02: Per-angle logo overlay preview UI -- completed 2026-02-02

#### Phase 23: Visual Logo Placement UI

**Goal**: Browser-based drag-and-drop interface for positioning and sizing logos per angle
**Depends on**: Phase 22
**Plans**: 2

Plans:
- [x] 23-01: Core drag-and-drop placement engine and angle card integration -- completed 2026-02-02
- [x] 23-02: Alignment guides, polish, and WYSIWYG verification -- completed 2026-02-02

#### Phase 24: Logo Upload & Management

**Goal**: Upload facility with resize, format handling, and logo library management
**Depends on**: Phase 23
**Research**: Unlikely (file upload + Sharp resize, established patterns)
**Plans**: 2

Plans:
- [x] 24-01: Logo upload API with Sharp processing and registry CRUD -- completed 2026-02-02
- [x] 24-02: Logo management UI with drag-and-drop upload and library grid -- completed 2026-02-02

#### Phase 25: Customer Account System

**Goal**: Multi-customer branded accounts with configurable markup and royalty structures
**Depends on**: Phase 24
**Research**: No (single markup % per customer, established JSON store + REST API + preview UI patterns)
**Plans**: 3

Plans:
- [x] 25-01: Customer account types, store, and REST API -- completed 2026-02-02
- [x] 25-02: Customer management dashboard UI -- completed 2026-02-02
- [x] 25-03: Customer-aware pricing calculations and logo integration -- completed 2026-02-02

#### Phase 26: Royalty Calculation & PDF Reporting

**Goal**: Period-based royalty calculation with branded PDF statement generation per customer
**Depends on**: Phase 25
**Research**: Unlikely (PDFKit already in codebase from v0.2 invoice generation)
**Plans**: 3

Plans:
- [x] 26-01: Royalty calculation engine and API endpoints -- completed 2026-02-02
- [x] 26-02: Royalty statement PDF generator -- completed 2026-02-02
- [x] 26-03: Royalty reporting dashboard UI -- completed 2026-02-02

#### Phase 27: Pipeline Automation

**Goal**: Bulk operations, smarter defaults, and reduced manual steps in product creation workflow
**Depends on**: Phase 26
**Research**: Unlikely (internal pipeline improvements)
**Plans**: 3

Plans:
- [x] 27-01: Recent-choice memory (localStorage + server-side preferences persistence) -- completed 2026-02-02
- [x] 27-02: Batch processing engine with SSE progress stream -- completed 2026-02-02
- [x] 27-03: Batch creation UI with live progress queue -- completed 2026-02-02

#### Phase 28: Order Management Hardening

**Goal**: Improve order tracking reliability, fulfillment workflow visibility, and vendor PO management
**Depends on**: Phase 27
**Research**: Unlikely (hardening existing order management code)
**Plans**: 2

Plans:
- [x] 28-01: Error tracking, retry logic, and summary/error API endpoints -- completed 2026-02-02
- [x] 28-02: Order dashboard UI with status cards, error alerts, and enhanced timeline -- completed 2026-02-02

#### Phase 29: Inventory Sync Reliability

**Goal**: Tighten stock sync accuracy between vendors and WIX, improve alert reliability and threshold management
**Depends on**: Phase 28
**Research**: Unlikely (hardening existing inventory sync code)
**Plans**: 3

Plans:
- [ ] 29-01: Per-product thresholds, case-insensitive SKU matching, and snapshot staleness detection
- [x] 29-02: Sync health timing, notification delivery tracking, mapping audit, and alert log retention -- completed 2026-02-02
- [ ] 29-03: Inventory reliability dashboard UI (health cards, alert filtering, threshold badges, audit controls)

#### Phase 30: Integration Testing & Polish

**Goal**: End-to-end testing of all v1.0 features, regression checks, and documentation updates
**Depends on**: Phase 29
**Research**: Unlikely (testing and polish, internal patterns)
**Plans**: TBD

Plans:
- [ ] 30-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 21 → 22 → 23 → 24 → 25 → 26 → 27 → 28 → 29 → 30

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|---------------|--------|-----------|
| 1. Site Audit & Discovery | v0.1 | 3/3 | Complete | 2026-01-29 |
| 2. Navigation & Product Discovery | v0.1 | 5/5 | Complete | 2026-01-30 |
| 3. Mobile Experience Optimization | v0.1 | 3/3 | Complete | 2026-01-30 |
| 4. Checkout & Conversion Optimization | v0.1 | 3/3 | Complete | 2026-01-30 |
| 5. SanMar API Foundation | v0.1 | 5/5 | Complete | 2026-01-30 |
| 6. Product Creation Pipeline | v0.1 | 5/5 | Complete | 2026-01-30 |
| 7. Pricing & Variant Logic | v0.1 | 3/3 | Complete | 2026-01-30 |
| 8. Inventory Monitoring | v0.1 | 2/2 | Complete | 2026-01-30 |
| 9. Automated Stock Sync | v0.1 | 2/2 | Complete | 2026-01-31 |
| 10. Integration Polish | v0.1 | 3/3 | Complete | 2026-01-31 |
| 11. Automate WIX Editor Fixes | v0.2 | 4/4 | Complete | 2026-01-31 |
| 12. Multi-Collection Product Routing | v0.2 | 1/1 | Complete | 2026-01-31 |
| 13. Template Presets & Pipeline Speed | v0.2 | 2/2 | Complete | 2026-01-31 |
| 14. Logo Overlay Engine | v0.2 | 3/3 | Complete | 2026-01-31 |
| 15. Cost Tracking & Sale/Promo Pricing | v0.2 | 4/4 | Complete | 2026-01-31 |
| 16. Real-time Stock Sync & Multi-warehouse | v0.2 | 5/5 | Complete | 2026-01-31 |
| 17. S&S Activewear API Integration | v0.2 | 7/7 | Complete | 2026-02-01 |
| 18. Order Management — Invoice & Label Printing | v0.2 | 6/6 | Complete | 2026-02-01 |
| 19. Order Management — SanMar Cart Automation | v0.2 | 3/3 | Complete | 2026-02-01 |
| 20. Integration Testing & Polish | v0.2 | 3/3 | Complete | 2026-02-01 |
| 21. Multi-Angle Image Support | v1.0 | 1/1 | Complete | 2026-02-02 |
| 22. Multi-Angle Logo Overlay | v1.0 | 2/2 | Complete | 2026-02-02 |
| 23. Visual Logo Placement UI | v1.0 | 2/2 | Complete | 2026-02-02 |
| 24. Logo Upload & Management | v1.0 | 2/2 | Complete | 2026-02-02 |
| 25. Customer Account System | v1.0 | 3/3 | Complete | 2026-02-02 |
| 26. Royalty Calculation & PDF Reporting | v1.0 | 3/3 | Complete | 2026-02-02 |
| 27. Pipeline Automation | v1.0 | 3/3 | Complete | 2026-02-02 |
| 28. Order Management Hardening | v1.0 | 2/2 | Complete | 2026-02-02 |
| 29. Inventory Sync Reliability | v1.0 | 2/3 | In progress | - |
| 30. Integration Testing & Polish | v1.0 | 0/? | Not started | - |
