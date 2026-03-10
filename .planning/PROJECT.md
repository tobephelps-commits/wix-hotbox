# HotBox Clothing Store Enhancement

## What This Is

A self-contained Raspberry Pi 5 production appliance for HotBox Clothing (hotboxclothing.shop), a custom apparel brand selling decorated blanks on WIX. The Pi appliance runs a Fastify + SQLite backend with Vite/React touch-first frontend, accessible via 15.6" touchscreen kiosk and LAN web browser. The system connects multiple wholesale vendors (SanMar, S&S Activewear) to WIX via automated pipeline, streamlines product creation with template presets and logo overlay compositing, manages orders with invoice/label/production sheet PDF generation and dual-vendor cart automation, tracks B2B customer royalties with branded PDF statements, monitors multi-warehouse inventory with priority-based polling and email alerts, and prints to network printers via CUPS/IPP. Discoverable on LAN via mDNS (hotbox.local), resilient to power cycles via systemd watchdog and boot hardening.

## Core Value

Effortless product creation — enter a style number from any supported vendor and get a draft WIX product with pricing, variants, and images ready for review. Eliminating manual copy-paste is the single biggest productivity unlock.

## Requirements

### Validated

- ✓ Connect to WIX store via MCP and audit current site structure, navigation, and UX — v0.1
- ✓ Improve product discovery and navigation (filtering, categorization, search) — v0.1
- ✓ Optimize mobile shopping experience (50% of traffic is mobile) — v0.1 (WIX Editor guides created, 32 manual fixes documented)
- ✓ Reduce checkout friction and cart abandonment — v0.1 (5 policies configured, size guides added, 7 remaining manual fixes documented)
- ✓ Build SanMar API client for product data, pricing, and inventory queries — v0.1
- ✓ Create product creation pipeline: SanMar style number → configured WIX product draft — v0.1
- ✓ Support per-product variant curation (colors/sizes selection per product) — v0.1
- ✓ Implement variable pricing logic by product type with markup rules — v0.1 (7 category presets)
- ✓ Build SanMar blank inventory monitoring with low-stock and out-of-stock alerts — v0.1
- ✓ Automated WIX product status updates based on SanMar stock levels — v0.1
- ✓ Notification system for stock alerts — v0.1 (Nodemailer SMTP email)
- ✓ Triage WIX Editor manual fixes and build site verification script — v0.2 (30 fixes tracked, Playwright verification)
- ✓ Multi-collection product routing in creation pipeline — v0.2
- ✓ Reusable template presets for product creation — v0.2 (template CRUD, CLI and API integration)
- ✓ Logo overlay compositing on product images — v0.2 (Sharp-based engine with position presets)
- ✓ Cost tracking and margin analysis per product — v0.2 (decoration cost, margin dashboard)
- ✓ Sale/promo pricing engine with WIX sync — v0.2 (percent/fixed/override discounts, coupon API)
- ✓ Real-time multi-warehouse inventory monitoring — v0.2 (priority-based polling, warehouse breakdown)
- ✓ Secondary vendor support (S&S Activewear) — v0.2 (vendor adapter abstraction, unified types)
- ✓ Order management with WIX sync and lifecycle tracking — v0.2 (order store, management CLI, dashboard)
- ✓ Invoice and shipping label PDF generation with printing — v0.2 (PDFKit, cross-platform print)
- ✓ SanMar cart automation for order fulfillment — v0.2 (Playwright browser automation)
- ✓ Operational documentation and smoke test validation — v0.2 (29/29 checks, OPERATIONS.md runbook)
- ✓ Multi-angle product images (front, back, left) from vendor APIs — v1.0
- ✓ Visual logo placement with drag-and-drop WYSIWYG editor — v1.0
- ✓ Logo upload and management facility — v1.0
- ✓ Customer account system with B2B markup pricing — v1.0
- ✓ Royalty calculation and branded PDF statement generation — v1.0
- ✓ Batch product creation with live SSE progress streaming — v1.0
- ✓ Pipeline preferences persistence (localStorage + server backup) — v1.0
- ✓ Order management hardening (error tracking, retry, on-hold status) — v1.0
- ✓ Inventory sync reliability (per-product thresholds, staleness detection, mapping audit) — v1.0
- ✓ End-to-end v1.0 integration testing and operational documentation — v1.0 (34/34 checks, OPERATIONS.md v3.0)
- ✓ Stock visibility for out-of-stock variants — v1.1 (WIX Inventory V2 API, shows "Out of Stock" instead of hiding)
- ✓ Variant image switching documentation — v1.1 (API verified, WIX Editor config guide created)
- ✓ Side-view image fix for SanMar products — v1.1 (sideImage set to null, prevents incorrect sleeve logo placement)
- ✓ Operations Dashboard with daemon controls — v1.1 (Start/Stop buttons, health metrics cards)
- ✓ Step-by-step Product Pipeline Wizard — v1.1 (5-step flow with visual variant selection)
- ✓ Product Migration tooling for existing WIX products — v1.1 (browser + wizard integration)
- ✓ Dashboard tabbed navigation — v1.2 (sidebar with Products/Orders/Inventory/Customers tabs, localStorage persistence)
- ✓ Production sheet PDF generation — v1.2 (per-order garment specs, logo placement, quantity breakdown)
- ✓ S&S Activewear cart automation — v1.2 (browser automation, CLI, dashboard modal)
- ✓ Order pipeline visualization — v1.2 (kanban stages, aging indicators, attention badges)
- ✓ Bulk order operations — v1.2 (multi-select, batch status, batch production sheets, ZIP download)
- ✓ Raspberry Pi 5 appliance with Pi OS Lite, headless bootstrap, Chromium kiosk mode — v2.0
- ✓ Fastify + SQLite backend architecture with WAL mode, migration system, plugin architecture — v2.0
- ✓ Vite + React touch-first frontend with sidebar navigation, CSS design tokens — v2.0
- ✓ Full vendor pipeline port (SanMar SOAP + S&S REST) with unified product types — v2.0
- ✓ Logo system port: upload, multi-angle overlay compositing, drag-and-drop placement editor — v2.0
- ✓ Order management port: WIX sync, lifecycle, invoice/label/production sheet PDFs, pipeline UI, bulk ops — v2.0
- ✓ Inventory sync port: priority polling daemon, multi-warehouse tracking, WIX stock sync, email alerts — v2.0
- ✓ Cart automation port: vendor-agnostic consolidator, Playwright automation for SanMar + S&S — v2.0
- ✓ Customer & royalty system port: B2B accounts, markup pricing, royalty calculation, PDF statements — v2.0
- ✓ Network printing via CUPS/IPP with auto-discovery — v2.0
- ✓ mDNS LAN discovery (hotbox.local) for browser access from any device — v2.0
- ✓ Appliance hardening: systemd watchdog, graceful shutdown, health monitoring, log rotation — v2.0
- ✓ Comprehensive Playwright E2E test automation on live Pi — v2.0
- ✓ Touch UI modernization: 48px+ targets, rounded corners, design tokens, smooth transitions — v2.0
- ✓ Full v1.x feature parity: manual orders, shipping labels, cart automation UI, batch creation — v2.0

### Active

- [ ] Execute 30 pending WIX Editor manual fixes (navigation, mobile, gallery, checkout)
- [ ] Enable abandoned cart recovery emails (highest-ROI conversion optimization)

### Out of Scope

- Automatic purchase orders / auto-reordering from vendors — too risky, notify only
- Platform migration — must stay on WIX
- Print-on-demand integration — decoration workflow is handled externally
- Custom design tool / mockup generator — uses existing mockup tools, not building one
- Mockup-based product imagery in creation workflow — pipeline uses vendor media; mockups are applied separately by owner
- Offline mode — real-time sync is core to inventory monitoring

## Context

Shipped v2.0 Pi Appliance with ~37,459 LOC TypeScript/TSX/CSS across 324 files (20,894 backend, 16,565 frontend).
Tech stack: Raspberry Pi 5 (ARM64), Pi OS Lite 64-bit Bookworm, Node.js 20 LTS, TypeScript (ESM/NodeNext), Fastify (HTTP server), better-sqlite3 (SQLite with WAL mode), Vite + React (frontend), SOAP (SanMar API), REST (WIX V1 API, WIX Inventory V2 API, S&S Activewear API), Nodemailer (SMTP), Sharp (image compositing), PDFKit (PDF generation), Playwright (browser automation, E2E testing), CUPS/IPP (network printing), mDNS/Avahi (LAN discovery), systemd (service management, watchdog).
Backend modules: pipeline (product creation, vendor adapters, WIX publish), orders (WIX sync, lifecycle, PDFs, cart automation), inventory (polling daemon, stock sync, alerts), customers (B2B accounts, royalties, pricing), logos (upload, overlay compositing, placement), printing (CUPS/IPP discovery, PDF print jobs), system (health, config, network info).
Frontend: React SPA with sidebar navigation, 6 tabs (Products, Orders, Inventory, Customers, System, Logos), touch-optimized with CSS design tokens, 48px+ touch targets, rounded corners, smooth transitions.
Accessible via Chromium kiosk on 15.6" touchscreen and LAN browser at hotbox.local:3000.
Store has 105 products across 10 collections. 30 WIX Editor manual fixes pending for store owner.

## Constraints

- **Platform**: WIX only — no migration, all work within WIX ecosystem
- **Vendor APIs**: SanMar (SOAP) and S&S Activewear (REST) credentials required
- **Tooling**: WIX MCP (Docker) for site management, vendor APIs for product/inventory data
- **Stock tracking**: Vendor blank availability only — not tracking decorated/finished inventory
- **WIX Editor**: Mobile layout, navigation menus, page content, and gallery-variant linking require WIX Editor (no REST API)
- **SanMar.com cart**: Browser automation dependent on SanMar.com DOM structure; may need selector updates

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| UX improvements first, then SanMar integration | Store is live and losing conversions; SanMar API setup can happen in parallel | ✓ Good — UX issues documented and critical fixes applied while API client built in parallel |
| Draft-first product publishing | Owner wants to review/customize before products go live | ✓ Good — enforced at type level (visible: false), preview server enables visual curation |
| Variable pricing by product type | Different categories warrant different markup strategies | ✓ Good — 7 presets cover all product types, size upcharges handle extended sizes |
| Mockup images, not SanMar photos | Products are custom decorated — SanMar blank photos don't represent the finished product | ✓ Good — pipeline fetches vendor media for reference; owner replaces with mockups post-creation |
| SanMar stock monitoring only (v0.1) | Decorated inventory tracked externally; vendor blank availability is the supply chain signal | ✓ Good — expanded in v0.2 to multi-vendor with priority-based polling |
| ESM module system with NodeNext resolution | Modern TypeScript setup, native ES modules | ✓ Good — clean imports, .js extensions in TS |
| Pure-function pricing engine | No API dependencies, testable, composable | ✓ Good — preview UI and CLI both use same functions |
| Nodemailer for SMTP notifications | Zero external service dependencies, works with any SMTP provider | ✓ Good — simple setup, env-var config |
| Visibility-only variant sync | Preserve price/SKU/weight, change only visible field | ✓ Good — non-destructive, owner's customizations preserved |
| VendorAdapter interface with SanMar direct path preserved | Zero regression risk for existing SanMar workflow; new vendors use adapter | ✓ Good — S&S integrated cleanly, SanMar unchanged |
| Local-first order store with WIX sync | Works offline, preserves local status advancement | ✓ Good — WIX sync additive, manual orders supported |
| Playwright browser automation for SanMar cart | Direct API cart not available; browser automation with headed checkout handoff | ✓ Good — preview-before-execute prevents accidental fills |
| Priority-based inventory polling | Hot/normal/slow tiers balance API load with freshness needs | ✓ Good — single tick-based daemon, configurable priorities |
| Auth helpers duplicated per module | Avoid modifying wix-api.ts private internals for orders/coupons | ⚠️ Revisit — consider extracting shared auth module if adding more WIX API consumers |
| All UI in single preview.html | Consistent pattern, single-file deployment | ⚠️ Revisit — file now ~7000+ lines; splitting recommended if adding more features |
| WIX Inventory V2 API for stock visibility | Native inventory tracking shows "Out of Stock" instead of hiding variants | ✓ Good — better customer UX, preserves variant visibility |
| sideImage null for SanMar products | CLASS_TYPE_HIGH is front/lifestyle shot, not side view | ✓ Good — prevents incorrect sleeve logo placement |
| AbortSignal for daemon control | Graceful shutdown allows current tick to complete | ✓ Good — no data loss on stop |
| 5-step wizard flow with validation | Each step validates before advancing | ✓ Good — prevents incomplete product creation |
| 200px sidebar with dark theme | Matches header design, sufficient for icon + label | ✓ Good — consistent visual design |
| localStorage for tab persistence | Fast local reads, survives session | ✓ Good — immediate tab restoration on reload |
| Production sheet line items by vendorStyle | Consolidated product sections for production clarity | ✓ Good — easier scanning for decoration staff |
| Multi-strategy selectors for S&S cart | Fallback patterns handle site variations | ✓ Good — resilient to S&S.com DOM changes |
| Aging thresholds per stage | Operational visibility for orders needing attention | ✓ Good — actionable attention bar |
| Partial failure for bulk operations | One invalid order doesn't block the rest | ✓ Good — better UX for batch processing |
| Sticky toolbar at bottom | Visible during scroll, doesn't obscure orders | ✓ Good — accessible bulk actions |
| Pi OS Lite 64-bit (no desktop) | Lighter, faster boot, fewer attack surfaces | ✓ Good — ARM64 for Node.js 20+, minimal footprint |
| Fastify over Express | Better TypeScript support, plugin architecture, schema validation | ✓ Good — clean decorator pattern, type-safe routes |
| SQLite with WAL mode | Single-file database, zero setup, optimal for single-user appliance | ✓ Good — no PostgreSQL overhead, better-sqlite3 sync API |
| Vite + React frontend | Fast HMR, modern build tooling, component-based UI | ✓ Good — replaced monolithic preview.html with proper SPA |
| setDataDir/setConfig init patterns | Decouple modules from config imports, pure functions | ✓ Good — testable, no module-level state |
| CSS custom properties for design tokens | Single source of truth for touch-optimized theme | ✓ Good — consistent 48px+ targets, rounded corners throughout |
| mDNS for LAN discovery | hotbox.local accessible without IP address lookup | ✓ Good — zero-config LAN access from any device |
| Unified vendor cart consolidator | Single vendor-agnostic module replaces separate SanMar/S&S cart modules | ✓ Good — less duplication, CartItem includes vendor field |
| systemd watchdog + graceful shutdown | Quick recovery without false resets, clean database close | ✓ Good — 15s timeout, power cycle resilient |

---
*Last updated: 2026-03-10 after v2.0 milestone*
