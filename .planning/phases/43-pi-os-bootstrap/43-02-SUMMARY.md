# Plan 43-02 Summary — Chromium Kiosk Mode

**Status:** COMPLETE
**Date:** 2026-03-07
**Tasks:** 2/2

## What was done

### Task 1: Chromium kiosk installation and launcher scripts
- Created `pi/kiosk/install-kiosk.sh` — installs minimal X11 (xserver-xorg-core, xinit, x11-xserver-utils, xdotool) and Chromium without any desktop environment or window manager
- Pre-configures Chromium profile to suppress first-run wizard and translation prompts
- Installs `unclutter` for cursor auto-hide
- Disables screen blanking via `/etc/X11/xorg.conf.d/10-blanking.conf` (DPMS off, all blank timers to 0)
- Created `pi/kiosk/kiosk.sh` — launches Chromium in fullscreen kiosk mode at `http://localhost:HOTBOX_PORT` with touch events enabled, auto-restarts on crash after 3s delay
- Created `pi/kiosk/xinitrc` — wires startx to the kiosk launcher via symlink

### Task 2: Touchscreen configuration and calibration
- Created `pi/kiosk/touch-calibrate.sh` — detects touchscreen devices by known patterns (WaveShare, eGalax, ILITEK, Goodix, FT5406), maps touch input to display output via xinput
- Supports display rotation (normal, left, right, inverted) with matching coordinate transformation matrices applied to touch input
- Persists calibration to `/etc/X11/xorg.conf.d/40-touch.conf` and rotation preference to `hotbox.conf`
- Updated install-kiosk.sh to run touch auto-detection at end of installation

## Commits
- `5a7f514`: feat(43): add Chromium kiosk mode scripts
- `961c441`: feat(43): add touchscreen calibration and display rotation

## Files
- `pi/kiosk/install-kiosk.sh` — kiosk package installer
- `pi/kiosk/kiosk.sh` — kiosk launcher with crash recovery
- `pi/kiosk/xinitrc` — X11 init file for startx
- `pi/kiosk/touch-calibrate.sh` — touchscreen detection and calibration

## Decisions
| Decision | Rationale |
|----------|-----------|
| Minimal X11 without window manager | Lighter footprint; Chromium --kiosk handles its own window |
| Crash recovery via infinite loop with 3s delay | Ensures kiosk stays running without systemd dependency (service comes in later phase) |
| Known-pattern touchscreen detection | Covers common Pi-compatible touchscreen brands without requiring manual device ID |
| Coordinate transformation matrices for rotation | Standard xinput approach; avoids evdev/libinput config complexity |
