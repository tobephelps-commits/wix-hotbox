/**
 * Product Data Fetcher (v2.0 Unified Vendor Architecture)
 *
 * Fetches product data from any supported vendor using the unified
 * VendorAdapter interface and returns a ProductPreview for the curation UI.
 *
 * Usage:
 *   import { fetchProductPreview } from './fetch-product.js';
 *   const result = await fetchProductPreview('PC61', 'sanmar');
 *   const result = await fetchProductPreview('2000', 'ss');
 *
 * v2.0: Uses unified vendor adapter pattern exclusively.
 * No SanMar-specific or S&S-specific imports.
 *
 * Phase 47: Product Pipeline Creation UI
 */

import type { VendorId, UnifiedProductData } from '../vendors/types.js';
import { getVendor } from '../vendors/registry.js';
import { buildProductPreview } from './mapper.js';
import type { ProductPreview } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of fetching and previewing product data from a vendor.
 *
 * Contains both the UI-ready preview and the raw unified data needed
 * for the subsequent create step.
 */
export interface ProductFetchResult {
  /** UI-ready preview with colors, sizes, pricing, and images */
  preview: ProductPreview;
  /** Raw unified vendor data needed for WIX product creation */
  rawData: UnifiedProductData;
}

// =============================================================================
// Main Fetch Function
// =============================================================================

/**
 * Fetch product data from a vendor and build a preview for the curation UI.
 *
 * Routes through the VendorAdapter abstraction layer to fetch all product
 * data (products, pricing, inventory, media) in parallel, then builds a
 * ProductPreview for the UI.
 *
 * @param style - Vendor-specific style number (e.g., "PC61" for SanMar, "2000" for S&S)
 * @param vendorId - Which vendor to query
 * @returns ProductFetchResult with preview and rawData for subsequent create step
 * @throws Error if style not found or any required API query fails
 */
export async function fetchProductPreview(
  style: string,
  vendorId: VendorId,
): Promise<ProductFetchResult> {
  const adapter = getVendor(vendorId);
  const rawData = await adapter.fetchAllProductData(style);

  const preview = buildProductPreview(rawData);

  return { preview, rawData };
}
