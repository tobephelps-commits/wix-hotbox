/**
 * SanMar Vendor Adapter
 *
 * Wraps existing SanMar service functions behind the VendorAdapter interface,
 * mapping SanMar-specific types to unified vendor-agnostic types.
 *
 * This adapter does NOT modify any existing SanMar code. It imports from
 * the SanMar public API (index.ts) and maps results to unified types
 * from the vendor abstraction layer.
 *
 * v2.0 architecture: ported from scripts/sanmar/adapter.ts
 */

import {
  getProductByStyle,
  getStylePricing,
  getStyleInventory,
  getProductImages,
  validateCredentials,
} from './index.js';

import type {
  ProductInfo,
  PricingInfo,
  SkuInventory,
  MediaContent,
} from './index.js';

import { MEDIA_CLASS_TYPES } from './types/media.js';

import type { VendorAdapter } from '../registry.js';

import type {
  UnifiedProduct,
  UnifiedPricing,
  UnifiedInventory,
  UnifiedMedia,
  UnifiedProductData,
} from '../types.js';

// =============================================================================
// Mapping Functions (private)
// =============================================================================

/**
 * Map a SanMar ProductInfo to a UnifiedProduct.
 * Each ProductInfo represents one SKU (style + color + size).
 */
function mapSanMarProduct(product: ProductInfo): UnifiedProduct {
  const basic = product.productBasicInfo;
  return {
    vendor: 'sanmar',
    brandName: basic.brandName,
    style: basic.style,
    productTitle: basic.productTitle,
    description: basic.productDescription,
    color: basic.color,
    colorCode: basic.catalogColor,
    size: basic.size,
    sizeOrder: basic.sizeIndex,
    category: basic.category,
    pieceWeight: basic.pieceWeight,
    status: basic.productStatus,
    caseQty: parseInt(basic.caseSize) || undefined,
  };
}

/**
 * Map SanMar PricingInfo to a UnifiedPricing.
 * SanMar returns style-level pricing (not per-SKU), so the adapter
 * wraps it into a single-element array.
 */
function mapSanMarPricing(pricing: PricingInfo): UnifiedPricing {
  return {
    vendor: 'sanmar',
    piecePrice: pricing.piecePrice,
    casePrice: pricing.casePrice,
    salePrice: pricing.pieceSalePrice > 0 ? pricing.pieceSalePrice : null,
    saleExpiration: pricing.saleEndDate,
    priceCode: pricing.priceCode,
  };
}

/**
 * Map a SanMar SkuInventory to a UnifiedInventory.
 * Converts numeric warehouse IDs to strings and sums quantities.
 */
function mapSanMarInventory(sku: SkuInventory, style: string): UnifiedInventory {
  const warehouses = sku.whse.map((w) => ({
    id: String(w.whseID),
    name: w.whseName,
    qty: w.qty,
  }));

  const totalQty = sku.whse.reduce((sum, w) => sum + w.qty, 0);

  return {
    vendor: 'sanmar',
    style,
    color: sku.color,
    size: sku.size,
    totalQty,
    warehouses,
  };
}

/**
 * Map SanMar MediaContent items for a single color to a UnifiedMedia.
 *
 * SanMar returns one MediaContent per image (not per color), so we
 * group by color first and then map classType IDs to unified fields:
 *   1007 → frontImage (Front flat)
 *   1008 → backImage (Rear flat)
 *   1006 → onModelFront (Primary/lifestyle)
 *   1004 → swatchImage (Color swatch)
 *   2001 → (High-resolution, typically another front/lifestyle shot — NOT a side view)
 */
function mapSanMarMediaForColor(color: string, items: MediaContent[]): UnifiedMedia {
  let frontImage: string | null = null;
  let backImage: string | null = null;
  let sideImage: string | null = null;
  let swatchImage: string | null = null;
  let onModelFront: string | null = null;
  let onModelBack: string | null = null;
  let onModelSide: string | null = null;

  for (const item of items) {
    const classId = item.classType.classTypeId;

    switch (classId) {
      case MEDIA_CLASS_TYPES.Front:
        frontImage = item.url;
        break;
      case MEDIA_CLASS_TYPES.Rear:
        backImage = item.url;
        break;
      case MEDIA_CLASS_TYPES.High:
        // SanMar 2001 "High" is a high-resolution image, typically another
        // front/lifestyle shot — NOT a true side view. Do not map as sideImage.
        // If no Primary image exists, use High as a fallback on-model image.
        if (!onModelFront) {
          onModelFront = item.url;
        }
        break;
      case MEDIA_CLASS_TYPES.Swatch:
        swatchImage = item.url;
        break;
      case MEDIA_CLASS_TYPES.Primary:
        onModelFront = item.url;
        break;
      // SanMar doesn't provide separate side-view, on-model back, or
      // on-model side images via PromoStandards, so those remain null
    }
  }

  return {
    vendor: 'sanmar',
    color,
    frontImage,
    backImage,
    sideImage,
    swatchImage,
    onModelFront,
    onModelBack,
    onModelSide,
  };
}

/**
 * Group MediaContent items by color and map each group to a UnifiedMedia.
 * Returns one UnifiedMedia per unique color.
 */
function mapSanMarMedia(items: MediaContent[]): UnifiedMedia[] {
  // Group by color
  const byColor = new Map<string, MediaContent[]>();
  for (const item of items) {
    const existing = byColor.get(item.color);
    if (existing) {
      existing.push(item);
    } else {
      byColor.set(item.color, [item]);
    }
  }

  // Map each color group to a UnifiedMedia
  const result: UnifiedMedia[] = [];
  for (const [color, colorItems] of byColor) {
    result.push(mapSanMarMediaForColor(color, colorItems));
  }

  return result;
}

// =============================================================================
// SanMar Adapter Class
// =============================================================================

/**
 * SanMar vendor adapter implementing VendorAdapter interface.
 *
 * Wraps existing SanMar service functions and maps their responses
 * to unified vendor-agnostic types. Does not modify any existing
 * SanMar code -- purely a thin mapping layer.
 */
class SanMarAdapter implements VendorAdapter {
  readonly vendorId = 'sanmar' as const;
  readonly vendorName = 'SanMar';

  /**
   * Fetch all product SKUs for a given style.
   * Calls getProductByStyle and maps each ProductInfo to UnifiedProduct.
   */
  async getProductsByStyle(style: string): Promise<UnifiedProduct[]> {
    const products = await getProductByStyle(style);
    return products.map(mapSanMarProduct);
  }

  /**
   * Fetch pricing for a given style.
   * SanMar returns style-level pricing (single PricingInfo), so we wrap
   * it into a single-element array for the unified interface.
   */
  async getStylePricing(style: string): Promise<UnifiedPricing[]> {
    const pricing = await getStylePricing(style);
    return [mapSanMarPricing(pricing)];
  }

  /**
   * Fetch per-SKU inventory with warehouse breakdown for a given style.
   * Maps each SkuInventory to UnifiedInventory with string warehouse IDs.
   */
  async getStyleInventory(style: string): Promise<UnifiedInventory[]> {
    const skus = await getStyleInventory(style);
    return skus.map((sku) => mapSanMarInventory(sku, style));
  }

  /**
   * Fetch product images for all colors of a given style.
   * Groups MediaContent by color, then maps each group to UnifiedMedia.
   * Returns one UnifiedMedia entry per color.
   */
  async getProductImages(style: string): Promise<UnifiedMedia[]> {
    const images = await getProductImages(style);
    return mapSanMarMedia(images);
  }

  /**
   * Fetch all product data in parallel with graceful degradation.
   *
   * Runs all 4 queries concurrently using Promise.allSettled.
   * Products are required; pricing, inventory, and media are optional
   * (same pattern as existing fetchProductData in the pipeline).
   */
  async fetchAllProductData(style: string): Promise<UnifiedProductData> {
    const [productResult, pricingResult, inventoryResult, mediaResult] =
      await Promise.allSettled([
        this.getProductsByStyle(style),
        this.getStylePricing(style),
        this.getStyleInventory(style),
        this.getProductImages(style),
      ]);

    // Products are REQUIRED
    if (productResult.status === 'rejected') {
      throw new Error(
        `Failed to fetch product info for '${style}': ${
          productResult.reason instanceof Error
            ? productResult.reason.message
            : String(productResult.reason)
        }`
      );
    }
    const products = productResult.value;

    // Pricing is OPTIONAL -- use empty array if failed
    let pricing: UnifiedPricing[] = [];
    if (pricingResult.status === 'fulfilled') {
      pricing = pricingResult.value;
    } else {
      const err = pricingResult.reason;
      console.warn(
        `  pricing unavailable for ${style}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Inventory is OPTIONAL -- use empty array if failed
    let inventory: UnifiedInventory[] = [];
    if (inventoryResult.status === 'fulfilled') {
      inventory = inventoryResult.value;
    } else {
      const err = inventoryResult.reason;
      console.warn(
        `  inventory unavailable for ${style}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    // Media is OPTIONAL -- use empty array if failed
    let media: UnifiedMedia[] = [];
    if (mediaResult.status === 'fulfilled') {
      media = mediaResult.value;
    } else {
      const err = mediaResult.reason;
      console.warn(
        `  media unavailable for ${style}: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    return {
      vendor: 'sanmar',
      style,
      products,
      pricing,
      inventory,
      media,
    };
  }

  /**
   * Validate that SanMar API credentials are configured.
   * Wraps the synchronous validateCredentials() in a Promise
   * to match the VendorAdapter interface.
   */
  async validateCredentials(): Promise<boolean> {
    try {
      return validateCredentials();
    } catch {
      return false;
    }
  }
}

// =============================================================================
// Export & Auto-Registration
// =============================================================================

/** Singleton SanMar adapter instance */
export const sanmarAdapter = new SanMarAdapter();

// Auto-register when this module is imported
import { registerVendor } from '../registry.js';
registerVendor(sanmarAdapter);
