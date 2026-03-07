---
phase: 44-backend-architecture
plan: 02
subsystem: data-layer
tags: [sqlite, better-sqlite3, migrations, database, system-info]

requires:
  - phase: 44-backend-architecture
    plan: 01
    provides: Fastify server scaffold with typed config and route plugins
provides:
  - SQLite database with WAL mode and migration system
  - Database accessible via fastify.db decoration in all routes
  - /api/system endpoint with database and system stats
  - Graceful database lifecycle (open on start, close on shutdown)
affects: [45-data-layer, 46-product-pipeline, 55-lan-dashboard]

tech-stack:
  added: [better-sqlite3]
  patterns: [migration-runner, fastify-decorate-db, server-lifecycle-hooks]

key-files:
  created: [src/db/index.ts, src/db/schema.ts, src/db/migrations/001-initial.sql]
  modified: [src/server.ts, src/app.ts, src/routes/index.ts, package.json]

key-decisions:
  - "WAL mode + foreign keys + 5s busy timeout as default SQLite pragmas"
  - "Migration files resolved from src/ in dev, dist/ in production via existence check"
  - "Node.js cpSync in postbuild script to copy .sql migrations to dist/"
  - "fastify.decorate for both db and config, typed via module augmentation"

patterns-established:
  - "Numbered SQL migrations (001-initial.sql, 002-*.sql, etc.) with tracking table"
  - "Database passed from server.ts to buildApp, decorated onto Fastify instance"
  - "Server lifecycle: config -> db -> migrations -> app -> listen -> shutdown -> db close"

duration: 8min
completed: 2026-03-07
---

# Phase 44 Plan 02: Backend Architecture -- SQLite Database & Migration System

**SQLite database with better-sqlite3, migration runner, server lifecycle integration, and system info endpoint**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-07T19:04:00Z
- **Completed:** 2026-03-07T19:12:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Installed better-sqlite3 with TypeScript types for synchronous SQLite access
- Created migration system that tracks applied migrations in a `migrations` table
- Database opens with WAL mode, foreign keys, and busy timeout for Pi appliance reliability
- Integrated database into server startup/shutdown lifecycle
- Added fastify.db and fastify.config decorations with TypeScript type augmentation
- Created /api/system endpoint returning version, uptime, memory, platform, arch, and database stats
- Build script copies .sql migration files to dist/ for production deployment

## Task Commits

Each task was committed atomically:

1. **Task 1: Set up SQLite database with better-sqlite3 and migration system** - `bc327dd` (feat)
2. **Task 2: Integrate database into server lifecycle and add system info endpoint** - `4e9f876` (feat)

## Files Created/Modified
- `src/db/index.ts` - createDatabase(), runMigrations(), closeDatabase() with WAL pragmas
- `src/db/schema.ts` - SQL constants and column type helpers for future migrations
- `src/db/migrations/001-initial.sql` - Bootstrap migration creating the migrations tracking table
- `src/server.ts` - Updated with database lifecycle (open, migrate, pass to app, close on shutdown)
- `src/app.ts` - Accepts Database parameter, decorates fastify.db and fastify.config
- `src/routes/index.ts` - Added /api/system endpoint, TypeScript module augmentation for db/config
- `package.json` - Added better-sqlite3 dependency, postbuild script for migration file copy

## Decisions Made
- WAL mode + foreign keys + 5s busy timeout as default SQLite pragmas for Pi appliance performance
- Migration files resolved by checking src/db/migrations/ first (dev), falling back to dist/db/migrations/ (prod)
- Used Node.js cpSync in a postbuild inline script for cross-platform migration file copying
- Decorated both db and config on Fastify instance, typed via `declare module 'fastify'` augmentation

## Deviations from Plan

None. All tasks completed as specified.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Database foundation ready for domain tables (products, orders, customers, inventory)
- Future phases add numbered migrations (002-products.sql, 003-orders.sql, etc.)
- fastify.db available in all route plugins for database queries
- /api/system provides operational visibility for the Pi dashboard

---
*Phase: 44-backend-architecture*
*Completed: 2026-03-07*
