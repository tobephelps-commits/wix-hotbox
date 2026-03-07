---
phase: 51-inventory-sync
plan: 04
subsystem: api, sync
tags: [fastify, wix-api, inventory, daemon, polling, smtp]

# Dependency graph
requires:
  - phase: 51-01
    provides: monitor store, types, alerts, alert-log
  - phase: 51-02
    provides: sync types, product mappings, notifications
  - phase: 51-03
    provides: monitor poller (pollOnce, pollDue, pollProduct)
provides:
  - Stock sync engine (WIX inventory updates from vendor snapshots)
  - Sync daemon with health tracking and graceful shutdown
  - REST API for sync operations, daemon control, and mapping audit
affects: [52-touch-dashboard, 53-system-health]

# Tech tracking
tech-stack:
  added: []
  patterns: [self-contained WIX API calls, module-level daemon state, AbortController shutdown]

key-files:
  created:
    - src/sync/stock-sync.ts
    - src/sync/sync-poller.ts
    - src/routes/sync.ts
  modified:
    - src/sync/index.ts
    - src/routes/index.ts

key-decisions:
  - "Self-contained WIX API calls in stock-sync.ts (same pattern as orders/wix-sync.ts)"
  - "getMonitorConfig() instead of Config parameter for pollOnce calls"
  - "NotificationConfig built from env vars in route handler, not stored in DB"
  - "200ms delay between WIX API calls for rate limiting"

patterns-established:
  - "WixConfig { apiKey, siteId } parameter for WIX API modules"
  - "Daemon lifecycle: startDaemon/stopDaemon/isDaemonRunning/getSyncHealth"

# Metrics
duration: 8min
completed: 2026-03-07
---

# Plan 04: Stock Sync Engine, Daemon, and API Routes

**Self-contained WIX stock sync engine with smart polling daemon and REST API for daemon control, mapping management, and inventory audit**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-07
- **Completed:** 2026-03-07
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Stock sync engine fetches WIX product variants, matches against vendor snapshots via SKU parsing, updates inventory with rate limiting
- Smart sync daemon with 60-second tick interval, health tracking (cumulative moving average, error escalation), and AbortController-based shutdown
- Complete REST API: mapping CRUD, on-demand sync, daemon start/stop/health, and product mapping audit against WIX API

## Task Commits

Each task was committed atomically:

1. **Task 1: Port stock sync engine and smart daemon** - `b5c274b` (feat)
2. **Task 2: Create sync API routes and register** - `8f86cd4` (feat)

## Files Created/Modified
- `src/sync/stock-sync.ts` - WIX inventory sync engine with SKU parsing, self-contained API calls
- `src/sync/sync-poller.ts` - Sync daemon with health tracking, pollOnce integration, notification delivery
- `src/sync/index.ts` - Updated barrel exports for stock-sync and sync-poller
- `src/routes/sync.ts` - Fastify plugin with 8 endpoints for mappings, sync, daemon, audit
- `src/routes/index.ts` - Registered syncRoutes with /sync prefix

## Decisions Made
- Used self-contained WIX API calls in stock-sync.ts rather than importing from pipeline module (different API patterns, decoupled)
- Sync poller calls getMonitorConfig() for default MonitorConfig rather than accepting Config parameter (pollOnce expects MonitorConfig)
- NotificationConfig constructed from env vars in route handlers (same pattern as v1.x getSyncConfigFromEnv)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete inventory sync system operational: poll vendors, sync WIX, daemon control via REST
- Both /monitor and /sync prefixes registered in routes/index.ts
- Ready for dashboard UI integration (phase 52)

---
*Phase: 51-inventory-sync*
*Completed: 2026-03-07*
