/**
 * Unified Vendor Types
 *
 * Vendor-agnostic type definitions that abstract over differences between
 * SanMar and S&S Activewear. These types form the contract between
 * vendor-specific adapters and the vendor-agnostic pipeline, monitor,
 * and sync systems.
 *
 * NO imports from vendor-specific modules (scripts/sanmar/, scripts/ss-activewear/).
 * All vendor quirks are handled by adapters that map to these unified shapes.
 *
 * Phase 17: S&S Activewear API Integration
 */

// =============================================================================
// Vendor Identification
// =============================================================================

/**
 * Supported vendor identifiers.
 * - 'sanmar': SanMar (SOAP/WSDL API, existing integration)
 * - 'ss': S&S Activewear (REST/JSON API V2)
 */
export type VendorId = 'sanmar' | 'ss';

// =============================================================================
// Unified Product
// =============================================================================

/**
 * Normalized product data from any vendor.
 *
 * Each entry represents a single SKU (style + color + size combination).
 * Adapters map vendor-specific fields to this shape:
 * - SanMar: ProductBasicInfo from getProductInfoByStyle
 * - S&S: Flat SSProduct object from GET /v2/products/?style=X
 */
export interface UnifiedProduct {
  /** Which vendor this product came from */
  vendor: VendorId;
  /** Brand name (e.g., "Port & Company", "Gildan") */
  brandName: string;
  /**
   * Vendor-scoped style identifier.
   * - SanMar: style number (e.g., "PC61", "DM130L")
   * - S&S: styleName/partNumber (e.g., "2000", "00760")
   *
   * NOT cross-vendor compatible -- same physical product may have
   * different style identifiers on different vendors.
   */
  style: string;
  /** Full product title (e.g., "Port & Company Essential Tee") */
  productTitle: string;
  /** Product description text */
  description: string;
  /** Display color name (e.g., "Jet Black", "White") */
  color: string;
  /**
   * Vendor-internal color code.
   * - SanMar: catalogColor field
   * - S&S: colorCode field (2-digit code)
   */
  colorCode: string;
  /** Size label (e.g., "S", "M", "L", "2XL") */
  size: string;
  /**
   * Sort key for size ordering.
   * - SanMar: sizeIndex field
   * - S&S: sizeOrder field
   */
  sizeOrder: string;
  /** Product category (e.g., "T-Shirts", "Polos") */
  category: string;
  /** Weight per piece in ounces */
  pieceWeight: number;
  /** Product status (e.g., "Active", "New", "Discontinued") */
  status: string;
  /**
   * Units per case (optional).
   * - SanMar: caseSize field (string, parsed to number)
   * - S&S: caseQty field (number)
   */
  caseQty?: number;
}

// =============================================================================
// Unified Pricing
// =============================================================================

/**
 * Normalized pricing data for a single SKU.
 *
 * Adapters map vendor-specific pricing to this shape:
 * - SanMar: PricingInfo from getPricing SOAP call (separate from product)
 * - S&S: Inline pricing fields on SSProduct object (same API call as product)
 */
export interface UnifiedPricing {
  /** Which vendor this pricing came from */
  vendor: VendorId;
  /** Wholesale cost per piece (the base cost to HotBox) */
  piecePrice: number;
  /** Wholesale cost per case */
  casePrice: number;
  /** Current sale price per piece, or null if no active sale */
  salePrice: number | null;
  /**
   * Sale expiration date in ISO 8601 format (YYYY-MM-DD), or null if no sale.
   * S&S adapter must convert from MM/DD/YYYY to ISO format.
   */
  saleExpiration: string | null;
  /**
   * SanMar-specific pricing code letter (A-E, P-T).
   * Represents suggested retail markup tier. Absent for S&S products.
   */
  priceCode?: string;
  /**
   * S&S-specific negotiated price for the account.
   * May differ from piecePrice when the account has special pricing.
   * Absent for SanMar products.
   */
  customerPrice?: number;
  /**
   * S&S Minimum Advertised Price.
   * Products must not be listed below this price publicly.
   * Absent for SanMar products.
   */
  mapPrice?: number;
}

// =============================================================================
// Unified Warehouse
// =============================================================================

/**
 * Normalized per-warehouse inventory quantity.
 *
 * Uses string ID to accommodate both vendors:
 * - SanMar: Numeric warehouse IDs as strings (e.g., "1", "2", "31")
 * - S&S: State abbreviation codes (e.g., "IL", "TX", "NV")
 */
export interface UnifiedWarehouse {
  /**
   * Warehouse identifier (string to accommodate both vendors).
   * - SanMar: Numeric ID as string (e.g., "1" for Seattle)
   * - S&S: State abbreviation (e.g., "IL" for Bolingbrook/Lockport)
   */
  id: string;
  /** Human-readable display name (e.g., "Seattle, WA" or "Bolingbrook, IL") */
  name: string;
  /** Quantity available at this warehouse */
  qty: number;
}

// =============================================================================
// Unified Inventory
// =============================================================================

/**
 * Normalized per-SKU inventory data.
 *
 * Adapters map vendor-specific inventory to this shape:
 * - SanMar: SkuInventory from getInventoryQtyForStyleColorSize SOAP call
 * - S&S: Inline qty + warehouses[] on SSProduct, or separate /v2/inventory/ call
 */
export interface UnifiedInventory {
  /** Which vendor this inventory came from */
  vendor: VendorId;
  /** Vendor-scoped style identifier */
  style: string;
  /** Color name for this SKU */
  color: string;
  /** Size label for this SKU */
  size: string;
  /** Total quantity available across all warehouses */
  totalQty: number;
  /** Per-warehouse breakdown */
  warehouses: UnifiedWarehouse[];
}

// =============================================================================
// Unified Media
// =============================================================================

/**
 * Normalized image URLs for a single color of a product.
 *
 * All URLs are absolute and point to full-size images.
 * Adapters normalize vendor-specific image handling:
 * - SanMar: Full URLs from PromoStandards MediaContent SOAP response
 * - S&S: Relative paths with _fm suffix, adapter prepends base URL
 *   and replaces with _fl (large) suffix for full-size images
 *
 * Null means no image available for that view.
 */
export interface UnifiedMedia {
  /** Which vendor these images came from */
  vendor: VendorId;
  /** Color name these images correspond to */
  color: string;
  /** Front flat/product image URL, or null if unavailable */
  frontImage: string | null;
  /** Back flat/product image URL, or null if unavailable */
  backImage: string | null;
  /** Side flat/product image URL, or null if unavailable */
  sideImage: string | null;
  /** Color swatch image URL, or null if unavailable */
  swatchImage: string | null;
  /** Front on-model image URL, or null if unavailable */
  onModelFront: string | null;
  /** Back on-model image URL, or null if unavailable */
  onModelBack: string | null;
  /** Side on-model image URL, or null if unavailable */
  onModelSide: string | null;
}

// =============================================================================
// Unified Product Data (Aggregated)
// =============================================================================

/**
 * Complete aggregated data from a vendor for a single style.
 *
 * Mirrors the existing SanMar ProductData pattern: a single object
 * containing all product, pricing, inventory, and media data for a style.
 * Used by fetchAllProductData() on VendorAdapter.
 */
export interface UnifiedProductData {
  /** Which vendor this data came from */
  vendor: VendorId;
  /** Vendor-scoped style identifier */
  style: string;
  /** All SKU-level product entries for this style */
  products: UnifiedProduct[];
  /** Pricing for each SKU */
  pricing: UnifiedPricing[];
  /** Inventory for each SKU */
  inventory: UnifiedInventory[];
  /** Media/images grouped by color */
  media: UnifiedMedia[];
}
