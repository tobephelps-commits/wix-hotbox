/**
 * SMS Notification Sender
 *
 * Sends SMS notifications via Twilio when order status changes.
 * Handles phone number formatting to E.164, graceful degradation
 * when Twilio is not configured, and best-effort delivery (never throws).
 *
 * Phase 61: Notification System
 */

import Twilio from 'twilio';
import type Database from 'better-sqlite3';
import type { Config } from '../config.js';
import type { NotificationTemplate, NotificationContext, SendResult } from './types.js';
import { renderTemplate, logNotification, updateLogStatus } from './store.js';

// =============================================================================
// Twilio Configuration
// =============================================================================

/** Local config shape for Twilio credentials */
interface TwilioConfig {
  accountSid: string;
  authToken: string;
  phoneNumber: string;
}

/**
 * Check whether Twilio is configured with all required credentials.
 * Returns true only if accountSid, authToken, and phoneNumber are all non-empty.
 */
export function isTwilioConfigured(config: Config): boolean {
  return (
    config.twilioAccountSid.length > 0 &&
    config.twilioAuthToken.length > 0 &&
    config.twilioPhoneNumber.length > 0
  );
}

// =============================================================================
// Phone Number Formatting
// =============================================================================

/**
 * Format a phone number to E.164 format for Twilio.
 *
 * Accepts common US formats:
 * - (555) 123-4567
 * - 555-123-4567
 * - 5551234567
 * - +15551234567
 * - 15551234567
 *
 * Returns null if the number doesn't result in a valid E.164 format.
 */
export function formatPhoneE164(phone: string): string | null {
  // If already starts with +, validate it has enough digits
  if (phone.startsWith('+')) {
    const digits = phone.replace(/\D/g, '');
    // US numbers: +1 followed by 10 digits = 11 digits total
    if (digits.length >= 10 && digits.length <= 15) {
      return `+${digits}`;
    }
    return null;
  }

  // Strip all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // 10 digits: US number without country code → prepend +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // 11 digits starting with 1: US number with country code → prepend +
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // Invalid format
  return null;
}

// =============================================================================
// SMS Send Function
// =============================================================================

/**
 * Send an SMS notification for an order using a template.
 *
 * Flow:
 * 1. Check Twilio is configured
 * 2. Check customer phone exists
 * 3. Format phone to E.164
 * 4. Render body from template
 * 5. Log as 'pending'
 * 6. Send via Twilio
 * 7. Update log status (sent/failed)
 *
 * Never throws — returns SendResult with success/error.
 */
export async function sendOrderSms(
  config: Config,
  db: Database.Database,
  orderId: number,
  template: NotificationTemplate,
  context: NotificationContext,
): Promise<SendResult> {
  // 1. Check Twilio is configured
  if (!isTwilioConfigured(config)) {
    return { success: false, error: 'Twilio not configured' };
  }

  // 2. Check customer phone exists
  if (!context.customerPhone) {
    return { success: false, error: 'No phone number' };
  }

  // 3. Format phone to E.164
  const formattedPhone = formatPhoneE164(context.customerPhone);
  if (!formattedPhone) {
    return { success: false, error: 'Invalid phone number format' };
  }

  // 4. Render body from template
  let body = renderTemplate(template.bodyTemplate, context);

  // 5. Truncate to 1600 chars (Twilio handles multi-segment, but has a max)
  if (body.length > 1600) {
    body = body.substring(0, 1600);
  }

  // 6. Log notification as 'pending'
  const logId = logNotification(db, {
    orderId,
    templateId: template.id,
    channel: 'sms',
    recipient: formattedPhone,
    body,
    status: 'pending',
  });

  try {
    // 7. Create Twilio client and send
    const client = Twilio(config.twilioAccountSid, config.twilioAuthToken);
    await client.messages.create({
      body,
      from: config.twilioPhoneNumber,
      to: formattedPhone,
    });

    // 8. Success: update log
    updateLogStatus(db, logId, 'sent', undefined, new Date().toISOString());
    return { success: true, logId };
  } catch (err: unknown) {
    // 9. Failure: update log with error
    const errorMessage = err instanceof Error ? err.message : String(err);
    updateLogStatus(db, logId, 'failed', errorMessage);
    return { success: false, error: errorMessage, logId };
  }
}
