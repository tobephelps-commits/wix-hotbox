# Roadmap: HotBox Clothing Store Enhancement

## Overview

Transform HotBox Clothing from a manually-managed WIX store into a streamlined operation with optimized storefront UX and automated SanMar product pipeline. The first half focuses on conversion -- fixing navigation, mobile experience, and checkout on the live store. The second half builds the SanMar integration that eliminates manual product creation, adds inventory monitoring, and automates stock-level responses. v0.2 extends into multi-brand operations with secondary vendor fallback, order fulfillment automation, and advanced pricing/inventory capabilities. v1.0 adds multi-angle branded product imagery with visual placement tools, customer royalty tracking with PDF reporting, and pipeline/operations hardening.

## Domain Expertise

None

## Milestones

- ✅ **v0.1 MVP** -- Phases 1-10 (shipped 2026-01-31)
- ✅ **v0.2 Multi-Brand Operations** -- Phases 11-20 (shipped 2026-02-01)
- ✅ **v1.0 Visual Branding & Business Operations** -- Phases 21-30 (shipped 2026-02-02)
- ✅ **v1.1 Storefront Polish & Operations Dashboard** -- Phases 31-36 (shipped 2026-02-04)
- ✅ **v1.2 Order Fulfillment & Dashboard Redesign** -- Phases 37-42 (shipped 2026-02-04)
- ✅ **v2.0 Pi Appliance** -- Phases 43-59 (shipped 2026-03-09)
- 🚧 **v2.1 Customer Operations** -- Phases 60-64 (in progress)

## Completed Milestones

- ✅ [v0.1 MVP](milestones/v0.1-ROADMAP.md) (Phases 1-10) — SHIPPED 2026-01-31
- ✅ [v0.2 Multi-Brand Operations](milestones/v0.2-ROADMAP.md) (Phases 11-20) — SHIPPED 2026-02-01
- ✅ [v1.0 Visual Branding & Business Operations](milestones/v1.0-ROADMAP.md) (Phases 21-30) — SHIPPED 2026-02-02
- ✅ [v1.1 Storefront Polish & Operations Dashboard](milestones/v1.1-ROADMAP.md) (Phases 31-36) — SHIPPED 2026-02-04
- ✅ [v1.2 Order Fulfillment & Dashboard Redesign](milestones/v1.2-ROADMAP.md) (Phases 37-42) — SHIPPED 2026-02-04
- ✅ [v2.0 Pi Appliance](milestones/v2.0-ROADMAP.md) (Phases 43-59) — SHIPPED 2026-03-10

## Phases

### 🚧 v2.1 Customer Operations (In Progress)

**Milestone Goal:** Connect customers from WIX, communicate order progress via email/SMS, and streamline manual order creation with product selection and production notes.

#### Phase 60: WIX Customer Sync

**Goal**: Pull customer contacts (names, emails, phones) from WIX Contacts API into SQLite database with sync daemon
**Depends on**: Previous milestone complete
**Research**: Likely (WIX Contacts API integration)
**Research topics**: WIX Contacts API endpoints, rate limits, pagination, field mapping
**Plans**: TBD

Plans:
- [ ] 60-01: TBD (run /gsd:plan-phase 60 to break down)

#### Phase 61: Notification System ✅

**Goal**: Email + SMS notifications to customers as orders progress through the pipeline with configurable stage triggers
**Depends on**: Phase 60
**Completed**: 2026-03-10

Plans:
- [x] 61-01: Notification Foundation (migration, types, store)
- [x] 61-02: Email Notification Engine (HTML templates, SMTP sender)
- [x] 61-03: SMS Notification Engine (Twilio integration)
- [x] 61-04: Trigger System & REST API

#### Phase 62: Manual Order Product Picker ✅

**Goal**: Product picker that browses both WIX catalog and vendor catalogs (SanMar/S&S), allowing mix-and-match in manual orders
**Depends on**: Phase 60
**Completed**: 2026-03-10

Plans:
- [x] 62-01: Catalog Search API & ProductPicker Component
- [x] 62-02: OrderCreateForm Integration

#### Phase 63: Manual Order Production Notes ✅

**Goal**: Free-text production notes per line item for decoration/production instructions, integrated into production sheets
**Depends on**: Phase 62
**Completed**: 2026-03-10

Plans:
- [x] 63-01: Production Notes (DB migration, form input, detail view, PDF rendering)

#### Phase 64: Integration & Polish

**Goal**: Cross-feature testing, UI refinement, edge case handling across all v2.1 features
**Depends on**: Phase 63
**Research**: Unlikely (internal testing)
**Plans**: TBD

Plans:
- [ ] 64-01: TBD

<details>
<summary>✅ v2.0 Pi Appliance (Phases 43-59) — SHIPPED 2026-03-10</summary>

- [x] Phase 43: Pi OS Setup & Bootstrap (3/3 plans) — completed 2026-03-07
- [x] Phase 44: Backend Architecture (2/2 plans) — completed 2026-03-07
- [x] Phase 45: Touch UI Foundation (2/2 plans) — completed 2026-03-07
- [x] Phase 46: Product Pipeline — Vendor APIs (4/4 plans) — completed 2026-03-07
- [x] Phase 47: Product Pipeline — Creation UI (4/4 plans) — completed 2026-03-07
- [x] Phase 48: Logo System (3/3 plans) — completed 2026-03-07
- [x] Phase 49: Order Management — Core (4/4 plans) — completed 2026-03-07
- [x] Phase 50: Order Management — Advanced (3/3 plans) — completed 2026-03-07
- [x] Phase 51: Inventory Sync (4/4 plans) — completed 2026-03-07
- [x] Phase 52: Cart Automation (3/3 plans) — completed 2026-03-07
- [x] Phase 53: Customer & Royalty System (3/3 plans) — completed 2026-03-07
- [x] Phase 54: Network Printing (2/2 plans) — completed 2026-03-07
- [x] Phase 55: LAN Web Access (1/1 plans) — completed 2026-03-07
- [x] Phase 56: Appliance Hardening (1/1 plans) — completed 2026-03-07
- [x] Phase 57: Pi E2E Test Automation (7/7 plans) — completed 2026-03-08
- [x] Phase 57.1: Remaining Tab UIs (3/3 plans) — completed 2026-03-08
- [x] Phase 58: Kiosk Touch UI Modernization (6/6 plans) — completed 2026-03-08
- [x] Phase 59: v1.x Feature Parity Audit (5/5 plans) — completed 2026-03-09

</details>

<details>
<summary>✅ v1.2 Order Fulfillment & Dashboard Redesign (Phases 37-42) — SHIPPED 2026-02-04</summary>

- [x] Phase 37: Dashboard Redesign - Tabbed Navigation (2/2 plans) — completed 2026-02-04
- [x] Phase 38: Production Sheet Generator (2/2 plans) — completed 2026-02-04
- [x] Phase 39: S&S Activewear Cart Automation (3/3 plans) — completed 2026-02-04
- [x] Phase 40: Order Status Dashboard (2/2 plans) — completed 2026-02-04
- [x] Phase 41: Bulk Order Actions (2/2 plans) — completed 2026-02-04
- [x] Phase 42: Integration & Polish (2/2 plans) — completed 2026-02-04

</details>

<details>
<summary>✅ v1.1 Storefront Polish & Operations Dashboard (Phases 31-36) — SHIPPED 2026-02-04</summary>

- [x] Phase 31: Stock Visibility (3/3 plans) -- completed 2026-02-03
- [x] Phase 32: Variant Image Switching (1/1 plans) -- completed 2026-02-03
- [x] Phase 33: Side-View Image Investigation & Fix (1/1 plans) -- completed 2026-02-03
- [x] Phase 34: Operations Dashboard Foundation (2/2 plans) -- completed 2026-02-04
- [x] Phase 35: Product Pipeline Wizard (3/3 plans) -- completed 2026-02-04
- [x] Phase 36: Product Migration Tooling (2/2 plans) -- completed 2026-02-04

</details>

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
Phases execute in numeric order: 60 → 61 → 62 → 63 → 64

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
| 32. Variant Image Switching | v1.1 | 1/1 | Complete | 2026-02-03 |
| 33. Side-View Image Investigation & Fix | v1.1 | 1/1 | Complete | 2026-02-03 |
| 34. Operations Dashboard Foundation | v1.1 | 2/2 | Complete | 2026-02-04 |
| 35. Product Pipeline Wizard | v1.1 | 3/3 | Complete | 2026-02-04 |
| 36. Product Migration Tooling | v1.1 | 2/2 | Complete | 2026-02-04 |
| 37. Dashboard Redesign - Tabbed Navigation | v1.2 | 2/2 | Complete | 2026-02-04 |
| 38. Production Sheet Generator | v1.2 | 2/2 | Complete | 2026-02-04 |
| 39. S&S Activewear Cart Automation | v1.2 | 3/3 | Complete | 2026-02-04 |
| 40. Order Status Dashboard | v1.2 | 2/2 | Complete | 2026-02-04 |
| 41. Bulk Order Actions | v1.2 | 2/2 | Complete | 2026-02-04 |
| 42. Integration & Polish | v1.2 | 2/2 | Complete | 2026-02-04 |
| 43. Pi OS Setup & Bootstrap | v2.0 | 3/3 | Complete | 2026-03-07 |
| 44. Backend Architecture | v2.0 | 2/2 | Complete | 2026-03-07 |
| 45. Touch UI Foundation | v2.0 | 2/2 | Complete | 2026-03-07 |
| 46. Product Pipeline — Vendor APIs | v2.0 | 4/4 | Complete | 2026-03-07 |
| 47. Product Pipeline — Creation UI | v2.0 | 4/4 | Complete | 2026-03-07 |
| 48. Logo System | v2.0 | 3/3 | Complete | 2026-03-07 |
| 49. Order Management — Core | v2.0 | 4/4 | Complete | 2026-03-07 |
| 50. Order Management — Advanced | v2.0 | 3/3 | Complete | 2026-03-07 |
| 51. Inventory Sync | v2.0 | 4/4 | Complete | 2026-03-07 |
| 52. Cart Automation | v2.0 | 3/3 | Complete | 2026-03-07 |
| 53. Customer & Royalty System | v2.0 | 3/3 | Complete | 2026-03-07 |
| 54. Network Printing | v2.0 | 2/2 | Complete | 2026-03-07 |
| 55. LAN Web Access | v2.0 | 1/1 | Complete | 2026-03-07 |
| 56. Appliance Hardening | v2.0 | 1/1 | Complete | 2026-03-07 |
| 57. Pi E2E Test Automation | v2.0 | 7/7 | Complete | 2026-03-08 |
| 57.1. Remaining Tab UIs | v2.0 | 3/3 | Complete | 2026-03-08 |
| 58. Kiosk Touch UI Modernization | v2.0 | 6/6 | Complete | 2026-03-08 |
| 59. v1.x Feature Parity Audit | v2.0 | 5/5 | Complete | 2026-03-09 |
| 60. WIX Customer Sync | v2.1 | 2/2 | Complete | 2026-03-10 |
| 61. Notification System | v2.1 | 4/4 | Complete | 2026-03-10 |
| 62. Manual Order Product Picker | v2.1 | 2/2 | Complete | 2026-03-10 |
| 63. Manual Order Production Notes | v2.1 | 1/1 | Complete | 2026-03-10 |
| 64. Integration & Polish | v2.1 | 0/? | Not started | - |
