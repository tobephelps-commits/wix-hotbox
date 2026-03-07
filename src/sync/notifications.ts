/**
 * Stock Sync Email Notifications
 *
 * Builds formatted email digests from sync results and sends them
 * via SMTP using nodemailer. Email failures are caught and returned
 * as NotificationResult -- they never crash the sync loop.
 *
 * v2.0 architecture: ported from scripts/sync/notifications.ts
 * - Simplified email body (no monitor/warehouse dependencies)
 * - Takes NotificationConfig directly (not SyncConfig)
 * - Audit result summary included when provided
 */

import nodemailer from 'nodemailer';
import type {
  SyncResult,
  NotificationConfig,
  NotificationResult,
  MappingAuditResult,
} from './types.js';

// =============================================================================
// Email Body Builder
// =============================================================================

/**
 * Build a plain-text email body summarizing stock sync results.
 *
 * Structure:
 *   - Header with timestamp
 *   - Sync summary (products synced, variants updated)
 *   - Alert summary (threshold crossings) if alerts provided
 *   - Audit results (orphaned mappings) if audit provided
 *   - Summary totals
 *
 * @param results - Sync results from the poll cycle
 * @param alerts - Optional alert messages from threshold crossings
 * @param auditResult - Optional audit result for orphaned mapping info
 * @returns Formatted email body string
 */
function buildEmailBody(
  results: SyncResult[],
  alerts?: string[],
  auditResult?: MappingAuditResult,
): string {
  const lines: string[] = [];

  // Header
  lines.push('HotBox Stock Sync Report');
  lines.push('========================');
  lines.push(`Date: ${new Date().toISOString()}`);
  lines.push('');

  // Sync results section
  if (results.length > 0) {
    lines.push('WIX STORE UPDATES');
    lines.push('-----------------');

    for (const r of results) {
      const parts: string[] = [];
      if (r.variantsOutOfStock > 0) {
        parts.push(`${r.variantsOutOfStock} variant(s) out-of-stock`);
      }
      if (r.variantsRestocked > 0) {
        parts.push(`${r.variantsRestocked} variant(s) restocked`);
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

  // Alert summary section
  if (alerts && alerts.length > 0) {
    lines.push('STOCK ALERTS');
    lines.push('------------');
    for (const alert of alerts) {
      lines.push(`  ${alert}`);
    }
    lines.push('');
  }

  // Audit results section
  if (auditResult) {
    lines.push('MAPPING AUDIT');
    lines.push('-------------');
    lines.push(`  Total mappings: ${auditResult.total}`);
    lines.push(`  Healthy: ${auditResult.healthy}`);

    if (auditResult.orphaned.length > 0) {
      lines.push(`  Orphaned: ${auditResult.orphaned.length}`);
      for (const m of auditResult.orphaned) {
        lines.push(`    - ${m.style} (${m.vendor}): ${m.productName}`);
      }
    }

    if (auditResult.errors.length > 0) {
      lines.push(`  Errors: ${auditResult.errors.length}`);
      for (const e of auditResult.errors) {
        lines.push(`    - ${e.mapping.style}: ${e.error}`);
      }
    }

    lines.push('');
  }

  // Summary totals
  const totalOutOfStock = results.reduce(
    (sum, r) => sum + r.variantsOutOfStock,
    0,
  );
  const totalRestocked = results.reduce(
    (sum, r) => sum + r.variantsRestocked,
    0,
  );
  const totalChanges = totalOutOfStock + totalRestocked;

  lines.push('SUMMARY');
  lines.push('-------');
  lines.push(`Products checked: ${results.length}`);
  if (totalChanges > 0) {
    const productsChanged = results.filter(
      (r) => r.variantsOutOfStock > 0 || r.variantsRestocked > 0,
    ).length;
    lines.push(
      `WIX updates made: ${productsChanged} product(s), ${totalChanges} variant change(s)`,
    );
  }
  const noChangeCount = results.filter(
    (r) => r.variantsOutOfStock === 0 && r.variantsRestocked === 0,
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
 * Builds an email digest from sync results, alerts, and audit data,
 * then sends it using nodemailer. If config.enabled is false, returns
 * success immediately (no-op).
 *
 * Failures are caught and returned as NotificationResult -- email is
 * best-effort, never throws.
 *
 * @param config - Notification configuration with SMTP credentials
 * @param results - Sync results from the poll cycle
 * @param alerts - Optional alert messages from threshold crossings
 * @param auditResult - Optional audit result for orphaned mapping info
 * @returns NotificationResult indicating success or failure
 */
export async function sendSyncNotification(
  config: NotificationConfig,
  results: SyncResult[],
  alerts?: string[],
  auditResult?: MappingAuditResult,
): Promise<NotificationResult> {
  if (!config.enabled) {
    return { success: true };
  }

  try {
    const body = buildEmailBody(results, alerts, auditResult);

    // Build subject line
    const totalChanges = results.reduce(
      (sum, r) => sum + r.variantsOutOfStock + r.variantsRestocked,
      0,
    );
    const alertCount = alerts?.length ?? 0;
    const changeCount = totalChanges + alertCount;
    const subject =
      changeCount > 0
        ? `[HotBox] Stock Sync: ${changeCount} change(s) detected`
        : '[HotBox] Stock Sync: No changes';

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
    return { success: false, error: message };
  }
}
