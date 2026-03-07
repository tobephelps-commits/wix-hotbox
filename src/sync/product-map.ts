/**
 * Product Mapping Store (SQLite)
 *
 * CRUD operations for vendor style -> WIX product ID mappings.
 * All functions take Database as first parameter per v2.0 conventions.
 *
 * v2.0 architecture: ported from scripts/sync/product-map.ts
 * - JSON file persistence replaced with SQLite queries
 * - SyncConfig parameter replaced with Database parameter
 */

import type Database from 'better-sqlite3';
import type { ProductMapping } from './types.js';
import type { VendorId } from '../vendors/types.js';

// =============================================================================
// Product Mapping CRUD
// =============================================================================

/**
 * Find a product mapping by style number and optional vendor.
 *
 * @param db - SQLite database instance
 * @param style - Vendor style number to look up
 * @param vendor - Vendor ID (defaults to 'sanmar')
 * @returns The matching ProductMapping, or null if not found
 */
export function findMapping(
  db: Database.Database,
  style: string,
  vendor: VendorId = 'sanmar',
): ProductMapping | null {
  const row = db
    .prepare(
      'SELECT style, vendor, wix_product_id, product_name, linked_at FROM product_mappings WHERE style = ? AND vendor = ?',
    )
    .get(style, vendor) as
    | { style: string; vendor: VendorId; wix_product_id: string; product_name: string; linked_at: string }
    | undefined;

  if (!row) return null;

  return {
    style: row.style,
    vendor: row.vendor as VendorId,
    wixProductId: row.wix_product_id,
    productName: row.product_name,
    linkedAt: row.linked_at,
  };
}

/**
 * Save (upsert) a product mapping.
 *
 * Uses INSERT OR REPLACE to handle both new and existing mappings.
 * The UNIQUE(style, vendor) constraint drives the replace behavior.
 *
 * @param db - SQLite database instance
 * @param mapping - Product mapping to save
 */
export function saveMapping(
  db: Database.Database,
  mapping: ProductMapping,
): void {
  db.prepare(
    `INSERT OR REPLACE INTO product_mappings (style, vendor, wix_product_id, product_name, linked_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    mapping.style,
    mapping.vendor,
    mapping.wixProductId,
    mapping.productName,
    mapping.linkedAt,
  );
}

/**
 * Remove a product mapping by style number and optional vendor.
 *
 * @param db - SQLite database instance
 * @param style - Vendor style number to remove
 * @param vendor - Vendor ID (defaults to 'sanmar')
 * @returns true if a mapping was deleted, false if not found
 */
export function removeMapping(
  db: Database.Database,
  style: string,
  vendor: VendorId = 'sanmar',
): boolean {
  const result = db
    .prepare('DELETE FROM product_mappings WHERE style = ? AND vendor = ?')
    .run(style, vendor);

  return result.changes > 0;
}

/**
 * List all product mappings.
 *
 * @param db - SQLite database instance
 * @returns Array of all product mappings
 */
export function listMappings(db: Database.Database): ProductMapping[] {
  const rows = db
    .prepare(
      'SELECT style, vendor, wix_product_id, product_name, linked_at FROM product_mappings ORDER BY linked_at DESC',
    )
    .all() as {
    style: string;
    vendor: string;
    wix_product_id: string;
    product_name: string;
    linked_at: string;
  }[];

  return rows.map((row) => ({
    style: row.style,
    vendor: row.vendor as VendorId,
    wixProductId: row.wix_product_id,
    productName: row.product_name,
    linkedAt: row.linked_at,
  }));
}
