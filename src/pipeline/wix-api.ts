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
 * Authentication: Bearer token via setWixConfig() init function.
 * No hardcoded credentials or dotenv imports.
 *
 * v2.0 architecture: ported from scripts/pipeline/wix-api.ts
 * Phase 6 origin, ported Phase 47.
 */

import type {
  WixCreateProductRequest,
  WixMediaItem,
  WixVariantUpdate,
  WixInventoryUpdate,
} from './types.js';

// =============================================================================
// Constants
// =============================================================================

/** WIX Stores V1 API base URL */
const WIX_API_BASE = 'https://www.wixapis.com/stores/v1';

/** WIX Inventory V2 API base URL */
const WIX_INVENTORY_API_BASE = 'https://www.wixapis.com/stores/v2/inventoryItems';

// =============================================================================
// Module-level Config
// =============================================================================

/** Module-level WIX API configuration */
let wixApiKey: string | undefined;
let wixSiteId: string | undefined;

/**
 * Initialize the WIX API client with credentials.
 *
 * Must be called before any API function. Route handlers call this
 * at registration time with values from fastify.config.
 *
 * @param config - WIX API key and site ID
 */
export function setWixConfig(config: { apiKey: string; siteId: string }): void {
  wixApiKey = config.apiKey;
  wixSiteId = config.siteId;
}

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

/** WIX inventory item variant returned from Inventory API */
export interface WixInventoryItemVariant {
  variantId: string;
  inStock: boolean;
  quantity: number;
}

/** WIX inventory item returned from Inventory API */
export interface WixInventoryItem {
  id: string;
  productId: string;
  trackQuantity: boolean;
  variants: WixInventoryItemVariant[];
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Get the WIX API key from module config.
 * Throws an actionable error if not configured.
 */
function getApiKey(): string {
  if (!wixApiKey) {
    throw new Error(
      'WIX API key is not configured.\n' +
      'Call setWixConfig() before using WIX API functions.\n' +
      'To obtain your API key:\n' +
      '  1. Go to WIX Dashboard -> Developer Tools -> API Keys\n' +
      '  2. Generate an API Key with WIX_STORES.MODIFY_PRODUCTS permission\n' +
      '  3. Add WIX_API_KEY=your_key to your .env file'
    );
  }
  return wixApiKey;
}

/**
 * Get the WIX site ID from module config.
 * Throws if not configured.
 */
function getSiteId(): string {
  if (!wixSiteId) {
    throw new Error(
      'WIX site ID is not configured.\n' +
      'Call setWixConfig() before using WIX API functions.'
    );
  }
  return wixSiteId;
}

/**
 * Build standard headers for WIX API requests.
 */
function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getApiKey()}`,
    'wix-site-id': getSiteId(),
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
        'Check that WIX_API_KEY is valid and has WIX_STORES.MODIFY_PRODUCTS permission.'
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
 * Update any product fields via generic PATCH.
 *
 * PATCH /stores/v1/products/{productId}
 *
 * @param productId - The product ID
 * @param updates - Object with product fields to update
 * @returns The updated product object
 */
export async function updateProduct(
  productId: string,
  updates: Record<string, unknown>,
): Promise<WixProduct> {
  const endpoint = `${WIX_API_BASE}/products/${productId}`;

  console.log(`[WIX API] Updating product ${productId}...`);

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ product: updates }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, `productId=${productId}`);
  }

  const data = await response.json() as { product: WixProduct };
  console.log(`[WIX API] Product ${productId} updated`);
  return data.product;
}

/**
 * Update the base price (and optionally cost) of a product.
 *
 * Convenience wrapper around updateProduct for price changes.
 *
 * @param productId - The product ID
 * @param priceData - Object with price field (retail price)
 * @param costAndProfitData - Optional object with itemCost field
 */
export async function updateProductPrice(
  productId: string,
  priceData: { price: number },
  costAndProfitData?: { itemCost: number },
): Promise<void> {
  const updates: Record<string, unknown> = { priceData };
  if (costAndProfitData) {
    updates.costAndProfitData = costAndProfitData;
  }

  console.log(`[WIX API] Updating price for product ${productId} to $${priceData.price}...`);
  await updateProduct(productId, updates);
  console.log(`[WIX API] Price updated for product ${productId}`);
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
// Collection Functions
// =============================================================================

/**
 * List all collections in the WIX store.
 *
 * POST /stores/v1/collections/query
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
// Inventory V2 API Functions
// =============================================================================

/**
 * Get inventory for a product.
 *
 * GET /stores/v2/inventoryItems/product/{productId}?includeVariants=true
 *
 * @param productId - The WIX product ID
 * @returns Inventory item with variant quantities
 */
export async function getInventory(
  productId: string,
): Promise<WixInventoryItem> {
  const endpoint = `${WIX_INVENTORY_API_BASE}/product/${productId}?includeVariants=true`;

  console.log(`[WIX API] Fetching inventory for product ${productId}...`);

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, `productId=${productId}`);
  }

  const data = await response.json() as { inventoryItem: WixInventoryItem };
  return data.inventoryItem;
}

/**
 * Update inventory for a product.
 *
 * PATCH /stores/v2/inventoryItems/product/{productId}
 *
 * @param productId - The WIX product ID
 * @param update - Inventory update with trackQuantity and variant quantities
 */
export async function updateInventory(
  productId: string,
  update: WixInventoryUpdate,
): Promise<void> {
  const endpoint = `${WIX_INVENTORY_API_BASE}/product/${productId}`;

  console.log(`[WIX API] Updating inventory for product ${productId} (${update.variants.length} variants)...`);

  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({
      inventoryItem: {
        trackQuantity: update.trackQuantity,
        variants: update.variants,
      },
    }),
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint, `productId=${productId}`);
  }

  console.log(`[WIX API] Inventory updated for product ${productId}`);
}
