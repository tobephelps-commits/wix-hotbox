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

## Completed Milestones

- ✅ [v0.1 MVP](milestones/v0.1-ROADMAP.md) (Phases 1-10) — SHIPPED 2026-01-31
- ✅ [v0.2 Multi-Brand Operations](milestones/v0.2-ROADMAP.md) (Phases 11-20) — SHIPPED 2026-02-01
- ✅ [v1.0 Visual Branding & Business Operations](milestones/v1.0-ROADMAP.md) (Phases 21-30) — SHIPPED 2026-02-02
- ✅ [v1.1 Storefront Polish & Operations Dashboard](milestones/v1.1-ROADMAP.md) (Phases 31-36) — SHIPPED 2026-02-04
- ✅ [v1.2 Order Fulfillment & Dashboard Redesign](milestones/v1.2-ROADMAP.md) (Phases 37-42) — SHIPPED 2026-02-04

## Phases

### ✅ v2.0 Pi Appliance (Shipped 2026-03-09)

**Milestone Goal:** Full ground-up rewrite of HotBox as a self-contained Raspberry Pi 5 production appliance with touch-first UI, LAN access, and network printing

#### Phase 43: Pi OS Setup & Bootstrap
**Goal**: Select and configure optimal OS for Pi 5, headless bootstrap, kiosk mode Chromium, auto-start on boot, systemd services, resilient to power cycles
**Depends on**: Previous milestone complete
**Research**: Likely (new hardware platform, kiosk mode config, systemd services)
**Research topics**: Pi OS Lite vs Desktop, Chromium kiosk setup, systemd service patterns, boot resilience
**Plans**: TBD

Plans:
- [ ] 43-01: TBD (run /gsd:plan-phase 43 to break down)

#### Phase 44: Backend Architecture
**Goal**: Node.js/TypeScript server foundation, API structure, database selection, configuration management
**Depends on**: Phase 43
**Research**: Likely (architectural decisions — framework, database, project structure)
**Research topics**: Express vs Fastify on ARM64, SQLite vs PostgreSQL on Pi, project scaffolding
**Plans**: TBD

Plans:
- [ ] 44-01: TBD

#### Phase 45: Touch UI Foundation
**Goal**: Frontend framework setup, layout shell, sidebar navigation, touch interaction patterns for 15.6" display
**Depends on**: Phase 44
**Research**: Likely (frontend framework choice, touch interaction patterns)
**Research topics**: React vs SvelteKit for touch-first Pi kiosk, touch gesture libraries, on-screen keyboard
**Plans**: TBD

Plans:
- [ ] 45-01: TBD

#### Phase 46: Product Pipeline — Vendor APIs
**Goal**: Port SanMar + S&S Activewear API clients with product data fetching
**Depends on**: Phase 44
**Research**: Unlikely (porting existing vendor adapter patterns)
**Plans**: TBD

Plans:
- [ ] 46-01: TBD

#### Phase 47: Product Pipeline — Creation UI
**Goal**: Port style lookup, preview, pricing, variant selection, and WIX publish flow with touch-optimized UI
**Depends on**: Phase 45, Phase 46
**Research**: Unlikely (porting existing pipeline UI patterns)
**Plans**: TBD

Plans:
- [ ] 47-01: TBD

#### Phase 48: Logo System
**Goal**: Port logo upload/management, multi-angle overlay compositing, and visual drag-and-drop placement editor
**Depends on**: Phase 45, Phase 46
**Research**: Unlikely (porting existing logo system patterns)
**Plans**: TBD

Plans:
- [ ] 48-01: TBD

#### Phase 49: Order Management — Core
**Goal**: Port WIX order sync, lifecycle tracking, and status transitions
**Depends on**: Phase 44
**Research**: Unlikely (porting existing order management patterns)
**Plans**: TBD

Plans:
- [ ] 49-01: TBD

#### Phase 50: Order Management — Advanced
**Goal**: Port pipeline visualization, bulk operations, and production sheet generation with touch-optimized UI
**Depends on**: Phase 45, Phase 49
**Research**: Unlikely (porting existing advanced order management patterns)
**Plans**: TBD

Plans:
- [ ] 50-01: TBD

#### Phase 51: Inventory Sync
**Goal**: Port priority-based polling daemon, multi-warehouse stock tracking, per-product thresholds, WIX sync, and email alerts
**Depends on**: Phase 44, Phase 46
**Research**: Unlikely (porting existing inventory sync patterns)
**Plans**: TBD

Plans:
- [ ] 51-01: TBD

#### Phase 52: Cart Automation
**Goal**: Port SanMar + S&S Activewear browser-based cart filling with Playwright
**Depends on**: Phase 44, Phase 49
**Research**: Unlikely (porting existing Playwright cart automation patterns)
**Plans**: TBD

Plans:
- [ ] 52-01: TBD

#### Phase 53: Customer & Royalty System
**Goal**: Port B2B customer accounts, markup pricing, royalty calculation, and PDF statement generation
**Depends on**: Phase 44, Phase 49
**Research**: Unlikely (porting existing customer/royalty patterns)
**Plans**: TBD

Plans:
- [ ] 53-01: TBD

#### Phase 54: Network Printing
**Goal**: LAN printer discovery, PDF print jobs for invoices/labels/production sheets to network printers
**Depends on**: Phase 50, Phase 53
**Research**: Likely (LAN printer discovery, print protocols on Pi)
**Research topics**: CUPS on Pi, IPP protocol, network printer auto-discovery, PDF-to-printer pipelines
**Plans**: TBD

Plans:
- [ ] 54-01: TBD

#### Phase 55: LAN Web Access
**Goal**: Serve touch UI over local network, accessible from laptops/phones on the same LAN
**Depends on**: Phase 45
**Research**: Unlikely (standard web server serving to LAN)
**Plans**: TBD

Plans:
- [ ] 55-01: TBD

#### Phase 56: Appliance Hardening
**Goal**: Auto-start services, graceful shutdown, power cycle resilience, health monitoring, log rotation
**Depends on**: Phase 43, Phase 44
**Research**: Likely (boot resilience, watchdog, health monitoring on Pi hardware)
**Research topics**: systemd watchdog, journald log rotation, graceful shutdown hooks, filesystem integrity
**Plans**: TBD

Plans:
- [ ] 56-01: TBD

#### Phase 57: Pi Appliance E2E Test Automation
**Goal**: Comprehensive automated end-to-end testing of all UI interfaces and API functions on the live Raspberry Pi appliance using Playwright/Puppeteer, with iterative multi-pass execution to catch intermittent failures
**Depends on**: Phase 56
**Research**: Likely (Playwright on ARM64/Pi, headless vs headed testing on kiosk, touch event simulation)
**Research topics**: Playwright ARM64 support, Puppeteer on Pi 5, touch event automation, iterative test runners, network printer mock strategies
**Plans**: TBD

Plans:
- [ ] 57-01: TBD (run /gsd:plan-phase 57 to break down)

#### Phase 57.1: Remaining Tab UIs (INSERTED)
**Goal**: Build inventory monitoring, customer management, and system health tab UIs to replace placeholder screens. All backend APIs exist — need frontend React components wired into ContentArea.tsx.
**Depends on**: Phase 57
**Research**: No (APIs fully explored, existing tab patterns in Products/Orders to follow)
**Plans**: 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 57.1 to break down)

**Details:**
ContentArea.tsx currently shows "Coming in Phase XX" placeholders for inventory, customers, and system tabs. The backend APIs are complete:
- Inventory: /api/monitor/* (tracked products, alerts, polling, snapshots)
- Customers: /api/customers/* (CRUD, pricing calc, royalty reports/PDFs)
- System: /api/system, /api/health, /api/printing/*, /api/sync/health

#### Phase 58: Kiosk Touch UI Modernization
**Goal**: Redesign entire UI for 15.6" touchscreen kiosk — rounded corners, larger touch targets (56px+ buttons), bigger text, push-button-friendly navigation, smooth transitions. Use frontend-design skill for production-grade, distinctive interface quality.
**Depends on**: Phase 57.1
**Research**: No (existing UI components to restyle, no new APIs)
**Plans**: 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 58 to break down)

**Details:**
Current UI was built for functional completeness, not touch-first ergonomics. This phase modernizes every surface for comfortable finger operation on a 15.6" 1920x1080 touchscreen:
- Global design tokens: rounded corners (12-16px), generous padding, larger font sizes
- Sidebar: bigger icons and labels, wider touch targets, active state with rounded highlight
- Cards/panels: rounded surfaces with soft shadows, comfortable spacing
- Buttons: minimum 48x48px touch targets, clear visual hierarchy, press feedback
- Tables/lists: larger row heights, touch-friendly selection, swipe-friendly scrolling
- Forms/inputs: oversized input fields, large dropdowns, prominent action buttons
- Modals/dialogs: centered with backdrop blur, large close targets
- Typography: minimum 16px body, 20px+ headings, high contrast
- Transitions: smooth 200ms ease for state changes, touch ripple effects

#### Phase 59: v1.x Feature Parity Audit & Remediation
**Goal**: Systematically compare all v1.x desktop application functionality against the v2.0 Pi appliance, identify every missing feature/UI element, and build out the gaps to achieve full feature parity. Critical missing items include: manual order creation form, shipping label generation/printing, royalty calculation & reporting UI, cart automation UI, batch product creation UI, and complete inventory/customers tab wiring.
**Depends on**: Phase 58
**Research**: No (auditing existing codebase, all APIs already built)
**Plans**: 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 59 to break down)

**Details:**
The v2.0 Pi rewrite ported all backend APIs but several user-facing features are missing from the touch UI. Key gaps identified:

**HIGH PRIORITY (blocking daily operations):**
- Manual order creation — API exists (POST /api/orders) but no button or form in Orders tab
- Shipping label PDF — not ported from v1.x, no print button in order detail
- Royalty calculation & PDF reporting — types ported but engine, API routes, and UI missing
- Cart automation UI — consolidation API ready but no Playwright automation or trigger UI

**MEDIUM PRIORITY (reducing operator efficiency):**
- Batch product creation UI — SSE progress logic ported but no multi-product form
- Product migration browser — discover/import existing WIX products
- Inventory sync daemon wiring — core logic exists, needs systemd integration and dashboard controls
- Logo upload UI in Logo Manager — API ready, drag-and-drop upload missing

**LOW PRIORITY (v1.x CLI-only features):**
- Margin/profit reports
- Sale pricing management

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
Phases execute in numeric order: 43 → 44 → 45 → 46 → 47 → 48 → 49 → 50 → 51 → 52 → 53 → 54 → 55 → 56 → 57 → 57.1 → 58 → 59

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
| 43. Pi OS Setup & Bootstrap | v2.0 | 0/? | Not started | - |
| 44. Backend Architecture | v2.0 | 0/? | Not started | - |
| 45. Touch UI Foundation | v2.0 | 0/? | Not started | - |
| 46. Product Pipeline — Vendor APIs | v2.0 | 0/? | Not started | - |
| 47. Product Pipeline — Creation UI | v2.0 | 0/? | Not started | - |
| 48. Logo System | v2.0 | 0/? | Not started | - |
| 49. Order Management — Core | v2.0 | 0/? | Not started | - |
| 50. Order Management — Advanced | v2.0 | 0/? | Not started | - |
| 51. Inventory Sync | v2.0 | 0/? | Not started | - |
| 52. Cart Automation | v2.0 | 0/? | Not started | - |
| 53. Customer & Royalty System | v2.0 | 0/? | Not started | - |
| 54. Network Printing | v2.0 | 0/? | Not started | - |
| 55. LAN Web Access | v2.0 | 0/? | Not started | - |
| 56. Appliance Hardening | v2.0 | 0/? | Not started | - |
| 57. Pi E2E Test Automation | v2.0 | 0/? | Not started | - |
| 57.1. Remaining Tab UIs | v2.0 | 0/? | Not started | - |
| 58. Kiosk Touch UI Modernization | v2.0 | 0/? | Not started | - |
| 59. v1.x Feature Parity Audit | v2.0 | 5/5 | Complete | 2026-03-09 |
