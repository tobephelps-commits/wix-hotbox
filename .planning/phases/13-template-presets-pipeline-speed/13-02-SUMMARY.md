---
phase: 13-template-presets-pipeline-speed
plan: 02
subsystem: api
tags: [templates, product-pipeline, cli, preview-server, pricing-presets, api-endpoints]

# Dependency graph
requires:
  - phase: 13-template-presets-pipeline-speed
    plan: 01
    provides: ProductTemplate type, template CRUD module, --preset CLI flag, --list-presets/--list-templates
  - phase: 06-product-creation-pipeline
    provides: createWixProduct orchestrator, CuratedProduct type, create-product CLI
  - phase: 07-pricing-variant-logic
    provides: PricingConfig type, PRICING_PRESETS, getPresetConfig helper
  - phase: 12-multi-collection-product-routing
    provides: collection routing in pipeline, --collection CLI flag
provides:
  - --template CLI flag to apply saved templates to product creation
  - --save-template CLI flag to save current settings as reusable template
  - Template API endpoints on preview server (GET/POST/DELETE /api/templates)
  - Pricing presets API endpoint (GET /api/presets)
  - Full precedence chain: --price > --preset > --template > default
affects: [14-logo-overlay-engine]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Template application with field-level merge (pricing, sizes, colors, collections)"
    - "Additive collection merge: template collections + CLI --collection flags"
    - "RESTful template CRUD endpoints on preview server"

key-files:
  modified:
    - scripts/pipeline/create-product.ts
    - scripts/pipeline/preview-server.ts

key-decisions:
  - "Template pricing precedence: --price > --preset > --template pricingConfig > --template pricingPreset > default (standard-tee)"
  - "CLI --collection flags ADD to template collections (never replace)"
  - "Template color filter supports 'all' keyword or explicit catalog color array"
  - "Preview server template endpoints return proper HTTP status codes (201 created, 404 not found, 400 bad request)"

patterns-established:
  - "Template application pattern: load template -> merge fields into CuratedProduct -> CLI flags override"
  - "RESTful CRUD on preview server: GET list, GET by name, POST create, DELETE by name"

# Metrics
duration: 4min
completed: 2026-01-31
---

# Phase 13 Plan 02: Template Integration & Preview API Summary

**--template and --save-template CLI flags for template-driven product creation, plus RESTful template CRUD and pricing presets API endpoints on the preview server**

## Performance

- **Duration:** 4 min
- **Started:** 2026-01-31T22:20:00Z
- **Completed:** 2026-01-31T22:24:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- `--template "name"` CLI flag loads a saved template and applies its pricing, sizes, colors, and collections to new products
- `--save-template "name"` CLI flag saves current product settings as a reusable template after successful creation
- Full pricing precedence chain enforced: `--price > --preset > --template > default (standard-tee)`
- Template color filtering: supports "all" keyword or explicit catalog color array
- Template size filtering: intersects template sizes with available sizes from SanMar
- Collection merging: template collections serve as defaults, CLI `--collection` flags add to them (never replace)
- Template application summary printed when template is used (pricing source, sizes filtered, colors, collections)
- Template not found error shows available templates list or prompts to use `--save-template`
- Preview server: `GET /api/templates` lists all saved templates
- Preview server: `GET /api/templates/:name` returns single template or 404
- Preview server: `POST /api/templates` saves new template (validates name required)
- Preview server: `DELETE /api/templates/:name` deletes template or returns 404
- Preview server: `GET /api/presets` returns all 7 built-in pricing presets
- CORS headers updated to include DELETE method

## Task Commits

Each task was committed atomically:

1. **Task 1: Add --template and --save-template to create-product CLI** - `a2173eb` (feat)
2. **Task 2: Add template API endpoints to preview server** - `6fe507a` (feat)

## Files Created/Modified
- `scripts/pipeline/create-product.ts` - Added --template/--save-template flags, template loading/application logic, pricing precedence chain, sizes/colors/collections filtering, template save after creation
- `scripts/pipeline/preview-server.ts` - Added GET/POST/DELETE /api/templates endpoints, GET /api/presets endpoint, CORS DELETE support, route parsing for template and preset URLs

## Decisions Made
- Template pricing precedence: --price > --preset > --template pricingConfig > --template pricingPreset > default (standard-tee)
- CLI --collection flags are additive to template collections (never replace)
- Template color filter supports "all" keyword or explicit catalog color string array
- Preview server template endpoints return proper HTTP status codes (201/400/404/405/500)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 13 complete: template system with CRUD, CLI integration, and API endpoints all operational
- Templates can be saved, loaded, applied, and deleted via both CLI and HTTP API
- Ready for Phase 14 (Logo Overlay Engine) which builds on the product creation pipeline

---
*Phase: 13-template-presets-pipeline-speed*
*Completed: 2026-01-31*
