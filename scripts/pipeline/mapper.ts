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
 * - Price is per-variant: standard sizes get base price, extended sizes get upcharges
 *
 * Phase 6: Product Creation Pipeline
 * Phase 7: Per-variant pricing via PricingConfig (size upcharges for extended sizes)
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
  WixInventoryVariant,
  WixInventoryUpdate,
  ProductPreview,
  ColorPreview,
  PricingPreview,
  CuratedProduct,
} from './types.js';

import { calculateVariantPrice, calculateRetailPrice } from './pricing-rules.js';

// =============================================================================
// Media Class Type IDs (from SanMar PromoStandards)
// =============================================================================

/** Swatch image classTypeId */
const CLASS_TYPE_SWATCH = 1004;
/** Front-view image classTypeId */
const CLASS_TYPE_FRONT = 1007;
/** Rear/back-view image classTypeId */
const CLASS_TYPE_REAR = 1008;
/** Primary product image classTypeId */
const CLASS_TYPE_PRIMARY = 1006;
/** High-resolution image classTypeId (NOT a side view — typically another front/lifestyle shot) */
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
 * Handles graceful degradation:
 * - null pricing: wholesale/retail set to 0, saleActive false (with warning)
 * - empty inventory: colors show stockUnknown instead of out-of-stock
 * - empty images: colors have null swatch/front URLs (already handled)
 *
 * @param products - Product info array from getProductByStyle
 * @param pricing - Pricing info from getStylePricing (null if API failed)
 * @param images - All media content from getProductImages
 * @param inventory - All SKU inventory from getStyleInventory
 * @returns ProductPreview for the curation UI
 */
export function buildProductPreview(
  products: ProductInfo[],
  pricing: PricingInfo | null,
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

  // Determine if inventory data is available
  const inventoryAvailable = inventory.length > 0;

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

    // Find back image for this color (classTypeId 1008 = Rear)
    const backImage = images.find(
      (img) =>
        img.classType.classTypeId === CLASS_TYPE_REAR &&
        img.color.toLowerCase() === colorPair.catalogColor.toLowerCase(),
    );

    // Find side image for this color (classTypeId 2001 = High)
    const sideImage = images.find(
      (img) =>
        img.classType.classTypeId === CLASS_TYPE_HIGH &&
        img.color.toLowerCase() === colorPair.catalogColor.toLowerCase(),
    );

    // Stock status depends on whether inventory data is available
    if (!inventoryAvailable) {
      // No inventory data -- mark as stock unknown (visible by default)
      return {
        catalogColor: colorPair.catalogColor,
        displayColor: colorPair.displayColor,
        swatchUrl: swatchImage?.url ?? null,
        frontImageUrl: frontImage?.url ?? null,
        backImageUrl: backImage?.url ?? null,
        sideImageUrl: sideImage?.url ?? null,
        inStock: false,
        stockUnknown: true,
      };
    }

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
      backImageUrl: backImage?.url ?? null,
      sideImageUrl: sideImage?.url ?? null,
      inStock,
    };
  });

  // Build pricing preview -- handle null pricing gracefully
  let pricingPreview: PricingPreview;
  if (pricing) {
    pricingPreview = {
      wholesalePrice: getEffectivePrice(pricing),
      suggestedRetail: getSuggestedRetail(pricing),
      saleActive: isSaleActive(pricing),
    };
  } else {
    console.warn(
      `Pricing data unavailable for ${basic.style} -- wholesale cost will need manual entry`,
    );
    pricingPreview = {
      wholesalePrice: 0,
      suggestedRetail: 0,
      saleActive: false,
    };
  }

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
 * - Price: base retail (standard size, no upcharges) as product listing price
 * - Cost from curated wholesale cost
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
        price: calculateRetailPrice(curated.wholesaleCost, curated.pricingConfig.markupPercent, curated.pricingConfig.rounding),
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
 * For each selected color, assigns front, back, and side images to that Color choice.
 * Also adds general product images (primary/high-res) without choice assignment
 * to fill remaining slots.
 * Uses SanMar CDN URLs directly (WIX V1 accepts external URLs).
 *
 * Priority order per color:
 * 1. Front image (classTypeId 1007) -> assigned to Color choice
 * 2. Back image (classTypeId 1008) -> assigned to Color choice
 * 3. Side image (classTypeId 2001) -> assigned to Color choice
 *
 * After per-color angle images, fill remaining slots with general images
 * (primary 1006, high-res 2001 without color assignment) that haven't already
 * been added.
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
  const addedUrls = new Set<string>();

  // Step 1: Add front, back, and side images per selected color, assigned to Color choice
  for (const color of curated.selectedColors) {
    if (mediaItems.length >= WIX_MEDIA_LIMIT) break;

    const colorImages = imagesByColor.get(color.catalogColor) ?? [];
    const choiceAssignment = {
      option: 'Color',
      choice: color.displayColor, // ALWAYS use displayColor for WIX
    };

    // Front image
    const frontImage = colorImages.find(
      (img) => img.classType.classTypeId === CLASS_TYPE_FRONT,
    );
    if (frontImage && !addedUrls.has(frontImage.url) && mediaItems.length < WIX_MEDIA_LIMIT) {
      mediaItems.push({ url: frontImage.url, choice: choiceAssignment });
      addedUrls.add(frontImage.url);
    }

    // Back image (classTypeId 1008)
    const backImage = colorImages.find(
      (img) => img.classType.classTypeId === CLASS_TYPE_REAR,
    );
    if (backImage && !addedUrls.has(backImage.url) && mediaItems.length < WIX_MEDIA_LIMIT) {
      mediaItems.push({ url: backImage.url, choice: choiceAssignment });
      addedUrls.add(backImage.url);
    }

    // Side image (classTypeId 2001)
    const sideImage = colorImages.find(
      (img) => img.classType.classTypeId === CLASS_TYPE_HIGH,
    );
    if (sideImage && !addedUrls.has(sideImage.url) && mediaItems.length < WIX_MEDIA_LIMIT) {
      mediaItems.push({ url: sideImage.url, choice: choiceAssignment });
      addedUrls.add(sideImage.url);
    }
  }

  // Step 2: Fill remaining slots with general product images (primary, high-res)
  // without choice assignment -- only images not already added
  for (const color of curated.selectedColors) {
    if (mediaItems.length >= WIX_MEDIA_LIMIT) break;

    const colorImages = imagesByColor.get(color.catalogColor) ?? [];

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
 * - price: per-variant price from calculateVariantPrice (size upcharges for 2XL+)
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
  pricing: PricingInfo | null,
  inventory: SkuInventory[],
): WixVariantUpdate[] {
  const variants: WixVariantUpdate[] = [];
  const wholesaleCost = pricing ? getEffectivePrice(pricing) : curated.wholesaleCost;

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

      // Get weight from matching product (default to 0 if not found)
      const weight = matchingProduct?.productBasicInfo.pieceWeight ?? 0;

      // Build SKU: "{style}-{catalogColor}-{size}" format
      const sku = `${curated.style}-${color.catalogColor}-${size}`;

      // Phase 31: All variants are always visible
      // Stock visibility is handled via WIX Inventory API (trackQuantity + quantity)
      // instead of hiding out-of-stock variants
      variants.push({
        choices: {
          Color: color.displayColor, // ALWAYS displayColor for WIX-facing data
          Size: size,
        },
        price: calculateVariantPrice(curated.wholesaleCost, size, curated.pricingConfig),
        cost: wholesaleCost,
        weight,
        sku,
        visible: true,
      });
    }
  }

  return variants;
}

// =============================================================================
// 5. buildInventoryUpdate
// =============================================================================

/**
 * Build a WIX Inventory API update payload from curated product and inventory.
 *
 * Creates the WixInventoryUpdate structure for the Inventory V2 API, setting
 * trackQuantity to true and providing per-variant inStock/quantity values.
 *
 * Phase 31: Stock Visibility — This approach keeps all variants visible in the
 * storefront, but displays "Out of Stock" when a variant's quantity is 0.
 *
 * @param curated - The curated product with selections
 * @param inventory - SKU inventory from vendor
 * @param variantIds - Map of SKU -> WIX variantId (from updateProductVariants response)
 * @returns WixInventoryUpdate payload for the Inventory V2 API
 */
export function buildInventoryUpdate(
  curated: CuratedProduct,
  inventory: SkuInventory[],
  variantIds: Map<string, string>,
): WixInventoryUpdate {
  const variants: WixInventoryVariant[] = [];

  for (const color of curated.selectedColors) {
    for (const size of curated.selectedSizes) {
      const sku = `${curated.style}-${color.catalogColor}-${size}`;
      const variantId = variantIds.get(sku);
      if (!variantId) continue;

      const matchingInventory = inventory.find(
        (inv) =>
          inv.color.toLowerCase() === color.catalogColor.toLowerCase() &&
          inv.size.toLowerCase() === size.toLowerCase(),
      );

      const qty = matchingInventory ? getTotalQuantity(matchingInventory) : 0;

      variants.push({
        variantId,
        inStock: qty > 0,
        quantity: qty,
      });
    }
  }

  return {
    trackQuantity: true,
    variants,
  };
}
