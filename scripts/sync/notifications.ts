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
import type { StockAlert } from '../monitor/types.js';
import type { SyncResult, SyncConfig, NotificationConfig } from './types.js';

// =============================================================================
// Email Body Builder
// =============================================================================

/**
 * Build a plain-text email body summarizing stock changes and WIX updates.
 *
 * Structure:
 *   - Header with timestamp
 *   - Stock change alerts grouped by product
 *   - WIX store visibility updates per product
 *   - Summary totals
 *
 * Returns null if there are no changes to report (no alerts AND no sync updates),
 * signaling that no email should be sent.
 *
 * @param results - Sync results from syncAllProducts
 * @param alerts - Stock alerts from the poll cycle
 * @returns Formatted email body, or null if nothing to report
 */
export function buildSyncEmailBody(
  results: SyncResult[],
  alerts: StockAlert[],
): string | null {
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
): Promise<void> {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Sync] Failed to send notification email: ${message}`);
    // Do NOT throw -- email is best-effort, sync should continue
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
): Promise<void> {
  if (!config.notification.enabled) {
    return; // Notifications disabled
  }

  const body = buildSyncEmailBody(results, alerts);
  if (!body) {
    console.log('[Sync] No changes to report -- skipping notification email.');
    return;
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

  await sendSyncNotification(subject, body, config.notification);
}
