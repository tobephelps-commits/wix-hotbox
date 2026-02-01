# Roadmap: HotBox Clothing Store Enhancement

## Overview

Transform HotBox Clothing from a manually-managed WIX store into a streamlined operation with optimized storefront UX and automated SanMar product pipeline. The first half focuses on conversion -- fixing navigation, mobile experience, and checkout on the live store. The second half builds the SanMar integration that eliminates manual product creation, adds inventory monitoring, and automates stock-level responses. v0.2 extends into multi-brand operations with secondary vendor fallback, order fulfillment automation, and advanced pricing/inventory capabilities.

## Domain Expertise

None

## Milestones

- ✅ **v0.1 MVP** -- Phases 1-10 (shipped 2026-01-31)
- 🚧 **v0.2 Multi-Brand Operations** -- Phases 11-20 (in progress)

## Completed Milestones

- [v0.1 MVP](milestones/v0.1-ROADMAP.md) (Phases 1-10) -- SHIPPED 2026-01-31

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

### 🚧 v0.2 Multi-Brand Operations (In Progress)

**Milestone Goal:** Transform from single-pipeline MVP into a multi-brand, multi-vendor operation with order fulfillment automation and advanced pricing/inventory capabilities.

#### Phase 11: Automate WIX Editor Fixes

**Goal**: Use WIX APIs/Velo to automate the 32 pending manual fixes from v0.1 (chat widget removal, mobile responsive issues, abandoned cart setup, etc.)
**Depends on**: v0.1 complete
**Research**: Likely (WIX Velo/API capabilities for editor automation)
**Research topics**: WIX Velo scripting capabilities, which of the 32 fixes are automatable via API vs require manual Editor work
**Plans**: TBD

Plans:
- [x] 11-01: Consolidate WIX Editor/Dashboard fixes into master checklist
- [x] 11-02: Build Playwright site verification script
- [x] 11-03: Execute API-automatable fixes (0/3 candidates automatable)
- [x] 11-04: Run verification, generate status report, finalize Phase 11

#### Phase 12: Multi-Collection Product Routing

**Goal**: Route products to existing BigBarn, Board30, or other collections during the product creation pipeline
**Depends on**: Phase 11
**Research**: Unlikely (internal patterns, WIX API already integrated)
**Plans**: TBD

Plans:
- [x] 12-01: Add multi-collection product routing to creation pipeline

#### Phase 13: Template Presets & Pipeline Speed

**Goal**: Save and load pricing/variant configurations to reuse across products, speeding up the pipeline
**Depends on**: Phase 12
**Research**: Unlikely (internal patterns, local storage)
**Plans**: TBD

Plans:
- [x] 13-01: Build template system foundation with CRUD and --preset CLI flag
- [x] 13-02: Integrate templates into CLI and preview server API

#### Phase 14: Logo Overlay Engine

**Goal**: Place brand logos on SanMar product images with configurable placement rules (logo files ready, placement rules need definition per product/collection)
**Depends on**: Phase 13
**Research**: Likely (image compositing library selection — Sharp/Canvas, placement algorithms)
**Research topics**: Sharp vs node-canvas for image compositing, alpha blending, configurable placement coordinates
**Plans**: TBD

Plans:
- [x] 14-01: Build overlay engine core with Sharp compositing and logo registry
- [x] 14-02: Add --logo CLI flags and template integration to create-product
- [x] 14-03: Add overlay preview API and UI to preview server

#### Phase 15: Cost Tracking & Sale/Promo Pricing

**Goal**: Track per-product profitability, cost changes, margins, and support time-limited discounts, coupon codes, and flash sales
**Depends on**: Phase 14
**Research**: Unlikely (internal patterns, WIX pricing API known)
**Plans**: TBD

Plans:
- [x] 15-01: Build cost tracking data model with decoration cost and margin report CLI
- [x] 15-02: Build sale/promo pricing engine with CLI and WIX price update
- [x] 15-03: Integrate WIX Coupon API with CLI for coupon management
- [x] 15-04: Add margin dashboard and sale controls to preview server UI

#### Phase 16: Real-time Stock Sync & Multi-warehouse

**Goal**: Continuous inventory monitoring instead of manual/scheduled checks, with tracking across SanMar warehouse locations
**Depends on**: Phase 15
**Research**: Likely (continuous polling/webhook architecture, multi-warehouse SanMar API endpoints)
**Research topics**: SanMar inventory API warehouse location fields, polling interval optimization, event-driven vs scheduled sync
**Plans**: 5 plans in 3 waves

Plans:
- [x] 16-01: Extend snapshot data model with per-warehouse breakdown (Wave 1)
- [x] 16-02: Warehouse-aware alerts and email notification enrichment (Wave 2)
- [x] 16-03: Priority-based polling tiers, batch queries, and daemon resilience (Wave 1)
- [x] 16-04: Warehouse inventory CLI commands and priority management (Wave 2)
- [x] 16-05: Preview server inventory dashboard with warehouse breakdown UI (Wave 3)

#### Phase 17: S&S Activewear API Integration

**Goal**: Secondary vendor fallback when SanMar doesn't have a product — query S&S Activewear catalog and inventory
**Depends on**: Phase 16
**Research**: Likely (new external API integration, need current S&S Activewear API docs)
**Research topics**: S&S Activewear API authentication, product search, inventory endpoints, response format mapping to existing pipeline
**Plans**: 7 plans in 4 waves

Plans:
- [x] 17-01: Vendor abstraction types and VendorAdapter interface (Wave 1)
- [x] 17-02: S&S Activewear API client core (Wave 1)
- [ ] 17-03: SanMar vendor adapter (Wave 2)
- [ ] 17-04: S&S Activewear vendor adapter (Wave 2)
- [ ] 17-05: Pipeline vendor-agnostic refactor (Wave 3)
- [ ] 17-06: Monitor and sync vendor-agnostic refactor (Wave 3)
- [ ] 17-07: Preview server vendor support (Wave 4)

#### Phase 18: Order Management — Invoice & Label Printing

**Goal**: Print invoices and shipping labels from both WIX and manual orders
**Depends on**: Phase 17
**Research**: Likely (PDF generation libraries, shipping label format standards, printing integration)
**Research topics**: PDFKit vs Puppeteer for PDF generation, USPS/UPS label API formats, thermal printer support
**Plans**: TBD

Plans:
- [ ] 18-01: TBD

#### Phase 19: Order Management — SanMar Cart Automation

**Goal**: Auto-add order items to SanMar web shopping cart for fulfillment
**Depends on**: Phase 18
**Research**: Likely (browser automation for SanMar.com web cart)
**Research topics**: Puppeteer/Playwright for SanMar.com cart automation, session management, cart item mapping
**Plans**: TBD

Plans:
- [ ] 19-01: TBD

#### Phase 20: Integration Testing & Polish

**Goal**: End-to-end validation of all v0.2 features, documentation, and operational readiness
**Depends on**: Phase 19
**Research**: Unlikely (internal patterns)
**Plans**: TBD

Plans:
- [ ] 20-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20

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
| 17. S&S Activewear API Integration | v0.2 | 2/7 | In progress | - |
| 18. Order Management — Invoice & Label Printing | v0.2 | 0/? | Not started | - |
| 19. Order Management — SanMar Cart Automation | v0.2 | 0/? | Not started | - |
| 20. Integration Testing & Polish | v0.2 | 0/? | Not started | - |
