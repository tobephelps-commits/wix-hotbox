# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-31)

**Core value:** Effortless product creation -- enter a SanMar style number and get a draft WIX product with pricing, variants, and images ready for review.
**Current focus:** v0.2 Multi-Brand Operations — automate WIX fixes, multi-collection routing, logo overlays, secondary vendor, order management.

## Current Position

Phase: 20 of 20 (Integration Testing & Polish)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-02-01 — Completed 20-01-PLAN.md

Progress: █████████░ 99%

## Performance Metrics

**Velocity:**
- Total plans completed: 34 (v0.1)
- Average duration: ~1 session per plan
- Total execution time: 34 sessions across 3 days

**By Phase (v0.1):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Site Audit | 3/3 | 3 sessions | 1 session |
| 2. Navigation | 5/5 | 5 sessions | 1 session |
| 3. Mobile | 3/3 | 3 sessions | 1 session |
| 4. Checkout | 3/3 | 3 sessions | 1 session |
| 5. SanMar API | 5/5 | 5 sessions | 1 session |
| 6. Product Pipeline | 5/5 | 5 sessions | 1 session |
| 7. Pricing & Variant | 3/3 | 3 sessions | 1 session |
| 8. Inventory Monitor | 2/2 | 2 sessions | 1 session |
| 9. Stock Sync | 2/2 | 2 sessions | 1 session |
| 10. Integration Polish | 3/3 | 3 sessions | 1 session |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
All v0.1 decisions marked with outcomes. See PROJECT.md for full list.

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 11-01 | 30 pending fixes (not 32) after recount | Thorough parsing found 38 total (8 completed + 30 pending); original estimate was approximate |
| 11-01 | 7-wave execution order | Dependencies require Phase 2 prerequisites before Phase 3 mobile work |
| 11-01 | 3 fixes flagged for API automation | CL-2, CL-5, QW-6 may be addressable via WIX REST API in Plan 11-03 |
| 11-02 | Standalone script not test framework | Store owner needs plain readable output, not Jest/Vitest artifacts |
| 11-02 | 16 checks marked SKIP for manual verification | Avoids false positives on visual/subjective checks |
| 11-03 | 0 of 3 API candidates automatable | CL-2 and CL-5 are page content (not product data); QW-6 already verified. All 30 pending fixes require WIX Editor/Dashboard |
| 11-04 | Phase 11 complete — 30 manual WIX fixes triaged, verification scripts built, API automation boundary documented | Manual fixes tracked in WIX-EDITOR-FIXES.md; store owner runs `npm run verify:site-fixes` to check progress |
| 12-01 | Collection names preferred over UUIDs in CLI; UUID fallback supported | Ergonomic CLI usage: `--collection "Big Barn Crossfit"` instead of requiring UUIDs |
| 12-01 | data/collections.json gitignored as local cache | Regenerated via `--list-collections`; avoids committing live API data |
| 12-01 | Phase 12 complete — collection routing integrated as pipeline Step 5 | Products assigned to collections during creation; backward compatible |
| 13-01 | Templates stored in local JSON file (data/templates.json) | Same gitignored pattern as collections.json; local-first CLI tool |
| 13-01 | Template names normalized to lowercase for case-insensitive matching | Prevents duplicates from case variations |
| 13-01 | --list-presets and --list-templates exit before style arg required | Early-exit pattern for info-only CLI commands |
| 13-02 | Template pricing precedence: --price > --preset > --template > default | Clear override chain prevents confusion when multiple pricing sources specified |
| 13-02 | CLI --collection flags additive to template collections | Templates provide defaults; CLI adds, never replaces |
| 13-02 | RESTful template CRUD on preview server with proper HTTP status codes | Standard REST patterns (201 created, 404 not found) for future UI integration |
| 13-02 | Phase 13 complete — template system fully integrated into CLI and preview server | Templates usable via --template CLI flag and HTTP API; ready for Phase 14 |
| 14-01 | Proportional coordinates (0.0-1.0) for logo positioning | Works across all image sizes without pixel recalculation |
| 14-01 | Multiply blend mode default for screen-print effect | Logo appears as if printed on garment fabric |
| 14-01 | data/logos.json NOT gitignored — project configuration | Unlike collections.json/templates.json which are local caches |
| 14-02 | Logo overlay precedence: CLI --logo > template logoOverlay > none | Consistent with pricing precedence pattern |
| 14-02 | Overlaid images saved locally for manual WIX upload | Matches existing workflow: owner replaces SanMar photos with mockups post-creation |
| 14-03 | Preview overlay is visual verification only -- CLI handles actual overlay | Keeps preview simple; no need to pass overlay config through create endpoint |
| 14-03 | Left-sleeve position corrected from (0.25,0.25) to (0.80,0.32) | Original coordinates placed logo on wrong side; corrected to center of wearer's left sleeve facing outward |
| 14-03 | Phase 14 complete -- overlay engine core, CLI integration, and preview UI all functional | Logo files must be added to media/logos/ and registered in data/logos.json for production use |
| 15-01 | Cost history stored in data/cost-history.json following local data pattern | Same gitignored pattern as collections.json, templates.json; local-first CLI tool |
| 15-01 | Decoration cost as optional fields for backward compatibility | CuratedProduct and ProductTemplate extended without breaking existing code paths |
| 15-01 | calculateFullMargin kept separate from calculateMargin | Avoids breaking existing margin calculations that don't include decoration |
| 15-02 | Sale data in data/active-sales.json with original price snapshotting | Same gitignored pattern; snapshot enables reliable revert without external state |
| 15-02 | Discount format parsing: 20% / $5 / @19.99 | CLI ergonomics for percent, fixed, and override discount types |
| 15-02 | checkAndProcessSales() as manual trigger, not automated scheduler | Keeps system simple and CLI-driven; can be automated later if needed |
| 15-03 | Local auth helpers duplicated from wix-api.ts for coupon module | Avoids modifying wix-api.ts private function exports; same pattern, isolated module |
| 15-03 | PascalCase normalization for WIX Coupons V2 API type field | WIX API returns "PercentOff" not "percentOff"; case-insensitive comparison for display |
| 15-04 | Phase 15 complete -- cost tracking, sale pricing, coupons, and preview UI all integrated | Preview server is single interface for product curation, profitability, and promotion management |
| 16-01 | WarehouseQuantity uses warehouseId/warehouseName (not whseID/whseName) | Cleaner consumer-facing API; SanMar naming is an implementation detail |
| 16-01 | Zero-qty warehouses filtered from breakdown | Keeps snapshot JSON concise; consumers only see warehouses with stock |
| 16-01 | warehouses field optional on SkuSnapshot | Backward compatibility with existing snapshot files and consumers |
| 16-03 | Tick-based loop (1 min) instead of multiple timers for priority tiers | Single loop naturally handles hot/normal/slow by checking elapsed time each tick |
| 16-03 | pollDue delegates to pollOnce with productsOverride | Code reuse -- no duplication of snapshot/alert/warehouse logic |
| 16-03 | Health state is module-level, not persisted | Daemon state resets on restart which is appropriate; no stale health files |
| 16-03 | Error escalation threshold at 5 consecutive failures | Avoids log spam for transient errors while surfacing persistent issues |
| 16-02 | AlertWarehouseDetail as separate type for alert-specific shape | Cleaner interface than reusing WarehouseQuantity arrays directly |
| 16-02 | buildSyncEmailBody made async for snapshot loading | Enables WAREHOUSE INVENTORY section with per-product aggregated totals |
| 16-02 | Warehouse sections are additive to existing email format | Full backward compatibility with alerts lacking warehouseDetail |
| 16-04 | Warehouse inventory aggregated across all SKUs per warehouse | Overview display sums per-SKU warehouse data into per-warehouse totals |
| 16-04 | WAREHOUSES constant used for location display names | Consistent location names (e.g., "Seattle, WA") from sanmar/constants.ts |
| 16-04 | Health command reports 'not running' when daemon not active | Module-level state check; null means no loop running |
| 16-05 | Inventory section always visible (not tab-gated) | Follows existing Margin/Sales stacked layout pattern |
| 16-05 | Auto-refresh: products 60s, alerts 30s | Balances data freshness with API load |
| 16-05 | Phase 16 complete -- real-time stock sync with multi-warehouse fully operational | Preview server is single interface for inventory monitoring, alerts, and daemon health |
| 17-01 | String warehouse IDs in UnifiedWarehouse for both numeric (SanMar) and abbreviation (S&S) formats | Avoids type conversion; string accommodates both vendors naturally |
| 17-01 | Optional vendor-specific pricing fields (priceCode, customerPrice, mapPrice) | Each vendor has unique pricing concepts; optional fields avoid forcing irrelevant data |
| 17-01 | parseVendorFlag defaults to 'sanmar' when undefined | Backward compatibility with existing CLI that doesn't specify --vendor |
| 17-02 | Zero new dependencies for S&S — uses Node.js built-in fetch | REST/JSON API needs no libraries; keeps install footprint minimal |
| 17-02 | Sliding window rate limiter as shared singleton | All S&S usage (pipeline, monitoring, sync) shares 60 req/min budget |
| 17-02 | 404 returns empty array, not error | Query-style endpoints: "not found" is a valid empty result, not exceptional |
| 17-02 | Image URL resolver replaces _fm suffix with size param | S&S returns medium by default; _fl for product pages, _fs for thumbnails |
| 17-03 | Media classType mapping: 1007->front, 1008->back, 2001->side, 1004->swatch, 1006->onModelFront | Direct mapping from SanMar PromoStandards classType IDs to UnifiedMedia fields |
| 17-03 | SanMar pricing wrapped as single-element array | SanMar returns style-level pricing, not per-SKU; adapter normalizes to array for interface consistency |
| 17-04 | Use products endpoint for inventory (not /v2/inventory/) | Inventory items lack color/size names; products endpoint provides full context in one call |
| 17-04 | Style enrichment optional with try/catch fallback | Failure to fetch title/description doesn't block core product data |
| 17-04 | Swatch images use _fm (medium); all others use _fl (full/large) | Appropriate resolution for each image use case |
| 17-05 | SanMar direct path preserved; only non-SanMar vendors use VendorAdapter | Zero regression risk for existing SanMar workflow |
| 17-05 | Bridge mapping (unifiedToProductData) constructs SanMar-shaped objects from unified types | Avoids rewriting mapper.ts and create-product.ts consumers; transitional design |
| 17-05 | vendor field optional on CuratedProduct and ProductPreview | Backward compatibility with existing callers that don't specify vendor |
| 17-06 | WarehouseQuantity.warehouseId changed from number to string | Accommodates both SanMar numeric IDs and S&S abbreviation codes |
| 17-06 | Per-vendor credential caching via module-level Set | Avoids redundant adapter.validateCredentials() calls within same process |
| 17-06 | Style+vendor composite key for duplicate detection | Same style from different vendors = different products in tracking and sync |
| 17-06 | Alert warehouse detail: SanMar uses WAREHOUSES constant, others use snapshot data | Vendor-specific display without breaking generic interface |
| 17-07 | Product cache keyed by style:vendor composite for multi-vendor support | Allows caching same style from different vendors simultaneously |
| 17-07 | Vendor badge uses subtle color differentiation (blue for SanMar, amber for S&S) | Informative without being distracting |
| 17-07 | Vendor-specific pricing detail section adapts: Price Code for SanMar, MAP/Customer Price for S&S | Each vendor has unique pricing concepts worth surfacing |
| 17-07 | Warehouse labels adaptive: numeric IDs show as #N (SanMar), abbreviation codes show as-is (S&S) | Auto-detect format rather than requiring vendor context |
| 17-07 | Phase 17 complete -- S&S Activewear fully integrated across vendor types, API client, adapters, pipeline, monitor/sync, and preview server | Preview server is single interface for product curation from either vendor |
| 18-01 | Auth helpers duplicated locally for orders module | Same pattern as Phase 15-03 coupon module; avoids modifying wix-api.ts internals |
| 18-01 | Customer name from billingInfo.contactDetails (not buyerInfo) | WIX eCommerce V1 puts name/phone in contactDetails; buyerInfo only has contactId/email |
| 18-01 | WIX addressLine mapped to addressLine1 | WIX V1 ecom uses single addressLine field, not addressLine1/addressLine2 |
| 18-02 | Template module separated from generator for reusability | Layout helpers are reusable and independently testable; generator composes them |
| 18-02 | Brand accent color used sparingly (title, totals, footer) | Professional look — not dominant red, but accented |
| 18-02 | Proportional column widths in line items table | 50/12/18/20 split works across varying content lengths |
| 18-03 | WIX upsert preserves local status if advanced beyond WIX mapping | Prevents sync from regressing manually-progressed order statuses |
| 18-03 | Starting order number at 1001 for new installations | Professional-looking order numbers from the start |
| 18-03 | Sync errors captured in SyncResult array rather than thrown | Dashboard works with manual orders even if WIX API is down |
| 18-04 | Platform-detected print via child_process (no npm deps) | PowerShell on Windows, lp on macOS/Linux; zero new dependencies |
| 18-04 | Separate INVOICE_PRINTER and LABEL_PRINTER env vars | Different physical printers for regular paper vs thermal labels |
| 18-04 | Non-throwing printPdf returns PrintResult with success boolean | Print failures are informational, not exceptional; UI can display gracefully |
| 18-05 | Barrel export in orders/index.ts as single import surface | Clean API boundary; preview-server uses one import line instead of six |
| 18-05 | Dual lookup: /api/orders/:id resolves by orderNumber if all digits, UUID otherwise | Ergonomic URL access for both human-readable numbers and programmatic IDs |
| 18-05 | CORS expanded to include PATCH method | Required for status update endpoint; consistent across all CORS headers |
| 18-06 | Filter pills group statuses (New, In Progress, Shipped, Delivered) | Reduces UI noise; individual statuses visible via badges in table rows |
| 18-06 | Toast notification system for async actions | Global toast element for sync/print/status feedback; cleaner than status bar |
| 18-06 | Cancel order confirmation via browser confirm() | Prevents accidental irreversible status transitions |
| 18-06 | Phase 18 complete -- full order management dashboard operational | Preview server is single interface for products, orders, invoices, labels, and inventory |
| 19-01 | SanMar-only filtering: vendor==='ss' excluded, undefined defaults to SanMar | Backward compatible with existing orders that lack vendor field |
| 19-01 | Items without vendorStyle/color/size skipped with console warnings | Operator visibility without throwing; prevents broken cart items |
| 19-01 | Case-insensitive composite key with preserved original casing | Handles inconsistent casing in source data while producing clean output |
| 19-02 | Headless-to-headed browser handoff via Playwright storageState | Transfers cookies/session from headless automation to visible checkout browser |
| 19-02 | Multi-strategy selectors: swatch -> dropdown -> button fallback | Robust against SanMar.com DOM variations; clear comments mark update points |
| 19-02 | Per-item error isolation in batch cart filling | One item failing doesn't abort the rest; graceful degradation |
| 19-02 | Status update guard: only 'new' orders transition to 'ordered' | Prevents regression of already-advanced orders in lifecycle |
| 19-03 | CLI uses manual process.argv parsing following manage.ts pattern | No external arg parser dependency; consistent with existing CLI tools |
| 19-03 | Preview is default command; --fill must be explicit | Prevents accidental browser automation execution |
| 19-03 | Fill SanMar Cart button disabled when no 'new' orders | Prevents empty cart fills; button enables dynamically on loadOrders |
| 19-03 | Phase 19 complete -- cart automation accessible from CLI, REST API, and dashboard UI | Three entry points with preview-before-execute pattern across all surfaces |
| 20-01 | Smoke test uses temp file approach for module imports | tsx -e with relative imports fails on Windows; temp file workaround |
| 20-01 | CLI tests use help/dry-run to avoid side effects | Validates code loads and argument parsing without requiring env vars |
| 20-02 | Quick Reference organized by category instead of flat list | Better scannability for 40+ commands |
| 20-02 | Architecture section expanded from 4 to 7 modules | Accurately reflects v0.2 system topology |

### Blockers/Concerns

None carried forward. v0.1 blockers resolved or addressed in v0.2 scope.

### Roadmap Evolution

- Milestone v0.1 created: storefront UX + SanMar pipeline, 10 phases (Phase 1-10)
- Milestone v0.1 shipped: 2026-01-31, 34 plans, 3 days
- Milestone v0.2 created: multi-brand operations, 10 phases (Phase 11-20)

## Session Continuity

Last session: 2026-02-01
Stopped at: Completed 20-01-PLAN.md — Smoke test script validates 29 system checks, all passing
Resume file: None
