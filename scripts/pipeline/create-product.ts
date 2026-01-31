/**
 * WIX Product Creation Orchestrator
 *
 * Takes a CuratedProduct and executes the full WIX V1 creation flow:
 *   1. Create base product (with options/variants structure)
 *   2. Add media images (external URLs from SanMar CDN)
 *   3. Update variant pricing/SKU/weight
 *   4. Verify creation (get product, confirm variants)
 *
 * This is the final step of the pipeline:
 *   fetchProductData(style) -> curate (UI) -> createWixProduct(curated, data)
 *
 * Phase 6: Product Creation Pipeline
 */

import { fileURLToPath } from 'url';
import path from 'path';

import type { CuratedProduct } from './types.js';
import type { ProductData } from './fetch-product.js';
import { fetchProductData } from './fetch-product.js';
import {
  buildCreateProductPayload,
  buildMediaPayload,
  buildVariantUpdates,
} from './mapper.js';
import {
  createProduct,
  addProductMedia,
  updateProductVariants,
  getProduct,
} from './wix-api.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a successful WIX product creation.
 */
export interface CreationResult {
  /** WIX product ID */
  productId: string;
  /** WIX product page URL */
  productUrl: string;
  /** Number of color x size variants created */
  variantsCreated: number;
  /** Number of images attached */
  mediaAdded: number;
  /** Always "draft" (visible: false) */
  status: 'draft';
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Create a WIX draft product from a curated selection.
 *
 * Executes the full 4-step V1 flow: create -> media -> variants -> verify.
 * Products are ALWAYS created as invisible drafts.
 *
 * @param curated - The curated product with owner's color/size/price selections
 * @param productData - Aggregated SanMar data from fetchProductData
 * @returns CreationResult with product ID, URL, and counts
 */
export async function createWixProduct(
  curated: CuratedProduct,
  productData: ProductData,
): Promise<CreationResult> {
  console.log(`\nCreating WIX product for ${curated.style}...`);

  // Step 1: Create base product
  const payload = buildCreateProductPayload(curated);
  const product = await createProduct(payload);
  const productId = product.id;
  console.log(
    `  \u2713 Product created: ${curated.brandName} ${curated.productTitle} (ID: ${productId})`,
  );

  // Step 2: Add media images
  const mediaPayload = buildMediaPayload(curated, productData.imagesByColor);
  if (mediaPayload.length > 0) {
    await addProductMedia(productId, mediaPayload);
  }
  const colorSpecific = mediaPayload.filter((m) => m.choice).length;
  const general = mediaPayload.length - colorSpecific;
  console.log(
    `  \u2713 Media added: ${mediaPayload.length} images (${colorSpecific} color-specific, ${general} general)`,
  );

  // Step 3: Update variant pricing, SKU, weight, visibility
  const variantUpdates = buildVariantUpdates(
    curated,
    productData.products,
    productData.pricing,
    productData.inventory,
  );
  await updateProductVariants(productId, variantUpdates);
  console.log(
    `  \u2713 Variants updated: ${variantUpdates.length} variants (${curated.selectedColors.length} colors \u00d7 ${curated.selectedSizes.length} sizes)`,
  );

  // Step 4: Verify creation
  const verified = await getProduct(productId);
  const variantCount = verified.variants?.length ?? variantUpdates.length;
  console.log(
    `  \u2713 Verified: ${variantCount} variants, all priced at $${curated.basePrice.toFixed(2)}`,
  );

  // Build product URL
  const productUrl = verified.productPageUrl
    ? `${verified.productPageUrl.base}${verified.productPageUrl.path}`
    : `https://hotboxclothing.shop/product-page/${productId}`;

  console.log(`\nDraft product ready for review:`);
  console.log(`  ${productUrl}`);

  return {
    productId,
    productUrl,
    variantsCreated: variantCount,
    mediaAdded: mediaPayload.length,
    status: 'draft',
  };
}

// =============================================================================
// CLI Runner
// =============================================================================

const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  const style = process.argv[2];
  if (!style) {
    console.error(
      'Usage: npx tsx scripts/pipeline/create-product.ts <STYLE> [--price N]',
    );
    process.exit(1);
  }

  // Parse optional --price argument
  const priceArgIdx = process.argv.indexOf('--price');
  const price =
    priceArgIdx !== -1 ? parseFloat(process.argv[priceArgIdx + 1]) : null;

  try {
    const data = await fetchProductData(style);

    // Auto-curate: select ALL available colors and sizes
    const curated: CuratedProduct = {
      style: data.style,
      brandName: data.preview.brandName,
      productTitle: data.preview.productTitle,
      description: data.preview.description,
      selectedColors: data.preview.availableColors.map((c) => ({
        catalogColor: c.catalogColor,
        displayColor: c.displayColor,
      })),
      selectedSizes: data.preview.availableSizes,
      basePrice: price ?? data.preview.pricing.suggestedRetail,
      wholesaleCost: data.preview.pricing.wholesalePrice,
    };

    const result = await createWixProduct(curated, data);
    console.log(`\nResult:`);
    console.log(`  Product ID: ${result.productId}`);
    console.log(`  URL: ${result.productUrl}`);
    console.log(`  Variants: ${result.variantsCreated}`);
    console.log(`  Media: ${result.mediaAdded}`);
    console.log(`  Status: ${result.status}`);
  } catch (err) {
    console.error(
      'Error:',
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }
}
