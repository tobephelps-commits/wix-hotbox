/**
 * Inventory Monitor Store
 *
 * JSON file persistence for tracked products, configuration,
 * and inventory snapshots. All data is stored as human-readable
 * JSON files in the configured data directory.
 *
 * File structure:
 *   {dataDir}/config.json           - Monitor configuration
 *   {dataDir}/tracked-products.json - List of tracked products
 *   {dataDir}/snapshots/{style}.json - Latest inventory snapshot per style
 *
 * Phase 8: Inventory Monitoring
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { MonitorConfig, TrackedProduct, InventorySnapshot } from './types.js';

// =============================================================================
// Default Configuration
// =============================================================================

/**
 * Returns default monitor configuration values.
 */
export function getDefaultConfig(): MonitorConfig {
  return {
    pollIntervalMinutes: 60,
    dataDir: './data/monitor',
    lowStockThreshold: 10,
    criticalStockThreshold: 3,
    outOfStockThreshold: 0,
  };
}

// =============================================================================
// Configuration Persistence
// =============================================================================

/**
 * Load monitor configuration from JSON file.
 *
 * @param dataDir - Data directory to load from (default: "./data/monitor")
 * @returns MonitorConfig from file, or defaults if file doesn't exist
 */
export async function loadConfig(dataDir?: string): Promise<MonitorConfig> {
  const dir = dataDir ?? './data/monitor';
  const configPath = path.join(dir, 'config.json');

  try {
    const raw = await readFile(configPath, 'utf-8');
    return JSON.parse(raw) as MonitorConfig;
  } catch {
    // File doesn't exist or is invalid -- return defaults
    return getDefaultConfig();
  }
}

/**
 * Save monitor configuration to JSON file.
 *
 * Creates the data directory if it doesn't exist.
 *
 * @param config - Configuration to persist
 */
export async function saveConfig(config: MonitorConfig): Promise<void> {
  await mkdir(config.dataDir, { recursive: true });
  const configPath = path.join(config.dataDir, 'config.json');
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

// =============================================================================
// Tracked Products Persistence
// =============================================================================

/**
 * Load tracked products from JSON file.
 *
 * @param config - Monitor configuration (provides dataDir)
 * @returns Array of tracked products, or empty array if file doesn't exist
 */
export async function loadTrackedProducts(config: MonitorConfig): Promise<TrackedProduct[]> {
  const filePath = path.join(config.dataDir, 'tracked-products.json');

  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as TrackedProduct[];
  } catch {
    // File doesn't exist -- return empty list
    return [];
  }
}

/**
 * Save tracked products to JSON file.
 *
 * Creates the data directory if it doesn't exist.
 *
 * @param products - Array of tracked products to persist
 * @param config - Monitor configuration (provides dataDir)
 */
export async function saveTrackedProducts(
  products: TrackedProduct[],
  config: MonitorConfig,
): Promise<void> {
  await mkdir(config.dataDir, { recursive: true });
  const filePath = path.join(config.dataDir, 'tracked-products.json');
  await writeFile(filePath, JSON.stringify(products, null, 2), 'utf-8');
}

/**
 * Add a product to the tracked products list.
 *
 * Prevents duplicates by checking style number. If a product with the
 * same style already exists, it is NOT added again.
 *
 * @param product - Product to add
 * @param config - Monitor configuration (provides dataDir)
 */
export async function addTrackedProduct(
  product: TrackedProduct,
  config: MonitorConfig,
): Promise<void> {
  const products = await loadTrackedProducts(config);

  // Prevent duplicates by style
  const exists = products.some((p) => p.style === product.style);
  if (exists) {
    console.log(`[Monitor] Style ${product.style} is already tracked.`);
    return;
  }

  products.push(product);
  await saveTrackedProducts(products, config);
  console.log(`[Monitor] Added ${product.style} (${product.name}) to tracking.`);
}

/**
 * Remove a product from the tracked products list.
 *
 * @param style - SanMar style number to remove
 * @param config - Monitor configuration (provides dataDir)
 * @returns true if the product was found and removed, false if not found
 */
export async function removeTrackedProduct(
  style: string,
  config: MonitorConfig,
): Promise<boolean> {
  const products = await loadTrackedProducts(config);
  const filtered = products.filter((p) => p.style !== style);

  if (filtered.length === products.length) {
    console.log(`[Monitor] Style ${style} is not tracked.`);
    return false;
  }

  await saveTrackedProducts(filtered, config);
  console.log(`[Monitor] Removed ${style} from tracking.`);
  return true;
}

// =============================================================================
// Snapshot Persistence
// =============================================================================

/**
 * Load the latest inventory snapshot for a style.
 *
 * @param style - SanMar style number
 * @param config - Monitor configuration (provides dataDir)
 * @returns Latest snapshot, or null if no snapshot exists
 */
export async function loadLatestSnapshot(
  style: string,
  config: MonitorConfig,
): Promise<InventorySnapshot | null> {
  const snapshotPath = path.join(config.dataDir, 'snapshots', `${style}.json`);

  try {
    const raw = await readFile(snapshotPath, 'utf-8');
    return JSON.parse(raw) as InventorySnapshot;
  } catch {
    // No snapshot exists yet
    return null;
  }
}

/**
 * Save an inventory snapshot for a style.
 *
 * Overwrites the previous snapshot -- only the latest is needed
 * for change detection. Creates the snapshots directory if needed.
 *
 * @param snapshot - Inventory snapshot to persist
 * @param config - Monitor configuration (provides dataDir)
 */
export async function saveSnapshot(
  snapshot: InventorySnapshot,
  config: MonitorConfig,
): Promise<void> {
  const snapshotsDir = path.join(config.dataDir, 'snapshots');
  await mkdir(snapshotsDir, { recursive: true });
  const snapshotPath = path.join(snapshotsDir, `${snapshot.style}.json`);
  await writeFile(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');
}

// =============================================================================
// Product Last-Polled Tracking
// =============================================================================

/**
 * Update a single product's lastPolledAt timestamp in the tracked products file.
 *
 * Loads the tracked products list, finds the product by style, updates its
 * lastPolledAt field, and saves the list back. This enables priority-based
 * polling where each product tracks when it was last checked.
 *
 * @param style - SanMar style number to update
 * @param timestamp - ISO timestamp of the poll
 * @param config - Monitor configuration (provides dataDir)
 */
export async function updateProductLastPolled(
  style: string,
  timestamp: string,
  config: MonitorConfig,
): Promise<void> {
  const products = await loadTrackedProducts(config);
  const product = products.find((p) => p.style === style);

  if (!product) {
    return; // Product not found -- silently skip (may have been removed mid-poll)
  }

  product.lastPolledAt = timestamp;
  await saveTrackedProducts(products, config);
}
