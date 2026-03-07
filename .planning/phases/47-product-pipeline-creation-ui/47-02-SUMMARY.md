# Plan 47-02 Summary: Pipeline Orchestration & API Routes

## Result: COMPLETE

## Tasks Completed: 2/2

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Port fetch-product and create-product orchestrators | b96c5f5 | src/pipeline/fetch-product.ts, src/pipeline/create-product.ts, src/pipeline/index.ts |
| 2 | Create pipeline API routes and wire into Fastify | ca62f9c | src/routes/pipeline.ts, src/routes/index.ts |

## Decisions

| Decision | Rationale |
|----------|-----------|
| Module-level Map cache with 10-min TTL for rawData | Avoids re-fetching vendor data between preview and create steps without external cache dependency |
| fetchProductPreview returns both preview and rawData | Create step needs rawData for media/variant/inventory payloads; single fetch serves both needs |
| createWixProduct accepts UnifiedProductData directly | Eliminates SanMar-specific bridge function; vendor-agnostic from the start |

## Verification

- [x] `npx tsc --noEmit` passes with zero errors
- [x] Server starts without errors
- [x] GET /api/pipeline/presets returns 7 pricing presets (200 OK)
- [x] GET /api/pipeline/templates returns array (empty, 200 OK)
- [x] Pipeline route plugin initializes WIX config and templates dir from fastify.config

## Files Modified

- `src/pipeline/fetch-product.ts` (new) -- unified vendor fetchProductPreview function
- `src/pipeline/create-product.ts` (new) -- WIX creation orchestrator using UnifiedProductData
- `src/pipeline/index.ts` (modified) -- added barrel exports for fetch-product and create-product
- `src/routes/pipeline.ts` (new) -- 6 REST endpoints for pipeline operations
- `src/routes/index.ts` (modified) -- registered pipelineRoutes at /pipeline prefix
