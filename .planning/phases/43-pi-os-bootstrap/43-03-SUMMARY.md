---
phase: 43-pi-os-bootstrap
plan: 03
status: complete
completed: 2026-03-07
commits: [2f3ed1a, ccf6c24, 00d9fab]
---

# Plan 03 Summary: systemd Services & Boot Resilience

## What was built

### systemd Service Units (Task 1)
- **hotbox-server.service** — Node.js app server with security hardening (NoNewPrivileges, ProtectSystem=strict, read-only home, PrivateTmp). Restarts on failure (5 attempts in 60s). Logs to journald.
- **hotbox-kiosk.service** — Chromium kiosk display. Depends on server service, waits 3s before starting. Only starts if framebuffer exists (ConditionPathExists=/dev/fb0). Restarts on failure (3 attempts in 120s).
- **install-services.sh** — Copies service files, creates xinitrc symlink, enables services, creates data/logs directories with correct ownership.

### Boot Resilience (Task 2)
- **setup-readonly.sh** — tmpfs overlays for /tmp (100M), /var/tmp (50M), /var/log (50M). Root partition gets noatime,commit=120 to reduce SD write frequency. Swap disabled and masked. Graceful shutdown service syncs filesystems before power-off. Backs up fstab before modifying.
- **setup-watchdog.sh** — Enables Pi 5 hardware watchdog (dtparam=watchdog=on). Configures 15s timeout, 10s check interval, load and network monitoring. Journald log rotation: 50M max, 10M per file, 7-day retention.

### Master Setup & Documentation (Task 3)
- **setup.sh** — Orchestrates all 5 setup phases in order: bootstrap, kiosk, touch calibration, services, resilience. Single command to set up a fresh Pi.
- **README.md** — Complete setup guide with architecture diagram, quick/manual setup, configuration reference, useful commands, maintenance procedures, and troubleshooting table.

## Decisions

| Decision | Rationale |
|----------|-----------|
| Server starts first, kiosk waits 3s | Ensures HTTP server is listening before Chromium connects |
| Kiosk conditioned on /dev/fb0 | Safe to run headless without display hardware |
| tmpfs for /var/log (volatile) | System logs don't survive reboot; app logs persist in app/logs/ |
| commit=120 on root partition | Reduces SD write frequency from 5s to 120s, extending card life |
| Swap disabled and masked | SD card swap is both a reliability and performance problem |
| Watchdog timeout 15s | Long enough to avoid false resets, short enough for quick recovery |
| Journald capped at 50M / 7 days | Prevents journal from filling SD card on a constrained appliance |

## Files

- `pi/systemd/hotbox-server.service`
- `pi/systemd/hotbox-kiosk.service`
- `pi/systemd/install-services.sh`
- `pi/resilience/setup-readonly.sh`
- `pi/resilience/setup-watchdog.sh`
- `pi/setup.sh`
- `pi/README.md`
