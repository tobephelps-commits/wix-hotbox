/**
 * S&S Activewear Product Service
 *
 * Product queries against the S&S REST API V2 /v2/products/ endpoint.
 * Each product in the S&S response is a flat object containing product info,
 * pricing, images, and inventory all inline (unlike SanMar's separate services).
 *
 * Usage:
 *   import { getSSProductsByStyle, extractSSUniqueColors } from '../ss-activewear/index.js';
 *   const products = await getSSProductsByStyle('2000');
 *   const colors = extractSSUniqueColors(products);
 */

import { ssGetWithRetry } from '../client.js';
import { SS_IMAGE_BASE_URL } from '../constants.js';
import type { SSProduct, SSStyle } from '../types/index.js';

// =============================================================================
// Product Queries
// =============================================================================

/**
 * Get all product SKUs for a given style/part number.
 * Returns one SSProduct per SKU (style + color + size combination).
 *
 * S&S API's /products/?style= filters by internal styleID, but users enter
 * catalog style numbers (styleName). This function resolves styleName → styleID
 * via the /styles/?search= endpoint before querying products.
 *
 * @param style - S&S catalog style number (e.g., "8512", "2000")
 * @returns Array of product SKUs, or empty array if style not found
 */
export async function getSSProductsByStyle(style: string): Promise<SSProduct[]> {
  // Resolve user-entered styleName to internal styleID via search endpoint
  const styles = await ssGetWithRetry<SSStyle[]>(`/styles/`, { search: style });
  const exactMatch = styles.find(s => String(s.styleName) === style);

  if (exactMatch) {
    return ssGetWithRetry<SSProduct[]>(`/products/`, { style: String(exactMatch.styleID) });
  }

  // Fallback: treat input as styleID directly (backward compat)
  return ssGetWithRetry<SSProduct[]>(`/products/`, { style });
}

/**
 * Get product data for a specific SKU.
 * Returns the matching SKU(s) — typically a single-element array.
 *
 * @param sku - S&S SKU code (e.g., "2000-12-S")
 * @returns Array of matching products, or empty array if SKU not found
 */
export async function getSSProductBySku(sku: string): Promise<SSProduct[]> {
  return ssGetWithRetry<SSProduct[]>(`/products/${encodeURIComponent(sku)}`);
}

/**
 * Get all product SKUs for a given brand name.
 * WARNING: Brand queries can return very large result sets.
 *
 * @param brand - Brand name (e.g., "Gildan")
 * @returns Array of product SKUs for the brand
 */
export async function getSSProductsByBrand(brand: string): Promise<SSProduct[]> {
  return ssGetWithRetry<SSProduct[]>(`/products/`, { brand });
}

// =============================================================================
// Data Extraction Helpers
// =============================================================================

/**
 * Extract unique colors from a flat array of S&S product SKUs.
 * S&S returns one object per SKU; this deduplicates by colorCode.
 *
 * @param products - Array of S&S product SKUs
 * @returns Array of unique { colorName, colorCode } pairs
 */
export function extractSSUniqueColors(
  products: SSProduct[]
): { colorName: string; colorCode: string }[] {
  const seen = new Set<string>();
  const colors: { colorName: string; colorCode: string }[] = [];

  for (const product of products) {
    if (!seen.has(product.colorCode)) {
      seen.add(product.colorCode);
      colors.push({
        colorName: product.colorName,
        colorCode: product.colorCode,
      });
    }
  }

  return colors;
}

/**
 * Extract unique size names from a flat array of S&S product SKUs,
 * sorted by sizeOrder for correct display order (S, M, L, XL, etc.).
 *
 * @param products - Array of S&S product SKUs
 * @returns Sorted array of unique size names
 */
export function extractSSAvailableSizes(products: SSProduct[]): string[] {
  const sizeMap = new Map<string, string>(); // sizeName → sizeOrder

  for (const product of products) {
    if (!sizeMap.has(product.sizeName)) {
      sizeMap.set(product.sizeName, product.sizeOrder);
    }
  }

  // Sort by sizeOrder (numeric string comparison)
  return Array.from(sizeMap.entries())
    .sort((a, b) => {
      const orderA = parseFloat(a[1]) || 0;
      const orderB = parseFloat(b[1]) || 0;
      return orderA - orderB;
    })
    .map(([sizeName]) => sizeName);
}

// =============================================================================
// Image URL Resolution
// =============================================================================

/**
 * Resolve a relative S&S image path to a full absolute URL.
 *
 * S&S returns image paths with `_fm` (medium) suffix by default.
 * This function:
 * 1. Prepends SS_IMAGE_BASE_URL to make it absolute
 * 2. Replaces the `_fm` suffix with the requested size:
 *    - `fl` = full/large (recommended for product pages)
 *    - `fm` = medium (default from API)
 *    - `fs` = small (for thumbnails/swatches)
 *
 * @param relativePath - Relative image path from S&S API, or null
 * @param size - Image size suffix: 'fl' (large), 'fm' (medium), 'fs' (small)
 * @returns Absolute image URL, or null if input was null/empty
 */
export function resolveSSImageUrl(
  relativePath: string | null,
  size: 'fl' | 'fm' | 'fs' = 'fl'
): string | null {
  if (!relativePath) return null;

  // Replace default _fm suffix with requested size
  const resolved = relativePath.replace(/_fm\./, `_${size}.`);

  try {
    return new URL(resolved, SS_IMAGE_BASE_URL).toString();
  } catch {
    // If URL construction fails, return null rather than crash
    return null;
  }
}
