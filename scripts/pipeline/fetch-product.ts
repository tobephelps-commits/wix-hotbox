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
  /** Style-level pricing info */
  pricing: PricingInfo;
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

  // Run all 4 queries in parallel -- they are independent
  const [products, pricing, inventory, images] = await Promise.all([
    getProductByStyle(style).then((result) => {
      console.log(`  product info \u2713`);
      return result;
    }),
    getStylePricing(style).then((result) => {
      console.log(`  pricing \u2713`);
      return result;
    }),
    getStyleInventory(style).then((result) => {
      console.log(`  inventory \u2713`);
      return result;
    }),
    getProductImages(style).then((result) => {
      console.log(`  images \u2713`);
      return result;
    }),
  ]).catch((error: unknown) => {
    // Provide clear message for style-not-found errors
    if (
      error instanceof SanMarError &&
      error.type === SanMarErrorType.INVALID_STYLE
    ) {
      throw new Error(`Style '${style}' not found in SanMar catalog`);
    }
    // Let other SanMar errors propagate with their original classification
    throw error;
  });

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
    console.log(`Wholesale:   $${p.pricing.wholesalePrice.toFixed(2)}`);
    console.log(`Retail:      $${p.pricing.suggestedRetail.toFixed(2)}`);
    console.log(`Sale Active: ${p.pricing.saleActive ? 'Yes' : 'No'}`);
    console.log(`Images:      ${data.images.length} total`);
    console.log('========================================');

    // Show per-color summary
    console.log('\nColor Summary:');
    for (const color of p.availableColors) {
      const stockLabel = color.inStock ? 'In Stock' : 'Out of Stock';
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
