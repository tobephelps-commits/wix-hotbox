#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config/hotbox.conf"

echo "=========================================="
echo "  HotBox Pi Appliance Setup"
echo "=========================================="
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
  echo "ERROR: Must run as root (sudo ./setup.sh)"
  exit 1
fi

# Phase 1: Base bootstrap
echo "[1/6] Running base bootstrap..."
bash "$SCRIPT_DIR/bootstrap.sh"

# Phase 2: Kiosk installation
echo "[2/6] Installing kiosk display..."
bash "$SCRIPT_DIR/kiosk/install-kiosk.sh"

# Phase 3: Touch calibration
echo "[3/6] Configuring touchscreen..."
bash "$SCRIPT_DIR/kiosk/touch-calibrate.sh"

# Phase 4: systemd services
echo "[4/6] Installing services..."
bash "$SCRIPT_DIR/systemd/install-services.sh"

# Phase 5: Boot resilience
echo "[5/6] Configuring boot resilience..."
bash "$SCRIPT_DIR/resilience/setup-readonly.sh"
bash "$SCRIPT_DIR/resilience/setup-watchdog.sh"

# Phase 6: Health monitoring and maintenance timers
echo "[6/6] Installing health check and maintenance timers..."

# Health check
chmod +x "$SCRIPT_DIR/health/health-check.sh"
cp "$SCRIPT_DIR/health/hotbox-health.service" /etc/systemd/system/
cp "$SCRIPT_DIR/health/hotbox-health.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now hotbox-health.timer

# Database backup
chmod +x "$SCRIPT_DIR/maintenance/backup-db.sh"
cp "$SCRIPT_DIR/maintenance/hotbox-backup.service" /etc/systemd/system/
cp "$SCRIPT_DIR/maintenance/hotbox-backup.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now hotbox-backup.timer

# App update script
chmod +x "$SCRIPT_DIR/maintenance/update-app.sh"

echo ""
echo "=========================================="
echo "  Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Copy your .env file to /home/hotbox/app/.env"
echo "  2. Build the app: cd /home/hotbox/app && npm run build"
echo "  3. Reboot: sudo reboot"
echo "  4. App will auto-start on boot"
echo ""
echo "Useful commands:"
echo "  journalctl -u hotbox-server -f    # Server logs"
echo "  journalctl -u hotbox-kiosk -f     # Kiosk logs"
echo "  systemctl status hotbox-server    # Server status"
echo "  systemctl status hotbox-kiosk     # Kiosk status"
echo ""
