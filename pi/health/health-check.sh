#!/bin/bash
set -euo pipefail

# HotBox Health Check
# Checks if the HotBox server is responding and restarts if needed.
# Runs via systemd timer every 2 minutes.

# Root guard
if [ "$EUID" -ne 0 ]; then
  echo "ERROR: Must run as root"
  exit 1
fi

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_FILE="$SCRIPT_DIR/../config/hotbox.conf"
if [ -f "$CONF_FILE" ]; then
  source "$CONF_FILE"
fi

PORT="${HOTBOX_PORT:-3456}"

check_health() {
  curl -sf --max-time 10 "http://localhost:${PORT}/api/health" > /dev/null 2>&1
}

# First attempt
if check_health; then
  logger -t hotbox-health "Health check passed"
  exit 0
fi

logger -t hotbox-health "WARNING: Health check failed, retrying in 5s..."
sleep 5

# Second attempt
if check_health; then
  logger -t hotbox-health "Health check passed on retry"
  exit 0
fi

# Both attempts failed — restart the server
logger -t hotbox-health "ERROR: Health check failed twice, restarting hotbox-server.service"
systemctl restart hotbox-server.service
logger -t hotbox-health "hotbox-server.service restart initiated"
