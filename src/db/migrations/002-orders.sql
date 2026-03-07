-- Migration 002: Order Management Schema
-- Creates tables for orders, line items, status history, and error tracking.
-- Addresses stored as JSON blobs (always loaded with order, rarely queried independently).

-- =============================================================================
-- Orders
-- =============================================================================

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  wix_order_id TEXT UNIQUE,
  order_number INTEGER UNIQUE NOT NULL,
  source TEXT NOT NULL DEFAULT 'wix',
  status TEXT NOT NULL DEFAULT 'new',
  customer_first_name TEXT,
  customer_last_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  billing_address TEXT,
  shipping_address TEXT,
  collection TEXT,
  notes TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  shipping_cost REAL NOT NULL DEFAULT 0,
  tax REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  last_sync_error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- Order Line Items
-- =============================================================================

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL DEFAULT 0,
  total_price REAL NOT NULL DEFAULT 0,
  vendor_style TEXT,
  vendor TEXT,
  color TEXT,
  size TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- Order Status History
-- =============================================================================

CREATE TABLE IF NOT EXISTS order_status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- Order Errors
-- =============================================================================

CREATE TABLE IF NOT EXISTS order_errors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  operation TEXT NOT NULL,
  message TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_wix_order_id ON orders(wix_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_errors_order_id ON order_errors(order_id);
CREATE INDEX IF NOT EXISTS idx_order_errors_resolved ON order_errors(resolved);
