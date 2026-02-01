/**
 * S&S Activewear Inventory Service
 *
 * Inventory queries against the S&S REST API V2 /v2/inventory/ endpoint.
 * The inventory endpoint returns lighter payloads than /v2/products/ —
 * only SKU identification and per-warehouse quantities.
 * Use for monitoring where full product data is not needed.
 *
 * Usage:
 *   import { getSSStyleInventory, getSSTotalQuantity, isSSInStock } from '../ss-activewear/index.js';
 *   const inventory = await getSSStyleInventory('2000');
 *   const total = getSSTotalQuantity(inventory[0]);
 */

import { ssGetWithRetry } from '../client.js';
import type { SSInventoryItem } from '../types/index.js';

// =============================================================================
// Inventory Queries
// =============================================================================

/**
 * Get inventory data for all SKUs of a given style.
 * Uses the lighter /v2/inventory/ endpoint (no product details, just quantities).
 * Ideal for inventory monitoring and stock level checks.
 *
 * @param style - S&S style/part number (e.g., "2000")
 * @returns Array of inventory items per SKU, or empty array if style not found
 */
export async function getSSStyleInventory(style: string): Promise<SSInventoryItem[]> {
  return ssGetWithRetry<SSInventoryItem[]>(`/inventory/`, { style });
}

/**
 * Get inventory data for a batch of specific SKUs.
 * Uses comma-separated SKU path format for efficient batch queries.
 * Ideal for polling inventory across multiple products.
 *
 * @param skus - Array of S&S SKU codes (e.g., ["2000-12-S", "2000-12-M"])
 * @returns Array of inventory items for all requested SKUs
 */
export async function getSSInventoryBatch(skus: string[]): Promise<SSInventoryItem[]> {
  if (skus.length === 0) return [];

  // S&S supports comma-separated SKUs in the path
  const skuPath = skus.map(encodeURIComponent).join(',');
  return ssGetWithRetry<SSInventoryItem[]>(`/inventory/${skuPath}`);
}

// =============================================================================
// Inventory Calculation Helpers
// =============================================================================

/**
 * Calculate total available quantity across all warehouses for an inventory item.
 *
 * @param item - S&S inventory item with warehouse breakdown
 * @returns Total quantity summed across all warehouses
 */
export function getSSTotalQuantity(item: SSInventoryItem): number {
  return item.warehouses.reduce((sum, w) => sum + w.qty, 0);
}

/**
 * Check if an inventory item is in stock.
 * Optionally requires a minimum quantity threshold.
 *
 * @param item - S&S inventory item with warehouse breakdown
 * @param minQty - Minimum quantity to consider "in stock" (default: 1)
 * @returns true if total quantity meets or exceeds minQty
 */
export function isSSInStock(item: SSInventoryItem, minQty: number = 1): boolean {
  return getSSTotalQuantity(item) >= minQty;
}
