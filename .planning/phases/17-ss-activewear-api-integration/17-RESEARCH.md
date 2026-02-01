# Phase 17: S&S Activewear API Integration - Research

**Researched:** 2026-02-01
**Domain:** S&S Activewear REST API integration + multi-vendor abstraction
**Confidence:** HIGH

<research_summary>
## Summary

Researched the S&S Activewear API ecosystem for building a second vendor pipeline alongside the existing SanMar integration. S&S Activewear provides a **REST/JSON API (V2)** at `api.ssactivewear.com` — a fundamentally different protocol from SanMar's SOAP/WSDL services. Authentication is HTTP Basic (account number + API key), rate-limited to 60 requests/minute, with product, inventory, pricing, and media data all available from a **single unified endpoint** (`/v2/products/`) rather than SanMar's 7 separate WSDL services.

The key architectural challenge is that S&S returns **flat product objects** (one JSON object per SKU with all fields inline — product info, pricing, images, inventory) while SanMar returns **nested structured objects** from separate service calls. The multi-vendor abstraction must normalize these two very different shapes into unified types that the existing pipeline, monitoring, and sync systems consume.

S&S also offers PromoStandards SOAP endpoints (same standard SanMar uses) as an alternative — but the REST API is simpler, better documented, and provides the same data in fewer calls.

**Primary recommendation:** Use S&S REST API V2 (not PromoStandards SOAP). Build a VendorAdapter interface that both SanMar and S&S implement, with unified types the pipeline consumes. The adapter pattern cleanly separates vendor-specific API details from the vendor-agnostic pipeline.
</research_summary>

<standard_stack>
## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Node.js built-in `fetch` | Node 18+ | HTTP client for S&S REST API | Zero dependencies, native in Node 18+, already using ESM |
| `node-soap` | (existing) | SOAP client for SanMar | Already integrated for SanMar; not needed for S&S |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None new required | - | - | S&S REST API needs no special libraries |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| S&S REST API V2 | S&S PromoStandards SOAP | PromoStandards shares interface with SanMar but REST is simpler, fewer calls, better docs |
| Built-in fetch | axios/node-fetch | Built-in fetch is sufficient for Basic Auth + JSON; no need for library overhead |
| Custom adapter | Generic multi-vendor framework | No npm packages exist for S&S; custom adapter matches project patterns |

### Why No New Dependencies

S&S Activewear's REST API is HTTP Basic Auth + JSON. Node 18+ built-in `fetch` with `Authorization: Basic ${base64}` header handles this natively. No SOAP parsing, no WSDL resolution, no XML — just JSON REST calls. This is significantly simpler than SanMar.

**Installation:**
```bash
# No new packages needed — S&S uses REST/JSON with built-in fetch
# Existing project stack handles everything
```
</standard_stack>

<architecture_patterns>
## Architecture Patterns

### Recommended Project Structure
```
scripts/
├── vendor/                    # NEW: Vendor abstraction layer
│   ├── index.ts               # VendorAdapter interface + registry
│   ├── types.ts               # Unified vendor-agnostic types
│   └── registry.ts            # Vendor selection (sanmar | ss)
├── sanmar/                    # EXISTING: SanMar-specific implementation
│   ├── adapter.ts             # NEW: Implements VendorAdapter for SanMar
│   └── ... (existing files)   # Unchanged internal implementation
├── ss-activewear/             # NEW: S&S-specific implementation
│   ├── index.ts               # Public API (mirrors sanmar/index.ts pattern)
│   ├── auth.ts                # Basic Auth credential management
│   ├── client.ts              # REST client with rate limiting
│   ├── constants.ts           # Warehouses, base URL, etc.
│   ├── adapter.ts             # Implements VendorAdapter for S&S
│   ├── services/
│   │   ├── product.ts         # Product queries (GET /v2/products/)
│   │   ├── inventory.ts       # Inventory queries (GET /v2/inventory/)
│   │   └── styles.ts          # Style/catalog queries (GET /v2/styles/)
│   ├── types/
│   │   ├── product.ts         # S&S API response types
│   │   ├── inventory.ts       # S&S inventory response types
│   │   └── common.ts          # Shared S&S types
│   └── utils/
│       ├── rate-limiter.ts    # 60 req/min throttle
│       └── error-handler.ts   # Error classification
├── pipeline/                  # EXISTING: Modified to use VendorAdapter
│   ├── fetch-product.ts       # Takes vendor parameter
│   └── ...
└── monitor/                   # EXISTING: Modified to use VendorAdapter
    └── ...
```

### Pattern 1: Vendor Adapter Interface
**What:** Abstract interface that both SanMar and S&S implement
**When to use:** Any vendor-specific operation called from pipeline/monitor/sync
**Example:**
```typescript
// scripts/vendor/types.ts — Unified types
export type VendorId = 'sanmar' | 'ss';

export interface UnifiedProduct {
  vendor: VendorId;
  brandName: string;
  style: string;            // SanMar style number or S&S partNumber
  productTitle: string;
  description: string;
  color: string;
  colorCode: string;        // catalogColor (SanMar) or colorCode (S&S)
  size: string;
  sizeOrder: string;
  category: string;
  pieceWeight: number;
  status: string;
}

export interface UnifiedPricing {
  vendor: VendorId;
  piecePrice: number;
  casePrice: number;
  salePrice: number | null;
  saleExpiration: string | null;
  customerPrice?: number;    // S&S-specific negotiated price
  mapPrice?: number;         // S&S MAP price
}

export interface UnifiedInventory {
  vendor: VendorId;
  style: string;
  color: string;
  size: string;
  totalQty: number;
  warehouses: UnifiedWarehouse[];
}

export interface UnifiedWarehouse {
  id: string;               // warehouseAbbr (S&S) or whseID (SanMar)
  name: string;
  qty: number;
}

export interface UnifiedMedia {
  vendor: VendorId;
  color: string;
  frontImage: string | null;
  backImage: string | null;
  sideImage: string | null;
  swatchImage: string | null;
  onModelFront: string | null;
  onModelBack: string | null;
  onModelSide: string | null;
}

// scripts/vendor/index.ts — Adapter interface
export interface VendorAdapter {
  readonly vendorId: VendorId;

  // Product data
  getProductsByStyle(style: string): Promise<UnifiedProduct[]>;
  getProductVariant(style: string, color: string, size: string): Promise<UnifiedProduct | null>;

  // Pricing
  getStylePricing(style: string): Promise<UnifiedPricing[]>;

  // Inventory
  getStyleInventory(style: string): Promise<UnifiedInventory[]>;

  // Media
  getProductImages(style: string): Promise<UnifiedMedia[]>;

  // Validation
  validateCredentials(): Promise<boolean>;
}
```

### Pattern 2: Rate-Limited REST Client for S&S
**What:** HTTP client with built-in 60 req/min throttle and retry logic
**When to use:** All S&S API calls
**Example:**
```typescript
// scripts/ss-activewear/client.ts
const RATE_LIMIT = 60;  // requests per minute
const RATE_WINDOW = 60_000; // ms

class SSClient {
  private requestTimes: number[] = [];

  async get<T>(path: string, params?: Record<string, string>): Promise<T> {
    await this.throttle();
    const url = new URL(path, 'https://api.ssactivewear.com/v2/');
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, v);
      }
    }
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountNumber}:${apiKey}`).toString('base64')}`,
        'Accept': 'application/json',
      },
    });
    if (!response.ok) {
      throw new SSError(response.status, await response.text());
    }
    this.requestTimes.push(Date.now());
    return response.json() as T;
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(t => now - t < RATE_WINDOW);
    if (this.requestTimes.length >= RATE_LIMIT) {
      const waitUntil = this.requestTimes[0] + RATE_WINDOW;
      await new Promise(resolve => setTimeout(resolve, waitUntil - now));
    }
  }
}
```

### Pattern 3: Vendor Registry
**What:** Central registry to select vendor adapter by ID
**When to use:** CLI commands, pipeline entry points, monitor configuration
**Example:**
```typescript
// scripts/vendor/registry.ts
import type { VendorAdapter, VendorId } from './types.js';

const adapters = new Map<VendorId, VendorAdapter>();

export function registerVendor(adapter: VendorAdapter): void {
  adapters.set(adapter.vendorId, adapter);
}

export function getVendor(id: VendorId): VendorAdapter {
  const adapter = adapters.get(id);
  if (!adapter) throw new Error(`Unknown vendor: ${id}`);
  return adapter;
}

export function getDefaultVendor(): VendorAdapter {
  return getVendor('sanmar'); // backward compatibility
}
```

### Anti-Patterns to Avoid
- **Sharing SOAP/REST client code:** SanMar uses SOAP, S&S uses REST — don't try to abstract the transport layer. Abstract at the data layer (unified types) instead.
- **Modifying SanMar service internals:** Don't refactor the working SanMar code. Add an adapter wrapper around it that maps to unified types.
- **Single endpoint for everything:** S&S `/v2/products/` returns everything (product + pricing + inventory + images) in one call, but don't force SanMar to match this pattern. Let each adapter fetch data however its API works best.
- **Ignoring rate limits:** S&S has a hard 60 req/min limit. SanMar has no documented rate limit but can timeout. Handle each vendor's constraints independently.
</architecture_patterns>

<dont_hand_roll>
## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP Basic Auth | Custom auth header builder | `Buffer.from().toString('base64')` | Standard pattern, one line |
| Rate limiting | setTimeout chains | Sliding window queue pattern | Prevents race conditions in concurrent calls |
| JSON response parsing | Custom parser | `response.json()` built-in | Native, handles edge cases |
| SOAP client for S&S | node-soap setup | S&S REST API V2 | REST is simpler, same data, fewer dependencies |
| Product data normalization | Ad-hoc field mapping | Typed adapter with compile-time checks | TypeScript catches mapping errors at build time |
| Retry logic | Custom retry | Adapt existing `scripts/sanmar/utils/retry.ts` | Already battle-tested in SanMar integration |

**Key insight:** The biggest "don't hand-roll" for this phase is: don't build S&S integration using PromoStandards SOAP when a cleaner REST API exists. The REST API returns the same data with less complexity. PromoStandards would share the SOAP infrastructure with SanMar, but the complexity of maintaining two SOAP implementations outweighs the code sharing benefit.
</dont_hand_roll>

<common_pitfalls>
## Common Pitfalls

### Pitfall 1: S&S Flat Response vs SanMar Nested Response
**What goes wrong:** Assuming S&S data is structured like SanMar's separate services
**Why it happens:** SanMar has 7 SOAP endpoints returning focused data. S&S `/v2/products/?style=X` returns ONE flat array where each element contains product info, pricing, images, AND inventory all in one object.
**How to avoid:** Design the adapter to accept the flat S&S response and decompose it into the unified types (UnifiedProduct, UnifiedPricing, UnifiedInventory, UnifiedMedia) in a single pass.
**Warning signs:** Making 4 separate S&S API calls to get product + pricing + inventory + images when one call gets all of them.

### Pitfall 2: Rate Limit Exhaustion During Inventory Monitoring
**What goes wrong:** Monitoring 20+ S&S products with hot polling hits 60 req/min limit
**Why it happens:** SanMar has no documented rate limit. S&S has a hard 60/min cap.
**How to avoid:** The rate limiter must be shared across ALL S&S API usage (pipeline, monitoring, sync). Use S&S `/v2/inventory/` endpoint for monitoring (lighter than full products), and batch style queries with comma-separated IDs.
**Warning signs:** HTTP 429 responses, `X-Rate-Limit-Remaining: 0` header.

### Pitfall 3: Style Number Semantics Differ
**What goes wrong:** Using SanMar "style" (e.g., "PC61") directly as S&S "partNumber" (e.g., "00760")
**Why it happens:** Both vendors sell the same brands (Gildan, Port & Company, etc.) but use different part number schemes.
**How to avoid:** Treat style/partNumber as vendor-scoped identifiers. The unified type should have `vendorStyle: string` that's specific to each vendor. Never assume cross-vendor compatibility.
**Warning signs:** 404 errors when looking up a SanMar style on S&S or vice versa.

### Pitfall 4: Image URL Construction Differences
**What goes wrong:** Building S&S image URLs with SanMar patterns or vice versa
**Why it happens:** SanMar returns full URLs from PromoStandards MediaContent. S&S returns relative paths with size suffixes (`_fm`, `_fl`, `_fs`).
**How to avoid:** S&S images need base URL prepended: `https://www.ssactivewear.com/Images/Style/...`. Always use the `_fl` (full/large) suffix for product images, replacing the default `_fm` (medium). Each adapter normalizes to full absolute URLs.
**Warning signs:** Broken images in preview server, 404 on image fetch.

### Pitfall 5: S&S Warehouse Abbreviation vs SanMar Warehouse ID
**What goes wrong:** Mixing up warehouse identifiers — S&S uses state codes ("IL", "TX", "NV"), SanMar uses numeric IDs (1, 2, 3...)
**Why it happens:** Both have warehouses[] in inventory but with incompatible schemas
**How to avoid:** Unified `UnifiedWarehouse` type uses `id: string` (accepts both), with `name: string` for display. Each adapter maps its native format. S&S has ~14 warehouses (some closing in 2026), SanMar has 9.
**Warning signs:** Warehouse breakdown shows numeric IDs for S&S or string codes for SanMar.

### Pitfall 6: Pricing Structure Mismatch
**What goes wrong:** Missing S&S-specific pricing fields (mapPrice, customerPrice) or assuming SanMar's priceCode system applies
**Why it happens:** S&S has MAP (Minimum Advertised Price), negotiated customerPrice, and no priceCode markup system. SanMar has priceCode letters (A-E, P-T) with markup percentages.
**How to avoid:** Unified pricing uses `piecePrice` (wholesale cost) and `salePrice` as the common fields. Vendor-specific fields (priceCode, mapPrice) are optional. The cost tracking system already stores per-product costs, so vendor pricing quirks are captured at creation time.
**Warning signs:** Margin calculations wrong for S&S products, MAP violations if listing below mapPrice.
</common_pitfalls>

<code_examples>
## Code Examples

Verified patterns from official S&S API documentation:

### S&S Product Fetch (Single Style)
```typescript
// Source: api.ssactivewear.com/V2/Products.aspx
// GET /v2/products/?style={partNumber}

interface SSProduct {
  skuID: number;
  sku: string;
  gtin: string;
  styleID: number;
  brandName: string;
  styleName: string;       // e.g., "2000" for Gildan Ultra Cotton
  colorName: string;
  colorCode: string;
  colorGroup: string;
  colorFamily: string;
  sizeName: string;
  sizeCode: string;
  sizeOrder: string;
  caseQty: number;
  unitWeight: number;
  mapPrice: number;
  piecePrice: number;
  dozenPrice: number;
  casePrice: number;
  salePrice: number;
  customerPrice: number;
  saleExpiration: string;  // MM/DD/YYYY format
  qty: number;             // Combined across all warehouses
  warehouses: SSWarehouse[];
  // Image fields (all return _fm medium by default)
  colorSwatchImage: string;
  colorFrontImage: string;
  colorSideImage: string;
  colorBackImage: string;
  colorDirectSideImage: string;
  colorOnModelFrontImage: string;
  colorOnModelSideImage: string;
  colorOnModelBackImage: string;
}

interface SSWarehouse {
  warehouseAbbr: string;   // "IL", "TX", "NV", etc.
  skuID: number;
  qty: number;
  closeout: boolean;
  dropship: boolean;
  excludeFreeFreight: boolean;
  fullCaseOnly: boolean;
  returnable: boolean;
}
```

### S&S Authentication
```typescript
// Source: api.ssactivewear.com/V2/Help_Examples.aspx
// HTTP Basic Auth with Account Number + API Key

async function fetchSSProducts(partNumber: string): Promise<SSProduct[]> {
  const credentials = Buffer.from(
    `${process.env.SS_ACCOUNT_NUMBER}:${process.env.SS_API_KEY}`
  ).toString('base64');

  const response = await fetch(
    `https://api.ssactivewear.com/v2/products/?style=${encodeURIComponent(partNumber)}`,
    {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`S&S API error: ${response.status}`);
  }

  // Check rate limit header
  const remaining = response.headers.get('X-Rate-Limit-Remaining');
  if (remaining && parseInt(remaining) < 5) {
    console.warn(`S&S rate limit low: ${remaining} requests remaining`);
  }

  return response.json();
}
```

### S&S Inventory-Only Fetch (Lighter for Monitoring)
```typescript
// Source: api.ssactivewear.com/V2/Inventory.aspx
// GET /v2/inventory/?style={partNumber} — returns only SKU + warehouse qty

interface SSInventoryItem {
  sku: string;
  gtin: string;
  skuID_Master: number;
  yourSku: string;
  styleID: number;
  warehouses: { warehouseAbbr: string; skuID: number; qty: number }[];
}

// Use for monitoring — fewer fields, faster response
async function fetchSSInventory(partNumber: string): Promise<SSInventoryItem[]> {
  return ssClient.get<SSInventoryItem[]>(`inventory/?style=${partNumber}`);
}
```

### S&S Image URL Resolution
```typescript
// Source: api.ssactivewear.com/V2/Products.aspx
// Images returned with _fm (medium) suffix by default
// Replace with _fl for large, _fs for small

const SS_IMAGE_BASE = 'https://www.ssactivewear.com/';

function resolveSSImageUrl(relativePath: string | null, size: 'fl' | 'fm' | 'fs' = 'fl'): string | null {
  if (!relativePath) return null;
  // Replace default _fm with requested size
  const resolved = relativePath.replace(/_fm\./, `_${size}.`);
  return new URL(resolved, SS_IMAGE_BASE).toString();
}
```

### Mapping S&S Flat Data to Unified Types
```typescript
// One S&S product call returns everything — decompose in adapter
function mapSSProductToUnified(ss: SSProduct): {
  product: UnifiedProduct;
  pricing: UnifiedPricing;
  inventory: UnifiedInventory;
  media: UnifiedMedia;
} {
  return {
    product: {
      vendor: 'ss',
      brandName: ss.brandName,
      style: ss.styleName,
      productTitle: `${ss.brandName} ${ss.styleName}`,
      description: '', // Styles endpoint has full description
      color: ss.colorName,
      colorCode: ss.colorCode,
      size: ss.sizeName,
      sizeOrder: ss.sizeOrder,
      category: '',    // Categories endpoint needed
      pieceWeight: ss.unitWeight,
      status: 'Active',
    },
    pricing: {
      vendor: 'ss',
      piecePrice: ss.piecePrice,
      casePrice: ss.casePrice,
      salePrice: ss.salePrice || null,
      saleExpiration: ss.saleExpiration || null,
      customerPrice: ss.customerPrice,
      mapPrice: ss.mapPrice,
    },
    inventory: {
      vendor: 'ss',
      style: ss.styleName,
      color: ss.colorName,
      size: ss.sizeName,
      totalQty: ss.qty,
      warehouses: ss.warehouses.map(w => ({
        id: w.warehouseAbbr,
        name: w.warehouseAbbr, // Use constants for display names
        qty: w.qty,
      })),
    },
    media: {
      vendor: 'ss',
      color: ss.colorName,
      frontImage: resolveSSImageUrl(ss.colorFrontImage),
      backImage: resolveSSImageUrl(ss.colorBackImage),
      sideImage: resolveSSImageUrl(ss.colorSideImage),
      swatchImage: resolveSSImageUrl(ss.colorSwatchImage),
      onModelFront: resolveSSImageUrl(ss.colorOnModelFrontImage),
      onModelBack: resolveSSImageUrl(ss.colorOnModelBackImage),
      onModelSide: resolveSSImageUrl(ss.colorOnModelSideImage),
    },
  };
}
```
</code_examples>

<api_comparison>
## SanMar vs S&S API Comparison

### Protocol & Authentication
| Aspect | SanMar | S&S Activewear |
|--------|--------|----------------|
| Protocol | SOAP/XML via WSDL | REST/JSON |
| Auth | Per-endpoint credentials in SOAP body | HTTP Basic Auth header |
| Credentials | customerNumber + username + password | accountNumber + apiKey |
| Endpoints | 7 separate WSDL services | Single base URL with REST paths |
| Rate limit | None documented (timeouts possible) | 60 requests/minute |
| Env vars | SANMAR_CUSTOMER_NUMBER, SANMAR_USERNAME, SANMAR_PASSWORD | SS_ACCOUNT_NUMBER, SS_API_KEY |

### Data Model Comparison
| Data | SanMar | S&S |
|------|--------|-----|
| Product lookup | `getProductByStyle(style)` → ProductInfo[] | `GET /v2/products/?style=X` → SSProduct[] |
| Style identifier | "style" (e.g., "PC61", "DM130L") | "partNumber" / "styleName" (e.g., "00760", "2000") |
| Color identifier | catalogColor (internal) + color (display) | colorCode (2-digit) + colorName (display) |
| Size ordering | sizeIndex field | sizeOrder field |
| Pricing | Separate getPricing() SOAP call | Inline on product object |
| Inventory | Separate getInventory() SOAP call | Inline on product object OR separate /v2/inventory/ |
| Images | Separate PromoStandards MediaContent SOAP | Inline image URL fields on product object |
| Warehouses | Numeric IDs (1-31), 9 warehouses | State abbreviations (IL, TX, etc.), ~14 warehouses |
| Sale dates | ISO format | MM/DD/YYYY format |
| Inventory cap | 1500 means "≥1500" | No documented cap |

### Endpoint Mapping
| Operation | SanMar Endpoint | S&S Endpoint |
|-----------|----------------|--------------|
| All products for a style | `getProductInfoByStyle` (SOAP) | `GET /v2/products/?style=X` |
| Single variant | `getProductInfoByStyleColorSize` (SOAP) | `GET /v2/products/{sku}` |
| Style-level pricing | `getPricing` (SOAP) | Inline on `/v2/products/` response |
| Per-warehouse inventory | `getInventoryQtyForStyleColorSize` (SOAP) | `GET /v2/inventory/?style=X` or inline |
| Product images | `GetMediaContent` (PromoStandards SOAP) | Inline image fields on `/v2/products/` |
| Style metadata | `getProductInfoByStyle` | `GET /v2/styles/?style=X` |
| Brand list | N/A (in product data) | `GET /v2/brands/` |
| Categories | N/A (in product data) | `GET /v2/categories/` |
| Batch inventory | `getInventoryBatch` (up to 200 partIds) | `GET /v2/inventory/{sku1,sku2,...}` |
</api_comparison>

<warehouse_reference>
## S&S Activewear Warehouse Reference

### Active Warehouses (as of 2026-02-01)
| Abbreviation | City | State | Notes |
|-------------|------|-------|-------|
| IL | Bolingbrook/Lockport | Illinois | **Closing 2026** |
| TX | Fort Worth/Dallas | Texas | Dallas **closing 2026** |
| GA | McDonough/Duluth | Georgia | Duluth **closing 2026** |
| KS | Olathe | Kansas | |
| NV | Reno | Nevada | |
| NJ | Robbinsville | New Jersey | |
| PA | Harrisburg/Reading | Pennsylvania | Harrisburg **closing 2026** |
| AZ | Tempe | Arizona | |
| CA | Santa Fe Springs/Fresno | California | Fresno **closing 2026** |
| MA | Middleborough | Massachusetts | |
| FL | Orlando | Florida | |
| OH | West Chester Township | Ohio | |

Note: S&S is consolidating from ~18 DCs to fewer locations in 2026. The API's `warehouseAbbr` field will naturally reflect closures as warehouses go offline.

### SanMar Warehouses (for comparison)
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
</warehouse_reference>

<sota_updates>
## State of the Art (2025-2026)

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PromoStandards SOAP for both vendors | REST for S&S, SOAP for SanMar | S&S V2 REST API stable | Simpler S&S integration, different from SanMar |
| Manual multi-vendor frameworks | TypeScript adapter pattern | Industry standard | Clean abstraction, compile-time safety |
| Koleok npm library (2015 Meteor) | Build custom — no maintained library | Library abandoned ~2015 | Must build from scratch using native fetch |
| S&S 18+ warehouses | Consolidating to fewer DCs | 2026 closures announced | Warehouse list will shrink; design for dynamic list |

**New tools/patterns to consider:**
- **S&S MCP Server:** An MCP server for S&S Activewear exists (community-built) but is not relevant for this CLI tool integration
- **Node.js 18+ native fetch:** Eliminates need for axios/node-fetch dependencies for REST APIs
- **S&S FTP data library:** For bulk catalog imports, S&S offers downloadable Excel files updated nightly (products) and every 15 min (inventory) — useful for initial data seeding but API is better for real-time operations

**Deprecated/outdated:**
- **Koleok/ss-activewear-api npm:** Last updated 2015, Meteor-only, 8 commits total — do not use
- **S&S PromoStandards for primary integration:** REST API is recommended over SOAP for S&S
</sota_updates>

<open_questions>
## Open Questions

Things that couldn't be fully resolved:

1. **S&S API credential availability**
   - What we know: Auth requires Account Number + API Key from My Account page
   - What's unclear: Whether the store owner already has an S&S Activewear account with API access
   - Recommendation: Add credential validation step early in phase execution. Env vars: `SS_ACCOUNT_NUMBER`, `SS_API_KEY`

2. **S&S image resolution specifics**
   - What we know: Three sizes via suffix (`_fl` large, `_fm` medium, `_fs` small)
   - What's unclear: Exact pixel dimensions for each size
   - Recommendation: Use `_fl` (large) for product creation, `_fs` for swatches. Test with actual API response to confirm quality.

3. **Cross-vendor product matching**
   - What we know: Both vendors carry same brands (Gildan, Port & Company, etc.) but use different style numbers
   - What's unclear: Whether there's a reliable mapping between SanMar style numbers and S&S partNumbers
   - Recommendation: Don't attempt cross-vendor matching. Each product is vendor-scoped. If the user wants the same product from S&S instead of SanMar, they look up the S&S part number separately.

4. **S&S `customerPrice` field behavior**
   - What we know: S&S returns a `customerPrice` that may be a negotiated rate specific to the account
   - What's unclear: Whether this is always populated or only for accounts with negotiated pricing
   - Recommendation: Use `piecePrice` as the standard wholesale cost (same as SanMar). Show `customerPrice` when it differs from `piecePrice`.

5. **S&S `noeRetailing` flag handling**
   - What we know: When true, products cannot be sold on eBay/Amazon/Walmart
   - What's unclear: Whether this applies to WIX stores (it targets major marketplace platforms)
   - Recommendation: Surface as a warning during product creation but don't block. HotBox is a branded storefront, not a marketplace seller.
</open_questions>

<sources>
## Sources

### Primary (HIGH confidence)
- [S&S Activewear API V2 Documentation](https://api.ssactivewear.com/V2/Default.aspx) — Full endpoint reference, auth, rate limits
- [S&S Products Endpoint](https://api.ssactivewear.com/V2/Products.aspx) — Complete product object schema with all fields
- [S&S Inventory Endpoint](https://api.ssactivewear.com/V2/Inventory.aspx) — Inventory response structure, warehouse filtering
- [S&S Styles Endpoint](https://api.ssactivewear.com/V2/Styles.aspx) — Style metadata, search, descriptions
- [S&S Categories Endpoint](https://api.ssactivewear.com/V2/Categories.aspx) — Category structure
- [S&S Brands Endpoint](https://api.ssactivewear.com/V2/Brands.aspx) — Brand listing with images
- [S&S Specs Endpoint](https://api.ssactivewear.com/V2/Specs.aspx) — Product specifications
- [S&S Code Examples](https://api.ssactivewear.com/V2/Help_Examples.aspx) — Authentication patterns
- [S&S Orders POST](https://api.ssactivewear.com/V2/Orders_Post.aspx) — Order submission (future use)
- [S&S PromoStandards Portal](https://promostandards.ssactivewear.com/) — SOAP endpoint inventory
- [S&S Electronic Integration Page](https://www.ssactivewear.com/marketing/edi) — Integration options overview

### Secondary (MEDIUM confidence)
- [S&S Warehouse Locations (Qtees)](https://qtees.com/ss-activewear-warehouse-locations/) — Warehouse list verified against API docs
- [Adapter Pattern for Vendor Integrations (Bocoup)](https://www.bocoup.com/blog/adapter-pattern-a-must-for-vendor-service-integrations) — Architecture pattern reference
- [Adapter Pattern in TypeScript (Refactoring.guru)](https://refactoring.guru/design-patterns/adapter/typescript/example) — Implementation reference
- [Supply Master Shopify App](https://apps.shopify.com/supply-master) — Multi-vendor integration patterns (SanMar + S&S)
- [ImprintNext Supplier Integration](https://imprintnext.com/blog/supplier-catalog-integration-with-sanmar-ss-activewear-alphabroder) — Industry multi-vendor patterns

### Tertiary (LOW confidence - needs validation)
- S&S warehouse closures for 2026 — confirmed via S&S announcement PDF but exact timeline unclear
- `X-Rate-Limit-Remaining` header — documented in API overview but exact header name should be verified with actual API response
</sources>

<metadata>
## Metadata

**Research scope:**
- Core technology: S&S Activewear REST API V2
- Ecosystem: No libraries needed — native fetch + JSON
- Patterns: Adapter pattern for multi-vendor abstraction
- Pitfalls: Flat vs nested data, rate limiting, style number semantics, image URLs, warehouse ID formats, pricing structure differences

**Confidence breakdown:**
- Standard stack: HIGH — S&S REST API well documented, no dependencies needed
- Architecture: HIGH — Adapter pattern is well-established for multi-vendor, existing SanMar code is well-structured for wrapping
- Pitfalls: HIGH — Direct comparison of SanMar and S&S API documentation reveals specific differences
- Code examples: HIGH — All examples derived from official S&S API documentation
- Data mapping: MEDIUM — Field mapping based on API docs; actual API responses may reveal additional quirks

**Research date:** 2026-02-01
**Valid until:** 2026-03-03 (30 days — S&S API V2 is stable, warehouse closures are ongoing)
</metadata>

---

*Phase: 17-ss-activewear-api-integration*
*Research completed: 2026-02-01*
*Ready for planning: yes*
