/**
 * SQL schema constants for table creation.
 * Each migration file handles its own CREATE TABLE statements.
 * This module exports shared helpers and the bootstrap migration SQL.
 */

/** Bootstrap migration: creates the migration tracking table */
export const MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`;

/** Helper: SQLite timestamp default expression */
export const TIMESTAMP_DEFAULT = `DEFAULT (datetime('now'))`;

/** Helper: common column definitions for reuse in future migrations */
export const COLUMN_HELPERS = {
  /** Primary key auto-increment */
  pk: 'INTEGER PRIMARY KEY AUTOINCREMENT',
  /** Non-null text */
  textRequired: 'TEXT NOT NULL',
  /** Optional text */
  textOptional: 'TEXT',
  /** Non-null integer */
  intRequired: 'INTEGER NOT NULL',
  /** Optional integer */
  intOptional: 'INTEGER',
  /** Non-null real (float) */
  realRequired: 'REAL NOT NULL',
  /** Timestamp with auto-now default */
  createdAt: `TEXT NOT NULL DEFAULT (datetime('now'))`,
  /** Nullable timestamp for updates */
  updatedAt: 'TEXT',
} as const;
