---
phase: 05-sanmar-api-foundation
plan: 01
subsystem: api
tags: [sanmar, soap, typescript, node-soap, dotenv, promostandards]

# Dependency graph
requires:
  - phase: none
    provides: greenfield project initialization
provides:
  - TypeScript project with ESM configuration
  - All SanMar API response type definitions (product, inventory, pricing, media, auth)
  - WSDL URL constants for 7 services (production + test)
  - Warehouse, brand restriction, pricing code reference data
  - Auth credential module for both SanMar Standard and PromoStandards APIs
affects: [05-02-soap-client-factory, 05-03-product-media-services, 05-04-pricing-inventory-services, 05-05-public-api-export]

# Tech tracking
tech-stack:
  added: [soap@1.6.4, dotenv@17.2.3, typescript@5.x, tsx, @types/node]
  patterns: [ESM modules (type: module), NodeNext module resolution, barrel exports for types, env-based credential management]

key-files:
  created:
    - package.json
    - tsconfig.json
    - .env.example
    - .gitignore
    - scripts/sanmar/constants.ts
    - scripts/sanmar/auth.ts
    - scripts/sanmar/types/auth.ts
    - scripts/sanmar/types/product.ts
    - scripts/sanmar/types/inventory.ts
    - scripts/sanmar/types/pricing.ts
    - scripts/sanmar/types/media.ts
    - scripts/sanmar/types/index.ts
  modified: []

key-decisions:
  - "ESM module system (type: module in package.json) for modern Node.js compatibility"
  - "NodeNext module resolution for proper .js extension imports in TypeScript"
  - "Interface over type alias for all API response shapes (extensibility)"
  - "Separate auth objects for SanMar Standard vs PromoStandards API families"
  - "readonly arrays and as const for reference data immutability"

patterns-established:
  - "Pattern: scripts/sanmar/ directory for all SanMar integration code"
  - "Pattern: types/ subdirectory with barrel export (index.ts)"
  - "Pattern: .js extensions in TypeScript imports (NodeNext resolution)"
  - "Pattern: dotenv/config import for automatic env loading"

# Metrics
duration: 8min
completed: 2026-01-30
---

# Phase 5 Plan 01: Project Setup, Types, and Auth Summary

**TypeScript ESM project with soap/dotenv, complete SanMar API type system (product/inventory/pricing/media), 7 WSDL constants, and dual-auth credential module**

## Performance

- **Duration:** 8 min
- **Started:** 2026-01-30T00:00:00Z
- **Completed:** 2026-01-30T00:08:00Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Initialized TypeScript ESM project with soap and dotenv dependencies
- Defined complete type system for all SanMar API responses (5 type modules + barrel export)
- Created constants file with 7 WSDL URLs (prod + test), 9 warehouses, 13 restricted brands, pricing codes
- Built auth module with 4 exported functions covering both API families

## Task Commits

Each task was committed atomically:

1. **Task 1: Initialize TypeScript project and install dependencies** - `74529e2` (chore)
2. **Task 2: Create constants and TypeScript type definitions** - `9a114e4` (feat)
3. **Task 3: Build auth credential module** - `59d9707` (feat)

## Files Created/Modified
- `package.json` - ESM project with soap, dotenv, typescript, tsx dependencies
- `package-lock.json` - Dependency lock file
- `tsconfig.json` - TypeScript config: ES2022 target, NodeNext modules, strict mode
- `.env.example` - Documents 3 required SanMar credential env vars
- `.gitignore` - Excludes node_modules/, dist/, .env
- `scripts/sanmar/constants.ts` - WSDL URLs, warehouses, restricted brands, pricing codes, inventory cap
- `scripts/sanmar/types/auth.ts` - SanMarAuth, PromoStandardsAuth, SanMarCredentials interfaces
- `scripts/sanmar/types/product.ts` - ProductBasicInfo, ProductImageInfo, ProductPriceInfo, ProductInfo, ProductInfoResponse
- `scripts/sanmar/types/inventory.ts` - WarehouseInventory, SkuInventory, InventoryResponse, PSInventoryLocation, PSPartInventory
- `scripts/sanmar/types/pricing.ts` - PricingInfo, PricingResponse
- `scripts/sanmar/types/media.ts` - MEDIA_CLASS_TYPES, MediaClassType, MediaContent, MediaContentResponse
- `scripts/sanmar/types/index.ts` - Barrel re-export of all type modules
- `scripts/sanmar/auth.ts` - loadCredentials, getSanMarAuth, getPromoStandardsAuth, validateCredentials

## Decisions Made
- Used ESM (type: "module") for modern Node.js compatibility with soap and dotenv
- Used NodeNext module resolution requiring .js extensions in imports (TypeScript best practice for ESM)
- Used `interface` (not `type`) for all API response shapes to allow future extension
- Preserved SanMar's API typo "errorOccured" (missing 'r') in type definitions to match actual responses
- Used `as const` and `readonly` for reference data to prevent accidental mutation
- PromoStandards auth defaults to wsVersion '2.0.0' (current version)
- validateCredentials() returns boolean (no throw) for pre-flight checks vs loadCredentials() which throws

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

**External services require manual configuration.** See plan frontmatter for details:
- Environment variables: SANMAR_CUSTOMER_NUMBER, SANMAR_USERNAME, SANMAR_PASSWORD
- Account setup: Email sanmarintegrations@sanmar.com for API integration access
- SanMar will send an integration agreement; credentials provisioned 1-2 business days after signing

## Next Phase Readiness
- All types, constants, and auth module ready for SOAP client factory (Plan 05-02)
- TypeScript compiles with zero errors
- No blockers for next plan
- SanMar API credentials still needed for live testing (not required for Plan 02-04 code)

---
*Phase: 05-sanmar-api-foundation*
*Completed: 2026-01-30*
