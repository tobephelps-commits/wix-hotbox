#!/usr/bin/env bash
# HotBox Pi Appliance — Kiosk Launcher
# Runs as the hotbox user inside an X session (via startx / xinitrc).
# Launches Chromium in full-screen kiosk mode pointing at localhost.
# Auto-restarts Chromium if it crashes.

set -euo pipefail

# ---------- Load configuration ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/../config/hotbox.conf"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck source=../config/hotbox.conf
  source "$CONFIG_FILE"
fi

HOTBOX_PORT="${HOTBOX_PORT:-3456}"
HOTBOX_USER="${HOTBOX_USER:-hotbox}"

# ---------- Logging ----------
LOG_FILE="/var/log/hotbox-kiosk.log"
# Redirect stdout/stderr; create log if needed (may require prior sudo chmod)
if [[ -w "$LOG_FILE" ]] || touch "$LOG_FILE" 2>/dev/null; then
  exec >> "$LOG_FILE" 2>&1
else
  # Fall back to user-writable log
  LOG_FILE="/home/$HOTBOX_USER/hotbox-kiosk.log"
  exec >> "$LOG_FILE" 2>&1
fi

echo ""
echo "========================================"
echo " HotBox Kiosk — $(date -Iseconds)"
echo "========================================"

# ---------- Wait for X server ----------
echo "[kiosk] Waiting for X server..."
WAIT_TIMEOUT=30
WAIT_ELAPSED=0
until xdotool getactivewindow > /dev/null 2>&1; do
  sleep 0.5
  WAIT_ELAPSED=$((WAIT_ELAPSED + 1))
  if [[ $WAIT_ELAPSED -ge $((WAIT_TIMEOUT * 2)) ]]; then
    echo "[kiosk] ERROR: X server not ready after ${WAIT_TIMEOUT}s, proceeding anyway."
    break
  fi
done
echo "[kiosk] X server ready."

# ---------- Disable screen blanking (belt & suspenders) ----------
xset s off      2>/dev/null || true
xset -dpms      2>/dev/null || true
xset s noblank  2>/dev/null || true
echo "[kiosk] Screen blanking disabled via xset."

# ---------- Configure touchscreen ----------
TOUCH_SCRIPT="$SCRIPT_DIR/touch-calibrate.sh"
if [[ -f "$TOUCH_SCRIPT" ]]; then
  echo "[kiosk] Running touch calibration..."
  DISPLAY="${DISPLAY:-:0}" bash "$TOUCH_SCRIPT" 2>&1 || \
    echo "[kiosk] WARNING: Touch calibration failed (non-fatal)."
else
  echo "[kiosk] No touch-calibrate.sh found, skipping."
fi

# ---------- Hide cursor ----------
unclutter -idle 0.5 -root &
UNCLUTTER_PID=$!
echo "[kiosk] Cursor auto-hide started (pid $UNCLUTTER_PID)."

# ---------- Chromium kiosk loop ----------
KIOSK_URL="http://localhost:${HOTBOX_PORT}"
echo "[kiosk] Launching Chromium at $KIOSK_URL"

# Bookworm uses 'chromium', older Pi OS used 'chromium-browser'
CHROMIUM_BIN="$(command -v chromium 2>/dev/null || command -v chromium-browser 2>/dev/null || echo chromium)"

while true; do
  "$CHROMIUM_BIN" \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-translate \
    --no-first-run \
    --disable-features=TranslateUI \
    --check-for-update-interval=31536000 \
    --disable-session-crashed-bubble \
    --disable-component-update \
    --autoplay-policy=no-user-gesture-required \
    --start-fullscreen \
    --window-size=1920,1080 \
    --window-position=0,0 \
    --touch-events=enabled \
    --enable-touch-drag-drop \
    "$KIOSK_URL" || true

  echo "[kiosk] Chromium exited at $(date -Iseconds), restarting in 3s..."
  sleep 3
done
