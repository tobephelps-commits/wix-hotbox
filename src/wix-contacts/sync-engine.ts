/**
 * WIX Contacts Sync Engine
 *
 * Orchestrates a full contact sync cycle: fetches all contacts from WIX,
 * upserts them into SQLite, and auto-links to B2B customer accounts by email.
 *
 * Phase 60: WIX Customer Sync
 */

import type Database from 'better-sqlite3';
import type { Config } from '../config.js';
import type { CustomerSyncResult } from './types.js';
import { fetchAllContacts } from './api.js';
import { upsertWixContact, linkToCustomer } from './store.js';

// =============================================================================
// Sync Contacts
// =============================================================================

/**
 * Execute a full contact sync cycle.
 *
 * Pages through all WIX contacts via the async generator, upserts each
 * into SQLite, and returns totals. Partial failure tolerant — individual
 * upsert errors are logged but don't abort the sync.
 *
 * @param db - SQLite database instance
 * @param config - App config with WIX credentials
 * @returns CustomerSyncResult with counts
 */
export async function syncContacts(
  db: Database.Database,
  config: Config,
): Promise<CustomerSyncResult> {
  let contactsFetched = 0;
  let contactsCreated = 0;
  let contactsUpdated = 0;
  let contactsUnchanged = 0;
  const errors: string[] = [];

  for await (const batch of fetchAllContacts(config)) {
    for (const contact of batch) {
      try {
        const result = upsertWixContact(db, contact);
        contactsFetched++;

        if (result === 'created') contactsCreated++;
        else if (result === 'updated') contactsUpdated++;
        else contactsUnchanged++;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`Contact ${contact.id}: ${message}`);
        console.error(`[WixContacts] Error upserting contact ${contact.id}: ${message}`);
        contactsFetched++;
      }
    }

    console.log(
      `[WixContacts] Synced batch: ${batch.length} contacts ` +
      `(${contactsCreated} new, ${contactsUpdated} updated, ${contactsUnchanged} unchanged)`,
    );
  }

  console.log(
    `[WixContacts] Sync complete: ${contactsFetched} fetched, ` +
    `${contactsCreated} created, ${contactsUpdated} updated, ${errors.length} errors`,
  );

  return {
    contactsFetched,
    contactsCreated,
    contactsUpdated,
    contactsUnchanged,
    errors,
  };
}

// =============================================================================
// Auto-Link Contacts
// =============================================================================

/**
 * Auto-link unlinked WIX contacts to B2B customer accounts by email match.
 *
 * Queries all wix_contacts with email but no customer_id, checks if a
 * matching customer exists (case-insensitive email), and links them.
 *
 * @param db - SQLite database instance
 * @returns Number of contacts newly linked
 */
export function autoLinkContacts(db: Database.Database): number {
  // Find unlinked contacts that have an email
  const unlinked = db.prepare(`
    SELECT wix_contact_id, email
    FROM wix_contacts
    WHERE customer_id IS NULL AND email IS NOT NULL AND email != ''
  `).all() as Array<{ wix_contact_id: string; email: string }>;

  let linked = 0;

  for (const row of unlinked) {
    // Check if a customer has a matching email (case-insensitive)
    const customer = db.prepare(
      'SELECT id FROM customers WHERE email = ? COLLATE NOCASE',
    ).get(row.email) as { id: string } | undefined;

    if (customer) {
      linkToCustomer(db, row.wix_contact_id, customer.id);
      linked++;
    }
  }

  if (linked > 0) {
    console.log(`[WixContacts] Auto-linked ${linked} contacts to existing customers`);
  }

  return linked;
}
