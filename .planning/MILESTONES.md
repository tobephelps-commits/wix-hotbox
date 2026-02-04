# Project Milestones: HotBox Clothing Store Enhancement

## v1.1 Storefront Polish & Operations Dashboard (Shipped: 2026-02-04)

**Delivered:** Stock visibility for out-of-stock variants, variant image switching documentation, side-view image fix, Operations Dashboard with daemon controls, step-by-step Pipeline Wizard, and Product Migration tooling for existing WIX products.

**Phases completed:** 31-36 (12 plans total)

**Key accomplishments:**

- Integrated WIX Inventory V2 API to show "Out of Stock" for unavailable color/size combinations instead of hiding them
- Verified and documented variant image switching with WIX Editor configuration guide
- Fixed incorrect side-view image assignment in SanMar mapper preventing wrong sleeve logo placements
- Built Operations Dashboard with daemon Start/Stop controls and real-time health metrics (orders, inventory, daemon status, errors)
- Created 5-step Product Pipeline Wizard with visual variant selection, live pricing preview, and optional logo configuration
- Added Product Migration tooling to browse existing WIX products and migrate untracked ones through the wizard

**Stats:**

- 43 files created/modified
- ~9,140 net new lines of TypeScript/HTML
- 6 phases, 12 plans
- 2 days (2026-02-03 to 2026-02-04)

**Git range:** `fc40d39` to `c5835a9` (57 commits)

**What's next:** Store owner uses Pipeline Wizard for new products, Migration tooling for existing products, and Operations Dashboard for monitoring. 30 WIX Editor manual fixes still pending.

---

## v1.0 Visual Branding & Business Operations (Shipped: 2026-02-02)

**Delivered:** Multi-angle branded product imagery with visual drag-and-drop placement, customer account system with B2B royalty tracking and PDF statements, batch product creation, and pipeline/operations hardening across order management and inventory sync.

**Phases completed:** 21-30 (24 plans total)

**Key accomplishments:**

- Extended product pipeline with multi-angle images (front, back, left) from vendor APIs and per-angle logo overlay compositing
- Built drag-and-drop WYSIWYG logo placement editor with alignment guides, keyboard fine-tuning, and per-angle independent positioning
- Created logo upload and management facility with Sharp processing, thumbnail library grid, and inline editing
- Established B2B customer account system with markup pricing, royalty calculation engine, and branded PDF statement generation
- Added batch product creation with SSE progress streaming, pipeline preferences persistence, and 50-item sequential processing
- Hardened order management with error tracking, exponential backoff retry, on-hold status, and inventory sync with per-product thresholds, staleness detection, and mapping audit

**Stats:**

- 92 files created/modified
- ~16,777 net new lines of TypeScript/HTML
- 10 phases, 24 plans
- 1 day (2026-02-02)

**Git range:** `feat(21-01)` to `docs(30-03)` (90 commits)

**What's next:** Project complete. Store owner begins operational use of the full v1.0 system. Remaining active items: 30 WIX Editor manual fixes, abandoned cart recovery emails, variant image switching.

---

## v0.2 Multi-Brand Operations (Shipped: 2026-02-01)

**Delivered:** Multi-vendor product pipeline (SanMar + S&S Activewear), full order management with invoice/label PDFs, SanMar cart automation, profitability tooling with cost tracking and sale/promo pricing, and real-time multi-warehouse inventory monitoring.

**Phases completed:** 11-20 (38 plans total)

**Key accomplishments:**

- Triaged 30 WIX Editor manual fixes and built Playwright site verification script for ongoing progress tracking
- Built vendor adapter abstraction supporting S&S Activewear as secondary supplier alongside SanMar with unified product/inventory types
- Created full order management system: WIX order sync, lifecycle tracking, branded invoice and shipping label PDF generation, and cross-platform printing
- Automated SanMar.com cart filling with Playwright browser automation, preview-before-execute pattern, accessible from CLI, API, and dashboard
- Built profitability tools: cost tracking with margin dashboard, sale/promo engine with WIX price sync, coupon integration, and template preset system
- Upgraded inventory monitoring to real-time with priority-based polling daemon, per-warehouse stock breakdown, and enriched email alerts

**Stats:**

- 157 files created/modified (65 code files)
- ~18,969 net new lines of TypeScript/HTML
- 10 phases, 38 plans
- 4 days (2026-01-29 to 2026-02-01)

**Git range:** `docs(11)` to `docs(20-03)` (128 commits)

**What's next:** Store owner executes 30 pending WIX Editor manual fixes, configures abandoned cart recovery, and begins operational use of the full system.

---

## v0.1 MVP (Shipped: 2026-01-31)

**Delivered:** Complete storefront UX overhaul and automated SanMar-to-WIX product creation pipeline with inventory monitoring, stock sync, and email notifications.

**Phases completed:** 1-10 (34 plans total)

**Key accomplishments:**

- Audited live WIX store identifying 35 UX issues, removed chat widget blocking purchases, and documented all WIX Editor fixes needed
- Built comprehensive SanMar API client covering product data, pricing, inventory, and media with retry logic and error handling
- Created end-to-end product pipeline: enter SanMar style number, preview with pricing controls, publish as WIX draft product
- Implemented flexible pricing engine with 7 category presets, size upcharges, and per-product variant curation
- Built automated inventory monitoring with configurable alert thresholds, transition-only alerting, and stock sync to WIX product visibility
- Created operational runbook documenting 26 npm scripts, 12 environment variables, and 14 error scenarios

**Stats:**

- 142 files created/modified
- 10,174 lines of TypeScript/HTML (scripts/)
- 10 phases, 34 plans, 34 sessions
- 3 days from project start to ship (2026-01-29 to 2026-01-31)

**Git range:** `feat(02-01)` to `docs(10-03)` (117 commits)

**What's next:** Store owner executes 32 pending WIX Editor manual fixes, then evaluate need for v0.2 enhancements.

---
