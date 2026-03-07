-- Migration 004: Stock Sync Schema
-- Creates tables for product mappings linking vendor styles to WIX product IDs.
-- Used by the sync module to know which WIX products to update when vendor inventory changes.

-- =============================================================================
-- Product Mappings
-- =============================================================================

CREATE TABLE IF NOT EXISTS product_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  style TEXT NOT NULL,
  vendor TEXT NOT NULL DEFAULT 'sanmar',
  wix_product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  linked_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(style, vendor)
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_product_mappings_wix_product_id ON product_mappings(wix_product_id);
