---
phase: 43-pi-os-bootstrap
plan: 01
subsystem: infra
tags: [raspberry-pi, bash, nodejs, ssh, bootstrap]

# Dependency graph
requires: []
provides:
  - pi/ directory structure with bootstrap script
  - Central configuration file (hotbox.conf) for all Pi scripts
  - SSH hardening script with key-only auth
  - WiFi configuration template
  - Pi setup documentation (README.md)
affects: [44-kiosk-display, 45-app-service, 46-resilience]

# Tech tracking
tech-stack:
  added: [bash, nodesource-20.x]
  patterns: [idempotent-bootstrap, central-config-sourcing, root-guard]

key-files:
  created:
    - pi/bootstrap.sh
    - pi/README.md
    - pi/config/hotbox.conf
    - pi/config/wpa_supplicant.conf.template
    - pi/config/ssh-setup.sh

key-decisions:
  - "Pi OS Lite 64-bit Bookworm — no desktop, ARM64 for Node.js 20+"
  - "NodeSource repo for Node.js 20 LTS (not apt default)"
  - "Safety check before disabling password auth — only locks down if authorized_keys exists"

patterns-established:
  - "Root guard: all pi/ scripts check EUID at top"
  - "Config sourcing: scripts source pi/config/hotbox.conf for shared settings"
  - "Idempotent: all scripts safe to run multiple times"
  - "Logging: bootstrap logs to /var/log/hotbox-bootstrap.log"

# Metrics
duration: 8min
completed: 2026-03-07
---

# Phase 43, Plan 01: Pi OS Bootstrap Summary

**Pi OS Lite 64-bit bootstrap with Node.js 20 LTS, SSH hardening, and central configuration for the Pi appliance deployment layer**

## Performance

- **Duration:** 8 min
- **Tasks:** 2
- **Files created:** 5

## Accomplishments
- Bootstrap script that updates system, installs Node.js 20 via NodeSource, creates hotbox user, sets locale/timezone
- Central configuration file (hotbox.conf) shared by all pi/ scripts
- SSH hardening script with safety check — only disables password auth when authorized keys exist
- WiFi template and comprehensive setup documentation

## Task Commits

Each task was committed atomically:

1. **Task 1: Create pi/ directory structure and bootstrap script** - `5be79ac` (feat)
2. **Task 2: Create network and SSH configuration** - `a8cfada` (feat)

## Files Created/Modified
- `pi/bootstrap.sh` - Master bootstrap script for fresh Pi OS Lite install
- `pi/README.md` - Hardware requirements and step-by-step setup instructions
- `pi/config/hotbox.conf` - Central configuration sourced by all pi/ scripts
- `pi/config/wpa_supplicant.conf.template` - WiFi configuration template
- `pi/config/ssh-setup.sh` - SSH hardening with key-only auth

## Decisions Made
- Pi OS Lite 64-bit (Bookworm) chosen for minimal footprint and ARM64 Node.js compatibility
- Node.js 20 LTS installed via NodeSource repository (apt default is outdated)
- SSH password auth only disabled after verifying authorized_keys exists (prevents lockout)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- pi/ directory structure established for all subsequent Pi phases
- Bootstrap script ready for real Pi hardware testing
- Configuration pattern established for phases 44-46

---
*Phase: 43-pi-os-bootstrap*
*Completed: 2026-03-07*
