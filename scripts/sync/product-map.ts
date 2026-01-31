/**
 * Product Mapping Store
 *
 * JSON file persistence for SanMar style → WIX product ID mappings.
 * Follows the same pattern as scripts/monitor/store.ts for consistency.
 *
 * File structure:
 *   {dataDir}/product-map.json - Array of ProductMapping objects
 *
 * Phase 9: Automated Stock Sync
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ProductMapping, SyncConfig } from './types.js';

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Returns the default sync configuration.
 *
 * Notifications are disabled by default -- the user must set SMTP
 * credentials via environment variables to enable email digests.
 */
export function getDefaultSyncConfig(): SyncConfig {
  return {
    dataDir: './data/sync',
    notification: {
      enabled: false,
      smtp: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: '',
        pass: '',
      },
      to: '',
      from: '',
    },
  };
}

// =============================================================================
// Product Mapping CRUD
// =============================================================================

/**
 * Load all product mappings from JSON file.
 *
 * @param config - Sync configuration (provides dataDir)
 * @returns Array of product mappings, or empty array if file doesn't exist
 */
export async function loadProductMap(config: SyncConfig): Promise<ProductMapping[]> {
  const filePath = path.join(config.dataDir, 'product-map.json');

  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as ProductMapping[];
  } catch {
    // File doesn't exist or is invalid -- return empty list
    return [];
  }
}

/**
 * Save all product mappings to JSON file.
 *
 * Creates the data directory if it doesn't exist.
 *
 * @param mappings - Array of product mappings to persist
 * @param config - Sync configuration (provides dataDir)
 */
export async function saveProductMap(
  mappings: ProductMapping[],
  config: SyncConfig,
): Promise<void> {
  await mkdir(config.dataDir, { recursive: true });
  const filePath = path.join(config.dataDir, 'product-map.json');
  await writeFile(filePath, JSON.stringify(mappings, null, 2), 'utf-8');
}

/**
 * Add a product mapping.
 *
 * Prevents duplicate styles -- if a mapping for the same style
 * already exists, it is NOT added again.
 *
 * @param mapping - Product mapping to add
 * @param config - Sync configuration (provides dataDir)
 */
export async function addProductMapping(
  mapping: ProductMapping,
  config: SyncConfig,
): Promise<void> {
  const mappings = await loadProductMap(config);

  // Prevent duplicates by style
  const exists = mappings.some((m) => m.style === mapping.style);
  if (exists) {
    console.log(`[Sync] Style ${mapping.style} is already mapped.`);
    return;
  }

  mappings.push(mapping);
  await saveProductMap(mappings, config);
  console.log(`[Sync] Mapped ${mapping.style} -> WIX product ${mapping.wixProductId}`);
}

/**
 * Remove a product mapping by style number.
 *
 * @param style - SanMar style number to remove
 * @param config - Sync configuration (provides dataDir)
 * @returns true if the mapping was found and removed, false if not found
 */
export async function removeProductMapping(
  style: string,
  config: SyncConfig,
): Promise<boolean> {
  const mappings = await loadProductMap(config);
  const filtered = mappings.filter((m) => m.style !== style);

  if (filtered.length === mappings.length) {
    console.log(`[Sync] Style ${style} is not mapped.`);
    return false;
  }

  await saveProductMap(filtered, config);
  console.log(`[Sync] Removed mapping for ${style}.`);
  return true;
}

/**
 * Find a product mapping by style number.
 *
 * @param style - SanMar style number to look up
 * @param config - Sync configuration (provides dataDir)
 * @returns The matching ProductMapping, or null if not found
 */
export async function findMapping(
  style: string,
  config: SyncConfig,
): Promise<ProductMapping | null> {
  const mappings = await loadProductMap(config);
  return mappings.find((m) => m.style === style) ?? null;
}
