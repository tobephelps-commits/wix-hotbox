---
phase: 56-appliance-hardening
plan: 01
status: complete
---

## What was built
- Health check script (pi/health/health-check.sh) that pings /api/health every 2 minutes and auto-restarts the server after two consecutive failures
- Systemd oneshot service and timer for the health check (hotbox-health.service/timer)
- Database backup script (pi/maintenance/backup-db.sh) using SQLite .backup with 7-day rotation
- Systemd oneshot service and daily timer for backups (hotbox-backup.service/timer)
- Application update script (pi/maintenance/update-app.sh) that pulls from main, rebuilds, and restarts
- Extended /api/system endpoint with CPU load, memory stats, Pi temperature, disk usage, and network info
- Updated pi/setup.sh with phase 6 to install all health and maintenance timers

## Files modified
- pi/health/health-check.sh (new)
- pi/health/hotbox-health.service (new)
- pi/health/hotbox-health.timer (new)
- pi/maintenance/backup-db.sh (new)
- pi/maintenance/update-app.sh (new)
- pi/maintenance/hotbox-backup.service (new)
- pi/maintenance/hotbox-backup.timer (new)
- pi/setup.sh (modified - added phase 6)
- src/routes/index.ts (modified - extended /api/system)

## Commits
- 3f55033 feat(56): add health check, database backup, and update scripts
- da5b7dc feat(56): extend /api/system with hardware metrics

## Verification
- [x] `npx tsc --noEmit` passes with no errors
- [x] All shell scripts pass bash -n syntax check
- [x] Health check script sources config and uses curl
- [x] Backup script uses SQLite .backup with 7-day rotation
- [x] /api/system includes hardware metrics (cpu, memory, temperature, disk, network)
