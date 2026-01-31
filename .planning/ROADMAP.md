# Roadmap: HotBox Clothing Store Enhancement

## Overview

Transform HotBox Clothing from a manually-managed WIX store into a streamlined operation with optimized storefront UX and automated SanMar product pipeline. The first half focuses on conversion — fixing navigation, mobile experience, and checkout on the live store. The second half builds the SanMar integration that eliminates manual product creation, adds inventory monitoring, and automates stock-level responses.

## Domain Expertise

None

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Site Audit & Discovery** - Audit current WIX store structure, navigation, products, and UX via MCP
- [x] **Phase 2: Navigation & Product Discovery** - Improve filtering, categorization, search, and information architecture
- [x] **Phase 3: Mobile Experience Optimization** - Optimize layouts, touch targets, and flows for 50% mobile traffic
- [x] **Phase 4: Checkout & Conversion Optimization** - Reduce cart abandonment and streamline checkout flow
- [x] **Phase 5: SanMar API Foundation** - Build SanMar API client for product data, pricing, and inventory queries
- [x] **Phase 6: Product Creation Pipeline** - SanMar style number → configured WIX product draft with variants and images
- [x] **Phase 7: Pricing & Variant Logic** - Variable pricing rules by product type + per-product variant curation
- [x] **Phase 8: Inventory Monitoring** - SanMar blank stock monitoring with low-stock and out-of-stock alerts
- [x] **Phase 9: Automated Stock Sync** - WIX product status updates based on SanMar stock levels + notifications
- [ ] **Phase 10: Integration Polish** - End-to-end pipeline testing, edge cases, error handling, and documentation

## Phase Details

### Phase 1: Site Audit & Discovery
**Goal**: Complete picture of current store state — site structure, navigation hierarchy, product catalog, page layouts, and specific UX issues to fix
**Depends on**: Nothing (first phase)
**Research**: Unlikely (WIX MCP already configured and authenticated)
**Plans**: TBD

Plans:
- [x] 01-01: Connect via WIX MCP and map site structure, pages, and navigation
- [x] 01-02: Audit product catalog — categories, variants, images, descriptions
- [x] 01-03: Identify UX issues — navigation gaps, mobile problems, checkout friction points

### Phase 2: Navigation & Product Discovery
**Goal**: Customers can easily find products through improved filtering, categorization, search, and information architecture
**Depends on**: Phase 1
**Research**: Unlikely (WIX site capabilities, applying audit findings)
**Plans**: TBD

Plans:
- [x] 02-01: Restructure product categories and navigation hierarchy
- [x] 02-02: Implement filtering and search improvements
- [x] 02-03: Improve product pages — layout, descriptions, cross-selling
- [x] 02-04: Add search functionality and product filtering/sorting
- [x] 02-05: Add related products / cross-selling and standardize gallery layouts

### Phase 3: Mobile Experience Optimization
**Goal**: Mobile visitors (50% of traffic) get a smooth, conversion-friendly shopping experience
**Depends on**: Phase 2
**Research**: Unlikely (WIX responsive capabilities, internal patterns)
**Plans**: TBD

Plans:
- [x] 03-01: Optimize mobile navigation, menus, and touch targets
- [x] 03-02: Mobile product browsing and detail page improvements
- [x] 03-03: Mobile cart and checkout flow optimization

### Phase 4: Checkout & Conversion Optimization
**Goal**: Reduced cart abandonment through streamlined checkout, trust signals, and friction removal
**Depends on**: Phase 3
**Research**: Unlikely (WIX checkout configuration, established e-commerce patterns)
**Plans**: TBD

Plans:
- [x] 04-01: Configure checkout policies (terms, privacy, return, contact, shipping)
- [x] 04-02: Add brand-specific size guide info sections to all products
- [x] 04-03: Configure shipping, payment, and post-purchase experience

### Phase 5: SanMar API Foundation
**Goal**: Working SanMar API client that can query product data, pricing, and inventory
**Depends on**: Nothing (can start in parallel with UX work once API credentials obtained)
**Research**: Likely (external API integration)
**Research topics**: SanMar API authentication and credential setup, available endpoints (product/pricing/inventory), data formats and schemas, rate limits, SDK or client library availability
**Plans**: 5 plans in 4 waves

Plans:
- [x] 05-00: Research SanMar API documentation and ecosystem (completed via /gsd:research-phase)
- [x] 05-01: Project setup, TypeScript config, constants, types, and auth module
- [x] 05-02: SOAP client factory and error handling utilities
- [x] 05-03: Product data and media content services
- [x] 05-04: Pricing and inventory services
- [x] 05-05: Public API export and integration demo script

### Phase 6: Product Creation Pipeline
**Goal**: Enter a SanMar style number → get a draft WIX product with pricing, variants, and images ready for review
**Depends on**: Phase 5
**Research**: Likely (WIX product creation API + SanMar data mapping)
**Research topics**: WIX product creation API schema, image upload/handling, variant structure mapping, draft product workflow via MCP
**Plans**: TBD

Plans:
- [x] 06-01: Map SanMar product data to WIX product schema
- [x] 06-02: Build WIX V1 product creation service module
- [x] 06-03: Build pipeline orchestrator (fetch + create product scripts)
- [x] 06-04: Build local web preview server for visual curation
- [x] 06-05: Wire preview UI to pipeline backend and verify end-to-end flow

### Phase 7: Pricing & Variant Logic
**Goal**: Flexible pricing rules by product type and per-product variant curation (which colors/sizes to offer)
**Depends on**: Phase 6
**Research**: Unlikely (internal business logic building on established patterns)
**Plans**: 3 plans in 3 waves

Plans:
- [x] 07-01: Pricing rules engine with markup presets and size upcharges
- [x] 07-02: Pipeline integration — wire pricing config into mapper, types, and create flow
- [x] 07-03: Preview UI pricing controls and curation UX improvements

### Phase 8: Inventory Monitoring
**Goal**: Automated monitoring of SanMar blank inventory with configurable alert thresholds
**Depends on**: Phase 5
**Research**: Likely (SanMar inventory API specifics)
**Research topics**: SanMar inventory endpoint details, polling frequency limits, real-time vs batch availability, webhook support
**Plans**: TBD

Plans:
- [x] 08-01: Build inventory polling system with configurable check intervals
- [x] 08-02: Implement alert thresholds and low-stock/out-of-stock detection

### Phase 9: Automated Stock Sync
**Goal**: WIX product listings automatically reflect SanMar stock status + owner gets notified of stock changes
**Depends on**: Phase 8
**Research**: Likely (WIX product status API + notification integration)
**Research topics**: WIX product status update API (hide/show/flag products), notification service options (email, SMS, webhook), batch update capabilities
**Plans**: TBD

Plans:
- [x] 09-01: Automate WIX product status updates based on stock levels
- [x] 09-02: Build notification system for stock alerts

### Phase 10: Integration Polish
**Goal**: Reliable, production-ready end-to-end pipeline from SanMar catalog to live WIX store
**Depends on**: Phase 6, Phase 9
**Research**: Unlikely (internal testing and refinement of built systems)
**Plans**: TBD

Plans:
- [x] 10-01: End-to-end pipeline testing and edge case handling
- [x] 10-02: Error recovery, logging, and operational documentation
- [ ] 10-03: Operational documentation and runbook

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
Note: Phase 5 (SanMar API) can start in parallel with Phases 1-4 once API credentials are obtained.

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Site Audit & Discovery | 3/3 | Complete | 2026-01-29 |
| 2. Navigation & Product Discovery | 5/5 | Complete | 2026-01-30 |
| 3. Mobile Experience Optimization | 3/3 | Complete | 2026-01-30 |
| 4. Checkout & Conversion Optimization | 3/3 | Complete | 2026-01-30 |
| 5. SanMar API Foundation | 5/5 | Complete | 2026-01-30 |
| 6. Product Creation Pipeline | 5/5 | Complete | 2026-01-30 |
| 7. Pricing & Variant Logic | 3/3 | Complete | 2026-01-30 |
| 8. Inventory Monitoring | 2/2 | Complete | 2026-01-30 |
| 9. Automated Stock Sync | 2/2 | Complete | 2026-01-31 |
| 10. Integration Polish | 2/3 | In progress | - |
