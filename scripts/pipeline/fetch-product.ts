/**
 * SanMar Product Data Fetcher
 *
 * Fetches ALL SanMar data needed for a given style number in a single
 * coordinated call. Queries 4 SanMar API endpoints in parallel:
 *   1. getProductByStyle  -> product info (all colors/sizes)
 *   2. getStylePricing    -> pricing info
 *   3. getStyleInventory  -> inventory per SKU
 *   4. getProductImages   -> all media content
 *
 * After all queries return, builds a ProductPreview for the curation UI
 * and groups images by color for the media payload builder.
 *
 * Usage:
 *   import { fetchProductData } from './fetch-product.js';
 *   const data = await fetchProductData('PC61');
 *   console.log(data.preview.brandName, data.preview.productTitle);
 *
 * CLI:
 *   npx tsx scripts/pipeline/fetch-product.ts PC61
 *
 * Phase 6: Product Creation Pipeline
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';

import {
  getProductByStyle,
  getStylePricing,
  getStyleInventory,
  getProductImages,
  groupImagesByColor,
  SanMarError,
  SanMarErrorType,
  isRetryable,
} from '../sanmar/index.js';

import type {
  ProductInfo,
  PricingInfo,
  SkuInventory,
  MediaContent,
} from '../sanmar/index.js';

import { buildProductPreview } from './mapper.js';

import type { ProductPreview } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Aggregated product data from all 4 SanMar API endpoints.
 *
 * Contains raw data from each endpoint plus pre-computed values
 * for the mapper (imagesByColor map and ProductPreview).
 */
export interface ProductData {
  /** SanMar style number */
  style: string;
  /** All active products for this style (one per color+size combo) */
  products: ProductInfo[];
  /** Style-level pricing info (null if pricing API failed) */
  pricing: PricingInfo | null;
  /** Per-SKU inventory (color+size with warehouse breakdown) */
  inventory: SkuInventory[];
  /** All images for this style */
  images: MediaContent[];
  /** Images pre-grouped by catalog color for the media payload builder */
  imagesByColor: Map<string, MediaContent[]>;
  /** Pre-built preview for the curation UI */
  preview: ProductPreview;
}

// =============================================================================
// Main Fetch Function
// =============================================================================

/**
 * Fetch all SanMar data for a style number.
 *
 * Runs 4 API queries in parallel using Promise.all, then assembles
 * the aggregated ProductData with pre-computed imagesByColor and preview.
 *
 * @param style - SanMar style number (e.g., "PC61", "K420")
 * @returns Aggregated ProductData ready for curation and WIX creation
 * @throws Error if style not found or any API query fails
 */
export async function fetchProductData(style: string): Promise<ProductData> {
  console.log(`Fetching ${style}...`);

  // Run all 4 queries in parallel using allSettled for graceful degradation.
  // Product info is REQUIRED; pricing, inventory, and media are OPTIONAL.
  const [productResult, pricingResult, inventoryResult, imageResult] =
    await Promise.allSettled([
      getProductByStyle(style),
      getStylePricing(style),
      getStyleInventory(style),
      getProductImages(style),
    ]);

  // Product info is REQUIRED -- if this fails, we cannot continue
  if (productResult.status === 'rejected') {
    const error = productResult.reason;
    if (
      error instanceof SanMarError &&
      error.type === SanMarErrorType.INVALID_STYLE
    ) {
      throw new Error(`Style '${style}' not found in SanMar catalog`);
    }
    // Non-retryable user errors should throw immediately
    if (error instanceof SanMarError && !isRetryable(error)) {
      throw error;
    }
    throw new Error(
      `Failed to fetch product info for '${style}': ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const products = productResult.value;
  console.log(`  product info \u2713`);

  // Pricing is OPTIONAL -- use null if failed
  let pricing: PricingInfo | null = null;
  if (pricingResult.status === 'fulfilled') {
    pricing = pricingResult.value;
    console.log(`  pricing \u2713`);
  } else {
    const err = pricingResult.reason;
    const msg = err instanceof Error ? err.message : String(err);
    const retryHint =
      err instanceof SanMarError && isRetryable(err)
        ? ' (retryable -- try again later)'
        : '';
    console.warn(
      `  pricing \u2717 WARNING: Pricing data unavailable for ${style}: ${msg}${retryHint}`,
    );
  }

  // Inventory is OPTIONAL -- use empty array if failed
  let inventory: SkuInventory[] = [];
  if (inventoryResult.status === 'fulfilled') {
    inventory = inventoryResult.value;
    console.log(`  inventory \u2713`);
  } else {
    const err = inventoryResult.reason;
    const msg = err instanceof Error ? err.message : String(err);
    const retryHint =
      err instanceof SanMarError && isRetryable(err)
        ? ' (retryable -- try again later)'
        : '';
    console.warn(
      `  inventory \u2717 WARNING: Inventory data unavailable for ${style}: ${msg}${retryHint}`,
    );
  }

  // Media is OPTIONAL -- use empty array if failed
  let images: MediaContent[] = [];
  if (imageResult.status === 'fulfilled') {
    images = imageResult.value;
    console.log(`  images \u2713`);
  } else {
    const err = imageResult.reason;
    const msg = err instanceof Error ? err.message : String(err);
    const retryHint =
      err instanceof SanMarError && isRetryable(err)
        ? ' (retryable -- try again later)'
        : '';
    console.warn(
      `  images \u2717 WARNING: Image data unavailable for ${style}: ${msg}${retryHint}`,
    );
  }

  // Group images by color for the media payload builder
  const imagesByColor = groupImagesByColor(images);

  // Build preview for the curation UI
  const preview = buildProductPreview(products, pricing, images, inventory);

  console.log(`Fetched ${style}: ${products.length} variants, ${images.length} images`);

  return {
    style,
    products,
    pricing,
    inventory,
    images,
    imagesByColor,
    preview,
  };
}

// =============================================================================
// CLI Runner
// =============================================================================

const __fetch_filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __fetch_filename) {
  const style = process.argv[2];
  if (!style) {
    console.error('Usage: npx tsx scripts/pipeline/fetch-product.ts <STYLE>');
    console.error('Example: npx tsx scripts/pipeline/fetch-product.ts PC61');
    process.exit(1);
  }

  try {
    const data = await fetchProductData(style);
    const p = data.preview;

    console.log('\n========================================');
    console.log(`Brand:       ${p.brandName}`);
    console.log(`Title:       ${p.productTitle}`);
    console.log(`Style:       ${p.style}`);
    console.log(`Colors:      ${p.availableColors.length} available`);
    console.log(`Sizes:       ${p.availableSizes.join(', ')}`);
    console.log(`Wholesale:   ${p.pricing.wholesalePrice > 0 ? `$${p.pricing.wholesalePrice.toFixed(2)}` : 'unavailable'}`);
    console.log(`Retail:      ${p.pricing.suggestedRetail > 0 ? `$${p.pricing.suggestedRetail.toFixed(2)}` : 'unavailable'}`);
    console.log(`Sale Active: ${p.pricing.saleActive ? 'Yes' : 'No'}`);
    console.log(`Images:      ${data.images.length} total`);
    console.log('========================================');

    // Show per-color summary
    console.log('\nColor Summary:');
    for (const color of p.availableColors) {
      const stockLabel = color.stockUnknown ? 'Stock Unknown' : (color.inStock ? 'In Stock' : 'Out of Stock');
      const swatchLabel = color.swatchUrl ? 'swatch' : 'no swatch';
      const imageLabel = color.frontImageUrl ? 'front img' : 'no front img';
      console.log(
        `  ${color.displayColor.padEnd(25)} [${stockLabel}] (${swatchLabel}, ${imageLabel})`,
      );
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nError: ${message}`);
    process.exit(1);
  }
}
