#!/usr/bin/env bash
# HotBox Pi Appliance — Kiosk Mode Installer
# Installs minimal X11, Chromium, and screen utilities for kiosk mode.
# Usage: sudo bash install-kiosk.sh
#
# This does NOT install a desktop environment or window manager.
# Chromium runs full-screen via startx + xinit, managed by kiosk.sh.

set -euo pipefail

# ---------- Root check ----------
if [[ $EUID -ne 0 ]]; then
  echo "ERROR: This script must be run as root (use sudo)." >&2
  exit 1
fi

# ---------- Load configuration ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/../config/hotbox.conf"

if [[ -f "$CONFIG_FILE" ]]; then
  echo "[kiosk] Loading $CONFIG_FILE"
  # shellcheck source=../config/hotbox.conf
  source "$CONFIG_FILE"
else
  echo "[kiosk] Warning: $CONFIG_FILE not found, using defaults"
fi

HOTBOX_USER="${HOTBOX_USER:-hotbox}"
HOTBOX_APP_DIR="${HOTBOX_APP_DIR:-/home/$HOTBOX_USER/app}"

# ---------- Logging ----------
LOG_FILE="/var/log/hotbox-kiosk-install.log"
exec > >(tee -a "$LOG_FILE") 2>&1
echo ""
echo "========================================"
echo " HotBox Kiosk Install — $(date -Iseconds)"
echo "========================================"

# ---------- 1. Minimal X11 ----------
echo ""
echo "[1/4] Installing minimal X11 (no desktop environment)..."
apt-get install -y \
  xserver-xorg-core \
  xinit \
  x11-xserver-utils \
  xdotool

# ---------- 2. Chromium browser ----------
echo ""
echo "[2/4] Installing Chromium browser..."
apt-get install -y chromium-browser

# Create Chromium profile directory
CHROMIUM_DIR="/home/$HOTBOX_USER/.config/chromium"
mkdir -p "$CHROMIUM_DIR/Default"
chown -R "$HOTBOX_USER:$HOTBOX_USER" "/home/$HOTBOX_USER/.config"

# Pre-configure Chromium: disable first-run, translation, crash reporter
FIRST_RUN_FILE="$CHROMIUM_DIR/First Run"
if [[ ! -f "$FIRST_RUN_FILE" ]]; then
  touch "$FIRST_RUN_FILE"
  chown "$HOTBOX_USER:$HOTBOX_USER" "$FIRST_RUN_FILE"
  echo "[2/4] Created First Run sentinel to skip first-run wizard."
fi

LOCAL_STATE_FILE="$CHROMIUM_DIR/Local State"
if [[ ! -f "$LOCAL_STATE_FILE" ]]; then
  cat > "$LOCAL_STATE_FILE" <<'LOCALSTATE'
{
  "browser": {
    "enabled_labs_experiments": []
  },
  "data_reduction": {
    "daily_original_length": ["0"]
  },
  "profile": {
    "metrics": {
      "next_call_date": "99999999999"
    }
  }
}
LOCALSTATE
  chown "$HOTBOX_USER:$HOTBOX_USER" "$LOCAL_STATE_FILE"
  echo "[2/4] Created Local State to suppress prompts."
fi

# ---------- 3. Screen utilities ----------
echo ""
echo "[3/4] Installing screen utilities..."
apt-get install -y unclutter

# ---------- 4. Disable screen blanking ----------
echo ""
echo "[4/4] Disabling screen blanking and DPMS..."
mkdir -p /etc/X11/xorg.conf.d

cat > /etc/X11/xorg.conf.d/10-blanking.conf <<'XORGCONF'
# HotBox: Disable screen blanking and DPMS for kiosk mode
Section "ServerFlags"
    Option "BlankTime"  "0"
    Option "StandbyTime" "0"
    Option "SuspendTime" "0"
    Option "OffTime"     "0"
EndSection

Section "ServerLayout"
    Identifier "ServerLayout0"
    Option "BlankTime"  "0"
    Option "StandbyTime" "0"
    Option "SuspendTime" "0"
    Option "OffTime"     "0"
EndSection

Section "Monitor"
    Identifier "Monitor0"
    Option "DPMS" "false"
EndSection
XORGCONF
echo "[4/4] Created /etc/X11/xorg.conf.d/10-blanking.conf"

# ---------- Symlink xinitrc ----------
echo ""
echo "[kiosk] Setting up xinitrc..."
XINITRC_SRC="$HOTBOX_APP_DIR/pi/kiosk/xinitrc"
XINITRC_DEST="/home/$HOTBOX_USER/.xinitrc"

if [[ -L "$XINITRC_DEST" ]] || [[ -f "$XINITRC_DEST" ]]; then
  rm -f "$XINITRC_DEST"
fi
ln -s "$XINITRC_SRC" "$XINITRC_DEST"
chown -h "$HOTBOX_USER:$HOTBOX_USER" "$XINITRC_DEST"
echo "[kiosk] Symlinked $XINITRC_DEST -> $XINITRC_SRC"

# ---------- Make scripts executable ----------
chmod +x "$HOTBOX_APP_DIR/pi/kiosk/kiosk.sh" 2>/dev/null || true
chmod +x "$HOTBOX_APP_DIR/pi/kiosk/touch-calibrate.sh" 2>/dev/null || true
chmod +x "$HOTBOX_APP_DIR/pi/kiosk/xinitrc" 2>/dev/null || true

# ---------- Touch calibration (auto-detect) ----------
TOUCH_SCRIPT="$HOTBOX_APP_DIR/pi/kiosk/touch-calibrate.sh"
if [[ -x "$TOUCH_SCRIPT" ]]; then
  echo ""
  echo "[kiosk] Running touch calibration (auto-detect)..."
  bash "$TOUCH_SCRIPT" || echo "[kiosk] Touch calibration completed with warnings (non-fatal)."
else
  echo "[kiosk] Touch calibration script not found, skipping."
fi

# ---------- Done ----------
echo ""
echo "========================================"
echo " HotBox Kiosk Install COMPLETE"
echo " Chromium: $(chromium-browser --version 2>/dev/null || echo 'installed')"
echo " X11: minimal (no desktop environment)"
echo " Start with: sudo -u $HOTBOX_USER startx"
echo " Log: $LOG_FILE"
echo "========================================"
echo ""
