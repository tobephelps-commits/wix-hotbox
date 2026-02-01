/**
 * Stock Sync Types
 *
 * TypeScript interfaces for the WIX stock sync system:
 * - Product mappings linking vendor styles to WIX product IDs
 * - Sync result tracking per-product visibility changes
 * - Sync configuration
 *
 * Phase 9: Automated Stock Sync
 * Phase 17: Vendor-agnostic product mappings
 */

import type { VendorId } from '../vendor/types.js';

// =============================================================================
// Product Mapping
// =============================================================================

/**
 * Maps a vendor style number to a WIX product ID for stock sync.
 *
 * Created when a product is published via the pipeline. The sync
 * service uses this mapping to find the WIX product to update
 * when vendor inventory changes.
 *
 * The vendor field identifies which vendor to query (defaults to 'sanmar'
 * for backward compatibility with existing product-map.json files).
 */
export interface ProductMapping {
  /** Vendor style number (e.g., "PC61" for SanMar, "2000" for S&S) */
  style: string;
  /** WIX product ID returned from product creation or query */
  wixProductId: string;
  /** Product name for logging/notifications */
  productName: string;
  /** ISO timestamp when mapping was created */
  linkedAt: string;
  /** Which vendor this product comes from (defaults to 'sanmar' when absent) */
  vendor?: VendorId;
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
 * Email notification configuration.
 *
 * Uses nodemailer to send SMTP-based email digests of stock changes.
 * Works with any SMTP provider (Gmail, Outlook, SendGrid, custom).
 */
export interface NotificationConfig {
  /** Whether email notifications are enabled */
  enabled: boolean;
  /** SMTP connection settings */
  smtp: {
    host: string;       // e.g., "smtp.gmail.com"
    port: number;       // e.g., 587
    secure: boolean;    // true for 465, false for 587/25
    user: string;       // SMTP username (email address)
    pass: string;       // SMTP password or app password
  };
  /** Recipient email address (store owner) */
  to: string;
  /** Sender email address (can be same as smtp.user) */
  from: string;
}

/**
 * Configuration for the stock sync service.
 */
export interface SyncConfig {
  /** Directory for sync state files (default: "./data/sync") */
  dataDir: string;
  /** Email notification settings */
  notification: NotificationConfig;
}
