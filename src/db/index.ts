import Database from 'better-sqlite3';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Config } from '../config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Open SQLite database with recommended pragmas for the Pi appliance.
 * - WAL mode for concurrent read performance
 * - Foreign keys enabled
 * - 5s busy timeout for write contention
 */
export function createDatabase(config: Config): Database.Database {
  const dbPath = join(config.dataDir, 'hotbox.db');
  const db = new Database(dbPath);

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  return db;
}

/**
 * Resolve the migrations directory.
 * In development (tsx): src/db/migrations/
 * In production (compiled): dist/db/migrations/ (copied by postbuild script)
 */
function getMigrationsDir(): string {
  // Try src/db/migrations/ first (development with tsx)
  const srcDir = join(__dirname, 'migrations');
  if (existsSync(srcDir)) {
    return srcDir;
  }

  // Fallback: look relative to project root (production)
  const projectRoot = join(__dirname, '..', '..');
  const distDir = join(projectRoot, 'dist', 'db', 'migrations');
  if (existsSync(distDir)) {
    return distDir;
  }

  throw new Error(
    `Migration directory not found. Checked: ${srcDir}, ${distDir}`
  );
}

/**
 * Run pending SQL migrations in order.
 * Reads .sql files from the migrations directory, applies any not yet
 * recorded in the migrations table, wrapped in a transaction.
 */
export function runMigrations(db: Database.Database): void {
  const migrationsDir = getMigrationsDir();

  // Read and sort migration files
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  // Bootstrap: ensure migrations table exists before querying it
  // (001-initial.sql creates it, but we need it to check what's applied)
  const bootstrapSql = readFileSync(join(migrationsDir, files[0]!), 'utf-8');
  db.exec(bootstrapSql);

  // Get already-applied migrations
  const applied = new Set(
    (db.prepare('SELECT name FROM migrations').all() as { name: string }[]).map(
      (row) => row.name
    )
  );

  // Apply pending migrations in a transaction
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log('All migrations already applied.');
    return;
  }

  const applyMigrations = db.transaction(() => {
    for (const file of pending) {
      const sql = readFileSync(join(migrationsDir, file), 'utf-8');
      db.exec(sql);
      db.prepare('INSERT INTO migrations (name) VALUES (?)').run(file);
      console.log(`Migration applied: ${file}`);
    }
  });

  applyMigrations();
  console.log(`${pending.length} migration(s) applied.`);
}

/**
 * Close the database connection gracefully.
 */
export function closeDatabase(db: Database.Database): void {
  db.close();
  console.log('Database closed.');
}
