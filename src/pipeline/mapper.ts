/**
 * Vendor-Agnostic Product Mapper
 *
 * Transforms unified vendor data + curation choices into WIX V1 API payloads.
 * This is the core data bridge between vendor-agnostic product data and
 * WIX's REST API product creation format.
 *
 * Functions:
 * 1. buildProductPreview  - UnifiedProductData -> preview for curation UI
 * 2. buildCreateProductPayload - CuratedProduct -> WIX Create Product body
 * 3. buildMediaPayload    - CuratedProduct + UnifiedMedia[] -> WIX Add Media body
 * 4. buildVariantUpdates  - CuratedProduct + UnifiedProductData -> WIX Variant Updates
 * 5. buildInventoryUpdate - CuratedProduct + UnifiedInventory[] -> WIX Inventory Update
 *
 * Key mapping rules:
 * - ALWAYS use displayColor (not catalogColor) in WIX-facing data
 * - Use catalogColor ONLY for vendor API queries
 * - Products are ALWAYS created as invisible (draft-first workflow)
 * - Price is per-variant: standard sizes get base price, extended sizes get upcharges
 *
 * v2.0: Uses UnifiedProductData instead of SanMar-specific types.
 * Phase 6 origin, ported Phase 47.
 */

import type {
  UnifiedProduct,
  UnifiedPricing,
  UnifiedMedia,
  UnifiedInventory,
  UnifiedProductData,
} from '../vendors/types.js';

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
// Constants
// =============================================================================

/** Maximum images per WIX product */
const WIX_MEDIA_LIMIT = 15;

/** Maximum product name length in WIX */
const WIX_NAME_MAX_LENGTH = 80;

// =============================================================================
// 1. buildProductPreview
// =============================================================================

/**
 * Build a product preview from unified vendor data for the curation UI.
 *
 * Extracts unique colors with image URLs from media, available sizes,
 * per-color stock status, and pricing information.
 *
 * Handles graceful degradation:
 * - empty pricing: wholesale/retail set to 0, saleActive false
 * - empty inventory: colors show stockUnknown instead of out-of-stock
 * - empty media: colors have null image URLs
 *
 * @param data - Unified product data from any vendor adapter
 * @returns ProductPreview for the curation UI
 */
export function buildProductPreview(
  data: UnifiedProductData,
): ProductPreview {
  if (data.products.length === 0) {
    throw new Error('Cannot build preview: no products provided');
  }

  const first = data.products[0];

  // Extract unique colors from product data
  const colorMap = new Map<string, { colorCode: string; displayColor: string }>();
  for (const p of data.products) {
    if (!colorMap.has(p.colorCode)) {
      colorMap.set(p.colorCode, { colorCode: p.colorCode, displayColor: p.color });
    }
  }
  const uniqueColors = Array.from(colorMap.values());

  // Extract available sizes in vendor sort order
  const sizeMap = new Map<string, string>();
  for (const p of data.products) {
    if (!sizeMap.has(p.size)) {
      sizeMap.set(p.size, p.sizeOrder);
    }
  }
  const availableSizes = Array.from(sizeMap.entries())
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
    .map(([size]) => size);

  // Determine if inventory data is available
  const inventoryAvailable = data.inventory.length > 0;

  // Build color previews with images and stock status
  const availableColors: ColorPreview[] = uniqueColors.map((colorPair) => {
    // Find media for this color
    const colorMedia = data.media.find(
      (m) => m.color.toLowerCase() === colorPair.displayColor.toLowerCase(),
    );

    // Stock status depends on whether inventory data is available
    if (!inventoryAvailable) {
      return {
        catalogColor: colorPair.colorCode,
        displayColor: colorPair.displayColor,
        swatchUrl: colorMedia?.swatchImage ?? null,
        frontImageUrl: colorMedia?.frontImage ?? null,
        backImageUrl: colorMedia?.backImage ?? null,
        sideImageUrl: colorMedia?.sideImage ?? null,
        inStock: false,
        stockUnknown: true,
      };
    }

    // Check if any size for this color is in stock
    const colorInventory = data.inventory.filter(
      (inv) => inv.color.toLowerCase() === colorPair.displayColor.toLowerCase(),
    );
    const inStock = colorInventory.some((inv) => inv.totalQty > 0);

    return {
      catalogColor: colorPair.colorCode,
      displayColor: colorPair.displayColor,
      swatchUrl: colorMedia?.swatchImage ?? null,
      frontImageUrl: colorMedia?.frontImage ?? null,
      backImageUrl: colorMedia?.backImage ?? null,
      sideImageUrl: colorMedia?.sideImage ?? null,
      inStock,
    };
  });

  // Build pricing preview
  let pricingPreview: PricingPreview;
  if (data.pricing.length > 0) {
    const firstPricing = data.pricing[0];
    const effectivePrice = firstPricing.salePrice ?? firstPricing.piecePrice;
    pricingPreview = {
      wholesalePrice: effectivePrice,
      suggestedRetail: effectivePrice * 2, // Default 2x markup as suggestion
      saleActive: firstPricing.salePrice !== null,
    };
  } else {
    console.warn(
      `Pricing data unavailable for ${first.style} -- wholesale cost will need manual entry`,
    );
    pricingPreview = {
      wholesalePrice: 0,
      suggestedRetail: 0,
      saleActive: false,
    };
  }

  return {
    style: first.style,
    brandName: first.brandName,
    vendor: data.vendor,
    productTitle: first.productTitle,
    description: first.description,
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
      additionalInfoSections: [],
    },
  };
}

// =============================================================================
// 3. buildMediaPayload
// =============================================================================

/**
 * Build WIX media items from curated product and unified media data.
 *
 * For each selected color, assigns front and back images to that Color choice.
 * Also adds general product images (on-model, side) without choice assignment
 * to fill remaining slots.
 * Uses vendor CDN URLs directly (WIX V1 accepts external URLs).
 *
 * Priority order per color:
 * 1. Front image -> assigned to Color choice
 * 2. Back image -> assigned to Color choice
 *
 * After per-color angle images, fill remaining slots with additional images
 * (on-model, side) without choice assignment.
 *
 * Limited to 15 total images (WIX media limit per product).
 *
 * @param curated - The curated product with selected colors
 * @param media - UnifiedMedia[] from vendor adapter
 * @returns Array of WixMediaItem ready for WIX addProductMedia API
 */
export function buildMediaPayload(
  curated: CuratedProduct,
  media: UnifiedMedia[],
): WixMediaItem[] {
  const mediaItems: WixMediaItem[] = [];
  const addedUrls = new Set<string>();

  // Step 1: Add front and back images per selected color, assigned to Color choice
  for (const color of curated.selectedColors) {
    if (mediaItems.length >= WIX_MEDIA_LIMIT) break;

    const colorMedia = media.find(
      (m) => m.color.toLowerCase() === color.displayColor.toLowerCase(),
    );
    if (!colorMedia) continue;

    const choiceAssignment = {
      option: 'Color',
      choice: color.displayColor, // ALWAYS use displayColor for WIX
    };

    // Front image
    if (colorMedia.frontImage && !addedUrls.has(colorMedia.frontImage) && mediaItems.length < WIX_MEDIA_LIMIT) {
      mediaItems.push({ url: colorMedia.frontImage, choice: choiceAssignment });
      addedUrls.add(colorMedia.frontImage);
    }

    // Back image
    if (colorMedia.backImage && !addedUrls.has(colorMedia.backImage) && mediaItems.length < WIX_MEDIA_LIMIT) {
      mediaItems.push({ url: colorMedia.backImage, choice: choiceAssignment });
      addedUrls.add(colorMedia.backImage);
    }
  }

  // Step 2: Fill remaining slots with additional images (on-model, side)
  // without choice assignment
  for (const color of curated.selectedColors) {
    if (mediaItems.length >= WIX_MEDIA_LIMIT) break;

    const colorMedia = media.find(
      (m) => m.color.toLowerCase() === color.displayColor.toLowerCase(),
    );
    if (!colorMedia) continue;

    const extraUrls = [
      colorMedia.sideImage,
      colorMedia.onModelFront,
      colorMedia.onModelBack,
      colorMedia.onModelSide,
    ];

    for (const url of extraUrls) {
      if (mediaItems.length >= WIX_MEDIA_LIMIT) break;
      if (url && !addedUrls.has(url)) {
        mediaItems.push({ url });
        addedUrls.add(url);
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
 * - weight: pieceWeight from matching UnifiedProduct
 * - sku: "{style}-{catalogColor}-{size}" format
 * - visible: true (Phase 31: stock visibility via Inventory API)
 *
 * @param curated - The curated product with selections and pricing
 * @param data - Unified product data for weight and pricing lookup
 * @returns Array of WixVariantUpdate for all selected combinations
 */
export function buildVariantUpdates(
  curated: CuratedProduct,
  data: UnifiedProductData,
): WixVariantUpdate[] {
  const variants: WixVariantUpdate[] = [];

  // Find effective wholesale cost from pricing data
  const firstPricing = data.pricing[0];
  const wholesaleCost = firstPricing
    ? (firstPricing.salePrice ?? firstPricing.piecePrice)
    : curated.wholesaleCost;

  for (const color of curated.selectedColors) {
    for (const size of curated.selectedSizes) {
      // Find matching product for weight lookup
      const matchingProduct = data.products.find(
        (p) =>
          p.colorCode.toLowerCase() === color.catalogColor.toLowerCase() &&
          p.size.toLowerCase() === size.toLowerCase(),
      );

      // Get weight from matching product (default to 0 if not found)
      const weight = matchingProduct?.pieceWeight ?? 0;

      // Build SKU: "{style}-{catalogColor}-{size}" format
      const sku = `${curated.style}-${color.catalogColor}-${size}`;

      // Phase 31: All variants are always visible
      // Stock visibility is handled via WIX Inventory API
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
 * Build a WIX Inventory API update payload from curated product and unified inventory.
 *
 * Creates the WixInventoryUpdate structure for the Inventory V2 API, setting
 * trackQuantity to true and providing per-variant inStock/quantity values.
 *
 * Phase 31: Stock Visibility -- keeps all variants visible in the storefront,
 * but displays "Out of Stock" when a variant's quantity is 0.
 *
 * @param curated - The curated product with selections
 * @param inventory - UnifiedInventory[] from vendor adapter
 * @param variantIds - Map of SKU -> WIX variantId (from updateProductVariants response)
 * @returns WixInventoryUpdate payload for the Inventory V2 API
 */
export function buildInventoryUpdate(
  curated: CuratedProduct,
  inventory: UnifiedInventory[],
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

      const qty = matchingInventory?.totalQty ?? 0;

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
