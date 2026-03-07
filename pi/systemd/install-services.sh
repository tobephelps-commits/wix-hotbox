#!/usr/bin/env bash
# HotBox Pi Appliance — systemd Service Installer
# Installs and enables hotbox-server and hotbox-kiosk services.
# Usage: sudo bash install-services.sh

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
  echo "[services] Loading $CONFIG_FILE"
  # shellcheck source=../config/hotbox.conf
  source "$CONFIG_FILE"
else
  echo "[services] Warning: $CONFIG_FILE not found, using defaults"
fi

HOTBOX_USER="${HOTBOX_USER:-hotbox}"
HOTBOX_APP_DIR="${HOTBOX_APP_DIR:-/home/$HOTBOX_USER/app}"

# ---------- Logging ----------
LOG_FILE="/var/log/hotbox-services-install.log"
exec > >(tee -a "$LOG_FILE") 2>&1
echo ""
echo "========================================"
echo " HotBox Service Install — $(date -Iseconds)"
echo "========================================"

# ---------- 1. Copy service files ----------
echo ""
echo "[1/5] Copying service files to /etc/systemd/system/..."
cp "$SCRIPT_DIR/hotbox-server.service" /etc/systemd/system/hotbox-server.service
cp "$SCRIPT_DIR/hotbox-kiosk.service" /etc/systemd/system/hotbox-kiosk.service
echo "[1/5] Service files copied."

# ---------- 2. Symlink xinitrc ----------
echo ""
echo "[2/5] Setting up xinitrc symlink..."
XINITRC_SRC="$HOTBOX_APP_DIR/pi/kiosk/xinitrc"
XINITRC_DEST="/home/$HOTBOX_USER/.xinitrc"

if [[ -L "$XINITRC_DEST" ]] || [[ -f "$XINITRC_DEST" ]]; then
  echo "[2/5] $XINITRC_DEST already exists, replacing."
  rm -f "$XINITRC_DEST"
fi
ln -s "$XINITRC_SRC" "$XINITRC_DEST"
chown -h "$HOTBOX_USER:$HOTBOX_USER" "$XINITRC_DEST"
echo "[2/5] Symlinked $XINITRC_DEST -> $XINITRC_SRC"

# ---------- 3. Reload and enable ----------
echo ""
echo "[3/5] Reloading systemd and enabling services..."
systemctl daemon-reload
systemctl enable hotbox-server.service
echo "[3/5] hotbox-server.service enabled."
systemctl enable hotbox-kiosk.service
echo "[3/5] hotbox-kiosk.service enabled."

# ---------- 4. Create data and logs directories ----------
echo ""
echo "[4/5] Creating data and logs directories..."
mkdir -p "$HOTBOX_APP_DIR/data"
mkdir -p "$HOTBOX_APP_DIR/logs"
chown -R "$HOTBOX_USER:$HOTBOX_USER" "$HOTBOX_APP_DIR/data"
chown -R "$HOTBOX_USER:$HOTBOX_USER" "$HOTBOX_APP_DIR/logs"
chmod 755 "$HOTBOX_APP_DIR/data"
chmod 755 "$HOTBOX_APP_DIR/logs"
echo "[4/5] Directories created with correct ownership."

# ---------- 5. Status ----------
echo ""
echo "[5/5] Service status:"
echo ""
echo "--- hotbox-server ---"
systemctl status hotbox-server.service --no-pager 2>/dev/null || echo "  (not yet started — will start on next boot)"
echo ""
echo "--- hotbox-kiosk ---"
systemctl status hotbox-kiosk.service --no-pager 2>/dev/null || echo "  (not yet started — will start on next boot)"

# ---------- Done ----------
echo ""
echo "========================================"
echo " HotBox Service Install COMPLETE"
echo " Server: hotbox-server.service (enabled)"
echo " Kiosk:  hotbox-kiosk.service (enabled)"
echo " Log:    $LOG_FILE"
echo "========================================"
echo ""
echo "Reboot to test auto-start: sudo reboot"
echo ""
