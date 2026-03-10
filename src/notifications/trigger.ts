/**
 * Notification Trigger Engine
 *
 * Orchestrates notification delivery when order status changes.
 * Looks up enabled templates for the new status, resolves customer
 * contact info from order data and WIX contacts, and dispatches
 * to email/SMS channels.
 *
 * Best-effort: never throws — logs all attempts and returns results.
 *
 * Phase 61: Notification System
 */

import type Database from 'better-sqlite3';
import type { Config } from '../config.js';
import type { NotificationConfig } from '../sync/types.js';
import type { Order, OrderStatus } from '../orders/types.js';
import type {
  NotificationTemplate,
  NotificationContext,
  SendResult,
} from './types.js';
import { getEnabledTemplatesForStage } from './store.js';
import { sendOrderEmail } from './email-sender.js';
import { sendOrderSms } from './sms-sender.js';
import { getOrder } from '../orders/index.js';
import { getWixContactByEmail } from '../wix-contacts/store.js';

// =============================================================================
// Customer Contact Resolution
// =============================================================================

/**
 * Resolve customer contact information from an order.
 *
 * Priority for email:
 *   1. order.customerEmail
 *   2. order.billingAddress?.email (if OrderAddress ever gains email)
 *   3. WIX contact lookup by existing email
 *
 * Priority for phone:
 *   1. order.billingAddress?.phone
 *   2. order.customerPhone
 *   3. WIX contact phone
 *
 * Priority for name:
 *   1. order.billingAddress?.firstName + lastName
 *   2. order.customerFirstName + customerLastName
 *   3. WIX contact name
 *   4. 'Customer' (fallback)
 */
export function resolveCustomerContact(
  db: Database.Database,
  order: Order,
): { name: string; email: string | null; phone: string | null } {
  // Resolve email
  let email: string | null = order.customerEmail ?? null;

  // Resolve phone
  let phone: string | null = order.billingAddress?.phone ?? order.customerPhone ?? null;

  // Resolve name
  let name = 'Customer';
  if (order.billingAddress?.firstName) {
    name = [order.billingAddress.firstName, order.billingAddress.lastName]
      .filter(Boolean)
      .join(' ');
  } else if (order.customerFirstName) {
    name = [order.customerFirstName, order.customerLastName]
      .filter(Boolean)
      .join(' ');
  }

  // Try WIX contact lookup for additional info
  if (email) {
    try {
      const contact = getWixContactByEmail(db, email);
      if (contact) {
        // Fill in missing phone from WIX contact
        if (!phone && contact.phone) {
          phone = contact.phone;
        }
        // Fill in fallback name from WIX contact
        if (name === 'Customer' && (contact.firstName || contact.lastName)) {
          name = [contact.firstName, contact.lastName]
            .filter(Boolean)
            .join(' ') || 'Customer';
        }
      }
    } catch {
      // Best-effort: WIX contact lookup failure doesn't block notifications
    }
  }

  return { name, email, phone };
}

// =============================================================================
// Trigger Function
// =============================================================================

/**
 * Trigger notifications for an order status change.
 *
 * Finds all enabled templates for the new status, resolves customer
 * contact info, and dispatches to configured channels (email, SMS).
 *
 * Best-effort: never throws. If one channel fails, still tries the other.
 * All attempts are logged to notification_log via the senders.
 *
 * @param db - SQLite database instance
 * @param config - Application config (for Twilio credentials)
 * @param notificationConfig - SMTP notification settings
 * @param orderId - Order ID that changed status
 * @param newStatus - The new order status
 * @returns Array of SendResult for each notification attempt
 */
export async function triggerOrderNotifications(
  db: Database.Database,
  config: Config,
  notificationConfig: NotificationConfig,
  orderId: string,
  newStatus: OrderStatus,
): Promise<SendResult[]> {
  // 1. Get enabled templates for this status stage
  let templates: NotificationTemplate[];
  try {
    templates = getEnabledTemplatesForStage(db, newStatus);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Notifications] Failed to get templates for stage ${newStatus}: ${message}`);
    return [{ success: false, error: message }];
  }

  if (templates.length === 0) {
    return []; // No notifications configured for this stage
  }

  // 2. Look up the order
  let order: Order | null;
  try {
    const orderWithDetails = getOrder(db, orderId);
    order = orderWithDetails;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[Notifications] Failed to get order ${orderId}: ${message}`);
    return [{ success: false, error: message }];
  }

  if (!order) {
    return [{ success: false, error: 'Order not found' }];
  }

  // 3. Resolve customer contact info
  const contact = resolveCustomerContact(db, order);

  // 4. Build notification context
  const context: NotificationContext = {
    orderNumber: String(order.orderNumber),
    customerName: contact.name,
    customerEmail: contact.email ?? undefined,
    customerPhone: contact.phone ?? undefined,
    status: newStatus,
    storeName: 'HotBox Clothing',
  };

  // 5. Dispatch to each channel
  const results: SendResult[] = [];

  for (const template of templates) {
    try {
      let result: SendResult;

      if (template.channel === 'email') {
        result = await sendOrderEmail(
          notificationConfig,
          db,
          parseInt(orderId, 10) || 0,
          template,
          context,
        );
      } else if (template.channel === 'sms') {
        result = await sendOrderSms(
          config,
          db,
          parseInt(orderId, 10) || 0,
          template,
          context,
        );
      } else {
        result = { success: false, error: `Unknown channel: ${template.channel}` };
      }

      results.push(result);
    } catch (err) {
      // Should not happen (senders never throw) but guard anyway
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `[Notifications] Unexpected error dispatching ${template.channel} for order #${order.orderNumber}: ${message}`,
      );
      results.push({ success: false, error: message });
    }
  }

  console.log(
    `[Notifications] Triggered ${results.length} notification(s) for order #${order.orderNumber} → ${newStatus} ` +
    `(${results.filter(r => r.success).length} sent, ${results.filter(r => !r.success).length} failed)`,
  );

  return results;
}
