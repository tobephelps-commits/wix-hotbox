-- Migration 005: Customer Accounts
-- B2B customer accounts with markup pricing, royalty rates, and logo associations.

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  logo_keys TEXT NOT NULL DEFAULT '[]',
  markup_percent REAL NOT NULL DEFAULT 0,
  royalty_percent REAL NOT NULL DEFAULT 0,
  notes TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(active);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
