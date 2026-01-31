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
 * Phase 7: Per-variant pricing via PricingConfig
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
import { calculateRetailPrice, getPresetConfig } from './pricing-rules.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of a WIX product creation.
 *
 * On full success, warnings is empty. On partial failure (media or variant
 * steps failed but product was created), warnings contains actionable messages.
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
  /** Warnings from partial failures (empty on full success) */
  warnings: string[];
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
  const warnings: string[] = [];

  // Step 1: Create base product (REQUIRED -- failure here is fatal)
  const payload = buildCreateProductPayload(curated);
  const product = await createProduct(payload);
  const productId = product.id;
  console.log(
    `  \u2713 Product created: ${curated.brandName} ${curated.productTitle} (ID: ${productId})`,
  );

  // Step 2: Add media images (OPTIONAL -- continue on failure)
  let mediaCount = 0;
  try {
    const mediaPayload = buildMediaPayload(curated, productData.imagesByColor);
    if (mediaPayload.length > 0) {
      await addProductMedia(productId, mediaPayload);
    }
    mediaCount = mediaPayload.length;
    const colorSpecific = mediaPayload.filter((m) => m.choice).length;
    const general = mediaPayload.length - colorSpecific;
    console.log(
      `  \u2713 Media added: ${mediaPayload.length} images (${colorSpecific} color-specific, ${general} general)`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const warning = `Media upload failed for ${productId}: ${msg}. Product created but images need manual upload.`;
    warnings.push(warning);
    console.warn(`  \u2717 ${warning}`);
  }

  // Step 3: Update variant pricing, SKU, weight, visibility (OPTIONAL -- continue on failure)
  let variantCount = curated.selectedColors.length * curated.selectedSizes.length;
  try {
    const variantUpdates = buildVariantUpdates(
      curated,
      productData.products,
      productData.pricing,
      productData.inventory,
    );
    await updateProductVariants(productId, variantUpdates);
    variantCount = variantUpdates.length;
    console.log(
      `  \u2713 Variants updated: ${variantUpdates.length} variants (${curated.selectedColors.length} colors \u00d7 ${curated.selectedSizes.length} sizes)`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const warning = `Variant update failed for ${productId}: ${msg}. Product exists as draft but variants need manual configuration.`;
    warnings.push(warning);
    console.error(`  \u2717 ${warning}`);
  }

  // Step 4: Verify creation (OPTIONAL -- product was already created)
  let productUrl = `https://hotboxclothing.shop/product-page/${productId}`;
  try {
    const verified = await getProduct(productId);
    variantCount = verified.variants?.length ?? variantCount;
    const basePrice = calculateRetailPrice(curated.wholesaleCost, curated.pricingConfig.markupPercent, curated.pricingConfig.rounding);
    console.log(
      `  \u2713 Verified: ${variantCount} variants, base price $${basePrice.toFixed(2)} (${curated.pricingConfig.markupPercent}% markup)`,
    );
    productUrl = verified.productPageUrl
      ? `${verified.productPageUrl.base}${verified.productPageUrl.path}`
      : productUrl;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const warning = `Verification failed for ${productId}: ${msg}. Product was created but could not confirm final state.`;
    warnings.push(warning);
    console.warn(`  \u2717 ${warning}`);
  }

  console.log(`\nDraft product ready for review:`);
  console.log(`  ${productUrl}`);

  return {
    productId,
    productUrl,
    variantsCreated: variantCount,
    mediaAdded: mediaCount,
    status: 'draft',
    warnings,
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
      pricingConfig: price != null
        ? { markupPercent: ((price / data.preview.pricing.wholesalePrice) - 1) * 100, rounding: 'none' as const, sizeUpcharges: {} }
        : getPresetConfig('standard-tee'),
      wholesaleCost: data.preview.pricing.wholesalePrice,
    };

    const result = await createWixProduct(curated, data);
    console.log(`\nResult:`);
    console.log(`  Product ID: ${result.productId}`);
    console.log(`  URL: ${result.productUrl}`);
    console.log(`  Variants: ${result.variantsCreated}`);
    console.log(`  Media: ${result.mediaAdded}`);
    console.log(`  Status: ${result.status}`);

    if (result.warnings.length > 0) {
      console.log(`\nWarnings (${result.warnings.length}):`);
      for (const warning of result.warnings) {
        console.warn(`  ! ${warning}`);
      }
    }
  } catch (err) {
    console.error(
      'Error:',
      err instanceof Error ? err.message : String(err),
    );
    process.exit(1);
  }
}
