/**
 * Notification System Types
 *
 * Type definitions for configurable order status notifications
 * with email and SMS channels. Templates define message content
 * per stage+channel, and log entries track delivery history.
 *
 * Phase 61: Notification System
 */

// =============================================================================
// Channel & Status
// =============================================================================

/** Supported notification delivery channels */
export type NotificationChannel = 'email' | 'sms';

/** Delivery status for a notification log entry */
export type NotificationStatus = 'pending' | 'sent' | 'failed';

// =============================================================================
// Notification Template
// =============================================================================

/**
 * A configurable notification template that defines what message
 * to send when an order reaches a specific stage via a specific channel.
 *
 * Maps to the notification_templates table (camelCase).
 */
export interface NotificationTemplate {
  /** Unique identifier */
  id: number;
  /** Order status that triggers this notification */
  stage: string;
  /** Delivery channel */
  channel: NotificationChannel;
  /** Whether this template is active */
  enabled: boolean;
  /** Email subject template (null for SMS) */
  subject: string | null;
  /** Message body template with {{placeholder}} variables */
  bodyTemplate: string;
  /** ISO timestamp when created */
  createdAt: string;
  /** ISO timestamp when last updated */
  updatedAt: string;
}

// =============================================================================
// Notification Log Entry
// =============================================================================

/**
 * A record of a notification delivery attempt.
 * Tracks what was sent, to whom, and whether it succeeded.
 *
 * Maps to the notification_log table (camelCase).
 */
export interface NotificationLogEntry {
  /** Unique identifier */
  id: number;
  /** Order that triggered this notification */
  orderId: number;
  /** Template used (null if template was deleted) */
  templateId: number | null;
  /** Delivery channel used */
  channel: NotificationChannel;
  /** Email address or phone number */
  recipient: string;
  /** Email subject (null for SMS) */
  subject: string | null;
  /** Rendered message body */
  body: string;
  /** Delivery status */
  status: NotificationStatus;
  /** Error details on failure */
  errorMessage: string | null;
  /** ISO timestamp when actually sent */
  sentAt: string | null;
  /** ISO timestamp when log entry was created */
  createdAt: string;
}

// =============================================================================
// Input Types
// =============================================================================

/** Input for creating a new notification template */
export interface CreateTemplateInput {
  /** Order status that triggers this notification */
  stage: string;
  /** Delivery channel */
  channel: NotificationChannel;
  /** Email subject template (optional, null for SMS) */
  subject?: string;
  /** Message body template with {{placeholder}} variables */
  bodyTemplate: string;
  /** Whether this template is active (defaults to true) */
  enabled?: boolean;
}

/** Input for updating an existing notification template */
export interface UpdateTemplateInput {
  /** Updated email subject template */
  subject?: string;
  /** Updated message body template */
  bodyTemplate?: string;
  /** Updated enabled state */
  enabled?: boolean;
}

// =============================================================================
// Context & Result
// =============================================================================

/**
 * Context object for rendering notification templates.
 * Provides the values for {{placeholder}} substitution.
 */
export interface NotificationContext {
  /** Human-readable order number */
  orderNumber: string;
  /** Customer full name */
  customerName: string;
  /** Customer email (for email channel) */
  customerEmail?: string;
  /** Customer phone (for SMS channel) */
  customerPhone?: string;
  /** Current order status */
  status: string;
  /** Store/brand name */
  storeName: string;
}

/** Result of a notification send attempt */
export interface SendResult {
  /** Whether the notification was sent successfully */
  success: boolean;
  /** Error message on failure */
  error?: string;
  /** ID of the notification log entry */
  logId?: number;
}
