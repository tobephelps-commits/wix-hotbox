-- Migration 003: Inventory Monitoring Schema
-- Creates tables for tracked products, inventory snapshots, and stock alerts.
-- Supports the polling daemon and sync system for inventory monitoring.

-- =============================================================================
-- Tracked Products
-- =============================================================================

CREATE TABLE IF NOT EXISTS tracked_products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  style TEXT NOT NULL,
  name TEXT NOT NULL,
  vendor TEXT NOT NULL DEFAULT 'sanmar',
  colors TEXT,
  sizes TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  low_stock_threshold INTEGER,
  critical_stock_threshold INTEGER,
  out_of_stock_threshold INTEGER,
  last_polled_at TEXT,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(style, vendor)
);

-- =============================================================================
-- Inventory Snapshots
-- =============================================================================

CREATE TABLE IF NOT EXISTS inventory_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  style TEXT NOT NULL,
  vendor TEXT NOT NULL DEFAULT 'sanmar',
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  data TEXT NOT NULL,
  UNIQUE(style, vendor)
);

-- =============================================================================
-- Alerts
-- =============================================================================

CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  style TEXT NOT NULL,
  product_name TEXT NOT NULL,
  vendor TEXT NOT NULL DEFAULT 'sanmar',
  color TEXT NOT NULL,
  size TEXT NOT NULL,
  previous_qty INTEGER NOT NULL,
  current_qty INTEGER NOT NULL,
  warehouse_detail TEXT,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_alerts_style_vendor ON alerts(style, vendor);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_tracked_products_priority ON tracked_products(priority);
