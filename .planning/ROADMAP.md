# Roadmap: HotBox Clothing Store Enhancement

## Overview

Transform HotBox Clothing from a manually-managed WIX store into a streamlined operation with optimized storefront UX and automated SanMar product pipeline. The first half focuses on conversion -- fixing navigation, mobile experience, and checkout on the live store. The second half builds the SanMar integration that eliminates manual product creation, adds inventory monitoring, and automates stock-level responses. v0.2 extends into multi-brand operations with secondary vendor fallback, order fulfillment automation, and advanced pricing/inventory capabilities. v1.0 adds multi-angle branded product imagery with visual placement tools, customer royalty tracking with PDF reporting, and pipeline/operations hardening.

## Domain Expertise

None

## Milestones

- ✅ **v0.1 MVP** -- Phases 1-10 (shipped 2026-01-31)
- ✅ **v0.2 Multi-Brand Operations** -- Phases 11-20 (shipped 2026-02-01)
- ✅ **v1.0 Visual Branding & Business Operations** -- Phases 21-30 (shipped 2026-02-02)
- 🚧 **v1.1 Storefront Polish & Operations Dashboard** -- Phases 31-36 (in progress)

## Completed Milestones

- [v0.1 MVP](milestones/v0.1-ROADMAP.md) (Phases 1-10) -- SHIPPED 2026-01-31
- [v0.2 Multi-Brand Operations](milestones/v0.2-ROADMAP.md) (Phases 11-20) -- SHIPPED 2026-02-01
- [v1.0 Visual Branding & Business Operations](milestones/v1.0-ROADMAP.md) (Phases 21-30) -- SHIPPED 2026-02-02

## Phases

### 🚧 v1.1 Storefront Polish & Operations Dashboard (In Progress)

**Milestone Goal:** Enhance customer-facing storefront with stock visibility and variant image switching, plus build operational tooling for easier store management including daemon controls, pipeline wizard, and product migration.

#### Phase 31: Stock Visibility ✓

**Goal**: Show "Out of Stock" for unavailable color/size combinations instead of hiding them
**Depends on**: v1.0 complete
**Research**: No (WIX Inventory API integration - internal patterns)
**Plans**: 3
**Completed**: 2026-02-03

Plans:
- [x] 31-01: WIX Inventory API service + stock sync refactor
- [x] 31-02: Product creation inventory integration
- [x] 31-03: Verification + documentation (has checkpoint)

#### Phase 32: Variant Image Switching

**Goal**: Display color-specific product images when customer selects a color variant
**Depends on**: Phase 31
**Research**: Unlikely (WIX storefront image display - internal patterns)
**Plans**: TBD

Plans:
- [ ] 32-01: TBD

#### Phase 33: Side-View Image Investigation & Fix

**Goal**: Debug root cause of incorrect side angle images from vendor API, fix for sleeve logo placement
**Depends on**: Phase 32
**Research**: Likely (debugging vendor API response data and angle selection logic)
**Research topics**: Vendor API angle field values, image URL patterns, current angle selection implementation
**Plans**: TBD

Plans:
- [ ] 33-01: TBD

#### Phase 34: Operations Dashboard Foundation

**Goal**: Build daemon control panel and store health overview dashboard
**Depends on**: Phase 33
**Research**: Unlikely (internal dashboard - established patterns from existing admin pages)
**Plans**: TBD

Plans:
- [ ] 34-01: TBD

#### Phase 35: Product Pipeline Wizard

**Goal**: Step-by-step guided product creation with previews at each stage
**Depends on**: Phase 34
**Research**: Unlikely (UI wrapper for existing pipeline functionality)
**Plans**: TBD

Plans:
- [ ] 35-01: TBD

#### Phase 36: Product Migration Tooling

**Goal**: Batch re-import existing products through pipeline, register for inventory tracking
**Depends on**: Phase 35
**Research**: Unlikely (batch usage of existing pipeline with tracking registration)
**Plans**: TBD

Plans:
- [ ] 36-01: TBD

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

<details>
<summary>✅ v1.0 Visual Branding & Business Operations (Phases 21-30) -- SHIPPED 2026-02-02</summary>

- [x] Phase 21: Multi-Angle Image Support (1/1 plans) -- completed 2026-02-02
- [x] Phase 22: Multi-Angle Logo Overlay (2/2 plans) -- completed 2026-02-02
- [x] Phase 23: Visual Logo Placement UI (2/2 plans) -- completed 2026-02-02
- [x] Phase 24: Logo Upload & Management (2/2 plans) -- completed 2026-02-02
- [x] Phase 25: Customer Account System (3/3 plans) -- completed 2026-02-02
- [x] Phase 26: Royalty Calculation & PDF Reporting (3/3 plans) -- completed 2026-02-02
- [x] Phase 27: Pipeline Automation (3/3 plans) -- completed 2026-02-02
- [x] Phase 28: Order Management Hardening (2/2 plans) -- completed 2026-02-02
- [x] Phase 29: Inventory Sync Reliability (3/3 plans) -- completed 2026-02-02
- [x] Phase 30: Integration Testing & Polish (3/3 plans) -- completed 2026-02-02

</details>

## Progress

**Execution Order:**
Phases execute in numeric order: 31 → 32 → 33 → 34 → 35 → 36

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
| 29. Inventory Sync Reliability | v1.0 | 3/3 | Complete | 2026-02-02 |
| 30. Integration Testing & Polish | v1.0 | 3/3 | Complete | 2026-02-02 |
| 31. Stock Visibility | v1.1 | 3/3 | Complete | 2026-02-03 |
| 32. Variant Image Switching | v1.1 | 0/? | Not started | - |
| 33. Side-View Image Investigation & Fix | v1.1 | 0/? | Not started | - |
| 34. Operations Dashboard Foundation | v1.1 | 0/? | Not started | - |
| 35. Product Pipeline Wizard | v1.1 | 0/? | Not started | - |
| 36. Product Migration Tooling | v1.1 | 0/? | Not started | - |
