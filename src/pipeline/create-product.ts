/**
 * WIX Product Creation Orchestrator (v2.0)
 *
 * Takes a CuratedProduct and UnifiedProductData and executes the full
 * WIX V1 creation flow:
 *   1. Create base product (with options/variants structure)
 *   2. Add media images (external URLs from vendor CDN)
 *   3. Update variant pricing/SKU/weight
 *   4. Set initial inventory quantities
 *   5. Verify creation (get product, confirm variants)
 *   6. Assign to collections
 *
 * This is the final step of the pipeline:
 *   fetchProductPreview(style, vendor) -> curate (UI) -> createWixProduct(curated, rawData)
 *
 * v2.0: Uses UnifiedProductData exclusively (no SanMar-specific types).
 * No CLI runner, no dotenv, no logo overlay logic (logo system is Phase 48).
 *
 * Phase 47: Product Pipeline Creation UI
 */

import type { CuratedProduct } from './types.js';
import type { UnifiedProductData } from '../vendors/types.js';
import type { AngleOverlayConfig } from '../logo/types.js';
import { overlayProductImagesByAngle } from '../logo/overlay.js';
import {
  buildCreateProductPayload,
  buildMediaPayload,
  buildVariantUpdates,
  buildInventoryUpdate,
} from './mapper.js';
import {
  createProduct,
  addProductMedia,
  updateProductVariants,
  updateInventory,
  getProduct,
  addProductToCollection,
  getCollectionByName,
} from './wix-api.js';
import type { WixVariant } from './wix-api.js';
import { calculateRetailPrice } from './pricing-rules.js';

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
  /** Collections this product was added to (empty if none specified) */
  collectionsAssigned: string[];
}

// =============================================================================
// Main Function
// =============================================================================

/**
 * Create a WIX draft product from a curated selection.
 *
 * Executes the full multi-step V1 flow: create -> media -> variants ->
 * inventory -> verify -> collections. Products are ALWAYS created as
 * invisible drafts.
 *
 * @param curated - The curated product with owner's color/size/price selections
 * @param rawData - Unified vendor data from fetchProductPreview
 * @returns CreationResult with product ID, URL, and counts
 */
export async function createWixProduct(
  curated: CuratedProduct,
  rawData: UnifiedProductData,
  logoConfig?: AngleOverlayConfig,
): Promise<CreationResult> {
  console.log(`\nCreating WIX product for ${curated.style}...`);
  const warnings: string[] = [];

  // Step 1: Create base product (REQUIRED -- failure here is fatal)
  const payload = buildCreateProductPayload(curated);
  const product = await createProduct(payload);
  const productId = product.id;
  console.log(
    `  Product created: ${curated.brandName} ${curated.productTitle} (ID: ${productId})`,
  );

  // Step 2: Add media images (OPTIONAL -- continue on failure)
  let mediaCount = 0;
  try {
    const mediaPayload = buildMediaPayload(curated, rawData.media);
    if (mediaPayload.length > 0) {
      await addProductMedia(productId, mediaPayload);
    }
    mediaCount = mediaPayload.length;
    const colorSpecific = mediaPayload.filter((m) => m.choice).length;
    const general = mediaPayload.length - colorSpecific;
    console.log(
      `  Media added: ${mediaPayload.length} images (${colorSpecific} color-specific, ${general} general)`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const warning = `Media upload failed for ${productId}: ${msg}. Product created but images need manual upload.`;
    warnings.push(warning);
    console.warn(`  ${warning}`);
  }

  // Step 2b: Apply logo overlay if configured (OPTIONAL -- continue on failure)
  if (logoConfig) {
    try {
      console.log(`  Applying logo overlay (${logoConfig.logoName})...`);

      // Process each selected color sequentially to avoid memory pressure
      for (const color of curated.selectedColors) {
        const colorMedia = rawData.media.find(
          (m) => m.color.toLowerCase() === color.displayColor.toLowerCase(),
        );
        if (!colorMedia) continue;

        const angleImages: { front?: string; back?: string; side?: string } = {};
        if (colorMedia.frontImage) angleImages.front = colorMedia.frontImage;
        if (colorMedia.backImage) angleImages.back = colorMedia.backImage;
        if (colorMedia.sideImage) angleImages.side = colorMedia.sideImage;

        if (Object.keys(angleImages).length === 0) continue;

        const outputDir = './data/overlays';
        const overlayPaths = await overlayProductImagesByAngle(angleImages, logoConfig, outputDir);

        const overlayCount = Object.values(overlayPaths).filter(Boolean).length;
        if (overlayCount > 0) {
          console.log(`    ${color.displayColor}: ${overlayCount} overlay(s) generated`);
        }
      }

      console.log(`  Logo overlay complete.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const warning = `Logo overlay failed for ${productId}: ${msg}. Product created without logo overlays.`;
      warnings.push(warning);
      console.warn(`  ${warning}`);
    }
  }

  // Step 3: Update variant pricing, SKU, weight, visibility (OPTIONAL -- continue on failure)
  let variantCount = curated.selectedColors.length * curated.selectedSizes.length;
  let updatedVariants: WixVariant[] = [];
  try {
    const variantUpdates = buildVariantUpdates(curated, rawData);
    updatedVariants = await updateProductVariants(productId, variantUpdates);
    variantCount = variantUpdates.length;
    console.log(
      `  Variants updated: ${variantUpdates.length} variants (${curated.selectedColors.length} colors x ${curated.selectedSizes.length} sizes)`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const warning = `Variant update failed for ${productId}: ${msg}. Product exists as draft but variants need manual configuration.`;
    warnings.push(warning);
    console.error(`  ${warning}`);
  }

  // Step 3b: Set initial inventory quantities (OPTIONAL -- continue on failure)
  if (updatedVariants.length > 0) {
    try {
      // Build SKU -> variantId map for inventory update
      const variantIdMap = new Map<string, string>();
      for (const v of updatedVariants) {
        variantIdMap.set(v.variant.sku, v.id);
      }

      const inventoryPayload = buildInventoryUpdate(curated, rawData.inventory, variantIdMap);
      await updateInventory(productId, inventoryPayload);
      console.log(`  Inventory levels set for ${updatedVariants.length} variants.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const warning = `Inventory update failed for ${productId}: ${msg}. Product created but inventory tracking needs manual configuration.`;
      warnings.push(warning);
      console.warn(`  ${warning}`);
    }
  }

  // Step 4: Verify creation (OPTIONAL -- product was already created)
  let productUrl = `https://hotboxclothing.shop/product-page/${productId}`;
  try {
    const verified = await getProduct(productId);
    variantCount = verified.variants?.length ?? variantCount;
    const basePrice = calculateRetailPrice(curated.wholesaleCost, curated.pricingConfig.markupPercent, curated.pricingConfig.rounding);
    console.log(
      `  Verified: ${variantCount} variants, base price $${basePrice.toFixed(2)} (${curated.pricingConfig.markupPercent}% markup)`,
    );
    productUrl = verified.productPageUrl
      ? `${verified.productPageUrl.base}${verified.productPageUrl.path}`
      : productUrl;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const warning = `Verification failed for ${productId}: ${msg}. Product was created but could not confirm final state.`;
    warnings.push(warning);
    console.warn(`  ${warning}`);
  }

  // Step 5: Assign to collections (OPTIONAL -- continue on failure per collection)
  const collectionsAssigned: string[] = [];
  if (curated.collections && curated.collections.length > 0) {
    for (const collectionRef of curated.collections) {
      try {
        // Determine if it's a UUID or a name to resolve
        const isUuid = /^[0-9a-f]{8}-[0-9a-f-]+$/i.test(collectionRef) && collectionRef.length >= 36;
        let collectionId: string;
        let collectionName: string;

        if (isUuid) {
          collectionId = collectionRef;
          collectionName = collectionRef; // UUID used as display name
        } else {
          const collection = await getCollectionByName(collectionRef);
          collectionId = collection.id;
          collectionName = collection.name;
        }

        await addProductToCollection(productId, collectionId);
        collectionsAssigned.push(collectionName);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const warning = `Collection assignment failed for "${collectionRef}": ${msg}. Product created but needs manual collection assignment.`;
        warnings.push(warning);
        console.warn(`  ${warning}`);
      }
    }
    if (collectionsAssigned.length > 0) {
      console.log(
        `  Collections: added to ${collectionsAssigned.length} collections (${collectionsAssigned.join(', ')})`,
      );
    }
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
    collectionsAssigned,
  };
}
