# Plan 49-03 Summary: WIX Orders API Client & Sync

## Result: COMPLETE

**Phase:** 49-order-management-core
**Plan:** 03 of N
**Duration:** 1 session
**Date:** 2026-03-07

## What was done

### Task 1: Port WIX Orders API client
- Created `src/orders/wix-sync.ts` with full v2.0 port of v1.x WIX order sync:
  - `searchWixOrders(config, filter?, limit?)` -- cursor-based pagination, POST to ecom/v1/orders/search
  - `getWixOrder(config, orderId)` -- single order fetch by ID
  - `getRecentWixOrders(config, days?)` -- smart fetch: all unfulfilled + last N days, deduped, sorted DESC
  - `mapWixStatusToOrderStatus(wixOrder)` -- FULFILLED->shipped, PARTIALLY_FULFILLED->packed, CANCELED->cancelled, default->new
  - `mapWixOrderToCreateInput(wixOrder, collectionMap?)` -- full field mapping (customer, addresses, items, amounts, collection)
  - `buildCollectionMap(config)` -- cross-references WIX Products + Collections APIs, graceful degradation on failure
  - `syncWixOrders(config, db, options?)` -- orchestrates fetch->map->upsert, error-tolerant per-order processing
  - `syncWithRetry(config, db, options?)` -- exponential backoff (2^n * baseDelay) on API fetch failures
- Auth via config parameter (WIX_API_KEY, WIX_SITE_ID from fastify.config), not env directly
- Native fetch (Node 18+), no external HTTP libraries
- All WIX types defined locally (WixEcomOrder, WixAddress, WixLineItem, etc.)

### Task 2: Update barrel export with WIX sync
- Added re-exports of all 8 WIX sync functions and 3 types to `src/orders/index.ts`
- TypeScript compiles cleanly

## Commits
| Hash | Message |
|------|---------|
| 50f1a4d | feat(49): add WIX orders API client and sync orchestration module |
| 5f7b377 | feat(49): add WIX sync exports to orders barrel |

## Files Modified
- `src/orders/wix-sync.ts` (new)
- `src/orders/index.ts` (modified)

## Decisions
| Decision | Rationale |
|----------|-----------|
| Config parameter for auth (not env/setWixConfig) | Matches v2.0 pattern where route handlers pass fastify.config; pure functions, no module-level state |
| Combined collection map (productId + productName keys) | Primary lookup by catalog ID, fallback by name for custom/manual line items |
| Self-contained WIX API calls in wix-sync.ts (not reusing pipeline/wix-api.ts) | Different API base (ecom/v1 vs stores/v1), different auth patterns; avoids coupling order sync to pipeline module |
