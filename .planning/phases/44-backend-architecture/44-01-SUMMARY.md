---
phase: 44-backend-architecture
plan: 01
subsystem: api
tags: [fastify, typescript, rest-api, health-check, cors]

requires:
  - phase: 43-pi-os-bootstrap
    provides: systemd service expecting dist/server.js on port 3456
provides:
  - Fastify v5 server scaffold with typed config
  - Health endpoint at /api/health
  - Route plugin structure for domain routes
  - Graceful shutdown (SIGTERM/SIGINT)
  - Custom 404 and error handlers
affects: [44-backend-architecture, 45-data-layer, 55-lan-dashboard]

tech-stack:
  added: [fastify@5, @fastify/cors, @fastify/static]
  patterns: [fastify-plugin-routes, typed-config-loader, graceful-shutdown]

key-files:
  created: [src/server.ts, src/app.ts, src/config.ts, src/routes/index.ts]
  modified: [tsconfig.json, package.json]

key-decisions:
  - "rootDir changed from . to src so dist/server.js matches systemd expectation"
  - "Fastify decorate pattern to share appVersion across route plugins"
  - "Request timing hooks only in development mode (not production)"

patterns-established:
  - "Route plugins: export default async function(fastify, opts) registered with prefix"
  - "Config: typed interface + loadConfig() with env defaults + dotenv"
  - "Entry point: server.ts imports config + app, calls listen, handles signals"

duration: 12min
completed: 2026-03-07
---

# Phase 44 Plan 01: Backend Architecture — Server Foundation

**Fastify v5 server scaffold with typed config, health endpoint, route plugins, and graceful shutdown**

## Performance

- **Duration:** 12 min
- **Started:** 2026-03-07T18:58:00Z
- **Completed:** 2026-03-07T19:01:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Created v2.0 src/ directory structure replacing v1.x scripts/ compilation target
- Fastify v5 server running on port 3456 with LAN-accessible CORS
- Health endpoint at /api/health returning version, uptime, timestamp
- Route plugin structure ready for domain routes (products, orders, etc.)
- Custom 404 handler and global error handler with structured JSON responses
- Graceful shutdown on SIGTERM/SIGINT for systemd integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/ directory structure and update TypeScript config** - `17edf3d` (feat)
2. **Task 2: Add request logging, not-found handler, and API prefix structure** - `b59d2fc` (feat)

## Files Created/Modified
- `src/server.ts` - Entry point with graceful shutdown (compiles to dist/server.js)
- `src/app.ts` - Fastify app builder with CORS, error handling, request timing
- `src/config.ts` - Typed Config interface and loadConfig() with env defaults
- `src/routes/index.ts` - API route plugin with health endpoint
- `tsconfig.json` - Updated include to src/, rootDir to src for correct dist output
- `package.json` - Added Fastify deps, v2.0.0, dev/start scripts

## Decisions Made
- Changed rootDir from `.` to `src` so tsc outputs directly to dist/ (dist/server.js not dist/src/server.js), matching the systemd service ExecStart path
- Used Fastify's `decorate` pattern to share appVersion string across route plugins rather than re-reading package.json in each route
- Request timing hooks only registered in development mode to avoid log noise in production

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed rootDir for correct dist output path**
- **Found during:** Task 1 (build verification)
- **Issue:** With rootDir: "." and include: ["src/**/*.ts"], tsc output went to dist/src/server.js instead of dist/server.js
- **Fix:** Changed rootDir to "src" so compiled files land directly in dist/
- **Files modified:** tsconfig.json
- **Verification:** npm run build produces dist/server.js; node dist/server.js starts successfully
- **Committed in:** 17edf3d (Task 1 commit)

**2. [Rule 3 - Blocking] Typed error handler parameter**
- **Found during:** Task 1 (tsc --noEmit)
- **Issue:** error parameter in setErrorHandler was 'unknown' type under strict mode
- **Fix:** Added explicit FastifyError type annotation
- **Files modified:** src/app.ts
- **Verification:** tsc --noEmit passes cleanly
- **Committed in:** 17edf3d (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes necessary for correct compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Server foundation ready for data layer (Phase 45) and additional API routes
- Route plugin pattern established for products, orders, sync endpoints
- dist/server.js aligns with systemd hotbox-server.service ExecStart

---
*Phase: 44-backend-architecture*
*Completed: 2026-03-07*
