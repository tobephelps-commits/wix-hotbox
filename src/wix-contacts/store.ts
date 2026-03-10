/**
 * WIX Contacts Store
 *
 * SQLite-backed storage for WIX CRM contacts with CRUD operations.
 * All functions take Database as first parameter (v2.0 pattern).
 *
 * Phase 60: WIX Customer Sync
 */

import type Database from 'better-sqlite3';
import type { WixContact, WixApiContact } from './types.js';

// =============================================================================
// Row Mapping
// =============================================================================

/** SQLite row shape for the wix_contacts table (snake_case) */
interface WixContactRow {
  wix_contact_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  job_title: string | null;
  customer_id: string | null;
  wix_created_date: string | null;
  wix_updated_date: string | null;
  last_synced_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * Convert a SQLite row (snake_case) to a WixContact (camelCase).
 */
function rowToWixContact(row: WixContactRow): WixContact {
  return {
    wixContactId: row.wix_contact_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    company: row.company,
    jobTitle: row.job_title,
    customerId: row.customer_id,
    wixCreatedDate: row.wix_created_date,
    wixUpdatedDate: row.wix_updated_date,
    lastSyncedAt: row.last_synced_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// Read Operations
// =============================================================================

/**
 * List all synced WIX contacts with optional filtering.
 *
 * @param db - SQLite database instance
 * @param options - Optional filters: search text, linked/unlinked only
 * @returns Array of WixContact
 */
export function listWixContacts(
  db: Database.Database,
  options?: { search?: string; linkedOnly?: boolean; unlinkedOnly?: boolean },
): WixContact[] {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.search) {
    conditions.push(
      '(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)'
    );
    const pattern = `%${options.search}%`;
    params.push(pattern, pattern, pattern);
  }

  if (options?.linkedOnly) {
    conditions.push('customer_id IS NOT NULL');
  }

  if (options?.unlinkedOnly) {
    conditions.push('customer_id IS NULL');
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const sql = `SELECT * FROM wix_contacts ${where} ORDER BY last_name, first_name`;
  const rows = db.prepare(sql).all(...params) as WixContactRow[];
  return rows.map(rowToWixContact);
}

/**
 * Find a WIX contact by its WIX contact ID.
 */
export function getWixContact(
  db: Database.Database,
  wixContactId: string,
): WixContact | null {
  const row = db.prepare(
    'SELECT * FROM wix_contacts WHERE wix_contact_id = ?'
  ).get(wixContactId) as WixContactRow | undefined;
  return row ? rowToWixContact(row) : null;
}

/**
 * Find a WIX contact by email address (case-insensitive).
 */
export function getWixContactByEmail(
  db: Database.Database,
  email: string,
): WixContact | null {
  const row = db.prepare(
    'SELECT * FROM wix_contacts WHERE email = ? COLLATE NOCASE'
  ).get(email) as WixContactRow | undefined;
  return row ? rowToWixContact(row) : null;
}

// =============================================================================
// Write Operations
// =============================================================================

/**
 * Upsert a WIX contact from a WIX API response.
 *
 * Maps WixApiContact fields to SQL columns. Detects 'unchanged' by comparing
 * existing row fields against incoming data. Preserves existing customer_id
 * (manual links are not overwritten by sync).
 *
 * @param db - SQLite database instance
 * @param contact - WIX API contact response
 * @returns 'created' | 'updated' | 'unchanged'
 */
export function upsertWixContact(
  db: Database.Database,
  contact: WixApiContact,
): 'created' | 'updated' | 'unchanged' {
  const wixContactId = contact.id;
  const firstName = contact.info?.name?.first ?? null;
  const lastName = contact.info?.name?.last ?? null;
  const email = contact.primaryInfo?.email ?? null;
  const phone = contact.primaryInfo?.phone ?? null;
  const company = contact.info?.company ?? null;
  const jobTitle = contact.info?.jobTitle ?? null;
  const wixCreatedDate = contact.createdDate ?? null;
  const wixUpdatedDate = contact.updatedDate ?? null;

  // Check if contact already exists
  const existing = db.prepare(
    'SELECT * FROM wix_contacts WHERE wix_contact_id = ?'
  ).get(wixContactId) as WixContactRow | undefined;

  if (!existing) {
    // Insert new contact
    db.prepare(`
      INSERT INTO wix_contacts (
        wix_contact_id, first_name, last_name, email, phone,
        company, job_title, wix_created_date, wix_updated_date,
        last_synced_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
    `).run(
      wixContactId, firstName, lastName, email, phone,
      company, jobTitle, wixCreatedDate, wixUpdatedDate,
    );
    return 'created';
  }

  // Check if anything changed
  const unchanged =
    existing.first_name === firstName &&
    existing.last_name === lastName &&
    existing.email === email &&
    existing.phone === phone &&
    existing.company === company &&
    existing.job_title === jobTitle &&
    existing.wix_created_date === wixCreatedDate &&
    existing.wix_updated_date === wixUpdatedDate;

  if (unchanged) {
    // Still update last_synced_at to track that we checked
    db.prepare(
      "UPDATE wix_contacts SET last_synced_at = datetime('now') WHERE wix_contact_id = ?"
    ).run(wixContactId);
    return 'unchanged';
  }

  // Update existing contact, preserving customer_id
  db.prepare(`
    UPDATE wix_contacts SET
      first_name = ?,
      last_name = ?,
      email = ?,
      phone = ?,
      company = ?,
      job_title = ?,
      wix_created_date = ?,
      wix_updated_date = ?,
      last_synced_at = datetime('now'),
      updated_at = datetime('now')
    WHERE wix_contact_id = ?
  `).run(
    firstName, lastName, email, phone,
    company, jobTitle, wixCreatedDate, wixUpdatedDate,
    wixContactId,
  );
  return 'updated';
}

// =============================================================================
// Linking Operations
// =============================================================================

/**
 * Link a WIX contact to a B2B customer account.
 *
 * @param db - SQLite database instance
 * @param wixContactId - WIX contact ID to link
 * @param customerId - Customer account ID to link to
 * @returns true if the link was set, false if contact not found
 */
export function linkToCustomer(
  db: Database.Database,
  wixContactId: string,
  customerId: string,
): boolean {
  const result = db.prepare(
    "UPDATE wix_contacts SET customer_id = ?, updated_at = datetime('now') WHERE wix_contact_id = ?"
  ).run(customerId, wixContactId);
  return result.changes > 0;
}

/**
 * Unlink a WIX contact from its B2B customer account.
 *
 * @param db - SQLite database instance
 * @param wixContactId - WIX contact ID to unlink
 * @returns true if the link was cleared, false if contact not found
 */
export function unlinkFromCustomer(
  db: Database.Database,
  wixContactId: string,
): boolean {
  const result = db.prepare(
    "UPDATE wix_contacts SET customer_id = NULL, updated_at = datetime('now') WHERE wix_contact_id = ?"
  ).run(wixContactId);
  return result.changes > 0;
}

// =============================================================================
// Statistics
// =============================================================================

/**
 * Get aggregate statistics for WIX contacts.
 */
export function getWixContactStats(db: Database.Database): {
  total: number;
  linked: number;
  unlinked: number;
  lastSyncedAt: string | null;
} {
  const total = (db.prepare('SELECT COUNT(*) as count FROM wix_contacts').get() as { count: number }).count;
  const linked = (db.prepare('SELECT COUNT(*) as count FROM wix_contacts WHERE customer_id IS NOT NULL').get() as { count: number }).count;
  const unlinked = total - linked;
  const lastSyncRow = db.prepare(
    'SELECT MAX(last_synced_at) as last_synced FROM wix_contacts'
  ).get() as { last_synced: string | null };

  return {
    total,
    linked,
    unlinked,
    lastSyncedAt: lastSyncRow.last_synced,
  };
}
