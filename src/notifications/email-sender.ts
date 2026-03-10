/**
 * Email Sender
 *
 * Sends customer-facing HTML order status emails using nodemailer.
 * Reuses the same SMTP config pattern from sync/notifications.ts.
 * Logs delivery attempts to notification_log via the store.
 *
 * Best-effort: never throws — returns SendResult on success or failure.
 *
 * Phase 61: Notification System
 */

import nodemailer from 'nodemailer';
import type Database from 'better-sqlite3';
import type { NotificationConfig } from '../sync/types.js';
import type {
  NotificationTemplate,
  NotificationContext,
  SendResult,
} from './types.js';
import { renderTemplate, logNotification, updateLogStatus } from './store.js';

// =============================================================================
// Default Subjects per Stage
// =============================================================================

const DEFAULT_SUBJECTS: Record<string, string> = {
  ordered: '[HotBox] Order #{{orderNumber}} — Placed with Supplier',
  received: '[HotBox] Order #{{orderNumber}} — Materials Received',
  'in-production': '[HotBox] Order #{{orderNumber}} — In Production',
  packed: '[HotBox] Order #{{orderNumber}} — Ready to Ship',
  shipped: '[HotBox] Order #{{orderNumber}} — Shipped!',
  delivered: '[HotBox] Order #{{orderNumber}} — Delivered',
  cancelled: '[HotBox] Order #{{orderNumber}} — Cancelled',
};

// =============================================================================
// HTML Email Builder
// =============================================================================

/**
 * Build an HTML email from a rendered body and subject.
 *
 * Uses inline CSS for maximum email client compatibility.
 * Also generates a plain-text version by stripping HTML tags.
 */
export function buildOrderStatusEmail(
  context: NotificationContext,
  bodyTemplate: string,
  subjectTemplate: string,
): { subject: string; html: string; text: string } {
  const subject = renderTemplate(subjectTemplate, context);
  const renderedBody = renderTemplate(bodyTemplate, context);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f4;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:8px;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a1a;padding:24px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:1px;">HotBox Clothing</h1>
            </td>
          </tr>
          <!-- Order Number -->
          <tr>
            <td style="padding:24px 32px 8px 32px;text-align:center;">
              <p style="margin:0;color:#666666;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;">Order #${escapeHtml(context.orderNumber)}</p>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding:16px 32px 32px 32px;color:#333333;font-size:16px;line-height:1.6;">
              ${renderedBody}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:20px 32px;text-align:center;border-top:1px solid #eeeeee;">
              <p style="margin:0 0 4px 0;color:#999999;font-size:13px;">HotBox Clothing</p>
              <p style="margin:0;color:#bbbbbb;font-size:11px;">This is an automated notification.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  // Plain-text version: strip HTML tags and decode common entities
  const text = [
    'HotBox Clothing',
    '',
    `Order #${context.orderNumber}`,
    '',
    stripHtml(renderedBody),
    '',
    '---',
    'HotBox Clothing',
    'This is an automated notification.',
  ].join('\n');

  return { subject, html, text };
}

// =============================================================================
// Send Function
// =============================================================================

/**
 * Send an order status email to the customer.
 *
 * Flow:
 *   1. Render subject + body from template using context
 *   2. Build HTML + text email
 *   3. Log notification as 'pending' via logNotification()
 *   4. Send via nodemailer transport
 *   5. On success: updateLogStatus() to 'sent' with sentAt timestamp
 *   6. On failure: updateLogStatus() to 'failed' with error message
 *   7. Return SendResult (never throws)
 *
 * If config.enabled is false, returns success immediately (no-op).
 * If context.customerEmail is missing/empty, returns failure.
 */
export async function sendOrderEmail(
  config: NotificationConfig,
  db: Database.Database,
  orderId: number,
  template: NotificationTemplate,
  context: NotificationContext,
): Promise<SendResult> {
  // No-op if notifications are disabled
  if (!config.enabled) {
    return { success: true };
  }

  // Validate recipient
  if (!context.customerEmail || context.customerEmail.trim() === '') {
    return { success: false, error: 'No email address' };
  }

  // Resolve subject: use template subject if present, else stage default, else generic
  const subjectTemplate =
    template.subject ||
    DEFAULT_SUBJECTS[template.stage] ||
    `[HotBox] Order #{{orderNumber}} — Status Update`;

  // Build the email
  const { subject, html, text } = buildOrderStatusEmail(
    context,
    template.bodyTemplate,
    subjectTemplate,
  );

  // Log as pending
  let logId: number | undefined;
  try {
    logId = logNotification(db, {
      orderId,
      templateId: template.id,
      channel: 'email',
      recipient: context.customerEmail,
      subject,
      body: text,
      status: 'pending',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[Notifications] Failed to log notification for order #${context.orderNumber}: ${message}`,
    );
    return { success: false, error: message };
  }

  try {
    // Create transport and send
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
      to: context.customerEmail,
      subject,
      html,
      text,
    });

    // Update log to sent
    updateLogStatus(db, logId, 'sent', undefined, new Date().toISOString());
    console.log(
      `[Notifications] Email sent to ${context.customerEmail} for order #${context.orderNumber} (${template.stage})`,
    );

    return { success: true, logId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[Notifications] Failed to send email for order #${context.orderNumber}: ${message}`,
    );

    // Update log to failed (best-effort)
    try {
      updateLogStatus(db, logId, 'failed', message);
    } catch {
      // Swallow — best-effort logging
    }

    return { success: false, error: message, logId };
  }
}

// =============================================================================
// HTML Helpers
// =============================================================================

/** Escape HTML special characters for safe interpolation */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Strip HTML tags and decode common entities for plain-text fallback */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
