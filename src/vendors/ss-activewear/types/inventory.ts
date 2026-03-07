/**
 * S&S Activewear Inventory Types
 *
 * Types matching the S&S REST API V2 /v2/inventory/ JSON response.
 * The inventory endpoint returns a lighter payload than /v2/products/,
 * containing only SKU identification and per-warehouse quantities.
 * Use for monitoring where full product data is not needed.
 *
 * Source: https://api.ssactivewear.com/V2/Inventory.aspx
 */

// =============================================================================
// Inventory Response Types
// =============================================================================

/**
 * A single inventory record from GET /v2/inventory/.
 * Lighter than SSProduct — only identification + warehouse quantities.
 */
export interface SSInventoryItem {
  /** SKU code (e.g., "2000-12-S") */
  sku: string;
  /** Global Trade Item Number (UPC/EAN barcode) */
  gtin: string;
  /** Master SKU ID in S&S system */
  skuID_Master: number;
  /** Custom SKU mapping (if configured in S&S account) */
  yourSku: string;
  /** Style identifier grouping all colors/sizes */
  styleID: number;
  /** Per-warehouse inventory breakdown */
  warehouses: SSInventoryWarehouse[];
}

/**
 * Lightweight per-warehouse quantity record from the inventory endpoint.
 * Contains only the fields needed for stock level monitoring.
 */
export interface SSInventoryWarehouse {
  /** Warehouse state abbreviation (e.g., "IL", "TX", "NV") */
  warehouseAbbr: string;
  /** SKU ID for this warehouse record */
  skuID: number;
  /** Available quantity at this warehouse */
  qty: number;
}
