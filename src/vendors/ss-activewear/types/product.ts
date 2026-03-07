/**
 * S&S Activewear Product Types
 *
 * Types matching the S&S REST API V2 /v2/products/ JSON response.
 * Each JSON object in the array represents a single SKU (style + color + size)
 * with product info, pricing, images, and inventory all inline.
 *
 * Source: https://api.ssactivewear.com/V2/Products.aspx
 */

// =============================================================================
// Product Response Types
// =============================================================================

/**
 * A single S&S product SKU as returned by GET /v2/products/.
 * S&S returns a flat object per SKU with all data inline, unlike SanMar's
 * separate SOAP services for product, pricing, inventory, and media.
 */
export interface SSProduct {
  /** Unique SKU identifier in S&S system */
  skuID: number;
  /** SKU code (e.g., "2000-12-S" for Gildan 2000, color 12, size S) */
  sku: string;
  /** Global Trade Item Number (UPC/EAN barcode) */
  gtin: string;
  /** Style identifier grouping all colors/sizes */
  styleID: number;
  /** Brand display name (e.g., "Gildan") */
  brandName: string;
  /** Style name / part number (e.g., "2000" for Gildan Ultra Cotton) */
  styleName: string;
  /** Color display name (e.g., "Black") */
  colorName: string;
  /** Two-digit color code (e.g., "12") */
  colorCode: string;
  /** Color price code name */
  colorPriceCodeName: string;
  /** Color group identifier */
  colorGroup: string;
  /** Color group display name */
  colorGroupName: string;
  /** Color family ID */
  colorFamilyID: number;
  /** Color family name (e.g., "Black", "White", "Red") */
  colorFamily: string;
  /** Relative path to color swatch image (append to SS_IMAGE_BASE_URL) */
  colorSwatchImage: string;
  /** Relative path to front product image */
  colorFrontImage: string;
  /** Relative path to side product image */
  colorSideImage: string;
  /** Relative path to back product image */
  colorBackImage: string;
  /** Relative path to direct side image */
  colorDirectSideImage: string;
  /** Relative path to on-model front image */
  colorOnModelFrontImage: string;
  /** Relative path to on-model side image */
  colorOnModelSideImage: string;
  /** Relative path to on-model back image */
  colorOnModelBackImage: string;
  /** Primary color hex or name */
  color1: string;
  /** Secondary color hex or name (for multi-color items) */
  color2: string;
  /** Size display name (e.g., "S", "M", "L", "XL") */
  sizeName: string;
  /** Size code */
  sizeCode: string;
  /** Numeric sort order for size display */
  sizeOrder: string;
  /** Size price code name */
  sizePriceCodeName: string;
  /** Units per case */
  caseQty: number;
  /** Weight per unit in pounds */
  unitWeight: number;
  /** Minimum Advertised Price — do not list below this */
  mapPrice: number;
  /** Standard wholesale piece price */
  piecePrice: number;
  /** Price per dozen */
  dozenPrice: number;
  /** Price per case */
  casePrice: number;
  /** Current sale price (0 if no sale) */
  salePrice: number;
  /** Account-specific negotiated price */
  customerPrice: number;
  /** Sale expiration date in MM/DD/YYYY format */
  saleExpiration: string;
  /** When true, cannot be sold on eBay/Amazon/Walmart marketplaces */
  noeRetailing: boolean;
  /** Case weight in pounds */
  caseWeight: number;
  /** Case width in inches */
  caseWidth: number;
  /** Case length in inches */
  caseLength: number;
  /** Case height in inches */
  caseHeight: number;
  /** Combined quantity across all warehouses */
  qty: number;
  /** Country of manufacture */
  countryOfOrigin: string;
  /** Per-warehouse inventory breakdown */
  warehouses: SSWarehouse[];
}

/**
 * Per-warehouse inventory data for a product SKU.
 * S&S uses state abbreviations for warehouse identification.
 */
export interface SSWarehouse {
  /** Warehouse state abbreviation (e.g., "IL", "TX", "NV") */
  warehouseAbbr: string;
  /** SKU ID for this warehouse record */
  skuID: number;
  /** Available quantity at this warehouse */
  qty: number;
  /** Whether this item is being closed out at this warehouse */
  closeout: boolean;
  /** Whether this item is available for drop-shipping */
  dropship: boolean;
  /** Whether this item is excluded from free freight promotions */
  excludeFreeFreight: boolean;
  /** Whether full-case orders only are required */
  fullCaseOnly: boolean;
  /** Expected inventory date (ISO string, empty if no incoming) */
  expectedInventory: string;
  /** Whether this item is returnable from this warehouse */
  returnable: boolean;
}
