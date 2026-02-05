# Plan 42-01 Summary: Smoke Test v1.2 Coverage

## Status: COMPLETE

## What Was Done

Extended smoke-test.ts with v1.2 API endpoint and CLI command coverage to validate all new features added in phases 37-41.

### Task 1: Add v1.2 API endpoints to smoke test
- Added three new endpoints to ENDPOINT_TESTS array:
  - `/api/orders/summary/extended` - Extended order summary with aging
  - `/api/ss-cart/preview` - S&S cart preview
  - `/api/ss-cart/history` - S&S cart fill history
- Updated header comments to reflect v1.2 validation coverage
- Changed title banner from "HotBox v1.0" to "HotBox v1.2"

### Task 2: Add v1.2 CLI commands to smoke test
- Added `orders/ss-cart-cli.ts help` to CLI_TESTS array
- Validates that S&S cart CLI (Phase 39) loads correctly

### Task 3: Run smoke test and verify all pass
- Fixed pre-existing type errors discovered during validation:
  - `smoke-test.ts`: Fixed tsc error detection to check stdout (tsc outputs errors to stdout, not stderr)
  - `enable-inventory.ts`: Added non-null assertion for `style` parameter
  - `preview-server.ts`: Removed access to non-existent `error` property on CartFillResult
- All 38 smoke test checks pass (1 TypeScript, 9 CLI, 20 API, 8 Import)

## Commits

| Hash | Message |
|------|---------|
| 0301907 | feat(42): add v1.2 API endpoints to smoke test |
| 5ede992 | feat(42): add S&S cart CLI to smoke test |
| 48e8b96 | fix(42): resolve type errors blocking smoke test |

## Files Modified

- `scripts/smoke-test.ts` - Added v1.2 endpoints and CLI tests, fixed tsc error detection
- `scripts/pipeline/enable-inventory.ts` - Fixed null assertion type error
- `scripts/pipeline/preview-server.ts` - Removed invalid property access

## Verification

- [x] `npx tsc --noEmit` passes
- [x] `npm run smoke-test` exits with code 0
- [x] New v1.2 endpoints appear in smoke test output
- [x] S&S cart CLI test appears in smoke test output

## Smoke Test Results

```
TypeScript: 1/1 pass
CLI: 9/9 pass
API: 20/20 pass
Import: 8/8 pass

Total: 38/38 pass
SMOKE TEST PASSED - All 38 checks green
```

## Notes

- Production sheet (`/api/orders/:id/production-sheet`) and bulk operation endpoints (`/api/orders/bulk/*`) require specific order IDs or POST methods, so they cannot be tested with simple GET smoke tests
- The smoke test now covers all v1.2 features that are testable without dynamic data
