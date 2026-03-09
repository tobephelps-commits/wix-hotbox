# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-04)

**Core value:** Effortless product creation — enter a style number from any supported vendor and get a draft WIX product with pricing, variants, and images ready for review.
**Current focus:** v2.0 Pi Appliance — full rewrite as Raspberry Pi 5 production appliance

## Current Position

Phase: 59 (v1.x Feature Parity Audit) -- IN PROGRESS
Plan: 02 complete (Shipping Label PDF Generation)
Status: label-template.ts with 4x6 layout, GET /api/orders/:id/label route, Label button in OrderDetail
Last activity: 2026-03-09 - Shipping label PDF generation

Progress: ██████████ 100% (v2.0)

## Performance Metrics

**Velocity:**
- Total plans completed: 125 (34 v0.1 + 38 v0.2 + 24 v1.0 + 9 v1.1 + 12 v1.2 + 8 v2.0)
- Average duration: ~1 session per plan
- v0.1: 34 plans across 3 days (2026-01-29 to 2026-01-31)
- v0.2: 38 plans across 4 days (2026-01-29 to 2026-02-01)
- v1.0: 24 plans across 1 day (2026-02-02)
- v1.1: 9 plans (2026-02-03 to 2026-02-04)
- v1.2: 12 plans (2026-02-04)

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

**By Phase (v0.2):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 11. WIX Editor Fixes | 4/4 | 4 sessions | 1 session |
| 12. Collection Routing | 1/1 | 1 session | 1 session |
| 13. Template Presets | 2/2 | 2 sessions | 1 session |
| 14. Logo Overlay | 3/3 | 3 sessions | 1 session |
| 15. Cost/Sale Pricing | 4/4 | 4 sessions | 1 session |
| 16. Multi-warehouse | 5/5 | 5 sessions | 1 session |
| 17. S&S Activewear | 7/7 | 7 sessions | 1 session |
| 18. Order Management | 6/6 | 6 sessions | 1 session |
| 19. Cart Automation | 3/3 | 3 sessions | 1 session |
| 20. Testing & Polish | 3/3 | 3 sessions | 1 session |

**By Phase (v1.0):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 21. Multi-Angle Images | 1/1 | 1 session | 1 session |
| 22. Multi-Angle Logo Overlay | 2/2 | 2 sessions | 1 session |
| 23. Visual Logo Placement UI | 2/2 | 2 sessions | 1 session |
| 24. Logo Upload & Management | 2/2 | 2 sessions | 1 session |
| 25. Customer Account System | 3/3 | 3 sessions | 1 session |
| 26. Royalty Calculation & PDF | 3/3 | 3 sessions | 1 session |
| 27. Pipeline Automation | 3/3 | 3 sessions | 1 session |
| 28. Order Mgmt Hardening | 2/2 | 2 sessions | 1 session |
| 29. Inventory Sync Reliability | 3/3 | 3 sessions | 1 session |
| 30. Integration Testing & Polish | 3/3 | 3 sessions | 1 session |

**By Phase (v1.1):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 31. Variant OOS Visibility | 1/1 | 1 session | 1 session |
| 32. Color Swatch Media | 1/1 | 1 session | 1 session |
| 33. SanMar Side Image Fix | 1/1 | 1 session | 1 session |
| 34. Operations Dashboard | 2/2 | 2 sessions | 1 session |
| 35. Pipeline Wizard | 3/3 | 3 sessions | 1 session |
| 36. Product Migration | 2/2 | 2 sessions | 1 session |

**By Phase (v1.2):**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 37. Dashboard Tabbed Navigation | 2/2 | 2 sessions | 1 session |
| 38. Production Sheets | 2/2 | 2 sessions | 1 session |
| 39. S&S Cart Automation | 3/3 | 3 sessions | 1 session |
| 40. Order Status Dashboard | 2/2 | 2 sessions | 1 session |
| 41. Bulk Order Actions | 2/2 | 2 sessions | 1 session |
| 42. Integration & Polish | 2/2 | 2 sessions | 1 session |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
All v0.1 and v0.2 decisions marked with outcomes. See PROJECT.md for full list.

### Phase 25 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 25 | Single markup % per customer, not tiered | Per CONTEXT.md vision — simple B2B pricing model |
| 25 | logoKeys reference data/logos.json keys | Bridges logo system (phases 21-24) to customer accounts |
| 25 | Inline section layout (not tab-based) for customer UI | Matches existing dashboard where all sections are visible simultaneously |
| 25 | Logo chip picker for customer form | Visual thumbnail selection matching color-card selection pattern |
| 25 | Money rounding at each calculation step (not just final) | Prevents floating-point drift accumulation in multi-step pricing |
| 25 | Royalty calculated on retail price (not wholesale) | Standard royalty accounting practice |

### Phase 26 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 26 | Conservative discount heuristic: order.discount > 0 zeros all line items | Avoids royalty on staff/discount orders where markup was removed |
| 26 | Dynamic import for PDF module in API endpoint | Allows Plan 01 and 02 to run independently; 501 until module exists |
| 26 | Single-file royalty-statement.ts (template + generator combined) | Self-contained concern unlike invoices which separate for multi-order-type reuse |
| 26 | Static import replaces dynamic import after Plan 02 | Module now exists; cleaner code, better type checking |
| 26 | Actionable empty state for royalty dropdown when no customers exist | Better UX than silent empty dropdown; directs user to create customer first |

### Phase 27 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 27 | localStorage primary + server file fallback for preferences | Fast local reads with resilience to browser resets |
| 27 | angleOverlayState restored but overlay previews wait for product load | Prevents visual errors from stale image references |
| 27 | URL query params override saved preferences | Preserves deep-linking functionality |
| 27 | Sequential batch processing (not parallel) | Vendor APIs (SanMar SOAP, S&S REST) have rate limits; concurrent requests cause failures |
| 27 | SSE over WebSocket for progress streaming | Simpler protocol, EventSource-native, sufficient for unidirectional batch updates |
| 27 | 50-item batch limit | Prevents runaway long-running operations |
| 27 | Skip logo overlays in batch mode | Logo placement requires per-product visual positioning incompatible with automation |
| 27 | Fetch + ReadableStream for SSE (not EventSource) | POST method required for batch create; EventSource only supports GET |
| 27 | Vertical card stack for batch progress queue | Better readability than horizontal scroll for multi-item status display |

### Phase 28 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 28 | on-hold transitions bidirectional (new <-> on-hold, ordered <-> on-hold) | Allows pausing and resuming orders from the same lifecycle point |
| 28 | Only WIX API fetch retried, not per-order errors | Per-order errors are data issues, not transient; retry would re-process all orders |
| 28 | errored as cross-cutting count, not a real status | Orders with errors still need their actual lifecycle status for workflow progression |
| 28 | CSS custom properties for timeline dot colors | Allows pseudo-element coloring from JS without inline styles |
| 28 | Session-only banner dismiss (no persistent state) | Error banner is transient UI; re-shows on next page load if errors persist |

### Phase 29 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 29 | snapshotMaxAgeMinutes defaults to 180 (3 hours) | Generous to avoid false staleness positives on normal poll intervals |
| 29 | Per-product thresholds fully optional | Backward compatible with existing TrackedProduct JSON files |
| 29 | Color matching lowercased, size matching kept exact | Sizes are always uppercase; colors have vendor-specific casing |
| 29 | NotificationResult return type for sendSyncNotification | Enables delivery tracking without silently swallowing errors |
| 29 | Cumulative moving average for tick duration | Lower memory than sliding window, sufficient for operational alerting |
| 29 | 200ms rate limit between WIX API calls during audit | Prevents rate limit hits during full product mapping validation |
| 29 | 30-day default retention for alert log pruning | Applied before count cap for dual retention strategy |
| 29 | Health cards hidden when daemon not running | Avoids empty/misleading zero metrics in dashboard |
| 29 | Server-side alert filtering via query params | Accurate results from full alert log, not client-side truncated set |
| 29 | Hover tooltip for threshold badges (not click popover) | Read-only display of override values; simpler UX |

### Phase 43 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 43 | Pi OS Lite 64-bit Bookworm (no desktop) | Lighter, fewer attack surfaces, faster boot; ARM64 for Node.js 20+ |
| 43 | NodeSource repo for Node.js 20 LTS | apt default is outdated; NodeSource provides current LTS |
| 43 | Safety check before disabling password auth | Only locks down SSH when authorized_keys exists to prevent lockout |
| 43 | Minimal X11 without window manager | Lighter footprint; Chromium --kiosk handles its own window |
| 43 | Crash recovery via infinite loop with 3s delay | Ensures kiosk stays running without systemd dependency |
| 43 | Known-pattern touchscreen detection | Covers common Pi-compatible touchscreen brands |
| 43 | Coordinate transformation matrices for rotation | Standard xinput approach for touch-to-display mapping |
| 43 | Server starts first, kiosk waits 3s | Ensures HTTP server is listening before Chromium connects |
| 43 | Kiosk conditioned on /dev/fb0 | Safe to run headless without display hardware |
| 43 | tmpfs for /var/log (volatile) | System logs don't survive reboot; app logs persist in app/logs/ |
| 43 | commit=120 on root partition | Reduces SD write frequency, extending card life |
| 43 | Swap disabled and masked | SD card swap is a reliability and performance problem |
| 43 | Watchdog timeout 15s | Quick recovery without false resets |
| 43 | Journald capped at 50M / 7 days | Prevents journal from filling SD card |

### Phase 44 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 44 | rootDir changed from . to src in tsconfig | dist/server.js must match systemd ExecStart path |
| 44 | Fastify decorate pattern for appVersion | Share version string across route plugins without re-reading package.json |
| 44 | Request timing hooks only in dev mode | Avoid log noise in production; Fastify's built-in logger handles prod |
| 44 | WAL mode + foreign keys + 5s busy timeout as SQLite defaults | Optimal for Pi appliance concurrent reads and data integrity |
| 44 | Migration files resolved via existence check (src/ then dist/) | Works in both tsx dev and compiled production without config |
| 44 | Node.js cpSync in postbuild for migration file copy | Cross-platform compatible (Windows + Linux Pi) |
| 44 | fastify.decorate for db and config with module augmentation | Type-safe access to database and config in all route plugins |

### Phase 45 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 45 | Manual project setup (no create-vite) | Full control over structure, minimal boilerplate |
| 45 | Separate ui/tsconfig.json from root | Backend uses NodeNext/rootDir:src; frontend needs bundler/jsx |
| 45 | SPA fallback conditional on dist/public/ existence | Works in both dev (no static) and production (serves index.html) |
| 45 | 100dvh not 100vh | Correct viewport height on mobile/LAN access |
| 45 | CSS custom properties for all colors | Single source of truth for theme; easy to adjust |

### Phase 50 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 50 | setDataDir() init pattern for PDF logo path | Matches v2.0 module conventions; decouples from config imports |
| 50 | Shared drawHeader/drawFooter with title/prefix params | Reuse across production sheets and invoices without duplication |
| 50 | Bulk endpoint: single=PDF, multiple=ZIP | Optimal UX; avoids ZIP overhead for single document |
| 50 | X-Failed-Count header for partial bulk failures | Client awareness without breaking response format |

### Phase 53 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 53 | Royalty/pdf route registered before royalty route | Prevents Fastify from parsing "pdf" as a date query parameter |
| 53 | listOrders + getOrder loop for royalty data | generateRoyaltyReport needs OrderWithDetails[] with line items; listOrders returns Order[] only |
| 53 | Content-Disposition: inline for royalty PDF | Browser preview preferred over download for statement review |
| 53 | setRoyaltyStatementDataDir at route registration | Matches v2.0 setDataDir init pattern from pdf-template.ts |

### Blockers/Concerns

None (cleared for new milestone)

### Roadmap Evolution

- Milestone v0.1 created: storefront UX + SanMar pipeline, 10 phases (Phase 1-10)
- Milestone v0.1 shipped: 2026-01-31, 34 plans, 3 days
- Milestone v0.2 created: multi-brand operations, 10 phases (Phase 11-20)
- Milestone v0.2 shipped: 2026-02-01, 38 plans, 4 days
- Milestone v1.0 created: visual branding & business operations, 10 phases (Phase 21-30)
- Milestone v1.0 shipped: 2026-02-02, 24 plans, 1 day
- Milestone v1.1 created: storefront polish & operations dashboard, 6 phases (Phase 31-36)
- Milestone v1.1 shipped: 2026-02-04, 12 plans, 2 days
- Milestone v1.2 created: order fulfillment & dashboard redesign, 6 phases (Phase 37-42)
- Milestone v1.2 shipped: 2026-02-04, 13 plans, 1 day
- Milestone v2.0 created: Pi Appliance — full rewrite as Raspberry Pi 5 production appliance, 14 phases (Phase 43-56)
- Phase 57 added: Pi Appliance E2E Test Automation — Playwright/Puppeteer iterative testing on live Pi hardware
- Phase 57.1 inserted after Phase 57: Build inventory, customers, and system tab UIs to replace placeholder screens (URGENT)
- Phase 58 added: Kiosk Touch UI Modernization — rounded corners, larger touch targets, bigger text, push-button-friendly navigation for 15.6" touchscreen
- Phase 59 added: v1.x Feature Parity Audit & Remediation — compare all v1.x desktop features against v2.0 Pi app, build missing UI (manual orders, labels, royalty, cart automation, batch creation)

### Phase 30 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 30 | Multi-file import strategy for customers module test | No barrel export exists; sentinel path triggers custom script generation |

### Phase 31 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 31 | Use WIX Inventory V2 API for stock visibility | Native inventory tracking shows "Out of Stock" instead of hiding variants |
| 31 | Keep all variants visible (visible: true) | Customers can see all color/size options, improving UX |
| 31 | Rename hidden/restored to outOfStock/restocked | More accurate terminology for inventory-based approach |
| 31 | Capture variant IDs from updateProductVariants response | Need IDs to map SKU -> variantId for inventory API |
| 31 | Inventory update non-blocking on failure | Product creation should succeed even if inventory API fails |

### Phase 32 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 32 | Verification-only for API layer (no code changes) | buildMediaPayload() already correctly assigns images to color choices |
| 32 | Editor configuration is required (not API-automatable) | WIX Product Gallery widget setting cannot be changed via REST API |

### Phase 33 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 33 | Set sideImage to null explicitly for SanMar | CLASS_TYPE_HIGH (2001) is a high-res front/lifestyle shot, not a side view |
| 33 | Remove side image choice assignment from buildMediaPayload | Prevents duplicate front-looking images in WIX variant switching |
| 33 | Keep HIGH images as general product images (Step 2) | Still useful as additional product imagery, just not as color-specific side |

### Phase 34 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 34 | AbortSignal for daemon control (not process.exit) | Graceful shutdown allows current tick to complete before exiting |
| 34 | getSyncConfigFromEnv in sync-poller.ts | Needed for programmatic daemon start without CLI |
| 34 | Operations health endpoint aggregates all subsystems | Single call for dashboard overview card data |

### Phase 35 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 35 | Combined commit for CSS/HTML/JS tasks in same file | Both tasks modify preview.html; atomic split impractical |
| 35 | Steps 3-4 default valid (pricing/logo optional) | User can proceed with defaults; reduces friction |
| 35 | Step 5 validity derived from steps 1-2 only | Steps 1-2 are required data; 3-4 have sensible defaults |

### Phase 36 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 36 | Vendor detection via text + SKU heuristics | Standard naming conventions allow reliable vendor identification |
| 36 | Style+vendor composite key for tracking lookup | Same style number can exist on different vendors |

### Phase 37 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 37 | 200px sidebar width | Sufficient for icon + label without wasting screen space |
| 37 | Dark theme matching header (#1a1a2e) | Consistent visual design with existing header |
| 37 | Left border accent for active state | Clear visual indicator without being intrusive |
| 37 | localStorage for tab persistence | Fast local reads, survives session |
| 37 | Responsive collapse at 768px | Mobile-friendly without complete redesign |
| 37 | .tab-panel-extra wrapper divs for floating content | Content outside main tab panels needs visibility control |
| 37 | CSS margin-left for sidebar offset on extra panels | Extra panels at document level need layout alignment |

### Phase 38 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 38 | Group line items by vendorStyle | Consolidated product sections for production clarity |
| 38 | Sort quantities by color then size | Consistent ordering for easy scanning |
| 38 | Reuse brand constants from invoice-template.ts | Visual consistency across order documents |

### Phase 39 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 39 | S&S login URL is /myaccount/login | User checkpoint verification (not /account/signin) |
| 39 | Multi-strategy selectors for color/size | Fallback patterns handle site variations (swatches, dropdowns, buttons) |
| 39 | Browser handoff at cart page | Manual checkout required for payment; automation ends at cart |

### Phase 40 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 40 | Aging thresholds: new=48h, in-production=72h, packed=24h | Operational visibility for orders that need attention |
| 40 | Active statuses for stage metrics: new through shipped | Excludes terminal states (delivered, cancelled) from aggregation |
| 40 | hoursInStatus rounded to nearest integer | Cleaner display, sufficient precision for dashboard |

### Phase 41 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 41 | Partial failure handling for bulk operations | Better UX - one invalid order shouldn't block the rest |
| 41 | Single store load/save per batch | Performance optimization - avoid repeated file I/O |
| 41 | Temp directory with cleanup for ZIP | Proper resource management - stream ZIP then delete temp files |
| 41 | Route bulk endpoints before parameterized routes | Avoid regex pattern matching "bulk" as an order ID |
| 41 | Sticky toolbar at bottom of orders section | Visible during scroll, doesn't obscure orders |
| 41 | Selection preserved across filter changes | Better UX - user can select, filter, select more |
| 41 | Session storage handoff for cart fill | Existing cart fill modal reused with filter |

### Phase 42 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 42 | Fix tsc error detection to check stdout | TypeScript outputs errors to stdout, not stderr |
| 42 | Production sheet and bulk endpoints not smoke-testable | Require specific order IDs or POST methods |

### Phase 47 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 47 | setWixConfig() init pattern for wix-api.ts | Avoids importing fastify into pure API client; route handlers call at registration |
| 47 | setTemplatesDir() init pattern for templates.ts | Decouples from file path resolution; route handlers pass config.dataDir |
| 47 | mapper.ts uses UnifiedProductData exclusively | Vendor-agnostic pipeline; all vendor specifics handled by adapters |
| 47 | WIX_SITE_ID defaults to production value in config.ts | Backward compatibility; overridable via WIX_SITE_ID env var |
| 47 | Module-level Map cache with 10-min TTL for rawData | Avoids re-fetching vendor data between preview and create steps |
| 47 | PreviewData type defined locally in StyleLookup | UI runs in browser; pipeline types are backend-only; keeps frontend self-contained |
| 47 | Initial color selection = in-stock + unknown-stock | Out-of-stock excluded by default but still selectable for pre-orders |
| 47 | fetchProductPreview returns preview + rawData | Create step needs rawData; single fetch serves both needs |
| 47 | createWixProduct accepts UnifiedProductData directly | Eliminates SanMar-specific bridge; vendor-agnostic |

### Phase 48 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 48 | Logo filePaths relative to dataDir (logos/name.png) | v2.0 dataDir architecture; paths resolve via path.resolve(dataDir, filePath) |
| 48 | setDataDir + setUploadDataDir init at route registration | Matches pipeline module init pattern; decouples from config imports |
| 48 | Raw body parser for image/* at plugin level | Fastify needs explicit content type parser for binary upload bodies |

### Phase 49 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 49 | JSON blobs for addresses (not separate table) | Always loaded with order, rarely queried independently; matches v1.x pattern |
| 49 | order_number as INTEGER UNIQUE (not AUTOINCREMENT) | Allows explicit assignment starting at 1001; auto-increment handled by application layer |
| 49 | Separate OrderErrorOperation type | Enables strict typing of error operations across the codebase |
| 49 | AGING_THRESHOLDS as Partial<Record> | Only some statuses have thresholds; Partial avoids requiring entries for all statuses |
| 49 | Self-contained WIX API calls in wix-sync.ts | Different API base (ecom/v1 vs stores/v1), different auth patterns; avoids coupling to pipeline module |
| 49 | Config parameter for WIX sync auth | Matches v2.0 pattern where route handlers pass fastify.config; pure functions, no module-level state |

### Phase 52 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 52 | Unified consolidator replaces separate SanMar/S&S modules | Single vendor-agnostic module with optional VendorId filter reduces duplication |
| 52 | CartItem includes vendor field (VendorId) | Enables vendor-aware cart filling without external context |
| 52 | Direct order_items query for vendor filtering | Avoids loading full OrderWithDetails; more efficient for filtering |
| 52 | Web credentials default to empty string | Optional config; only needed when cart automation is active |

### Phase 51 Decisions

| Phase | Decision | Rationale |
|-------|----------|-----------|
| 51 | SyncConfig reduced to NotificationConfig only | db passed as function parameter per v2.0 conventions; no dataDir needed |
| 51 | SyncHealth interface in types.ts | Was inline in sync-poller.ts in v1.x; centralized for reuse |
| 51 | vendor required on ProductMapping | SQLite column has DEFAULT 'sanmar'; TypeScript mirrors DB schema |
| 51 | sendSyncNotification config-first signature | (config, results, alerts?, auditResult?) -- config is the dependency |
| 51 | Self-contained WIX API calls in stock-sync.ts | Same pattern as orders/wix-sync.ts; different API endpoints, decoupled from pipeline |
| 51 | getMonitorConfig() for pollOnce calls | pollOnce expects MonitorConfig, not Config; daemon gets defaults from store |
| 51 | WixConfig { apiKey, siteId } parameter pattern | Consistent API auth parameter across WIX-calling modules |

## Session Continuity

Last session: 2026-03-09
Stopped at: Phase 59 plan 02 complete
Resume file: None

## Milestones Shipped

| Version | Name | Phases | Plans | Shipped |
|---------|------|--------|-------|---------|
| v0.1 | MVP | 1-10 | 34 | 2026-01-31 |
| v0.2 | Multi-Brand Operations | 11-20 | 38 | 2026-02-01 |
| v1.0 | Visual Branding & Business Operations | 21-30 | 24 | 2026-02-02 |
| v1.1 | Storefront Polish & Operations Dashboard | 31-36 | 12 | 2026-02-04 |
| v1.2 | Order Fulfillment & Dashboard Redesign | 37-42 | 13 | 2026-02-04 |
| v2.0 | Pi Appliance | 43-56 | 20 | 2026-03-07 |
