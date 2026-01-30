/**
 * SanMar Inventory Service
 *
 * Queries SanMar for inventory data using both the SanMar Standard
 * getInventoryQtyForStyleColorSize endpoint (per-item) and the PromoStandards
 * GetInventoryLevels v2.0.0 endpoint (batch).
 *
 * Usage:
 *   import { getStyleInventory, getTotalQuantity, isInStock } from '../services/inventory.js';
 *   const skus = await getStyleInventory('PC61');
 *   for (const sku of skus) {
 *     console.log(`${sku.color} ${sku.size}: ${getTotalQuantity(sku)} units`);
 *   }
 *
 * IMPORTANT: Inventory values cap at 1500 per warehouse (July 2025 update).
 * A value of 1500 means "1500 or more" -- treat as "well stocked".
 */

import { getInventoryClient, getPSInventoryClient } from '../client.js';
import { getSanMarAuth, getPromoStandardsAuth } from '../auth.js';
import type {
  SkuInventory,
  InventoryResponse,
  WarehouseInventory,
  PSPartInventory,
  PSInventoryLocation,
} from '../types/index.js';
import { INVENTORY_CAP } from '../constants.js';
import { withRetry } from '../utils/retry.js';
import { classifyError } from '../utils/error-handler.js';

// =============================================================================
// Types
// =============================================================================

/**
 * Query parameters for inventory lookups.
 * Style is always required. Color and size are optional for broader queries.
 */
export interface InventoryQuery {
  /** SanMar style number (required, e.g., "PC61", "K420") */
  style: string;
  /** Catalog/mainframe color (optional -- use catalogColor, NOT display color) */
  color?: string;
  /** Size code (optional, e.g., "S", "M", "L", "XL") */
  size?: string;
}

// =============================================================================
// Core Inventory Function (SanMar Standard)
// =============================================================================

/**
 * Query SanMar for inventory data by style, color, and/or size.
 *
 * Uses the SanMar Standard getInventoryQtyForStyleColorSize endpoint.
 * Returns per-warehouse breakdown for all matching SKUs.
 *
 * NOTE: Inventory service uses positional args (arg0-arg5), NOT named
 * object args like product info. This matches SanMar's WSDL definition.
 *
 * @param query - Style (required), color and size (optional)
 * @returns Parsed InventoryResponse with per-SKU, per-warehouse data
 * @throws SanMarError if API returns an error or network fails after retries
 */
export async function getInventory(query: InventoryQuery): Promise<InventoryResponse> {
  const client = await getInventoryClient();
  const auth = getSanMarAuth();

  // SanMar Standard inventory uses positional args (arg0-arg5)
  const args = {
    arg0: auth.sanMarCustomerNumber,
    arg1: auth.sanMarUserName,
    arg2: auth.sanMarUserPassword,
    arg3: query.style,
    arg4: query.color ?? '',
    arg5: query.size ?? '',
  };

  // node-soap's *Async methods return [result, rawResponse, soapHeader, rawRequest]
  const soapResult = await withRetry(
    () => client.getInventoryQtyForStyleColorSizeAsync(args) as Promise<unknown[]>
  );

  // Extract the data result (first element)
  const result = soapResult[0] as Record<string, unknown> | undefined;
  const response = (result?.return ?? result) as Record<string, unknown> | undefined;

  // Check for SanMar response-level errors
  if (response?.errorOccured === true || response?.errorOccured === 'true') {
    const errorMsg = String(response?.message ?? 'Unknown inventory error');
    throw classifyError({ errorOccured: true, message: errorMsg });
  }

  // Parse response -- handle nested structure
  const responseData = (response?.response ?? response) as Record<string, unknown> | undefined;
  const style = String(responseData?.style ?? query.style);

  // Parse SKU array from response
  const skusWrapper = responseData?.skus as Record<string, unknown> | undefined;
  const rawSkuArray = normalizeArray(skusWrapper?.sku);

  const skus: SkuInventory[] = rawSkuArray.map((rawSku) => {
    const sku = rawSku as Record<string, unknown>;
    const rawWhse = normalizeArray(sku.whse);

    const whse: WarehouseInventory[] = rawWhse.map((rawW) => {
      const w = rawW as Record<string, unknown>;
      return {
        whseID: Number(w.whseID ?? 0),
        whseName: String(w.whseName ?? ''),
        qty: Number(w.qty ?? 0),
      };
    });

    return {
      color: String(sku.color ?? ''),
      size: String(sku.size ?? ''),
      whse,
    };
  });

  return {
    style,
    skus: { sku: skus },
  };
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get all SKU inventory for a style number.
 *
 * Returns array of all SKU inventory (all colors and sizes) with
 * per-warehouse breakdown. This is the primary query for checking
 * a full style's stock.
 *
 * @param style - SanMar style number (e.g., "PC61")
 * @returns Array of SkuInventory items with warehouse breakdowns
 */
export async function getStyleInventory(style: string): Promise<SkuInventory[]> {
  const response = await getInventory({ style });
  return response.skus.sku;
}

// =============================================================================
// Stock Status Utilities
// =============================================================================

/**
 * Sum quantity across all warehouses for a single SKU.
 *
 * @param skuInventory - Single SKU inventory with warehouse breakdown
 * @returns Total available quantity across all warehouses
 */
export function getTotalQuantity(skuInventory: SkuInventory): number {
  return skuInventory.whse.reduce((total, w) => total + w.qty, 0);
}

/**
 * Check if a SKU is in stock (has at least minQty available).
 *
 * @param skuInventory - Single SKU inventory
 * @param minQty - Minimum quantity required (default: 1).
 *                 Use > 1 for case pack requirements or minimum order thresholds.
 * @returns true if total quantity >= minQty
 */
export function isInStock(skuInventory: SkuInventory, minQty: number = 1): boolean {
  return getTotalQuantity(skuInventory) >= minQty;
}

/**
 * Check if a SKU is well stocked.
 *
 * Returns true if any warehouse shows the INVENTORY_CAP (1500),
 * meaning "1500 or more" -- the actual quantity is higher than reported.
 *
 * Per RESEARCH.md pitfall 3: 1500 is the API cap (updated July 2025).
 *
 * @param skuInventory - Single SKU inventory
 * @returns true if any warehouse is at the inventory cap
 */
export function isWellStocked(skuInventory: SkuInventory): boolean {
  return skuInventory.whse.some((w) => w.qty >= INVENTORY_CAP);
}

// =============================================================================
// Batch Inventory (PromoStandards)
// =============================================================================

/** Maximum partIds per PromoStandards GetInventoryLevels call */
const PS_BATCH_SIZE = 200;

/**
 * Batch inventory query using PromoStandards GetInventoryLevels v2.0.0.
 *
 * Accepts an array of partIds and returns per-part inventory with
 * warehouse-level detail. If more than 200 partIds are provided,
 * automatically chunks into sequential batches (NOT parallel -- respect
 * SanMar server load).
 *
 * @param partIds - Array of SanMar partId strings (up to any number; auto-chunked at 200)
 * @returns Combined array of PSPartInventory for all requested parts
 * @throws SanMarError if API returns an error or network fails
 */
export async function getInventoryBatch(partIds: string[]): Promise<PSPartInventory[]> {
  if (partIds.length === 0) {
    return [];
  }

  const client = await getPSInventoryClient();
  const auth = getPromoStandardsAuth('2.0.0');

  // Chunk into batches of PS_BATCH_SIZE (200)
  const chunks: string[][] = [];
  for (let i = 0; i < partIds.length; i += PS_BATCH_SIZE) {
    chunks.push(partIds.slice(i, i + PS_BATCH_SIZE));
  }

  const allResults: PSPartInventory[] = [];

  // Process chunks sequentially (do NOT parallelize -- respect SanMar server load)
  for (const chunk of chunks) {
    const args = {
      GetInventoryLevelsRequest: {
        wsVersion: auth.wsVersion,
        id: auth.id,
        password: auth.password,
        productId: chunk[0], // Required but ignored when using partIdArray
        Filter: {
          partIdArray: {
            partId: chunk,
          },
        },
      },
    };

    // node-soap's *Async methods return [result, rawResponse, soapHeader, rawRequest]
    const soapResult = await withRetry(
      () => client.GetInventoryLevelsAsync(args) as Promise<unknown[]>
    );

    const result = soapResult[0] as Record<string, unknown> | undefined;

    // Parse PromoStandards inventory response
    const inventory = result?.Inventory as Record<string, unknown> | undefined;
    const partArray = inventory?.PartInventoryArray as Record<string, unknown> | undefined;
    const rawParts = normalizeArray(partArray?.PartInventory);

    for (const rawPart of rawParts) {
      const part = rawPart as Record<string, unknown>;

      // Parse location array
      const locArray = part.InventoryLocationArray as Record<string, unknown> | undefined;
      const rawLocs = normalizeArray(locArray?.InventoryLocation);

      const locations: PSInventoryLocation[] = rawLocs.map((rawLoc) => {
        const loc = rawLoc as Record<string, unknown>;
        return {
          inventoryLocationId: Number(loc.inventoryLocationId ?? 0),
          inventoryLocationName: String(loc.inventoryLocationName ?? ''),
          qty: Number(loc.qty ?? 0),
        };
      });

      // Parse quantity available (may be nested in Quantity object)
      let quantityAvailable = 0;
      const qtyField = part.quantityAvailable;
      if (typeof qtyField === 'number') {
        quantityAvailable = qtyField;
      } else if (qtyField && typeof qtyField === 'object') {
        const qtyObj = qtyField as Record<string, unknown>;
        const innerQty = qtyObj.Quantity as Record<string, unknown> | undefined;
        quantityAvailable = Number(innerQty?.value ?? qtyObj.value ?? 0);
      }

      allResults.push({
        partId: String(part.partId ?? ''),
        partColor: String(part.partColor ?? ''),
        labelSize: String(part.labelSize ?? ''),
        quantityAvailable,
        locations,
      });
    }
  }

  return allResults;
}

// =============================================================================
// Formatting
// =============================================================================

/**
 * Format inventory data into a human-readable summary table.
 *
 * Shows: Color | Size | Total | In Stock | Warehouses with stock
 * Flags items at INVENTORY_CAP as "1500+".
 * Shows per-warehouse breakdown for items with low stock.
 *
 * @param skus - Array of SkuInventory items
 * @returns Formatted multi-line summary string
 */
export function formatInventorySummary(skus: SkuInventory[]): string {
  if (skus.length === 0) {
    return 'No inventory data available.';
  }

  const lines: string[] = [];

  // Header
  lines.push('Color           | Size   | Total  | Status       | Warehouses');
  lines.push('----------------|--------|--------|--------------|---------------------------');

  for (const sku of skus) {
    const total = getTotalQuantity(sku);
    const wellStocked = isWellStocked(sku);
    const inStock = isInStock(sku);

    // Format total with cap indicator
    const totalStr = wellStocked ? '1500+' : String(total);

    // Status
    let status: string;
    if (wellStocked) {
      status = 'Well Stocked';
    } else if (inStock) {
      status = 'In Stock';
    } else {
      status = 'Out of Stock';
    }

    // Warehouses with stock (for low stock items, show breakdown)
    let warehouseStr: string;
    const stockedWarehouses = sku.whse.filter((w) => w.qty > 0);
    if (stockedWarehouses.length === 0) {
      warehouseStr = '-';
    } else if (wellStocked) {
      warehouseStr = `${stockedWarehouses.length} warehouse(s)`;
    } else {
      // Show per-warehouse breakdown for non-well-stocked items
      warehouseStr = stockedWarehouses
        .map((w) => `${w.whseName}: ${w.qty}`)
        .join(', ');
    }

    // Pad columns for alignment
    const colorPad = sku.color.padEnd(15);
    const sizePad = sku.size.padEnd(6);
    const totalPad = totalStr.padEnd(6);
    const statusPad = status.padEnd(12);

    lines.push(`${colorPad} | ${sizePad} | ${totalPad} | ${statusPad} | ${warehouseStr}`);
  }

  // Summary footer
  const totalSkus = skus.length;
  const inStockCount = skus.filter((s) => isInStock(s)).length;
  const outOfStockCount = totalSkus - inStockCount;
  lines.push('');
  lines.push(`Total SKUs: ${totalSkus} | In Stock: ${inStockCount} | Out of Stock: ${outOfStockCount}`);

  return lines.join('\n');
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Normalize a value to always be an array.
 * Handles cases where SOAP returns a single object instead of an array.
 */
function normalizeArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}
