-- Migration 006: WIX Contacts
-- Raw WIX CRM contact data, separate from B2B customers table.
-- Enables syncing contacts from WIX and optionally linking them to customer accounts.

CREATE TABLE IF NOT EXISTS wix_contacts (
  wix_contact_id TEXT PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  phone TEXT,
  company TEXT,
  job_title TEXT,
  customer_id TEXT,
  wix_created_date TEXT,
  wix_updated_date TEXT,
  last_synced_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_wix_contacts_email ON wix_contacts(email);
CREATE INDEX IF NOT EXISTS idx_wix_contacts_customer_id ON wix_contacts(customer_id);
