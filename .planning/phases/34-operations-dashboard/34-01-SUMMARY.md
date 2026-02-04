# Plan 34-01 Summary: Daemon Lifecycle Control & Operations Health API

## Overview

Added daemon lifecycle control API and unified operations health endpoint to enable starting/stopping the sync daemon from the web dashboard without CLI access, plus provide aggregated store health data for the operations overview.

## Completed Tasks

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Add daemon lifecycle control to sync-poller.ts | 31e0203 | Done |
| 2 | Add daemon control and operations health API endpoints | 4585681 | Done |

## Changes

### Task 1: Daemon Lifecycle Control (sync-poller.ts)

Added module-level daemon control functions for programmatic start/stop:

- `_abortController` - Module-level state to track running loop
- `isDaemonRunning()` - Check if daemon is currently running
- `startDaemon()` - Start daemon programmatically (non-blocking)
- `stopDaemon()` - Stop daemon gracefully via abort signal
- `getSyncConfigFromEnv()` - Build SyncConfig from environment variables
- Modified `startSmartSyncLoop()` to accept optional `AbortSignal` parameter
- Added `cleanupOnShutdown()` for session cleanup and logging

### Task 2: API Endpoints (preview-server.ts)

Added three new REST API endpoints:

1. **POST /api/daemon/start**
   - Starts the sync daemon programmatically
   - Returns 200 with `{"success":true,"message":"Daemon started"}` if started
   - Returns 409 with `{"success":false,"message":"Daemon already running"}` if already running

2. **POST /api/daemon/stop**
   - Stops the running sync daemon gracefully
   - Returns 200 with `{"success":true,"message":"Daemon stop signal sent"}` if stopped
   - Returns 409 with `{"success":false,"message":"Daemon not running"}` if not running

3. **GET /api/operations/health**
   - Returns aggregated health data for the operations dashboard
   - Includes daemon status and health metrics
   - Includes order status counts, error count, and last sync time
   - Includes inventory tracking counts and monitor config

## Verification Results

- [x] `npx tsc --noEmit` passes (no TypeScript errors in plan files)
- [x] `npm run preview` starts without errors
- [x] `curl http://localhost:3456/api/operations/health` returns aggregated health JSON
- [x] `curl -X POST http://localhost:3456/api/daemon/start` starts daemon (returns 200)
- [x] `curl -X POST http://localhost:3456/api/daemon/stop` stops daemon (returns 200)
- [x] GET /api/inventory/health still works (existing endpoint unchanged)

## Files Modified

- `scripts/sync/sync-poller.ts` - Added daemon lifecycle control functions
- `scripts/pipeline/preview-server.ts` - Added API endpoints for daemon control and operations health

## API Response Examples

### GET /api/operations/health

```json
{
  "daemon": {
    "running": false,
    "health": null
  },
  "orders": {
    "statusCounts": {"delivered": 5, "new": 6, "errored": 0},
    "errorCount": 0,
    "lastSync": "2026-02-02T18:34:13.744Z"
  },
  "inventory": {
    "trackedProductCount": 33,
    "recentAlertCount": 10,
    "config": {
      "pollIntervalMinutes": 60,
      "lowStockThreshold": 10
    }
  },
  "timestamp": "2026-02-04T14:35:33.022Z"
}
```

### POST /api/daemon/start

```json
{"success": true, "message": "Daemon started"}
```

### POST /api/daemon/stop

```json
{"success": true, "message": "Daemon stop signal sent"}
```

## Notes

- The abort signal approach allows graceful shutdown - the current tick completes before exiting
- Operations health endpoint provides a single call for dashboard overview card data
- No regressions to existing inventory/order APIs
