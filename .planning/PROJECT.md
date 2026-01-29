# HotBox Clothing Store Enhancement

## What This Is

A productivity and conversion system for HotBox Clothing (hotboxclothing.shop), a custom apparel brand selling decorated SanMar blanks on WIX. The project connects SanMar's wholesale catalog to WIX via API, streamlines the product creation pipeline from blank garment to published listing, improves storefront UX for better conversion, and adds automated stock monitoring.

## Core Value

Effortless product creation — enter a SanMar style number and get a draft WIX product with pricing, variants, and images ready for review. Eliminating manual copy-paste is the single biggest productivity unlock.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Connect to WIX store via MCP and audit current site structure, navigation, and UX
- [ ] Improve product discovery and navigation (filtering, categorization, search)
- [ ] Optimize mobile shopping experience (50% of traffic is mobile)
- [ ] Reduce checkout friction and cart abandonment
- [ ] Build SanMar API client for product data, pricing, and inventory queries
- [ ] Create product creation pipeline: SanMar style number → configured WIX product draft
- [ ] Support per-product variant curation (colors/sizes selection per product)
- [ ] Implement variable pricing logic by product type with markup rules
- [ ] Integrate mockup-based product imagery into creation workflow
- [ ] Build SanMar blank inventory monitoring with low-stock and out-of-stock alerts
- [ ] Automated WIX product status updates based on SanMar stock levels
- [ ] Notification system for stock alerts (method TBD)

### Out of Scope

- Automatic purchase orders / auto-reordering from SanMar — too risky for v1, notify only
- Multi-supplier support — SanMar only for v1
- Platform migration — must stay on WIX
- Print-on-demand integration — decoration workflow is handled externally
- Custom design tool / mockup generator — uses existing mockup tools, not building one

## Context

- **Store:** hotboxclothing.shop — active WIX store with 25-100 products
- **Business model:** Custom prints/embroidery on SanMar blank apparel. HotBox is a brand, not a reseller
- **Traffic:** Roughly 50/50 mobile/desktop split
- **Current workflow:** Fully manual — copy/paste product data from SanMar website into WIX editor one at a time
- **Images:** Uses mockup generators to show designs on garment templates, not SanMar product photos
- **SanMar account:** Active wholesale account, API access not yet enabled (contact sanmarintegrations@sanmar.com)
- **WIX MCP:** Docker-based WIX MCP configured and authenticated — ready to use
- **Pain points:** Navigation/discovery poor, mobile experience lacking, checkout has friction
- **Product publishing:** Prefers draft-first workflow — review before going live
- **Variant strategy:** Per-product decision on which colors/sizes to offer (sometimes all, sometimes curated)

## Constraints

- **Platform**: WIX only — no migration, all work within WIX ecosystem
- **SanMar API**: Wholesale account exists but API credentials not yet provisioned — Phase 2 blocked until enabled
- **Tooling**: WIX MCP (Docker) for site management, SanMar API for product/inventory data
- **Stock tracking**: SanMar blank availability only — not tracking decorated/finished inventory

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| UX improvements first, then SanMar integration | Store is live and losing conversions; SanMar API setup can happen in parallel | -- Pending |
| Draft-first product publishing | Owner wants to review/customize before products go live | -- Pending |
| Variable pricing by product type | Different categories warrant different markup strategies | -- Pending |
| Mockup images, not SanMar photos | Products are custom decorated — SanMar blank photos don't represent the finished product | -- Pending |
| SanMar stock monitoring only | Decorated inventory tracked externally; SanMar blank availability is the supply chain signal | -- Pending |

---
*Last updated: 2026-01-29 after initialization*
