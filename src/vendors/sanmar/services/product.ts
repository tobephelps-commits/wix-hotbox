/**
 * SanMar Product Data Service
 *
 * Queries SanMar for product information by style number using the
 * SanMar Standard getProductInfoByStyleColorSize endpoint.
 *
 * Usage:
 *   import { getProductByStyle, getProductVariant, extractUniqueColors } from './services/product.js';
 *   const products = await getProductByStyle('PC61');
 *   const colors = extractUniqueColors(products);
 *
 * IMPORTANT: Always use catalogColor (mainframe color) for API queries,
 * NOT the display color name. Example: "Ath. Maroon" not "Athletic Maroon".
 */

import { getProductInfoClient } from '../client.js';
import { getSanMarAuth } from '../auth.js';
import type { ProductInfo, ProductInfoResponse } from '../types/index.js';
import { ACTIVE_PRODUCT_STATUSES } from '../constants.js';
import { withRetry } from '../utils/retry.js';
import { classifyError, SanMarErrorType } from '../utils/error-handler.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Query parameters for product info requests.
 *
 * @property style - SanMar style number (required). Examples: "PC61", "K420", "L223"
 * @property color - Catalog/mainframe color (optional). NOT the display color name.
 *                   Example: "Ath. Maroon" not "Athletic Maroon"
 * @property size - Size code (optional). Examples: "S", "M", "L", "XL", "2XL"
 */
export interface ProductQuery {
  style: string;
  color?: string;
  size?: string;
}

// =============================================================================
// Core Query Function
// =============================================================================

/**
 * Query SanMar for product information by style, color, and/or size.
 *
 * Calls the SanMar Standard getProductInfoByStyleColorSize endpoint.
 * Wraps the SOAP call in retry logic for transient failures.
 *
 * @param query - Style (required), color and size (optional)
 * @returns Full product info response including error status and product list
 * @throws SanMarError if the API returns an error or call fails
 */
export async function getProductInfo(
  query: ProductQuery
): Promise<ProductInfoResponse> {
  const client = await getProductInfoClient();
  const auth = getSanMarAuth();

  // Build SOAP args -- omit undefined fields
  const queryArgs: Record<string, string> = { style: query.style };
  if (query.color !== undefined) {
    queryArgs.color = query.color;
  }
  if (query.size !== undefined) {
    queryArgs.size = query.size;
  }

  const args = {
    arg0: queryArgs,
    arg1: auth,
  };

  // Call with retry for transient errors
  // node-soap's *Async methods return [result, rawResponse, soapHeader, rawRequest]
  const soapResult = await withRetry(
    () => client.getProductInfoByStyleColorSizeAsync(args) as Promise<unknown[]>
  );

  // Extract the data result (first element of the array)
  const result = soapResult[0] as Record<string, unknown> | undefined;
  const response = (result?.return ?? result) as Record<string, unknown> | undefined;

  // Check for SanMar response-level errors
  if (response?.errorOccured === true || response?.errorOccured === 'true') {
    const classified = classifyError(response);
    throw classified;
  }

  // Normalize listResponse to always be an array
  const listResponse = normalizeArray(response?.listResponse) as ProductInfo[];

  return {
    errorOccured: false,
    message: String(response?.message ?? ''),
    listResponse,
  };
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get all active products for a style number.
 *
 * Returns all colors and sizes for the given style, filtered to
 * active products only (excludes Discontinued and Coming Soon).
 *
 * @param style - SanMar style number (e.g., "PC61")
 * @returns Array of active ProductInfo items
 */
export async function getProductByStyle(
  style: string
): Promise<ProductInfo[]> {
  const response = await getProductInfo({ style });
  return filterActiveProducts(response.listResponse);
}

/**
 * Get all active products for a style and catalog color.
 *
 * @param style - SanMar style number
 * @param catalogColor - Catalog/mainframe color (NOT display color name).
 *                       Parameter named "catalogColor" to prevent the #1 SanMar API pitfall.
 * @returns Array of active ProductInfo items for that color
 */
export async function getProductByStyleAndColor(
  style: string,
  catalogColor: string
): Promise<ProductInfo[]> {
  const response = await getProductInfo({ style, color: catalogColor });
  return filterActiveProducts(response.listResponse);
}

/**
 * Get a single product variant by style, catalog color, and size.
 *
 * Returns null if the specific variant is not found (instead of throwing).
 * Other errors (credentials, connection, etc.) still throw.
 *
 * @param style - SanMar style number
 * @param catalogColor - Catalog/mainframe color
 * @param size - Size code (e.g., "S", "M", "L", "XL")
 * @returns Single ProductInfo or null if variant not found
 */
export async function getProductVariant(
  style: string,
  catalogColor: string,
  size: string
): Promise<ProductInfo | null> {
  try {
    const response = await getProductInfo({
      style,
      color: catalogColor,
      size,
    });
    const active = filterActiveProducts(response.listResponse);
    return active.length > 0 ? active[0] : null;
  } catch (error: unknown) {
    // "Invalid Style + Color + Size" means variant not found -- return null
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

// =============================================================================
// Extraction Utilities
// =============================================================================

/**
 * Extract unique color pairs from a product list.
 *
 * Returns deduplicated array of { catalogColor, displayColor } sorted
 * alphabetically by catalogColor. Useful for building variant options.
 *
 * @param products - Array of ProductInfo items (typically from getProductByStyle)
 * @returns Sorted array of unique color pairs
 */
export function extractUniqueColors(
  products: ProductInfo[]
): Array<{ catalogColor: string; displayColor: string }> {
  const colorMap = new Map<string, string>();

  for (const product of products) {
    const { catalogColor, color } = product.productBasicInfo;
    if (!colorMap.has(catalogColor)) {
      colorMap.set(catalogColor, color);
    }
  }

  return Array.from(colorMap.entries())
    .map(([catalogColor, displayColor]) => ({ catalogColor, displayColor }))
    .sort((a, b) => a.catalogColor.localeCompare(b.catalogColor));
}

/**
 * Extract unique sizes from a product list in SanMar size order.
 *
 * Uses the sizeIndex field from ProductBasicInfo for correct sort order
 * (XS, S, M, L, XL, 2XL, 3XL, 4XL, 5XL, 6XL).
 *
 * @param products - Array of ProductInfo items
 * @returns Sorted array of unique size strings
 */
export function extractAvailableSizes(products: ProductInfo[]): string[] {
  const sizeMap = new Map<string, number>();

  for (const product of products) {
    const { size, sizeIndex } = product.productBasicInfo;
    if (!sizeMap.has(size)) {
      sizeMap.set(size, parseSizeIndex(sizeIndex));
    }
  }

  return Array.from(sizeMap.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([size]) => size);
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Filter products to active statuses only.
 * Removes Discontinued and Coming Soon products.
 */
function filterActiveProducts(products: ProductInfo[]): ProductInfo[] {
  return products.filter((product) =>
    ACTIVE_PRODUCT_STATUSES.includes(product.productBasicInfo.productStatus)
  );
}

/**
 * Normalize a value to always be an array.
 * Handles cases where SOAP returns a single object instead of an array.
 */
function normalizeArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * Check if an error is a "not found" type (invalid style, color, or size).
 * These are expected when querying specific variants that may not exist.
 */
function isNotFoundError(error: unknown): boolean {
  if (
    error &&
    typeof error === 'object' &&
    'type' in error
  ) {
    const typed = error as { type: string };
    return (
      typed.type === SanMarErrorType.INVALID_STYLE ||
      typed.type === SanMarErrorType.INVALID_COLOR ||
      typed.type === SanMarErrorType.INVALID_SIZE
    );
  }
  return false;
}

/**
 * Parse sizeIndex string to a numeric value for sorting.
 * Falls back to a high number if parsing fails to push unknown sizes to end.
 */
function parseSizeIndex(sizeIndex: string): number {
  const parsed = parseInt(sizeIndex, 10);
  return isNaN(parsed) ? 9999 : parsed;
}
