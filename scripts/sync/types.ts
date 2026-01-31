/**
 * Stock Sync Types
 *
 * TypeScript interfaces for the WIX stock sync system:
 * - Product mappings linking SanMar styles to WIX product IDs
 * - Sync result tracking per-product visibility changes
 * - Sync configuration
 *
 * Phase 9: Automated Stock Sync
 */

// =============================================================================
// Product Mapping
// =============================================================================

/**
 * Maps a SanMar style number to a WIX product ID for stock sync.
 *
 * Created when a product is published via the pipeline. The sync
 * service uses this mapping to find the WIX product to update
 * when SanMar inventory changes.
 */
export interface ProductMapping {
  /** SanMar style number (e.g., "PC61") */
  style: string;
  /** WIX product ID returned from product creation or query */
  wixProductId: string;
  /** Product name for logging/notifications */
  productName: string;
  /** ISO timestamp when mapping was created */
  linkedAt: string;
}

// =============================================================================
// Sync Results
// =============================================================================

/**
 * Result of a sync operation for one product.
 *
 * Tracks how many variants were hidden (out of stock),
 * restored (back in stock), or unchanged during the sync.
 */
export interface SyncResult {
  /** SanMar style number */
  style: string;
  /** Product name for display */
  productName: string;
  /** WIX product ID that was synced */
  wixProductId: string;
  /** Number of variants set to visible: false (out of stock) */
  variantsHidden: number;
  /** Number of variants set to visible: true (restocked) */
  variantsRestored: number;
  /** Number of variants with no visibility change */
  variantsUnchanged: number;
  /** Any errors encountered during sync */
  errors: string[];
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Configuration for the stock sync service.
 */
export interface SyncConfig {
  /** Directory for sync state files (default: "./data/sync") */
  dataDir: string;
}
