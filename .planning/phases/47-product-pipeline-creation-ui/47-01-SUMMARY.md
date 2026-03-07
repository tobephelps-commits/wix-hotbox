# Plan 47-01 Summary: Port Pipeline Business Logic to src/pipeline/

## Result: COMPLETE

## Tasks Completed: 2/2

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Port pricing-rules.ts, types.ts, and mapper.ts | 55e0452 | src/pipeline/pricing-rules.ts, src/pipeline/types.ts, src/pipeline/mapper.ts |
| 2 | Port WIX API client, templates, barrel export, config | b291cb1 | src/pipeline/wix-api.ts, src/pipeline/templates.ts, src/pipeline/index.ts, src/config.ts |

## Decisions

| Decision | Rationale |
|----------|-----------|
| mapper.ts uses UnifiedProductData instead of SanMar-specific types | Vendor-agnostic pipeline; all vendor specifics handled by adapters |
| setWixConfig() init pattern for wix-api.ts | Avoids importing fastify into pure API client; route handlers call at registration |
| setTemplatesDir() init pattern for templates.ts | Decouples from file path resolution; route handlers pass config.dataDir |
| WIX_SITE_ID defaults to production value in config.ts | Preserves backward compatibility; overridable via env var |
| Color matching in mapper uses displayColor for media lookup | UnifiedMedia.color contains display name, not vendor-internal code |

## Verification

- [x] `npx tsc --noEmit` passes with zero errors
- [x] All src/pipeline/*.ts files exist (pricing-rules, types, mapper, wix-api, templates, index)
- [x] mapper.ts imports ONLY from src/vendors/types.ts and local pipeline modules
- [x] wix-api.ts has no hardcoded credentials or dotenv imports
- [x] templates.ts uses configurable data directory

## Files Modified

- `src/pipeline/pricing-rules.ts` (new) -- copied as-is from scripts/pipeline/
- `src/pipeline/types.ts` (new) -- VendorId import path updated to ../vendors/
- `src/pipeline/mapper.ts` (new) -- refactored to use UnifiedProductData
- `src/pipeline/wix-api.ts` (new) -- config-based credentials, no CLI runner
- `src/pipeline/templates.ts` (new) -- configurable data directory
- `src/pipeline/index.ts` (new) -- barrel export
- `src/config.ts` (modified) -- added wixApiKey and wixSiteId
