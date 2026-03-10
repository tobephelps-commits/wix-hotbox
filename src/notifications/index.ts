/**
 * Notification System
 *
 * Barrel export for notification types and store functions.
 *
 * Phase 61: Notification System
 */

export * from './types.js';
export * from './store.js';
export { sendOrderEmail, buildOrderStatusEmail } from './email-sender.js';
export { sendOrderSms, formatPhoneE164, isTwilioConfigured } from './sms-sender.js';
