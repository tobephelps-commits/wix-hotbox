/**
 * WIX Catalog V1 REST API Service
 *
 * Wraps fetch calls to the WIX Stores V1 API endpoints for product creation.
 * Handles the multi-step V1 product creation flow:
 *   1. Create base product (with options/variants structure)
 *   2. Add media images (external URLs)
 *   3. Update variant pricing/SKU/weight
 *   4. Optionally add to collection
 *
 * Authentication: Bearer token via WIX_API_KEY environment variable.
 * Site ID: Hardcoded from Phase 1 audit.
 *
 * Phase 6: Product Creation Pipeline
 */

import 'dotenv/config';
import type {
  WixCreateProductRequest,
  WixMediaItem,
  WixVariantUpdate,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

/** WIX site ID from Phase 1 audit */
const WIX_SITE_ID = 'c744cbdb-46f8-4c66-ac76-eb31bd0d52c1';

/** WIX Stores V1 API base URL */
const WIX_API_BASE = 'https://www.wixapis.com/stores/v1';

// =============================================================================
// WIX API Response Types (WIX-specific, defined here)
// =============================================================================

/** WIX product URL structure */
export interface WixProductPageUrl {
  base: string;
  path: string;
}

/** WIX variant stock info */
export interface WixVariantStock {
  trackQuantity: boolean;
  quantity: number;
  inStock: boolean;
}

/** WIX variant price data */
export interface WixVariantPriceData {
  price: number;
  currency: string;
}

/** WIX variant inner data */
export interface WixVariantData {
  priceData: WixVariantPriceData;
  sku: string;
  weight: number;
  visible: boolean;
}

/** WIX variant returned from API */
export interface WixVariant {
  id: string;
  choices: Record<string, string>;
  variant: WixVariantData;
  stock: WixVariantStock;
}

/** WIX product returned from API */
export interface WixProduct {
  id: string;
  name: string;
  visible: boolean;
  productPageUrl: WixProductPageUrl;
  variants: WixVariant[];
  [key: string]: unknown;
}

/** WIX collection returned from API */
export interface WixCollection {
  id: string;
  name: string;
  [key: string]: unknown;
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Get the WIX API key from environment.
 * Throws an actionable error if not configured.
 */
function getApiKey(): string {
  const apiKey = process.env.WIX_API_KEY;
  if (!apiKey) {
    throw new Error(
      'WIX_API_KEY environment variable is not set.\n' +
      'To obtain your API key:\n' +
      '  1. Go to WIX Dashboard -> Developer Tools -> API Keys\n' +
      '  2. Generate an API Key with WIX_STORES.MODIFY_PRODUCTS permission\n' +
      '  3. Add WIX_API_KEY=your_key to your .env file\n' +
      'See .env.example for details.'
    );
  }
  return apiKey;
}

/**
 * Build standard headers for WIX API requests.
 */
function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
    'wix-site-id': WIX_SITE_ID,
  };
}

/**
 * Handle WIX API error responses with descriptive messages.
 * Reads the response body and throws with HTTP status, endpoint, and WIX error details.
 */
async function handleErrorResponse(
  response: Response,
  endpoint: string,
  context?: string,
): Promise<never> {
  let errorBody: string;
  try {
    errorBody = await response.text();
  } catch {
    errorBody = '(unable to read response body)';
  }

  // Parse JSON error if possible for better messages
  let wixMessage = errorBody;
  try {
    const parsed = JSON.parse(errorBody);
    if (parsed.message) {
      wixMessage = parsed.message;
    } else if (parsed.details) {
      wixMessage = JSON.stringify(parsed.details);
    }
  } catch {
    // Use raw text
  }

  const contextStr = context ? ` [${context}]` : '';

  switch (response.status) {
    case 401:
      throw new Error(
        `WIX API 401 Unauthorized at ${endpoint}${contextStr}: ${wixMessage}\n` +
        'Check that WIX_API_KEY in .env is valid and has WIX_STORES.MODIFY_PRODUCTS permission.'
      );
    case 403:
      throw new Error(
        `WIX API 403 Forbidden at ${endpoint}${contextStr}: ${wixMessage}\n` +
        'The API key may lack required permissions. Ensure WIX_STORES.MODIFY_PRODUCTS is enabled.'
      );
    case 404:
      throw new Error(
        `WIX API 404 Not Found at ${endpoint}${contextStr}: ${wixMessage}`
      );
    case 400:
      throw new Error(
        `WIX API 400 Bad Request at ${endpoint}${contextStr}: ${wixMessage}`
      );
    default:
      throw new Error(
        `WIX API ${response.status} at ${endpoint}${contextStr}: ${wixMessage}`
      );
  }
}

// =============================================================================
// Public API Functions
// =============================================================================

/**
 * Create a new product in the WIX store.
 *
 * POST /stores/v1/products
 *
 * @param payload - The product creation request body
 * @returns The created product object (includes `id` for subsequent calls)
 */
export async function createProduct(
  payload: WixCreateProductRequest,
): Promise<WixProduct> {
  const endpoint = `${WIX_API_BASE}/products`;

  console.log(`[WIX API] Creating product: "${payload.product.name}"...`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, payload.product.name);
  }

  const data = await response.json() as { product: WixProduct };
  console.log(`[WIX API] Product created: ${data.product.id}`);
  return data.product;
}

/**
 * Add media images to a product.
 *
 * POST /stores/v1/products/{productId}/media
 *
 * V1 accepts external URLs directly -- no need to upload to WIX Media Manager first.
 *
 * @param productId - The product ID returned from createProduct
 * @param media - Array of media items with URLs and optional choice assignments
 */
export async function addProductMedia(
  productId: string,
  media: WixMediaItem[],
): Promise<void> {
  const endpoint = `${WIX_API_BASE}/products/${productId}/media`;

  console.log(`[WIX API] Adding ${media.length} media items to product ${productId}...`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ media }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, `productId=${productId}`);
  }

  console.log(`[WIX API] ${media.length} media items added to product ${productId}`);
}

/**
 * Update variant pricing, SKU, weight, and visibility for a product.
 *
 * PATCH /stores/v1/products/{productId}/variants
 *
 * V1 accepts choices as Record<string, string> (e.g., { "Color": "Black", "Size": "M" }).
 *
 * @param productId - The product ID
 * @param variants - Array of variant updates with choices, price, cost, weight, sku, visible
 * @returns Updated variants array (includes variant IDs)
 */
export async function updateProductVariants(
  productId: string,
  variants: WixVariantUpdate[],
): Promise<WixVariant[]> {
  const endpoint = `${WIX_API_BASE}/products/${productId}/variants`;

  console.log(`[WIX API] Updating ${variants.length} variants for product ${productId}...`);

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ variants }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, `productId=${productId}`);
  }

  const data = await response.json() as { variants: WixVariant[] };
  console.log(`[WIX API] ${data.variants.length} variants updated for product ${productId}`);
  return data.variants;
}

/**
 * Get a product by ID with full variant data.
 *
 * GET /stores/v1/products/{productId}?includeVariants=true
 *
 * @param productId - The product ID
 * @returns Full product object with variants
 */
export async function getProduct(
  productId: string,
): Promise<WixProduct> {
  const endpoint = `${WIX_API_BASE}/products/${productId}?includeVariants=true`;

  console.log(`[WIX API] Fetching product ${productId}...`);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, `productId=${productId}`);
  }

  const data = await response.json() as { product: WixProduct };
  return data.product;
}

/**
 * Add a product to a collection.
 *
 * POST /stores/v1/collections/{collectionId}/productIds
 *
 * @param productId - The product ID to add
 * @param collectionId - The collection ID to add the product to
 */
export async function addProductToCollection(
  productId: string,
  collectionId: string,
): Promise<void> {
  const endpoint = `${WIX_API_BASE}/collections/${collectionId}/productIds`;

  console.log(`[WIX API] Adding product ${productId} to collection ${collectionId}...`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ productIds: [productId] }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, `productId=${productId}, collectionId=${collectionId}`);
  }

  console.log(`[WIX API] Product ${productId} added to collection ${collectionId}`);
}

/**
 * Query products using the WIX V1 product query endpoint.
 *
 * POST /stores/v1/products/query
 *
 * WIX V1 quirk: the filter field is a JSON **string**, not a nested object.
 * If no filter is provided, all products are returned (subject to pagination).
 *
 * @param filter - Optional filter object (will be stringified for the V1 API)
 * @param limit - Max products per page (default: 100, WIX max)
 * @returns Array of products matching the query
 */
export async function queryProducts(
  filter?: Record<string, unknown>,
  limit?: number,
): Promise<WixProduct[]> {
  const endpoint = `${WIX_API_BASE}/products/query`;
  const pageSize = limit ?? 100;
  const allProducts: WixProduct[] = [];
  let offset = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const body: Record<string, unknown> = {
      query: {
        ...(filter ? { filter: JSON.stringify(filter) } : {}),
        paging: { limit: pageSize, offset },
      },
      includeVariants: true,
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleErrorResponse(response, endpoint, 'queryProducts');
    }

    const data = await response.json() as {
      products: WixProduct[];
      totalResults: number;
    };

    allProducts.push(...data.products);

    // Check if there are more pages
    if (allProducts.length >= data.totalResults || data.products.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return allProducts;
}

/**
 * List all products in the WIX store.
 *
 * Convenience function that paginates through all products
 * using queryProducts with no filter.
 *
 * @returns Array of all products in the store
 */
export async function listAllProducts(): Promise<WixProduct[]> {
  console.log('[WIX API] Listing all products...');
  const products = await queryProducts();
  console.log(`[WIX API] Found ${products.length} total products.`);
  return products;
}

// =============================================================================
// Collection Functions (Phase 12: Multi-Collection Product Routing)
// =============================================================================

/**
 * List all collections in the WIX store.
 *
 * POST /stores/v1/collections/query
 *
 * Paginates through all collections using the same query pattern as queryProducts.
 *
 * @returns Array of all collections with id and name
 */
export async function listCollections(): Promise<WixCollection[]> {
  const endpoint = `${WIX_API_BASE}/collections/query`;
  const pageSize = 100;
  const allCollections: WixCollection[] = [];
  let offset = 0;

  console.log('[WIX API] Listing all collections...');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const body = {
      query: {
        paging: { limit: pageSize, offset },
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      await handleErrorResponse(response, endpoint, 'listCollections');
    }

    const data = await response.json() as {
      collections: WixCollection[];
      totalResults: number;
    };

    allCollections.push(...data.collections);

    // Check if there are more pages
    if (allCollections.length >= data.totalResults || data.collections.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  console.log(`[WIX API] Found ${allCollections.length} collections.`);
  return allCollections;
}

/**
 * Get a collection by name (case-insensitive match).
 *
 * Queries all collections and finds one matching the given name.
 * Throws a descriptive error listing available collections if not found.
 *
 * @param name - Collection name to search for (case-insensitive)
 * @returns The matching WixCollection
 */
export async function getCollectionByName(name: string): Promise<WixCollection> {
  const collections = await listCollections();
  const match = collections.find(
    (c) => c.name.toLowerCase() === name.toLowerCase(),
  );

  if (!match) {
    const available = collections.map((c) => `  - "${c.name}" (${c.id})`).join('\n');
    throw new Error(
      `Collection "${name}" not found.\n` +
      `Available collections:\n${available}`,
    );
  }

  return match;
}

// =============================================================================
// CLI Runner (Phase 12)
// =============================================================================

import { fileURLToPath } from 'url';
import path from 'path';
import { writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const command = process.argv[2];

  if (command === '--list-collections') {
    try {
      const collections = await listCollections();
      console.log(`\nFound ${collections.length} collections:\n`);
      for (const col of collections) {
        console.log(`  ${col.name} -> ${col.id}`);
      }

      // Write to data/collections.json
      const outPath = path.resolve(path.dirname(__filename), '../../data/collections.json');
      const output = {
        collections: collections.map((c) => ({ id: c.id, name: c.name })),
        lastUpdated: new Date().toISOString(),
      };
      writeFileSync(outPath, JSON.stringify(output, null, 2) + '\n');
      console.log(`\nWritten to ${outPath}`);
    } catch (err) {
      console.error('Error:', err instanceof Error ? err.message : String(err));
      process.exit(1);
    }
  } else {
    console.log('Usage: npx tsx scripts/pipeline/wix-api.ts --list-collections');
  }
}
