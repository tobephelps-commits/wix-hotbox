/**
 * SanMar-to-WIX Mapper Functions
 *
 * Transforms SanMar product data + curation choices into WIX V1 API payloads.
 * This is the core data bridge between SanMar's SOAP API responses and
 * WIX's REST API product creation format.
 *
 * Functions:
 * 1. buildProductPreview  - SanMar data -> preview for curation UI
 * 2. buildCreateProductPayload - CuratedProduct -> WIX Create Product body
 * 3. buildMediaPayload    - CuratedProduct + images -> WIX Add Media body
 * 4. buildVariantUpdates  - CuratedProduct + inventory -> WIX Variant Updates
 *
 * Key mapping rules:
 * - ALWAYS use displayColor (not catalogColor) in WIX-facing data
 * - Use catalogColor ONLY for SanMar API queries
 * - Products are ALWAYS created as invisible (draft-first workflow)
 * - Price is uniform across variants for Phase 6 (Phase 7 adds variable pricing)
 *
 * Phase 6: Product Creation Pipeline
 */

import type {
  ProductInfo,
  PricingInfo,
  MediaContent,
  SkuInventory,
} from '../sanmar/index.js';

import {
  extractUniqueColors,
  extractAvailableSizes,
  getEffectivePrice,
  getSuggestedRetail,
  isSaleActive,
  getTotalQuantity,
} from '../sanmar/index.js';

import type {
  WixCreateProductRequest,
  WixMediaItem,
  WixVariantUpdate,
  ProductPreview,
  ColorPreview,
  PricingPreview,
  CuratedProduct,
} from './types.js';

// =============================================================================
// Media Class Type IDs (from SanMar PromoStandards)
// =============================================================================

/** Swatch image classTypeId */
const CLASS_TYPE_SWATCH = 1004;
/** Front-view image classTypeId */
const CLASS_TYPE_FRONT = 1007;
/** Primary product image classTypeId */
const CLASS_TYPE_PRIMARY = 1006;
/** High-resolution image classTypeId */
const CLASS_TYPE_HIGH = 2001;

/** Maximum images per WIX product */
const WIX_MEDIA_LIMIT = 15;

/** Maximum product name length in WIX */
const WIX_NAME_MAX_LENGTH = 80;

// =============================================================================
// 1. buildProductPreview
// =============================================================================

/**
 * Build a product preview from SanMar data for the curation UI.
 *
 * Extracts unique colors with swatch/front image URLs from media,
 * available sizes in SanMar sort order, per-color stock status,
 * and pricing information.
 *
 * @param products - Product info array from getProductByStyle
 * @param pricing - Pricing info from getStylePricing
 * @param images - All media content from getProductImages
 * @param inventory - All SKU inventory from getStyleInventory
 * @returns ProductPreview for the curation UI
 */
export function buildProductPreview(
  products: ProductInfo[],
  pricing: PricingInfo,
  images: MediaContent[],
  inventory: SkuInventory[],
): ProductPreview {
  if (products.length === 0) {
    throw new Error('Cannot build preview: no products provided');
  }

  // Get basic info from the first product (same across all variants)
  const firstProduct = products[0];
  const basic = firstProduct.productBasicInfo;

  // Extract unique colors from product data
  const uniqueColors = extractUniqueColors(products);

  // Extract available sizes in SanMar sort order
  const availableSizes = extractAvailableSizes(products);

  // Build color previews with images and stock status
  const availableColors: ColorPreview[] = uniqueColors.map((colorPair) => {
    // Find swatch image for this color
    const swatchImage = images.find(
      (img) =>
        img.classType.classTypeId === CLASS_TYPE_SWATCH &&
        img.color.toLowerCase() === colorPair.catalogColor.toLowerCase(),
    );

    // Find front image for this color
    const frontImage = images.find(
      (img) =>
        img.classType.classTypeId === CLASS_TYPE_FRONT &&
        img.color.toLowerCase() === colorPair.catalogColor.toLowerCase(),
    );

    // Check if any size for this color is in stock
    const colorInventory = inventory.filter(
      (sku) => sku.color.toLowerCase() === colorPair.catalogColor.toLowerCase(),
    );
    const inStock = colorInventory.some((sku) => getTotalQuantity(sku) > 0);

    return {
      catalogColor: colorPair.catalogColor,
      displayColor: colorPair.displayColor,
      swatchUrl: swatchImage?.url ?? null,
      frontImageUrl: frontImage?.url ?? null,
      inStock,
    };
  });

  // Build pricing preview
  const pricingPreview: PricingPreview = {
    wholesalePrice: getEffectivePrice(pricing),
    suggestedRetail: getSuggestedRetail(pricing),
    saleActive: isSaleActive(pricing),
  };

  return {
    style: basic.style,
    brandName: basic.brandName,
    productTitle: basic.productTitle,
    description: basic.productDescription,
    availableColors,
    availableSizes,
    pricing: pricingPreview,
  };
}

// =============================================================================
// 2. buildCreateProductPayload
// =============================================================================

/**
 * Build a WIX V1 Create Product request body from a curated product.
 *
 * Maps curated product data into the WIX product creation format:
 * - Name: "{brandName} {productTitle}" truncated to 80 chars
 * - productType: "physical", visible: false, manageVariants: true
 * - Product options: Color (type "color") and Size (type "drop_down")
 * - Price and cost from curated selections
 *
 * @param curated - The curated product with owner's selections
 * @returns WixCreateProductRequest ready for the WIX API
 */
export function buildCreateProductPayload(
  curated: CuratedProduct,
): WixCreateProductRequest {
  // Build product name: "{brandName} {productTitle}" truncated to 80 chars
  const fullName = `${curated.brandName} ${curated.productTitle}`;
  const name = fullName.length > WIX_NAME_MAX_LENGTH
    ? fullName.substring(0, WIX_NAME_MAX_LENGTH)
    : fullName;

  // Build Color option with selected display colors
  const colorOption = {
    name: 'Color',
    optionType: 'color' as const,
    choices: curated.selectedColors.map((color) => ({
      value: color.displayColor,
      description: color.displayColor,
    })),
  };

  // Build Size option with selected sizes
  const sizeOption = {
    name: 'Size',
    optionType: 'drop_down' as const,
    choices: curated.selectedSizes.map((size) => ({
      value: size,
      description: size,
    })),
  };

  return {
    product: {
      name,
      productType: 'physical',
      visible: false,
      description: curated.description,
      brand: curated.brandName,
      weight: 0, // Will be set per-variant; placeholder for base product
      manageVariants: true,
      priceData: {
        price: curated.basePrice,
      },
      costAndProfitData: {
        itemCost: curated.wholesaleCost,
      },
      productOptions: [colorOption, sizeOption],
      additionalInfoSections: [], // Size guides already added in Phase 4
    },
  };
}

// =============================================================================
// 3. buildMediaPayload
// =============================================================================

/**
 * Build WIX media items from curated product and images grouped by color.
 *
 * For each selected color, assigns the front image to that Color choice.
 * Also adds general product images (primary/high-res) without choice assignment.
 * Uses SanMar CDN URLs directly (WIX V1 accepts external URLs).
 *
 * Priority order:
 * 1. One front image per selected color (assigned to Color choice)
 * 2. General product images (primary, high-res) without choice assignment
 *
 * Limited to 15 total images (WIX media limit per product).
 *
 * @param curated - The curated product with selected colors
 * @param imagesByColor - Map of catalog color -> MediaContent[] from groupImagesByColor
 * @returns Array of WixMediaItem ready for WIX addProductMedia API
 */
export function buildMediaPayload(
  curated: CuratedProduct,
  imagesByColor: Map<string, MediaContent[]>,
): WixMediaItem[] {
  const mediaItems: WixMediaItem[] = [];

  // Step 1: Add one front image per selected color, assigned to Color choice
  for (const color of curated.selectedColors) {
    if (mediaItems.length >= WIX_MEDIA_LIMIT) break;

    const colorImages = imagesByColor.get(color.catalogColor) ?? [];

    // Find the front image for this color
    const frontImage = colorImages.find(
      (img) => img.classType.classTypeId === CLASS_TYPE_FRONT,
    );

    if (frontImage) {
      mediaItems.push({
        url: frontImage.url,
        choice: {
          option: 'Color',
          choice: color.displayColor, // ALWAYS use displayColor for WIX
        },
      });
    }
  }

  // Step 2: Add general product images (primary, high-res) without choice assignment
  // Collect all unique general images across all selected colors
  const addedUrls = new Set(mediaItems.map((item) => item.url));

  for (const color of curated.selectedColors) {
    if (mediaItems.length >= WIX_MEDIA_LIMIT) break;

    const colorImages = imagesByColor.get(color.catalogColor) ?? [];

    // Add primary images
    for (const img of colorImages) {
      if (mediaItems.length >= WIX_MEDIA_LIMIT) break;
      if (addedUrls.has(img.url)) continue;

      if (
        img.classType.classTypeId === CLASS_TYPE_PRIMARY ||
        img.classType.classTypeId === CLASS_TYPE_HIGH
      ) {
        mediaItems.push({ url: img.url });
        addedUrls.add(img.url);
      }
    }
  }

  return mediaItems;
}

// =============================================================================
// 4. buildVariantUpdates
// =============================================================================

/**
 * Build WIX variant updates for all selected color x size combinations.
 *
 * For each combination:
 * - choices: { "Color": displayColor, "Size": size }
 * - price: curated.basePrice (uniform in Phase 6, variable in Phase 7)
 * - cost: wholesale effective price
 * - weight: pieceWeight from matching ProductInfo
 * - sku: "{style}-{catalogColor}-{size}" format
 * - visible: true if that color+size combo has inventory
 *
 * @param curated - The curated product with selections and pricing
 * @param products - Product info array for weight lookup
 * @param pricing - Pricing info for wholesale cost
 * @param inventory - SKU inventory for stock status
 * @returns Array of WixVariantUpdate for all selected combinations
 */
export function buildVariantUpdates(
  curated: CuratedProduct,
  products: ProductInfo[],
  pricing: PricingInfo,
  inventory: SkuInventory[],
): WixVariantUpdate[] {
  const variants: WixVariantUpdate[] = [];
  const wholesaleCost = getEffectivePrice(pricing);

  for (const color of curated.selectedColors) {
    for (const size of curated.selectedSizes) {
      // Find matching product for weight lookup
      const matchingProduct = products.find(
        (p) =>
          p.productBasicInfo.catalogColor.toLowerCase() ===
            color.catalogColor.toLowerCase() &&
          p.productBasicInfo.size.toLowerCase() === size.toLowerCase(),
      );

      // Find matching inventory for stock status
      const matchingInventory = inventory.find(
        (sku) =>
          sku.color.toLowerCase() === color.catalogColor.toLowerCase() &&
          sku.size.toLowerCase() === size.toLowerCase(),
      );

      // Determine if in stock (has any inventory)
      const isVariantInStock = matchingInventory
        ? getTotalQuantity(matchingInventory) > 0
        : false;

      // Get weight from matching product (default to 0 if not found)
      const weight = matchingProduct?.productBasicInfo.pieceWeight ?? 0;

      // Build SKU: "{style}-{catalogColor}-{size}" format
      const sku = `${curated.style}-${color.catalogColor}-${size}`;

      variants.push({
        choices: {
          Color: color.displayColor, // ALWAYS displayColor for WIX-facing data
          Size: size,
        },
        price: curated.basePrice,
        cost: wholesaleCost,
        weight,
        sku,
        visible: isVariantInStock,
      });
    }
  }

  return variants;
}
