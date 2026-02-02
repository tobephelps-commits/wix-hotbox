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
import type { ProductMapping, SyncConfig, MappingAuditResult } from './types.js';
import { getProduct } from '../pipeline/wix-api.js';

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
 * Prevents duplicate style+vendor pairs -- if a mapping for the same style
 * and vendor already exists, it is NOT added again. The same style from
 * different vendors is allowed (e.g., PC61 from SanMar and PC61 from S&S).
 *
 * @param mapping - Product mapping to add
 * @param config - Sync configuration (provides dataDir)
 */
export async function addProductMapping(
  mapping: ProductMapping,
  config: SyncConfig,
): Promise<void> {
  const mappings = await loadProductMap(config);

  // Prevent duplicates by style+vendor
  const vendor = mapping.vendor ?? 'sanmar';
  const exists = mappings.some(
    (m) => m.style === mapping.style && (m.vendor ?? 'sanmar') === vendor,
  );
  if (exists) {
    console.log(`[Sync] Style ${mapping.style} (${vendor}) is already mapped.`);
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

// =============================================================================
// Mapping Freshness Audit
// =============================================================================

/**
 * Audit all product mappings against the WIX API.
 *
 * Checks each mapping by fetching the product from WIX. Products that
 * return 404 are flagged as orphaned (deleted from WIX but still mapped).
 * Other errors are recorded separately.
 *
 * Rate-limited: 200ms delay between WIX API calls to avoid rate limits.
 *
 * @param config - Sync configuration (provides dataDir)
 * @returns Audit result with healthy/orphaned/error counts
 */
export async function auditProductMappings(config: SyncConfig): Promise<MappingAuditResult> {
  const mappings = await loadProductMap(config);
  const total = mappings.length;

  const result: MappingAuditResult = {
    total,
    healthy: 0,
    orphaned: [],
    errors: [],
  };

  if (total === 0) {
    console.log('[Audit] No product mappings to audit.');
    return result;
  }

  console.log(`[Audit] Auditing ${total} product mapping(s)...`);

  for (let i = 0; i < mappings.length; i++) {
    const mapping = mappings[i];
    console.log(`[Audit] Checking ${i + 1}/${total}: ${mapping.style}...`);

    try {
      await getProduct(mapping.wixProductId);
      result.healthy++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      if (message.includes('404')) {
        result.orphaned.push(mapping);
      } else {
        result.errors.push({ mapping, error: message });
      }
    }

    // Rate limit: 200ms between WIX API calls
    if (i < mappings.length - 1) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  console.log(
    `[Audit] ${result.healthy} healthy, ${result.orphaned.length} orphaned, ${result.errors.length} errors`,
  );

  return result;
}

/**
 * Remove orphaned mappings identified by a prior audit.
 *
 * Loads the current product map, filters out any mappings whose
 * style+wixProductId match an orphaned entry, and saves the result.
 *
 * @param audit - Audit result containing orphaned mappings to remove
 * @param config - Sync configuration (provides dataDir)
 * @returns Number of mappings removed
 */
export async function removeOrphanedMappings(
  audit: MappingAuditResult,
  config: SyncConfig,
): Promise<number> {
  if (audit.orphaned.length === 0) {
    console.log('[Audit] No orphaned mappings to remove.');
    return 0;
  }

  const mappings = await loadProductMap(config);
  const orphanedIds = new Set(audit.orphaned.map((m) => m.wixProductId));
  const filtered = mappings.filter((m) => !orphanedIds.has(m.wixProductId));
  const count = mappings.length - filtered.length;

  await saveProductMap(filtered, config);
  console.log(`[Audit] Removed ${count} orphaned mapping(s).`);

  return count;
}
