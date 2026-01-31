# HotBox Clothing Store Enhancement

## What This Is

A productivity and conversion system for HotBox Clothing (hotboxclothing.shop), a custom apparel brand selling decorated SanMar blanks on WIX. The project connects SanMar's wholesale catalog to WIX via automated pipeline, streamlines product creation from blank garment to published listing with visual curation and flexible pricing, improves storefront UX for better conversion, and monitors SanMar stock levels with automated WIX product visibility sync and email alerts.

## Core Value

Effortless product creation — enter a SanMar style number and get a draft WIX product with pricing, variants, and images ready for review. Eliminating manual copy-paste is the single biggest productivity unlock.

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

### Active

- [ ] Execute 32 pending WIX Editor manual fixes (navigation, mobile, gallery, checkout)
- [ ] Enable abandoned cart recovery emails (highest-ROI conversion optimization)
- [ ] Configure variant image switching (mockup upload + gallery-variant linking in WIX Editor)

### Out of Scope

- Automatic purchase orders / auto-reordering from SanMar — too risky, notify only
- Multi-supplier support — SanMar only
- Platform migration — must stay on WIX
- Print-on-demand integration — decoration workflow is handled externally
- Custom design tool / mockup generator — uses existing mockup tools, not building one
- Mockup-based product imagery in creation workflow — pipeline uses SanMar media; mockups are applied separately by owner

## Context

Shipped v0.1 with 10,174 LOC TypeScript/HTML across 43 code files.
Tech stack: Node.js 18+, TypeScript (ESM/NodeNext), SOAP (SanMar API), REST (WIX V1 API), Nodemailer (SMTP).
Pipeline tools: SanMar API client, product mapper, preview server (localhost:3456), WIX product creator, inventory monitor, stock sync poller.
Store has 105 products across 10 collections. 32 WIX Editor manual fixes pending for store owner.
SanMar API credentials active and all endpoints verified.

## Constraints

- **Platform**: WIX only — no migration, all work within WIX ecosystem
- **SanMar API**: Credentials active and verified — all endpoints operational
- **Tooling**: WIX MCP (Docker) for site management, SanMar API for product/inventory data
- **Stock tracking**: SanMar blank availability only — not tracking decorated/finished inventory
- **WIX Editor**: Mobile layout, navigation menus, page content, and gallery-variant linking require WIX Editor (no REST API)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| UX improvements first, then SanMar integration | Store is live and losing conversions; SanMar API setup can happen in parallel | ✓ Good — UX issues documented and critical fixes applied while API client built in parallel |
| Draft-first product publishing | Owner wants to review/customize before products go live | ✓ Good — enforced at type level (visible: false), preview server enables visual curation |
| Variable pricing by product type | Different categories warrant different markup strategies | ✓ Good — 7 presets cover all product types, size upcharges handle extended sizes |
| Mockup images, not SanMar photos | Products are custom decorated — SanMar blank photos don't represent the finished product | ✓ Good — pipeline fetches SanMar media for reference; owner replaces with mockups post-creation |
| SanMar stock monitoring only | Decorated inventory tracked externally; SanMar blank availability is the supply chain signal | ✓ Good — monitor tracks blank stock, sync hides OOS variants, email alerts notify owner |
| ESM module system with NodeNext resolution | Modern TypeScript setup, native ES modules | ✓ Good — clean imports, .js extensions in TS |
| Pure-function pricing engine | No API dependencies, testable, composable | ✓ Good — preview UI and CLI both use same functions |
| Nodemailer for SMTP notifications | Zero external service dependencies, works with any SMTP provider | ✓ Good — simple setup, env-var config |
| Visibility-only variant sync | Preserve price/SKU/weight, change only visible field | ✓ Good — non-destructive, owner's customizations preserved |

---
*Last updated: 2026-01-31 after v0.1 milestone*
