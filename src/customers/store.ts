/**
 * Customer Store
 *
 * SQLite-backed customer account storage with CRUD operations.
 * All functions take Database as first parameter (v2.0 pattern).
 *
 * Phase 53: Customer & Royalty System (v2.0 port from JSON-file store)
 */

import crypto from 'node:crypto';
import type Database from 'better-sqlite3';
import type { CustomerAccount, CreateCustomerInput, UpdateCustomerInput } from './types.js';

// =============================================================================
// Row Mapping
// =============================================================================

/** SQLite row shape for the customers table */
interface CustomerRow {
  id: string;
  name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  logo_keys: string;
  markup_percent: number;
  royalty_percent: number;
  notes: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

/**
 * Convert a SQLite row (snake_case, integer booleans, JSON strings)
 * to a CustomerAccount (camelCase, real booleans, parsed arrays).
 */
function rowToCustomer(row: CustomerRow): CustomerAccount {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone ?? undefined,
    logoKeys: JSON.parse(row.logo_keys) as string[],
    markupPercent: row.markup_percent,
    royaltyPercent: row.royalty_percent,
    notes: row.notes ?? undefined,
    active: row.active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// =============================================================================
// Read Operations
// =============================================================================

/**
 * List customers with optional active-only filtering.
 */
export function listCustomers(db: Database.Database, activeOnly?: boolean): CustomerAccount[] {
  const sql = activeOnly
    ? 'SELECT * FROM customers WHERE active = 1 ORDER BY name'
    : 'SELECT * FROM customers ORDER BY name';
  const rows = db.prepare(sql).all() as CustomerRow[];
  return rows.map(rowToCustomer);
}

/**
 * Find a customer by their unique ID.
 */
export function getCustomer(db: Database.Database, id: string): CustomerAccount | null {
  const row = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as CustomerRow | undefined;
  return row ? rowToCustomer(row) : null;
}

/**
 * Find a customer by name (case-insensitive).
 * Used by the royalty system for order matching.
 */
export function getCustomerByName(db: Database.Database, name: string): CustomerAccount | null {
  const row = db.prepare('SELECT * FROM customers WHERE name = ? COLLATE NOCASE').get(name) as CustomerRow | undefined;
  return row ? rowToCustomer(row) : null;
}

// =============================================================================
// Write Operations
// =============================================================================

/**
 * Add a new customer account.
 * Generates a UUID v4 for the id and sets timestamps.
 */
export function addCustomer(db: Database.Database, input: CreateCustomerInput): CustomerAccount {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const logoKeysJson = JSON.stringify(input.logoKeys ?? []);

  db.prepare(`
    INSERT INTO customers (id, name, contact_name, email, phone, logo_keys, markup_percent, royalty_percent, notes, active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    input.name,
    input.contactName,
    input.email,
    input.phone ?? null,
    logoKeysJson,
    input.markupPercent ?? 0,
    input.royaltyPercent ?? 0,
    input.notes ?? null,
    input.active !== false ? 1 : 0,
    now,
    now,
  );

  return getCustomer(db, id)!;
}

/**
 * Update a customer account.
 * Only updates provided fields. Sets updated_at to current datetime.
 */
export function updateCustomer(db: Database.Database, id: string, updates: UpdateCustomerInput): CustomerAccount | null {
  const existing = getCustomer(db, id);
  if (!existing) return null;

  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.name !== undefined) { sets.push('name = ?'); values.push(updates.name); }
  if (updates.contactName !== undefined) { sets.push('contact_name = ?'); values.push(updates.contactName); }
  if (updates.email !== undefined) { sets.push('email = ?'); values.push(updates.email); }
  if (updates.phone !== undefined) { sets.push('phone = ?'); values.push(updates.phone ?? null); }
  if (updates.logoKeys !== undefined) { sets.push('logo_keys = ?'); values.push(JSON.stringify(updates.logoKeys)); }
  if (updates.markupPercent !== undefined) { sets.push('markup_percent = ?'); values.push(updates.markupPercent); }
  if (updates.royaltyPercent !== undefined) { sets.push('royalty_percent = ?'); values.push(updates.royaltyPercent); }
  if (updates.notes !== undefined) { sets.push('notes = ?'); values.push(updates.notes ?? null); }
  if (updates.active !== undefined) { sets.push('active = ?'); values.push(updates.active ? 1 : 0); }

  if (sets.length === 0) return existing;

  sets.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE customers SET ${sets.join(', ')} WHERE id = ?`).run(...values);

  return getCustomer(db, id);
}

/**
 * Delete a customer account.
 * @returns true if customer was found and removed, false if not found
 */
export function deleteCustomer(db: Database.Database, id: string): boolean {
  const result = db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  return result.changes > 0;
}
