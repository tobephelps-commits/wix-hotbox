# HotBox Clothing Store Enhancement

## What This Is

A full-stack operations platform for HotBox Clothing (hotboxclothing.shop), a custom apparel brand selling decorated blanks on WIX. The system connects multiple wholesale vendors (SanMar, S&S Activewear) to WIX via automated pipeline, streamlines product creation with template presets and logo overlay compositing, manages orders with invoice/label PDF generation and SanMar cart automation, tracks profitability with cost/margin dashboards and sale/promo tooling, and monitors multi-warehouse inventory with real-time priority-based polling and email alerts. All operations accessible via CLI, REST API, and browser-based preview dashboard.

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

### Active

- [ ] Execute 30 pending WIX Editor manual fixes (navigation, mobile, gallery, checkout)
- [ ] Enable abandoned cart recovery emails (highest-ROI conversion optimization)
- [ ] Configure variant image switching (mockup upload + gallery-variant linking in WIX Editor)

### Out of Scope

- Automatic purchase orders / auto-reordering from vendors — too risky, notify only
- Platform migration — must stay on WIX
- Print-on-demand integration — decoration workflow is handled externally
- Custom design tool / mockup generator — uses existing mockup tools, not building one
- Mockup-based product imagery in creation workflow — pipeline uses vendor media; mockups are applied separately by owner
- Offline mode — real-time sync is core to inventory monitoring

## Context

Shipped v0.2 with ~29,000 LOC TypeScript/HTML across 85 code files.
Tech stack: Node.js 18+, TypeScript (ESM/NodeNext), SOAP (SanMar API), REST (WIX V1 API, S&S Activewear API), Nodemailer (SMTP), Sharp (image compositing), PDFKit (PDF generation), Playwright (browser automation, site verification).
System modules: pipeline (product creation, preview server), sanmar (API client, SOAP), vendors (adapter abstraction), monitor (inventory alerts), sync (stock polling, WIX sync), orders (lifecycle, invoices, labels, cart automation), pricing (cost tracking, margins, sales/promos).
Preview server (localhost:3456) is single-pane-of-glass for product curation, order management, inventory monitoring, profitability analysis, and promotion management.
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
| All UI in single preview.html | Consistent pattern, single-file deployment | ⚠️ Revisit — file growing large; may need splitting for maintainability |

---
*Last updated: 2026-02-01 after v0.2 milestone*
