/**
 * SanMar Inventory Types
 *
 * TypeScript interfaces for inventory data returned by both SanMar Standard
 * (getInventoryQtyForStyleColorSize) and PromoStandards (GetInventoryLevels v2.0.0).
 */

// =============================================================================
// SanMar Standard Inventory
// =============================================================================

/**
 * Per-warehouse inventory quantity.
 */
export interface WarehouseInventory {
  whseID: number;
  whseName: string;
  qty: number;
}

/**
 * Inventory for a single SKU (color + size combination).
 */
export interface SkuInventory {
  color: string;
  size: string;
  whse: WarehouseInventory[];
}

/**
 * Full inventory response for a style from getInventoryQtyForStyleColorSize.
 */
export interface InventoryResponse {
  style: string;
  skus: {
    sku: SkuInventory[];
  };
}

// =============================================================================
// PromoStandards Inventory (v2.0.0)
// =============================================================================

/**
 * Per-location inventory from PromoStandards GetInventoryLevels.
 */
export interface PSInventoryLocation {
  inventoryLocationId: number;
  inventoryLocationName: string;
  qty: number;
}

/**
 * Per-part (SKU) inventory from PromoStandards GetInventoryLevels.
 * Supports batch queries with up to 200 partIds per call.
 */
export interface PSPartInventory {
  partId: string;
  partColor: string;
  labelSize: string;
  quantityAvailable: number;
  locations: PSInventoryLocation[];
}
