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
- [ ] **Phase 2: Navigation & Product Discovery** - Improve filtering, categorization, search, and information architecture
- [ ] **Phase 3: Mobile Experience Optimization** - Optimize layouts, touch targets, and flows for 50% mobile traffic
- [ ] **Phase 4: Checkout & Conversion Optimization** - Reduce cart abandonment and streamline checkout flow
- [ ] **Phase 5: SanMar API Foundation** - Build SanMar API client for product data, pricing, and inventory queries
- [ ] **Phase 6: Product Creation Pipeline** - SanMar style number → configured WIX product draft with variants and images
- [ ] **Phase 7: Pricing & Variant Logic** - Variable pricing rules by product type + per-product variant curation
- [ ] **Phase 8: Inventory Monitoring** - SanMar blank stock monitoring with low-stock and out-of-stock alerts
- [ ] **Phase 9: Automated Stock Sync** - WIX product status updates based on SanMar stock levels + notifications
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
- [ ] 02-01: Restructure product categories and navigation hierarchy
- [ ] 02-02: Implement filtering and search improvements
- [ ] 02-03: Improve product pages — layout, descriptions, cross-selling

### Phase 3: Mobile Experience Optimization
**Goal**: Mobile visitors (50% of traffic) get a smooth, conversion-friendly shopping experience
**Depends on**: Phase 2
**Research**: Unlikely (WIX responsive capabilities, internal patterns)
**Plans**: TBD

Plans:
- [ ] 03-01: Optimize mobile navigation, menus, and touch targets
- [ ] 03-02: Mobile product browsing and detail page improvements
- [ ] 03-03: Mobile cart and checkout flow optimization

### Phase 4: Checkout & Conversion Optimization
**Goal**: Reduced cart abandonment through streamlined checkout, trust signals, and friction removal
**Depends on**: Phase 3
**Research**: Unlikely (WIX checkout configuration, established e-commerce patterns)
**Plans**: TBD

Plans:
- [ ] 04-01: Audit and streamline checkout flow
- [ ] 04-02: Add trust signals, urgency elements, and recovery mechanisms
- [ ] 04-03: Configure shipping, payment, and post-purchase experience

### Phase 5: SanMar API Foundation
**Goal**: Working SanMar API client that can query product data, pricing, and inventory
**Depends on**: Nothing (can start in parallel with UX work once API credentials obtained)
**Research**: Likely (external API integration)
**Research topics**: SanMar API authentication and credential setup, available endpoints (product/pricing/inventory), data formats and schemas, rate limits, SDK or client library availability
**Plans**: TBD

Plans:
- [ ] 05-01: Research SanMar API documentation and authentication setup
- [ ] 05-02: Build API client with product data and pricing queries
- [ ] 05-03: Add inventory query capabilities and error handling

### Phase 6: Product Creation Pipeline
**Goal**: Enter a SanMar style number → get a draft WIX product with pricing, variants, and images ready for review
**Depends on**: Phase 5
**Research**: Likely (WIX product creation API + SanMar data mapping)
**Research topics**: WIX product creation API schema, image upload/handling, variant structure mapping, draft product workflow via MCP
**Plans**: TBD

Plans:
- [ ] 06-01: Map SanMar product data to WIX product schema
- [ ] 06-02: Build product creation flow — data transform + WIX draft creation
- [ ] 06-03: Integrate mockup image handling into creation workflow

### Phase 7: Pricing & Variant Logic
**Goal**: Flexible pricing rules by product type and per-product variant curation (which colors/sizes to offer)
**Depends on**: Phase 6
**Research**: Unlikely (internal business logic building on established patterns)
**Plans**: TBD

Plans:
- [ ] 07-01: Implement variable pricing logic with markup rules by product type
- [ ] 07-02: Build per-product variant curation — color/size selection interface

### Phase 8: Inventory Monitoring
**Goal**: Automated monitoring of SanMar blank inventory with configurable alert thresholds
**Depends on**: Phase 5
**Research**: Likely (SanMar inventory API specifics)
**Research topics**: SanMar inventory endpoint details, polling frequency limits, real-time vs batch availability, webhook support
**Plans**: TBD

Plans:
- [ ] 08-01: Build inventory polling system with configurable check intervals
- [ ] 08-02: Implement alert thresholds and low-stock/out-of-stock detection

### Phase 9: Automated Stock Sync
**Goal**: WIX product listings automatically reflect SanMar stock status + owner gets notified of stock changes
**Depends on**: Phase 8
**Research**: Likely (WIX product status API + notification integration)
**Research topics**: WIX product status update API (hide/show/flag products), notification service options (email, SMS, webhook), batch update capabilities
**Plans**: TBD

Plans:
- [ ] 09-01: Automate WIX product status updates based on stock levels
- [ ] 09-02: Build notification system for stock alerts

### Phase 10: Integration Polish
**Goal**: Reliable, production-ready end-to-end pipeline from SanMar catalog to live WIX store
**Depends on**: Phase 6, Phase 9
**Research**: Unlikely (internal testing and refinement of built systems)
**Plans**: TBD

Plans:
- [ ] 10-01: End-to-end pipeline testing and edge case handling
- [ ] 10-02: Error recovery, logging, and operational documentation

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10
Note: Phase 5 (SanMar API) can start in parallel with Phases 1-4 once API credentials are obtained.

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Site Audit & Discovery | 3/3 | Complete | 2026-01-29 |
| 2. Navigation & Product Discovery | 0/3 | Not started | - |
| 3. Mobile Experience Optimization | 0/3 | Not started | - |
| 4. Checkout & Conversion Optimization | 0/3 | Not started | - |
| 5. SanMar API Foundation | 0/3 | Not started | - |
| 6. Product Creation Pipeline | 0/3 | Not started | - |
| 7. Pricing & Variant Logic | 0/2 | Not started | - |
| 8. Inventory Monitoring | 0/2 | Not started | - |
| 9. Automated Stock Sync | 0/2 | Not started | - |
| 10. Integration Polish | 0/2 | Not started | - |
