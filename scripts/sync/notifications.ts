/**
 * Stock Sync Email Notifications
 *
 * Builds formatted email digests from sync results and stock alerts,
 * and sends them via SMTP using nodemailer. Email failures are caught
 * and logged -- they never crash the sync loop.
 *
 * Usage:
 *   import { notifySyncResults } from './notifications.js';
 *   await notifySyncResults(results, alerts, config);
 *
 * Phase 9: Automated Stock Sync
 */

import nodemailer from 'nodemailer';
import type { StockAlert, InventorySnapshot } from '../monitor/types.js';
import { loadLatestSnapshot, loadConfig as loadMonitorConfig } from '../monitor/store.js';
import type { SyncResult, SyncConfig, NotificationConfig, NotificationResult } from './types.js';

// =============================================================================
// Warehouse Email Helpers
// =============================================================================

/**
 * Format per-alert warehouse detail lines for email body.
 *
 * Adds indented lines showing which warehouses have stock and which don't.
 * Returns empty array if the alert has no warehouseDetail.
 *
 * @param alert - Stock alert with optional warehouseDetail
 * @returns Array of indented warehouse detail lines
 */
function formatAlertWarehouseLines(alert: StockAlert): string[] {
  if (!alert.warehouseDetail) return [];

  const lines: string[] = [];
  const detail = alert.warehouseDetail;

  if (detail.warehousesWithStock.length > 0) {
    const shown = detail.warehousesWithStock.slice(0, 3);
    const formatted = shown.map((w) => `${w.name} (${w.qty.toLocaleString()})`).join(', ');
    const remaining = detail.warehousesWithStock.length - shown.length;
    const suffix = remaining > 0 ? `, +${remaining} more` : '';
    lines.push(`       Warehouses with stock: ${formatted}${suffix}`);
  }

  if (detail.warehousesOutOfStock.length > 0) {
    const shown = detail.warehousesOutOfStock.slice(0, 3);
    const formatted = shown.map((w) => w.name).join(', ');
    const remaining = detail.warehousesOutOfStock.length - shown.length;
    const suffix = remaining > 0 ? `, +${remaining} more` : '';
    lines.push(`       Warehouses out: ${formatted}${suffix}`);
  }

  return lines;
}

/**
 * Build the WAREHOUSE INVENTORY section from latest snapshots.
 *
 * Groups warehouse quantities by product and shows top 3 warehouses
 * by quantity for each product.
 *
 * @param snapshots - Map of style -> latest snapshot
 * @param results - Sync results for product names
 * @returns Array of formatted lines, or empty if no warehouse data
 */
function buildWarehouseInventorySection(
  snapshots: Map<string, InventorySnapshot>,
  results: SyncResult[],
): string[] {
  if (snapshots.size === 0) return [];

  // Aggregate per-product warehouse totals from snapshots
  const productTotals: {
    style: string;
    name: string;
    warehouses: Map<string, number>;
  }[] = [];

  for (const result of results) {
    const snapshot = snapshots.get(result.style);
    if (!snapshot) continue;

    // Sum quantities per warehouse across all SKUs
    const warehouseTotals = new Map<string, number>();
    for (const sku of snapshot.skus) {
      if (!sku.warehouses) continue;
      for (const wh of sku.warehouses) {
        const current = warehouseTotals.get(wh.warehouseName) ?? 0;
        warehouseTotals.set(wh.warehouseName, current + wh.qty);
      }
    }

    if (warehouseTotals.size > 0) {
      productTotals.push({
        style: result.style,
        name: result.productName,
        warehouses: warehouseTotals,
      });
    }
  }

  if (productTotals.length === 0) return [];

  const lines: string[] = [];
  lines.push('WAREHOUSE INVENTORY');
  lines.push('\u2500'.repeat(21));

  for (const product of productTotals) {
    // Sort warehouses by total qty descending
    const sorted = [...product.warehouses.entries()].sort((a, b) => b[1] - a[1]);
    const top3 = sorted.slice(0, 3);
    const formatted = top3.map(([name, qty]) => `${name}: ${qty.toLocaleString()}`).join('  |  ');
    const remaining = sorted.length - top3.length;
    const suffix = remaining > 0 ? `  |  +${remaining} warehouses` : '';

    lines.push(`  ${product.style} ${product.name}:`);
    lines.push(`    ${formatted}${suffix}`);
  }

  lines.push('');
  return lines;
}

// =============================================================================
// Email Body Builder
// =============================================================================

/**
 * Build a plain-text email body summarizing stock changes and WIX updates.
 *
 * Structure:
 *   - Header with timestamp
 *   - Stock change alerts grouped by product (with warehouse detail)
 *   - WIX store visibility updates per product
 *   - Warehouse inventory summary per product
 *   - Summary totals
 *
 * Returns null if there are no changes to report (no alerts AND no sync updates),
 * signaling that no email should be sent.
 *
 * @param results - Sync results from syncAllProducts
 * @param alerts - Stock alerts from the poll cycle
 * @returns Formatted email body, or null if nothing to report
 */
export async function buildSyncEmailBody(
  results: SyncResult[],
  alerts: StockAlert[],
): Promise<string | null> {
  // Check if there's anything to report
  const hasAlerts = alerts.length > 0;
  const hasChanges = results.some(
    (r) => r.variantsHidden > 0 || r.variantsRestored > 0,
  );

  if (!hasAlerts && !hasChanges) {
    return null; // Nothing to report -- skip email
  }

  const lines: string[] = [];

  // Header
  lines.push('HotBox Stock Sync Report');
  lines.push('========================');
  lines.push(`Date: ${new Date().toISOString()}`);
  lines.push('');

  // Stock change alerts section
  if (hasAlerts) {
    lines.push('STOCK CHANGES DETECTED');
    lines.push('---------------------');

    // Group alerts by style+productName
    const grouped = new Map<string, StockAlert[]>();
    for (const alert of alerts) {
      const key = `${alert.style} ${alert.productName}`;
      const group = grouped.get(key) ?? [];
      group.push(alert);
      grouped.set(key, group);
    }

    for (const [product, productAlerts] of grouped) {
      lines.push(`  ${product}:`);
      for (const alert of productAlerts) {
        switch (alert.type) {
          case 'out-of-stock':
            lines.push(
              `    \u26A0 OUT OF STOCK: ${alert.color} ${alert.size} (was ${alert.previousQty}, now ${alert.currentQty})`,
            );
            break;
          case 'back-in-stock':
            lines.push(
              `    \uD83D\uDFE2 BACK IN STOCK: ${alert.color} ${alert.size} (was ${alert.previousQty}, now ${alert.currentQty})`,
            );
            break;
          case 'critical':
            lines.push(
              `    \uD83D\uDD34 CRITICAL: ${alert.color} ${alert.size} (${alert.currentQty} remaining)`,
            );
            break;
          case 'low-stock':
            lines.push(
              `    \uD83D\uDFE1 LOW STOCK: ${alert.color} ${alert.size} (${alert.currentQty} remaining)`,
            );
            break;
        }
        // Add per-alert warehouse detail lines
        const warehouseLines = formatAlertWarehouseLines(alert);
        lines.push(...warehouseLines);
      }
    }

    lines.push('');
  }

  // WIX store updates section
  if (results.length > 0) {
    lines.push('WIX STORE UPDATES');
    lines.push('-----------------');

    for (const r of results) {
      const parts: string[] = [];
      if (r.variantsHidden > 0) {
        parts.push(`${r.variantsHidden} variant(s) hidden (out of stock at SanMar)`);
      }
      if (r.variantsRestored > 0) {
        parts.push(`${r.variantsRestored} variant(s) restored (back in stock)`);
      }
      if (r.variantsUnchanged > 0) {
        parts.push(`${r.variantsUnchanged} variant(s) unchanged`);
      }

      lines.push(`  ${r.style} ${r.productName}:`);
      for (const part of parts) {
        lines.push(`    - ${part}`);
      }

      if (r.errors.length > 0) {
        lines.push(`    - ${r.errors.length} error(s): ${r.errors.join('; ')}`);
      }
    }

    lines.push('');
  }

  // Warehouse inventory section (from latest snapshots)
  if (results.length > 0) {
    try {
      const monitorConfig = await loadMonitorConfig();
      const snapshots = new Map<string, InventorySnapshot>();
      for (const result of results) {
        const snapshot = await loadLatestSnapshot(result.style, monitorConfig);
        if (snapshot) {
          snapshots.set(result.style, snapshot);
        }
      }
      const warehouseLines = buildWarehouseInventorySection(snapshots, results);
      lines.push(...warehouseLines);
    } catch {
      // Snapshot loading failed -- skip warehouse inventory section gracefully
    }
  }

  // Summary totals
  const totalHidden = results.reduce((sum, r) => sum + r.variantsHidden, 0);
  const totalRestored = results.reduce((sum, r) => sum + r.variantsRestored, 0);
  const totalChanges = totalHidden + totalRestored;

  lines.push('SUMMARY');
  lines.push('-------');
  lines.push(`Products checked: ${results.length}`);
  if (totalChanges > 0) {
    lines.push(
      `WIX updates made: ${results.filter((r) => r.variantsHidden > 0 || r.variantsRestored > 0).length} product(s), ${totalChanges} variant change(s)`,
    );
  }
  const noChangeCount = results.filter(
    (r) => r.variantsHidden === 0 && r.variantsRestored === 0,
  ).length;
  if (noChangeCount > 0) {
    lines.push(`No action needed: ${noChangeCount} product(s) (no changes)`);
  }

  lines.push('');
  lines.push('---');
  lines.push('Automated by HotBox Stock Sync');

  return lines.join('\n');
}

// =============================================================================
// Email Sending
// =============================================================================

/**
 * Send a sync notification email via SMTP.
 *
 * Uses nodemailer to create an SMTP transport and send a plain-text email.
 * Failures are caught and logged -- email is best-effort, not critical.
 *
 * @param subject - Email subject line
 * @param body - Plain-text email body
 * @param config - Notification configuration with SMTP credentials
 */
export async function sendSyncNotification(
  subject: string,
  body: string,
  config: NotificationConfig,
): Promise<NotificationResult> {
  try {
    const transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });

    await transport.sendMail({
      from: config.from,
      to: config.to,
      subject,
      text: body,
    });

    console.log(`[Sync] Notification email sent to ${config.to}`);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Sync] Failed to send notification email: ${message}`);
    // Do NOT throw -- email is best-effort, sync should continue
    return { success: false, error: message };
  }
}

// =============================================================================
// Orchestrator
// =============================================================================

/**
 * Send email notification for sync results if notifications are enabled
 * and there are changes to report.
 *
 * Flow:
 * 1. Check if notifications are enabled. If not, return silently.
 * 2. Build email body from results and alerts. If null (no changes), return.
 * 3. Build subject line with change count.
 * 4. Send email.
 *
 * @param results - Sync results from syncAllProducts
 * @param alerts - Stock alerts from the poll cycle
 * @param config - Full sync configuration (includes notification settings)
 */
export async function notifySyncResults(
  results: SyncResult[],
  alerts: StockAlert[],
  config: SyncConfig,
): Promise<NotificationResult | null> {
  if (!config.notification.enabled) {
    return null; // Notifications disabled
  }

  const body = await buildSyncEmailBody(results, alerts);
  if (!body) {
    console.log('[Sync] No changes to report -- skipping notification email.');
    return null;
  }

  // Build subject line
  const totalChanges = results.reduce(
    (sum, r) => sum + r.variantsHidden + r.variantsRestored,
    0,
  );
  const alertCount = alerts.length;
  const subject =
    totalChanges > 0 || alertCount > 0
      ? `[HotBox] Stock Sync: ${totalChanges + alertCount} change(s) detected`
      : '[HotBox] Stock Sync: No changes';

  return sendSyncNotification(subject, body, config.notification);
}
