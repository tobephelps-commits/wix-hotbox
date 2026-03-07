/**
 * Stock Sync Types
 *
 * TypeScript interfaces for the stock sync system:
 * - Product mappings linking vendor styles to WIX product IDs
 * - Sync result tracking per-product inventory changes
 * - Sync health metrics for the polling daemon
 * - Notification configuration
 *
 * v2.0 architecture: ported from scripts/sync/types.ts
 * - VendorId imported from vendors module
 * - SyncConfig reduced to NotificationConfig (db passed as function parameter)
 */

import type { VendorId } from '../vendors/types.js';

// =============================================================================
// Product Mapping
// =============================================================================

/**
 * Maps a vendor style number to a WIX product ID for stock sync.
 *
 * Created when a product is published via the pipeline. The sync
 * service uses this mapping to find the WIX product to update
 * when vendor inventory changes.
 */
export interface ProductMapping {
  /** Vendor style number (e.g., "PC61" for SanMar, "2000" for S&S) */
  style: string;
  /** Which vendor this product comes from */
  vendor: VendorId;
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
 * Tracks how many variants had their inventory updated:
 * out-of-stock (quantity set to 0), restocked (quantity > 0),
 * or unchanged during the sync.
 */
export interface SyncResult {
  /** Vendor style number */
  style: string;
  /** Product name for display */
  productName: string;
  /** WIX product ID that was synced */
  wixProductId: string;
  /** Number of variants set to out-of-stock (quantity 0) */
  variantsOutOfStock: number;
  /** Number of variants restocked (quantity > 0) */
  variantsRestocked: number;
  /** Number of variants with no inventory change */
  variantsUnchanged: number;
  /** Number of variants with unparseable SKUs */
  parseErrors: number;
  /** Any errors encountered during sync */
  errors: string[];
}

// =============================================================================
// Mapping Audit
// =============================================================================

/**
 * Result of a product mapping freshness audit.
 *
 * Checks all product mappings against the WIX API to detect
 * orphaned mappings (WIX product deleted) and other fetch errors.
 */
export interface MappingAuditResult {
  /** Total mappings checked */
  total: number;
  /** Mappings where WIX product still exists */
  healthy: number;
  /** Mappings where WIX product was not found (404) */
  orphaned: ProductMapping[];
  /** Mappings where fetch produced a non-404 error */
  errors: { mapping: ProductMapping; error: string }[];
}

// =============================================================================
// Notification Result
// =============================================================================

/**
 * Result of a notification delivery attempt.
 *
 * Returned by sendSyncNotification so callers can track delivery
 * success/failure in SyncHealth without swallowing errors.
 */
export interface NotificationResult {
  /** Whether the email was sent successfully */
  success: boolean;
  /** Error message if delivery failed */
  error?: string;
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
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  };
  /** Recipient email address (store owner) */
  to: string;
  /** Sender email address (can be same as smtp.user) */
  from: string;
}

// =============================================================================
// Sync Health
// =============================================================================

/**
 * Health metrics for the sync polling daemon.
 *
 * Tracks operational statistics for monitoring and alerting.
 * Populated by the sync-poller and exposed via health API endpoint.
 */
export interface SyncHealth {
  /** ISO timestamp when the daemon started */
  startedAt: string;
  /** ISO timestamp of the last poll tick, or null if none yet */
  lastTickAt: string | null;
  /** ISO timestamp of the last successful tick, or null if none yet */
  lastSuccessAt: string | null;
  /** Number of consecutive errors (resets on success) */
  consecutiveErrors: number;
  /** Total number of completed poll cycles */
  totalCycles: number;
  /** Total number of errored poll cycles */
  totalErrors: number;
  /** Number of products polled in the last tick */
  productsPolled: number;
  /** Duration of the last tick in milliseconds */
  lastTickDurationMs: number;
  /** Cumulative moving average tick duration in milliseconds */
  avgTickDurationMs: number;
  /** Maximum tick duration seen in milliseconds */
  maxTickDurationMs: number;
  /** Total number of notification emails sent successfully */
  notificationsSent: number;
  /** Total number of notification emails that failed */
  notificationsFailed: number;
}
