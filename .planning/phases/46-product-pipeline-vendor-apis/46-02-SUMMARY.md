# Plan 46-02 Summary: Port SanMar SOAP Client Library

## Result: COMPLETE

## What was done

Ported the complete SanMar SOAP API client from `scripts/sanmar/` to `src/vendors/sanmar/` for the v2.0 backend architecture.

### Task 1: Types, constants, auth, client, and utils
- Ported 6 type files (auth, product, pricing, inventory, media, barrel index) as-is
- Ported constants.ts (WSDL URLs, warehouses, brand restrictions, pricing codes) as-is
- Ported auth.ts with `import 'dotenv/config'` removed (loaded once at startup via src/config.ts)
- Ported client.ts (SOAP client factory with Map-based caching) as-is
- Ported utils/error-handler.ts (error classification, SanMarError class, retryability) as-is
- Ported utils/retry.ts (exponential backoff retry wrapper) as-is

### Task 2: Service functions and public API barrel
- Ported services/product.ts (getProductByStyle, getProductVariant, extractUniqueColors, extractAvailableSizes)
- Ported services/pricing.ts (getStylePricing, getVariantPricing, isSaleActive, getEffectivePrice, getSuggestedRetail)
- Ported services/inventory.ts with WarehouseQuantity type defined locally (removed dependency on scripts/monitor/types.js which doesn't exist in v2.0)
- Ported services/media.ts (getProductImages, getFrontImages, getSwatchImages, groupImagesByColor, XML fallback parser)
- Ported services/index.ts barrel export
- Created index.ts public API barrel exporting all services, types, constants, auth validation, client debug helpers, and error handling

### Not ported (intentionally)
- `scripts/sanmar/demo.ts` -- CLI demo script, not a library module
- `scripts/sanmar/adapter.ts` -- vendor adapter goes in Plan 04 per plan notes

## Decisions

| Decision | Rationale |
|----------|-----------|
| WarehouseQuantity defined locally in inventory service | Original imported from scripts/monitor/types.js which doesn't exist in v2.0 architecture |
| No dotenv/config imports anywhere in src/vendors/sanmar/ | v2.0 app loads dotenv once at startup via src/config.ts |

## Verification

- TypeScript compiles clean (`npx tsc --noEmit` -- zero errors)
- No `dotenv/config` imports in any src/vendors/sanmar/ file
- All public API functions accessible via src/vendors/sanmar/index.ts
- All internal imports resolve (relative paths remain valid after port)

## Files created (17)

- `src/vendors/sanmar/types/auth.ts`
- `src/vendors/sanmar/types/product.ts`
- `src/vendors/sanmar/types/pricing.ts`
- `src/vendors/sanmar/types/inventory.ts`
- `src/vendors/sanmar/types/media.ts`
- `src/vendors/sanmar/types/index.ts`
- `src/vendors/sanmar/constants.ts`
- `src/vendors/sanmar/auth.ts`
- `src/vendors/sanmar/client.ts`
- `src/vendors/sanmar/utils/error-handler.ts`
- `src/vendors/sanmar/utils/retry.ts`
- `src/vendors/sanmar/services/product.ts`
- `src/vendors/sanmar/services/pricing.ts`
- `src/vendors/sanmar/services/inventory.ts`
- `src/vendors/sanmar/services/media.ts`
- `src/vendors/sanmar/services/index.ts`
- `src/vendors/sanmar/index.ts`
