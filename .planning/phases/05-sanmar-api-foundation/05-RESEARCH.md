# Phase 5: SanMar API Foundation - Research

**Researched:** 2026-01-30
**Domain:** SanMar SOAP Web Services API + PromoStandards integration from Node.js/TypeScript
**Confidence:** HIGH

<research_summary>
## Summary

Researched the SanMar API ecosystem for building a Node.js/TypeScript client that queries product data, pricing, and inventory. SanMar provides a SOAP-based XML API (not REST) with both proprietary endpoints and PromoStandards-compliant endpoints. There is no official SanMar SDK for any language -- all integrations are built using general-purpose SOAP client libraries pointed at SanMar's published WSDLs.

The standard approach for Node.js is the `soap` npm package (node-soap), which is actively maintained (v1.6.x, Jan 2026) and handles WSDL parsing, client generation, and async/await natively. SanMar's API uses parameter-based authentication (customer number + sanmar.com username/password passed as arguments to every call), not WS-Security headers.

Key finding: SanMar's own documentation recommends a **hybrid FTP + API approach** -- use FTP files (`sanmar_dip.txt`, updated hourly) for bulk inventory/pricing data, and SOAP API calls for real-time per-item lookups. For Phase 5 (foundation), we build the SOAP API client first since the use case is selective per-style queries, not full catalog sync. FTP integration can be added in Phase 8 (Inventory Monitoring) if needed for bulk monitoring.

**Primary recommendation:** Build a TypeScript SOAP client using `soap` (node-soap) against SanMar's published WSDLs. Start with `getProductInfoByStyleColorSize` for product data, `getInventoryQtyForStyleColorSize` for inventory, and `getPricing` for pricing. Use PromoStandards endpoints where they offer richer data (product data v2.0.0, inventory v2.0.0).
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| soap (node-soap) | 1.6.x | SOAP client for consuming SanMar WSDLs | Only actively maintained Node.js SOAP client; 1,172+ npm dependents; async/await support; Axios-based HTTP |
| typescript | 5.x | Type safety for API response handling | SanMar returns complex nested XML; types prevent mapping errors |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| wsdl-tsclient | latest | Generate TypeScript types from WSDL | Optional: auto-generate interfaces from SanMar WSDLs for type safety |
| dotenv | 16.x | Environment variable management | Store SanMar credentials securely (customer number, username, password) |
| soap-stub | latest | Mock SOAP clients in tests | Unit testing without hitting SanMar production servers |
| xml2js | 0.6.x | Parse XML responses if needed | Fallback for edge cases where node-soap doesn't parse correctly |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| soap (node-soap) | easy-soap-request | easy-soap-request is simpler but requires manually building XML envelopes -- no WSDL parsing |
| soap (node-soap) | strong-soap | strong-soap is a rewrite of node-soap but tied to LoopBack ecosystem; less community support |
| soap (node-soap) | PSRESTful service | PSRESTful wraps PromoStandards in REST/JSON ($99/mo) -- eliminates SOAP but adds cost and external dependency |
| Custom SOAP client | promostandards-sdk-js | Pre-alpha (v0.1.11), unmaintained, zero npm dependents -- not production-ready |
| SOAP API | FTP file parsing only | FTP files have bulk data but no real-time per-item queries; can't look up a single style on demand |

**Installation:**
```bash
npm install soap typescript dotenv
npm install -D wsdl-tsclient soap-stub @types/node
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
scripts/
├── sanmar/
│   ├── client.ts              # SOAP client factory (creates + caches clients)
│   ├── auth.ts                # Credential management (env vars → auth objects)
│   ├── services/
│   │   ├── product.ts         # Product data queries (getProductInfoByStyleColorSize, PromoStandards GetProduct)
│   │   ├── inventory.ts       # Inventory queries (getInventoryQtyForStyleColorSize, PS getInventoryLevels)
│   │   └── pricing.ts         # Pricing queries (getPricing, PS GetConfigurationAndPricing)
│   ├── types/
│   │   ├── product.ts         # TypeScript interfaces for product data responses
│   │   ├── inventory.ts       # TypeScript interfaces for inventory responses
│   │   └── pricing.ts         # TypeScript interfaces for pricing responses
│   ├── mappers/
│   │   └── sanmar-to-wix.ts   # Transform SanMar data → WIX product schema (Phase 6)
│   └── utils/
│       ├── error-handler.ts   # SOAP error parsing + retry logic
│       └── constants.ts       # WSDL URLs, warehouse IDs, brand lists
```

### Pattern 1: Singleton SOAP Client Factory
**What:** Create SOAP clients once from WSDL and reuse them. WSDL parsing is expensive -- don't recreate per request.
**When to use:** Every SOAP call
**Example:**
```typescript
// Source: node-soap best practices
import * as soap from 'soap';

const clients: Map<string, soap.Client> = new Map();

export async function getClient(wsdlUrl: string): Promise<soap.Client> {
  if (!clients.has(wsdlUrl)) {
    const client = await soap.createClientAsync(wsdlUrl);
    clients.set(wsdlUrl, client);
  }
  return clients.get(wsdlUrl)!;
}
```

### Pattern 2: SanMar Auth Object Builder
**What:** Build the authentication arguments that every SanMar API call requires. SanMar Standard calls need (customerNumber, username, password). PromoStandards calls need (id, password).
**When to use:** Every API call
**Example:**
```typescript
// Source: SanMar Web Services Integration Guide v24.2
// SanMar Standard auth (product info, inventory, pricing)
function getSanMarAuth() {
  return {
    sanMarCustomerNumber: process.env.SANMAR_CUSTOMER_NUMBER,
    sanMarUserName: process.env.SANMAR_USERNAME,
    sanMarUserPassword: process.env.SANMAR_PASSWORD,
  };
}

// PromoStandards auth (product data v2, inventory v2, pricing)
function getPromoStandardsAuth() {
  return {
    wsVersion: '2.0.0',
    id: process.env.SANMAR_USERNAME,
    password: process.env.SANMAR_PASSWORD,
  };
}
```

### Pattern 3: Dual API Strategy (SanMar Standard + PromoStandards)
**What:** SanMar offers both proprietary and PromoStandards endpoints. Use whichever gives better data for each use case.
**When to use:** Choosing which endpoint to call for a given operation
**Guidance:**
- **Product info by style:** Use SanMar Standard `getProductInfoByStyleColorSize` -- returns full product data including all images and pricing in one call
- **Product data with GTIN/PMS:** Use PromoStandards `GetProduct` v2.0.0 -- includes GTIN, PMS colors, companion products, apparel sizes
- **Inventory (total across warehouses):** Use SanMar Standard `getInventoryQtyForStyleColorSize` -- simpler response
- **Inventory (per warehouse):** Use PromoStandards `getInventoryLevels` v2.0.0 -- richer data with location details
- **Inventory (batch checkout):** Use PromoStandards `getInventoryLevels` with `partIdArray` -- up to 200 items per call
- **Pricing:** Use SanMar Standard `getPricing` -- returns piece, dozen, case, and sale prices
- **Media/images:** Use PromoStandards `getMediaContent` v1.1.0 -- returns all image types with classType metadata

### Anti-Patterns to Avoid
- **Creating a new SOAP client per request:** WSDL parsing is expensive. Create once, reuse.
- **Querying by brand or category via API:** These return massive datasets and frequently timeout. Use FTP files for bulk data.
- **Polling inventory via API for full catalog:** SanMar explicitly recommends FTP `sanmar_dip.txt` for frequent bulk inventory checks. API is for selective per-item queries.
- **Hardcoding WSDL URLs:** Use constants file. SanMar has both production and test URLs; test environment was recently renamed from "Edev" to "Test" (March 2025).
- **Ignoring the `catalogColor` vs `color` distinction:** SanMar has two color fields -- `catalogColor` (mainframe color, used in API queries) and `color` (display name). Using the wrong one causes "Invalid Style + Color + Size" errors.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SOAP XML envelope construction | Manual XML string building | `soap` npm package WSDL-based client | WSDL defines exact envelope structure, namespaces, types; manual XML is fragile and error-prone |
| WSDL parsing | Custom XML parser | `soap.createClientAsync(wsdlUrl)` | node-soap handles WSDL parsing, method discovery, and type coercion automatically |
| Response type mapping | Manual XML-to-object parsing | node-soap auto-deserialization + TypeScript interfaces | node-soap converts SOAP XML responses to JS objects automatically |
| Credential management | Config files with passwords | dotenv + environment variables | Standard practice; SanMar credentials should never be in source code |
| SOAP debugging | Console logging | `client.lastRequest` / `client.lastResponse` | node-soap provides built-in request/response inspection |
| Retry logic for timeouts | Custom retry code | Wrapper with exponential backoff | SanMar large responses timeout silently; need retry with progressive delays |

**Key insight:** SanMar's API is well-documented SOAP with standard WSDL definitions. The `soap` npm package handles all SOAP protocol complexity (envelope building, namespace management, type serialization). The main engineering work is in mapping SanMar's data model to our WIX product schema, not in SOAP protocol handling.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: catalogColor vs color Field Confusion
**What goes wrong:** API returns "Invalid Style + Color + Size specified" error
**Why it happens:** SanMar has two color representations: `catalogColor` (aka mainframe color, abbreviated, used in API queries) and `color` (full display name). Example: `catalogColor` = "Ath. Maroon" vs `color` = "Athletic Maroon"
**How to avoid:** Always use `catalogColor` / `SANMAR_MAINFRAME_COLOR` when making API queries. Use `color` / `COLOR_NAME` only for display purposes.
**Warning signs:** "Invalid Style + Color + Size specified" error when you know the style exists

### Pitfall 2: Large Response Timeouts
**What goes wrong:** `getProductInfoByBrand` or `getProductInfoByCategory` calls hang and return nothing
**Why it happens:** These endpoints return massive datasets. SanMar's docs explicitly warn: "Due to the data's size, a timeout may occur and may not return an XML response." When this happens, SanMar silently exports a CSV to your FTP folder instead.
**How to avoid:** Never query by brand or category via API. Use `getProductInfoByStyleColorSize` for per-item queries. For bulk data, use FTP files or `getProductBulkInfo` (once/month, exports to FTP).
**Warning signs:** API call takes >30 seconds, returns null/empty

### Pitfall 3: Inventory Quantity Cap
**What goes wrong:** Inventory numbers seem artificially low or capped
**Why it happens:** API responses cap inventory at 1500 per warehouse (updated July 2025 from previous 500 cap). FTP `sanmar_dip.txt` also shows 1500 max per warehouse.
**How to avoid:** Understand that 1500 means "1500 or more" -- treat it as "well stocked" threshold. For exact counts above 1500, you'd need to contact SanMar directly.
**Warning signs:** Multiple items showing exactly 1500 quantity

### Pitfall 4: Port 8080 Connectivity
**What goes wrong:** Cannot connect to SanMar WSDL or API endpoints
**Why it happens:** SanMar's web services run on port 8080 (not standard 80/443). Firewalls, cloud hosting providers, or proxies may block this port.
**How to avoid:** Ensure port 8080 is open for outbound traffic to IP `63.251.12.134`. Test with: `ping 63.251.12.134` or try loading a WSDL URL in browser.
**Warning signs:** ECONNREFUSED, ETIMEDOUT errors when creating SOAP client

### Pitfall 5: Discontinued Products in Data
**What goes wrong:** Products that can't be ordered appear in query results
**Why it happens:** SanMar keeps discontinued products in their data with `productStatus` = "Discontinued" and `discontinued_code` = "S" or "M". They remain listed until all sizes/colors of a color group have zero inventory.
**How to avoid:** Always filter on `productStatus` -- only use "Active", "New", or "Regular" products. Ignore "Coming Soon" (incomplete data) and "Discontinued".
**Warning signs:** Products showing zero inventory across all warehouses, `isCloseout` = true in PromoStandards responses

### Pitfall 6: Sale Pricing Date Sensitivity
**What goes wrong:** Using stale sale prices or missing active sales
**Why it happens:** Sale pricing is updated every Monday and Wednesday. Sale items have `saleStartDate` and `saleEndDate` fields. If you cache pricing, it goes stale quickly.
**How to avoid:** Always check `saleStartDate` and `saleEndDate` when using sale prices. For HotBox's use case (markup on wholesale cost), re-query pricing when creating/updating a product draft, not from cache.
**Warning signs:** Customer-facing prices don't match SanMar's current pricing

### Pitfall 7: Brand Restrictions for Direct-to-Consumer
**What goes wrong:** Listing restricted brands without embellishment on the WIX store
**Why it happens:** SanMar prohibits selling certain brands as blank/undecorated on consumer websites. Restricted brands include: Brooks Brothers, Carhartt, Cotopaxi, Eddie Bauer, New Era, Nike, OGIO, Outdoor Research, Stanley/Stella, tentree, The North Face, Tommy Bahama, Travis Mathew.
**How to avoid:** HotBox sells custom decorated apparel (prints/embroidery), so this is less of an issue -- but the system should flag these brands with a warning during product creation. Never list these as "blank" products.
**Warning signs:** SanMar account suspension notices related to brand compliance
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from SanMar documentation and node-soap best practices:

### Creating a SOAP Client from SanMar WSDL
```typescript
// Source: node-soap docs + SanMar WSDL URLs from Integration Guide v24.2
import * as soap from 'soap';

// SanMar Standard WSDLs
const WSDL_URLS = {
  productInfo: 'https://ws.sanmar.com:8080/SanMarWebService/SanMarProductInfoServicePort?wsdl',
  inventory: 'https://ws.sanmar.com:8080/SanMarWebService/SanMarWebServicePort?wsdl',
  pricing: 'https://ws.sanmar.com:8080/SanMarWebService/SanMarPricingServicePort?wsdl',
  // PromoStandards
  psProductData: 'https://ws.sanmar.com:8080/promostandards/ProductDataServiceV2.xml?wsdl',
  psInventory: 'https://ws.sanmar.com:8080/promostandards/InventoryServiceBindingV2final?WSDL',
  psMediaContent: 'https://ws.sanmar.com:8080/promostandards/MediaContentServiceBinding?wsdl',
  psPricing: 'https://ws.sanmar.com:8080/promostandards/PricingAndConfigServiceBinding?wsdl',
} as const;

// Test environment WSDLs (replace 'ws' with 'test-ws')
const TEST_WSDL_URLS = {
  productInfo: 'https://test-ws.sanmar.com:8080/SanMarWebService/SanMarProductInfoServicePort?wsdl',
  // ... same pattern for others
} as const;

const client = await soap.createClientAsync(WSDL_URLS.productInfo);
```

### Querying Product Info by Style
```typescript
// Source: SanMar Web Services Integration Guide v24.2, getProductInfoByStyleColorSize
const [result] = await client.getProductInfoByStyleColorSizeAsync({
  arg0: {
    style: 'PC61',       // SanMar style number (required)
    color: 'White',      // Catalog/mainframe color (optional)
    size: 'S',           // Size (optional)
  },
  arg1: {
    sanMarCustomerNumber: process.env.SANMAR_CUSTOMER_NUMBER,
    sanMarUserName: process.env.SANMAR_USERNAME,
    sanMarUserPassword: process.env.SANMAR_PASSWORD,
  },
});

// Response structure:
// result.return.errorOccured (boolean)
// result.return.message (string)
// result.return.listResponse[] (array of products)
//   .productBasicInfo { brandName, style, color, catalogColor, size, productTitle,
//                       productDescription, productStatus, availableSizes, caseSize,
//                       inventoryKey, sizeIndex, uniqueKey, category, keywords, pieceWeight }
//   .productImageInfo { frontModel, backModel, sideModel, threeQModel, frontFlat, backFlat,
//                       colorProductImage, colorSquareImage, brandLogoImage, specSheet }
//   .productPriceInfo { piecePrice, casePrice, dozenPrice, pieceSalePrice, caseSalePrice,
//                       priceCode, priceText, saleStartDate, saleEndDate }
```

### Querying Inventory by Style (All Warehouses)
```typescript
// Source: SanMar Web Services Integration Guide v24.2, getInventoryQtyForStyleColorSize
// Querying at style level returns ALL colors and sizes with per-warehouse breakdown
const inventoryClient = await soap.createClientAsync(WSDL_URLS.inventory);

const [result] = await inventoryClient.getInventoryQtyForStyleColorSizeAsync({
  arg0: process.env.SANMAR_CUSTOMER_NUMBER,
  arg1: process.env.SANMAR_USERNAME,
  arg2: process.env.SANMAR_PASSWORD,
  arg3: 'L223',          // Style (required)
  arg4: 'Pearl Grey',    // Catalog color (optional - omit for all colors)
  arg5: 'L',             // Size (optional - omit for all sizes)
});

// Response when querying by style (not style/color/size):
// result.return.response.style = 'L223'
// result.return.response.skus.sku[] = [
//   { color: 'Amethyst Purpl', size: 'XS',
//     whse: [{ whseID: 1, whseName: 'Seattle', qty: 17 },
//            { whseID: 2, whseName: 'Cincinnati', qty: 56 }, ...] },
//   ...
// ]
```

### Querying Inventory via PromoStandards (Batch by PartId)
```typescript
// Source: SanMar Web Services Integration Guide v24.2, PromoStandards Inventory V2.0.0
// Batch inventory check -- up to 200 partIds per call
const psInventoryClient = await soap.createClientAsync(WSDL_URLS.psInventory);

const [result] = await psInventoryClient.GetInventoryLevelsAsync({
  GetInventoryLevelsRequest: {
    wsVersion: '2.0.0',
    id: process.env.SANMAR_USERNAME,
    password: process.env.SANMAR_PASSWORD,
    productId: 'K420',   // Required but ignored when using partIdArray
    Filter: {
      partIdArray: {
        partId: ['92032', '92033', '678183'],  // Up to 200 partIds
      },
    },
  },
});

// Response: per-part inventory with warehouse-level detail
// result.Inventory.PartInventoryArray.PartInventory[] = [
//   { partId: '92032', partColor: 'Black', labelSize: 'S',
//     quantityAvailable: { Quantity: { uom: 'EA', value: 1045 } },
//     InventoryLocationArray: { InventoryLocation: [
//       { inventoryLocationId: 1, inventoryLocationName: 'Seattle', qty: 0 },
//       { inventoryLocationId: 2, inventoryLocationName: 'Cincinnati', qty: 167 },
//       ...
//     ]}
//   },
// ]
```

### Querying Media Content via PromoStandards
```typescript
// Source: SanMar Web Services Integration Guide v24.2, PromoStandards Media Content V1.1.0
const mediaClient = await soap.createClientAsync(WSDL_URLS.psMediaContent);

const [result] = await mediaClient.GetMediaContentAsync({
  GetMediaContentRequest: {
    wsVersion: '1.1.0',
    id: process.env.SANMAR_USERNAME,
    password: process.env.SANMAR_PASSWORD,
    mediaType: 'Image',   // 'Image' or 'Document'
    productId: 'K420',    // Style number (required)
    // partId: '92032',   // Optional: specific SKU
    // classType: 1007,   // Optional: 1004=Swatch, 1006=Primary, 1007=Front, 1008=Rear, 2001=High
  },
});

// Response: array of media items with classification
// result.MediaContentArray.MediaContent[] = [
//   { productId: 'K420', partId: '92032',
//     url: 'https://cdnm.sanmar.com/imglib/mresjpg/K420_Black_front_FS06.jpg',
//     mediaType: 'Image',
//     ClassTypeArray: { ClassType: { classTypeId: 1007, classTypeName: 'Front' } },
//     color: 'Black', singlePart: true },
//   ...
// ]
```

### Debugging SOAP Calls
```typescript
// Source: node-soap docs
// After any call, inspect the raw XML:
console.log('Last request:', client.lastRequest);
console.log('Last response:', client.lastResponse);

// Discover available methods:
console.log(JSON.stringify(client.describe(), null, 2));
```
</code_examples>

<sota_updates>
## State of the Art (2025-2026)

What's changed recently:

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Test env called "Edev" | Renamed to "Test" (test-ws.sanmar.com) | March 2025 | Update all test WSDL URLs |
| Inventory cap 500/warehouse | Cap raised to 1500/warehouse | July 2025 | Better inventory visibility in API and FTP |
| `sanmar_closeouts_dip.txt` daily | Now updated hourly | May 2020 | More frequent closeout data |
| Dozens pricing offered | Dozens pricing discontinued | May 2020 | `dozenPrice` field now shows piece price |
| Richmond VA warehouse (31) not available | Warehouse 31 (Richmond, VA) added | July 2024 | 9 warehouses total now |
| node-soap used `request` HTTP lib | node-soap uses Axios (since v0.40.0) | 2023 | Better HTTP handling, connection pooling |

**New tools/patterns to consider:**
- **PSRESTful:** REST/JSON wrapper for PromoStandards SOAP ($99/mo, free tier 10 calls/day). Could be useful as a fallback or for prototyping before building full SOAP client.
- **wsdl-tsclient:** Generate TypeScript interfaces from WSDL files. Could auto-generate types for all SanMar response objects.
- **PromoStandards partIdArray batch:** Inventory V2.0.0 now supports up to 200 partIds per call. Useful for batch inventory checks (e.g., checking stock for all variants of a product in one call).

**Deprecated/outdated:**
- **Dozens pricing:** All "dozen" fields now return piece price. Don't display or calculate with dozen pricing.
- **Edev environment:** Replaced by "Test" environment. Old URLs like `edev-ws.sanmar.com` no longer work.
- **promostandards-sdk-js:** Pre-alpha (v0.1.11), unmaintained, zero dependents. Do not use in production.
</sota_updates>

<open_questions>
## Open Questions

Things that couldn't be fully resolved:

1. **SanMar API credentials not yet provisioned**
   - What we know: HotBox has an active SanMar wholesale account. API access requires emailing sanmarintegrations@sanmar.com and signing an integration agreement.
   - What's unclear: Whether credentials have been requested yet, and how long until they're provisioned (SanMar says 1-2 business days after signed agreement).
   - Recommendation: Store owner should initiate the onboarding process ASAP. Phase 5 execution is blocked until credentials are available. The client code can be built and tested against SanMar's production WSDLs (SanMar recommends using production for product/inventory/pricing testing).

2. **Exact SOAP argument structure for node-soap**
   - What we know: SanMar's docs show raw XML request/response. node-soap converts these to JavaScript objects, but the exact object structure depends on WSDL parsing.
   - What's unclear: Whether node-soap's arg mapping matches the XML structure exactly (e.g., `arg0`, `arg1` vs named parameters).
   - Recommendation: Use `client.describe()` after creating client to discover exact method signatures. Build and test iteratively.

3. **PromoStandards vs SanMar Standard: which to prefer?**
   - What we know: Both work. PromoStandards has richer data (GTIN, PMS colors, batch inventory). SanMar Standard is simpler and returns all data in one call.
   - What's unclear: Whether one is more reliable or faster than the other in practice.
   - Recommendation: Start with SanMar Standard `getProductInfoByStyleColorSize` (simplest, most documented). Add PromoStandards endpoints where needed (batch inventory, media content).

4. **FTP access for Phase 8 (Inventory Monitoring)**
   - What we know: FTP credentials are separate from API credentials. FTP `sanmar_dip.txt` is SanMar's recommended approach for frequent bulk inventory checks.
   - What's unclear: Whether FTP access is automatically included in the integration agreement or requires a separate request.
   - Recommendation: Ask about FTP access during the onboarding process. Phase 5 doesn't need FTP, but Phase 8 likely will.
</open_questions>

<sanmar_api_reference>
## SanMar API Quick Reference

### WSDLs (Production)
| Service | URL |
|---------|-----|
| Product Info (Standard) | `https://ws.sanmar.com:8080/SanMarWebService/SanMarProductInfoServicePort?wsdl` |
| Inventory (Standard) | `https://ws.sanmar.com:8080/SanMarWebService/SanMarWebServicePort?wsdl` |
| Pricing (Standard) | `https://ws.sanmar.com:8080/SanMarWebService/SanMarPricingServicePort?wsdl` |
| Product Data (PS v2.0.0) | `https://ws.sanmar.com:8080/promostandards/ProductDataServiceV2.xml?wsdl` |
| Inventory (PS v2.0.0) | `https://ws.sanmar.com:8080/promostandards/InventoryServiceBindingV2final?WSDL` |
| Media Content (PS v1.1.0) | `https://ws.sanmar.com:8080/promostandards/MediaContentServiceBinding?wsdl` |
| Pricing (PS) | `https://ws.sanmar.com:8080/promostandards/PricingAndConfigServiceBinding?wsdl` |

### WSDLs (Test)
Same URLs with `test-ws.sanmar.com` instead of `ws.sanmar.com`.

### Authentication
| API Type | Fields |
|----------|--------|
| SanMar Standard | `sanMarCustomerNumber` (INT), `sanMarUserName` (STRING), `sanMarUserPassword` (STRING) |
| PromoStandards | `id` (STRING = sanmar.com username), `password` (STRING = sanmar.com password) |

### Key Methods (Phase 5 Scope)
| Method | Service | Returns |
|--------|---------|---------|
| `getProductInfoByStyleColorSize` | Standard Product | Full product data + images + pricing for a style/color/size |
| `getInventoryQtyForStyleColorSize` | Standard Inventory | Quantity per warehouse for a style (supports style-only queries) |
| `getPricing` | Standard Pricing | Piece/case/sale prices for a style/color/size |
| `GetProduct` | PS Product Data v2.0.0 | Rich product data with GTIN, PMS, categories, companions |
| `GetInventoryLevels` | PS Inventory v2.0.0 | Per-warehouse inventory with batch partIdArray support (200 max) |
| `GetMediaContent` | PS Media v1.1.0 | All image URLs with classType metadata |

### Warehouses
| ID | Location |
|----|----------|
| 1 | Seattle, WA |
| 2 | Cincinnati, OH |
| 3 | Dallas, TX |
| 4 | Reno, NV |
| 5 | Robbinsville, NJ |
| 6 | Jacksonville, FL |
| 7 | Minneapolis, MN |
| 12 | Phoenix, AZ |
| 31 | Richmond, VA |

### Product Statuses
| Status | Meaning | Use in HotBox? |
|--------|---------|----------------|
| Coming Soon | Data incomplete, not purchasable | No -- skip |
| New | Recently released, available | Yes |
| Regular | Standard active product | Yes |
| Active | Umbrella term for sellable | Yes |
| Discontinued | End of lifecycle, may have remaining stock | No -- filter out |

### Pricing Codes (MSRP Markup)
| Code | Suggested Retail Markup |
|------|----------------------|
| A/P | 50% |
| B/Q | 45% |
| C/R | 40% |
| D/S | 35% |
| E/T | 30% |

### Brand Restrictions (Cannot Sell Blank/Undecorated)
Brooks Brothers, Carhartt, Cotopaxi, Eddie Bauer, New Era, Nike, OGIO, Outdoor Research, Stanley/Stella, tentree, The North Face, Tommy Bahama, Travis Mathew

### MAP Pricing Tiers
| Tier | Max Discount | Brands |
|------|-------------|--------|
| 10% off MSRP | Standard MAP | Most retail brands (Nike, North Face, Eddie Bauer, etc.) |
| 20% off MSRP | Private label MAP | Port & Co, Port Authority, Sport-Tek, District, etc. |
| MSRP (no discount) | Full price only | Carhartt, Nike Bags, Tommy Bahama |
| No MAP | Unrestricted | Bella+Canvas, Gildan, Next Level, Comfort Colors, etc. |
</sanmar_api_reference>

<sources>
## Sources

### Primary (HIGH confidence)
- SanMar Web Services Integration Guide v24.2 (September 2025) -- in-repo at `SanMar-Web-Services-Integration-Guide-24.2.md`. Complete API reference with all endpoints, request/response schemas, code examples.
- SanMar FTP Integration Guide v23.3 (September 2025) -- in-repo at `SanMar-FTP-Integration-Guide-v23.3.md`. FTP data file schemas, inventory file formats, best practices.
- SanMar Purchase Order Integration Guide 24.2 (September 2025) -- in-repo at `SanMar-Purchase-Order-Integration-Guide-24.2.md`. PO submission (out of Phase 5 scope but useful for later phases).
- node-soap npm package docs (v1.6.x) -- https://www.npmjs.com/package/soap, https://github.com/vpulim/node-soap

### Secondary (MEDIUM confidence)
- SanMar Electronic Integrations page -- https://www.sanmar.com/resources/electronicintegration/integrationofferings
- SanMar Data Library -- https://www.sanmar.com/resources/electronicintegration/sanmardatalibrary
- PromoStandards official site -- https://promostandards.org/
- PSRESTful documentation -- https://psrestful.com/, https://docs.psrestful.com/
- wsdl-tsclient -- https://github.com/dderevjanik/wsdl-tsclient
- APIWORX DIY Developer Guide for SanMar -- https://apiworx.com/diy-developer-guide-building-custom-integrations-for-sanmar/

### Tertiary (LOW confidence - needs validation during implementation)
- promostandards-sdk-js -- https://github.com/manishrc/promostandards-sdk-js (unmaintained, reference only)
- Shopify community threads on SanMar integration -- developer experience reports but platform-specific
- node-soap argument mapping for SanMar WSDLs -- needs validation by calling `client.describe()` with actual credentials
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: SanMar SOAP Web Services API + PromoStandards
- Ecosystem: node-soap, wsdl-tsclient, PromoStandards SDK landscape
- Patterns: SOAP client factory, dual API strategy, auth management
- Pitfalls: Color field confusion, timeouts, port 8080, discontinued products, brand restrictions

**Confidence breakdown:**
- Standard stack: HIGH -- node-soap is verified as the only viable Node.js SOAP library; SanMar docs are comprehensive
- Architecture: HIGH -- patterns derived directly from SanMar's official documentation and best practices
- Pitfalls: HIGH -- documented in SanMar's own integration guide and verified via community reports
- Code examples: MEDIUM -- XML request/response structures from SanMar docs, node-soap object mapping needs validation with actual credentials
- API reference: HIGH -- copied directly from official SanMar documentation (v24.2, September 2025)

**Research date:** 2026-01-30
**Valid until:** 2026-03-01 (30 days -- SanMar API is stable; last breaking change was March 2025 test env rename)
</metadata>

---

*Phase: 05-sanmar-api-foundation*
*Research completed: 2026-01-30*
*Ready for planning: yes*
