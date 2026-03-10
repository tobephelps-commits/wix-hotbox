-- Migration 008: Add notes column to order_items
-- Allows per-item production notes (e.g., "Left chest logo, 3-color").

ALTER TABLE order_items ADD COLUMN notes TEXT;
