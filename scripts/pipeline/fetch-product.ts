/**
 * Vendor-Agnostic Product Data Fetcher
 *
 * Fetches ALL product data needed for a given style number from any
 * supported vendor (SanMar or S&S Activewear). Uses the VendorAdapter
 * abstraction layer to route requests to the correct vendor API.
 *
 * For SanMar (default), queries 4 SOAP endpoints in parallel.
 * For S&S Activewear, queries 1-2 REST endpoints.
 *
 * After all queries return, builds a ProductPreview for the curation UI
 * and groups images by color for the media payload builder.
 *
 * Usage:
 *   import { fetchProductData } from './fetch-product.js';
 *   const data = await fetchProductData('PC61');           // SanMar (default)
 *   const data = await fetchProductData('2000', 'ss');     // S&S Activewear
 *
 * CLI:
 *   npx tsx scripts/pipeline/fetch-product.ts PC61
 *   npx tsx scripts/pipeline/fetch-product.ts --vendor ss 2000
 *
 * Phase 6: Product Creation Pipeline
 * Phase 17: Vendor-agnostic refactor (VendorAdapter integration)
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import path from 'path';

// Vendor adapter imports -- ensure both adapters are registered
import '../sanmar/adapter.js';
import '../ss-activewear/adapter.js';

import { getVendor, parseVendorFlag } from '../vendor/index.js';
import type { VendorId, UnifiedProductData, UnifiedMedia } from '../vendor/types.js';

// SanMar-specific imports (needed for direct SanMar path and type compatibility)
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
  MediaClassType,
} from '../sanmar/index.js';

import { buildProductPreview } from './mapper.js';

import type { ProductPreview } from './types.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Aggregated product data from vendor API endpoints.
 *
 * Contains raw data from each endpoint plus pre-computed values
 * for the mapper (imagesByColor map and ProductPreview).
 *
 * NOTE: This interface uses SanMar-specific types (ProductInfo, PricingInfo,
 * SkuInventory, MediaContent) for backward compatibility with mapper.ts and
 * create-product.ts. For non-SanMar vendors, the unifiedToProductData()
 * bridge function constructs SanMar-shaped objects from unified types.
 * This is a transitional design -- future phases may migrate pipeline
 * internals to unified types directly.
 */
export interface ProductData {
  /** Vendor style number */
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
// Unified-to-ProductData Bridge (Transitional)
// =============================================================================

/**
 * Convert UnifiedProductData to the existing ProductData shape.
 *
 * This is a transitional bridge so that mapper.ts and create-product.ts
 * can consume data from any vendor without rewriting. For SanMar, this
 * mapping is lossless. For S&S, it constructs SanMar-shaped objects from
 * unified data.
 *
 * @param unified - Aggregated data from any VendorAdapter.fetchAllProductData()
 * @returns ProductData compatible with existing pipeline consumers
 */
function unifiedToProductData(unified: UnifiedProductData): ProductData {
  // --- Map UnifiedProduct[] -> ProductInfo[] ---
  const products: ProductInfo[] = unified.products.map((p) => ({
    productBasicInfo: {
      brandName: p.brandName,
      style: p.style,
      productTitle: p.productTitle,
      productDescription: p.description,
      color: p.color,
      catalogColor: p.colorCode,
      size: p.size,
      availableSizes: '',
      productStatus: p.status,
      caseSize: p.caseQty != null ? String(p.caseQty) : '0',
      inventoryKey: `${p.style}-${p.colorCode}-${p.size}`,
      sizeIndex: p.sizeOrder,
      uniqueKey: `${p.style}-${p.colorCode}-${p.size}`,
      category: p.category,
      keywords: '',
      pieceWeight: p.pieceWeight,
    },
    productImageInfo: {
      frontModel: null,
      backModel: null,
      sideModel: null,
      threeQModel: null,
      frontFlat: null,
      backFlat: null,
      colorProductImage: null,
      colorSquareImage: null,
      brandLogoImage: null,
      specSheet: null,
    },
    productPriceInfo: {
      piecePrice: 0,
      casePrice: 0,
      dozenPrice: 0,
      pieceSalePrice: 0,
      caseSalePrice: 0,
      priceCode: '',
      priceText: '',
      saleStartDate: null,
      saleEndDate: null,
    },
  }));

  // --- Map UnifiedPricing[] -> PricingInfo | null ---
  // Use the first pricing entry as style-level pricing (SanMar pattern)
  let pricing: PricingInfo | null = null;
  if (unified.pricing.length > 0) {
    const first = unified.pricing[0];
    pricing = {
      piecePrice: first.piecePrice,
      casePrice: first.casePrice,
      pieceSalePrice: first.salePrice ?? 0,
      caseSalePrice: 0,
      priceCode: first.priceCode ?? '',
      priceText: '',
      saleStartDate: null,
      saleEndDate: first.saleExpiration,
    };
  }

  // --- Map UnifiedInventory[] -> SkuInventory[] ---
  // Build color name → code lookup for inventory matching
  // (buildProductPreview filters inventory by catalogColor, not display name)
  const invColorNameToCode = new Map<string, string>();
  for (const p of unified.products) {
    if (!invColorNameToCode.has(p.color)) {
      invColorNameToCode.set(p.color, p.colorCode);
    }
  }

  const inventory: SkuInventory[] = unified.inventory.map((inv) => ({
    color: invColorNameToCode.get(inv.color) ?? inv.color,
    size: inv.size,
    whse: inv.warehouses.map((w) => ({
      whseID: parseInt(w.id) || 0,
      whseName: w.name,
      qty: w.qty,
    })),
  }));

  // --- Map UnifiedMedia[] -> MediaContent[] ---
  // Expand each UnifiedMedia into multiple MediaContent entries
  // (one per image type) to match the flat SanMar media format.
  // Build color name → code lookup so images use catalogColor (matches
  // buildProductPreview which filters by catalogColor, not display name).
  const colorNameToCode = new Map<string, string>();
  for (const p of unified.products) {
    if (!colorNameToCode.has(p.color)) {
      colorNameToCode.set(p.color, p.colorCode);
    }
  }

  const images: MediaContent[] = [];
  for (const media of unified.media) {
    const colorCode = colorNameToCode.get(media.color) ?? media.color;
    const addImage = (url: string | null, classTypeId: number, classTypeName: string) => {
      if (url) {
        images.push({
          productId: unified.style,
          partId: null,
          url,
          mediaType: 'Image',
          classType: { classTypeId, classTypeName } as MediaClassType,
          color: colorCode,
        });
      }
    };

    addImage(media.frontImage,    1007, 'Front');
    addImage(media.backImage,     1008, 'Rear');
    addImage(media.sideImage,     2001, 'High');
    addImage(media.swatchImage,   1004, 'Swatch');
    addImage(media.onModelFront,  1006, 'Primary');
    // on-model back and side don't have SanMar classType equivalents;
    // add them as generic images if needed in the future
  }

  // Group images by color
  const imagesByColor = groupImagesByColor(images);

  // Build preview
  const preview = buildProductPreview(products, pricing, images, inventory);
  preview.vendor = unified.vendor;

  return {
    style: unified.style,
    products,
    pricing,
    inventory,
    images,
    imagesByColor,
    preview,
  };
}

// =============================================================================
// Main Fetch Function
// =============================================================================

/**
 * Fetch all product data for a style number from any supported vendor.
 *
 * When vendorId is 'sanmar' or undefined, uses the original direct SanMar
 * API path for maximum backward compatibility. When vendorId is 'ss' or
 * another registered vendor, routes through the VendorAdapter abstraction.
 *
 * @param style - Vendor-specific style number (e.g., "PC61" for SanMar, "2000" for S&S)
 * @param vendorId - Which vendor to query (default: 'sanmar')
 * @returns Aggregated ProductData ready for curation and WIX creation
 * @throws Error if style not found or any required API query fails
 */
export async function fetchProductData(style: string, vendorId?: VendorId): Promise<ProductData> {
  const resolvedVendor = vendorId ?? 'sanmar';

  // For non-SanMar vendors, route through VendorAdapter
  if (resolvedVendor !== 'sanmar') {
    console.log(`Fetching ${style} from ${resolvedVendor}...`);
    const adapter = getVendor(resolvedVendor);
    const unified = await adapter.fetchAllProductData(style);
    console.log(`  products: ${unified.products.length} SKUs`);
    console.log(`  pricing: ${unified.pricing.length > 0 ? unified.pricing.length + ' entries' : 'unavailable'}`);
    console.log(`  inventory: ${unified.inventory.length} SKUs`);
    console.log(`  media: ${unified.media.length} colors`);

    const data = unifiedToProductData(unified);
    console.log(`Fetched ${style} via ${adapter.vendorName}: ${data.products.length} variants, ${data.images.length} images`);
    return data;
  }

  // SanMar: use original direct API path for backward compatibility
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
  preview.vendor = 'sanmar';

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
  // Parse --vendor flag from CLI args
  const vendorArgIdx = process.argv.indexOf('--vendor');
  const vendorFlag = vendorArgIdx !== -1 ? process.argv[vendorArgIdx + 1] : undefined;
  let vendorId: VendorId | undefined;
  try {
    vendorId = parseVendorFlag(vendorFlag);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // Style is the first positional arg that isn't a flag or flag value
  let style: string | undefined;
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--vendor') {
      i++; // skip flag value
      continue;
    }
    if (!process.argv[i].startsWith('-')) {
      style = process.argv[i];
      break;
    }
  }

  if (!style) {
    console.error('Usage: npx tsx scripts/pipeline/fetch-product.ts [--vendor sanmar|ss] <STYLE>');
    console.error('Examples:');
    console.error('  npx tsx scripts/pipeline/fetch-product.ts PC61');
    console.error('  npx tsx scripts/pipeline/fetch-product.ts --vendor ss 2000');
    process.exit(1);
  }

  try {
    const data = await fetchProductData(style, vendorId);
    const p = data.preview;

    console.log('\n========================================');
    console.log(`Vendor:      ${p.vendor ?? 'sanmar'}`);
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
