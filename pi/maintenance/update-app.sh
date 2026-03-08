#!/bin/bash
set -euo pipefail

# HotBox Application Update
# Pulls latest code from main branch, rebuilds, and restarts.
# Must run as root (needs systemctl restart).

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

APP_DIR="${HOTBOX_APP_DIR:-/home/hotbox/app}"

cd "$APP_DIR"

logger -t hotbox-update "Checking for updates..."

# Fetch latest from remote
git fetch origin main

LOCAL_HEAD=$(git rev-parse HEAD)
REMOTE_HEAD=$(git rev-parse origin/main)

if [ "$LOCAL_HEAD" = "$REMOTE_HEAD" ]; then
  logger -t hotbox-update "Already up to date (${LOCAL_HEAD:0:8})"
  exit 0
fi

logger -t hotbox-update "Update available: ${LOCAL_HEAD:0:8} -> ${REMOTE_HEAD:0:8}"

# Pull changes
logger -t hotbox-update "Pulling latest code..."
git pull origin main

# Install dependencies
logger -t hotbox-update "Installing dependencies..."
npm install --production

# Build application
logger -t hotbox-update "Building application..."
npm run build

# Restart service
logger -t hotbox-update "Restarting hotbox-server.service..."
systemctl restart hotbox-server.service

logger -t hotbox-update "Update complete: now at $(git rev-parse --short HEAD)"
