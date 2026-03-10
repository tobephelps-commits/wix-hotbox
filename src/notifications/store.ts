/**
 * Notification Store
 *
 * SQLite-backed storage for notification templates and delivery log.
 * All functions take Database as first parameter (v2.0 pattern).
 * Handles snake_case (DB) ↔ camelCase (TS) row mapping.
 *
 * Phase 61: Notification System
 */

import type Database from 'better-sqlite3';
import type {
  NotificationTemplate,
  NotificationLogEntry,
  NotificationChannel,
  NotificationStatus,
  CreateTemplateInput,
  UpdateTemplateInput,
  NotificationContext,
} from './types.js';

// =============================================================================
// Row Mapping
// =============================================================================

/** SQLite row shape for notification_templates (snake_case) */
interface TemplateRow {
  id: number;
  stage: string;
  channel: string;
  enabled: number;
  subject: string | null;
  body_template: string;
  created_at: string;
  updated_at: string;
}

/** SQLite row shape for notification_log (snake_case) */
interface LogRow {
  id: number;
  order_id: number;
  template_id: number | null;
  channel: string;
  recipient: string;
  subject: string | null;
  body: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

/**
 * Convert a SQLite template row (snake_case) to NotificationTemplate (camelCase).
 */
function rowToTemplate(row: TemplateRow): NotificationTemplate {
  return {
    id: row.id,
    stage: row.stage,
    channel: row.channel as NotificationChannel,
    enabled: row.enabled === 1,
    subject: row.subject,
    bodyTemplate: row.body_template,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convert a SQLite log row (snake_case) to NotificationLogEntry (camelCase).
 */
function rowToLogEntry(row: LogRow): NotificationLogEntry {
  return {
    id: row.id,
    orderId: row.order_id,
    templateId: row.template_id,
    channel: row.channel as NotificationChannel,
    recipient: row.recipient,
    subject: row.subject,
    body: row.body,
    status: row.status as NotificationStatus,
    errorMessage: row.error_message,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  };
}

// =============================================================================
// Template CRUD
// =============================================================================

/**
 * List all notification templates.
 */
export function listTemplates(db: Database.Database): NotificationTemplate[] {
  const rows = db.prepare(
    'SELECT * FROM notification_templates ORDER BY stage, channel'
  ).all() as TemplateRow[];
  return rows.map(rowToTemplate);
}

/**
 * Get a notification template by ID.
 */
export function getTemplate(
  db: Database.Database,
  id: number,
): NotificationTemplate | null {
  const row = db.prepare(
    'SELECT * FROM notification_templates WHERE id = ?'
  ).get(id) as TemplateRow | undefined;
  return row ? rowToTemplate(row) : null;
}

/**
 * Get a notification template by stage and channel.
 */
export function getTemplateByStageChannel(
  db: Database.Database,
  stage: string,
  channel: NotificationChannel,
): NotificationTemplate | null {
  const row = db.prepare(
    'SELECT * FROM notification_templates WHERE stage = ? AND channel = ?'
  ).get(stage, channel) as TemplateRow | undefined;
  return row ? rowToTemplate(row) : null;
}

/**
 * Get all enabled templates for a given order stage.
 * Returns templates for all channels (email, sms) that are enabled.
 */
export function getEnabledTemplatesForStage(
  db: Database.Database,
  stage: string,
): NotificationTemplate[] {
  const rows = db.prepare(
    'SELECT * FROM notification_templates WHERE stage = ? AND enabled = 1 ORDER BY channel'
  ).all(stage) as TemplateRow[];
  return rows.map(rowToTemplate);
}

/**
 * Create a new notification template.
 */
export function createTemplate(
  db: Database.Database,
  input: CreateTemplateInput,
): NotificationTemplate {
  const enabled = input.enabled !== undefined ? (input.enabled ? 1 : 0) : 1;
  const result = db.prepare(`
    INSERT INTO notification_templates (stage, channel, enabled, subject, body_template)
    VALUES (?, ?, ?, ?, ?)
  `).run(input.stage, input.channel, enabled, input.subject ?? null, input.bodyTemplate);

  return getTemplate(db, result.lastInsertRowid as number)!;
}

/**
 * Update an existing notification template.
 * Returns the updated template, or null if not found.
 */
export function updateTemplate(
  db: Database.Database,
  id: number,
  input: UpdateTemplateInput,
): NotificationTemplate | null {
  const existing = getTemplate(db, id);
  if (!existing) return null;

  const setClauses: string[] = [];
  const params: unknown[] = [];

  if (input.subject !== undefined) {
    setClauses.push('subject = ?');
    params.push(input.subject);
  }

  if (input.bodyTemplate !== undefined) {
    setClauses.push('body_template = ?');
    params.push(input.bodyTemplate);
  }

  if (input.enabled !== undefined) {
    setClauses.push('enabled = ?');
    params.push(input.enabled ? 1 : 0);
  }

  if (setClauses.length === 0) return existing;

  setClauses.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(
    `UPDATE notification_templates SET ${setClauses.join(', ')} WHERE id = ?`
  ).run(...params);

  return getTemplate(db, id)!;
}

/**
 * Delete a notification template by ID.
 * Returns true if deleted, false if not found.
 */
export function deleteTemplate(
  db: Database.Database,
  id: number,
): boolean {
  const result = db.prepare(
    'DELETE FROM notification_templates WHERE id = ?'
  ).run(id);
  return result.changes > 0;
}

// =============================================================================
// Log Operations
// =============================================================================

/**
 * Create a notification log entry.
 * Returns the log entry ID.
 */
export function logNotification(
  db: Database.Database,
  entry: {
    orderId: number;
    templateId?: number;
    channel: NotificationChannel;
    recipient: string;
    subject?: string;
    body: string;
    status: NotificationStatus;
    errorMessage?: string;
    sentAt?: string;
  },
): number {
  const result = db.prepare(`
    INSERT INTO notification_log (order_id, template_id, channel, recipient, subject, body, status, error_message, sent_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entry.orderId,
    entry.templateId ?? null,
    entry.channel,
    entry.recipient,
    entry.subject ?? null,
    entry.body,
    entry.status,
    entry.errorMessage ?? null,
    entry.sentAt ?? null,
  );
  return result.lastInsertRowid as number;
}

/**
 * Update the status of a notification log entry.
 */
export function updateLogStatus(
  db: Database.Database,
  logId: number,
  status: NotificationStatus,
  errorMessage?: string,
  sentAt?: string,
): void {
  db.prepare(`
    UPDATE notification_log SET status = ?, error_message = ?, sent_at = ? WHERE id = ?
  `).run(status, errorMessage ?? null, sentAt ?? null, logId);
}

/**
 * Query notification log entries with optional filters.
 * Returns entries and total count for pagination.
 */
export function getNotificationLog(
  db: Database.Database,
  filter?: {
    orderId?: number;
    channel?: NotificationChannel;
    status?: NotificationStatus;
    limit?: number;
    offset?: number;
  },
): { entries: NotificationLogEntry[]; totalCount: number } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter?.orderId !== undefined) {
    conditions.push('order_id = ?');
    params.push(filter.orderId);
  }

  if (filter?.channel) {
    conditions.push('channel = ?');
    params.push(filter.channel);
  }

  if (filter?.status) {
    conditions.push('status = ?');
    params.push(filter.status);
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const countRow = db.prepare(
    `SELECT COUNT(*) as count FROM notification_log ${where}`
  ).get(...params) as { count: number };

  const limit = filter?.limit ?? 50;
  const offset = filter?.offset ?? 0;

  const rows = db.prepare(
    `SELECT * FROM notification_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as LogRow[];

  return {
    entries: rows.map(rowToLogEntry),
    totalCount: countRow.count,
  };
}

/**
 * Get all notification log entries for a specific order.
 */
export function getLogForOrder(
  db: Database.Database,
  orderId: number,
): NotificationLogEntry[] {
  const rows = db.prepare(
    'SELECT * FROM notification_log WHERE order_id = ? ORDER BY created_at DESC'
  ).all(orderId) as LogRow[];
  return rows.map(rowToLogEntry);
}

// =============================================================================
// Template Rendering
// =============================================================================

/**
 * Render a template string by replacing {{placeholder}} variables with context values.
 * Uses simple string replacement — no template engine needed.
 * Missing values are replaced with empty string.
 */
export function renderTemplate(
  template: string,
  context: NotificationContext,
): string {
  const replacements: Record<string, string> = {
    orderNumber: context.orderNumber,
    customerName: context.customerName,
    customerEmail: context.customerEmail ?? '',
    customerPhone: context.customerPhone ?? '',
    status: context.status,
    storeName: context.storeName,
  };

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return replacements[key] ?? '';
  });
}
