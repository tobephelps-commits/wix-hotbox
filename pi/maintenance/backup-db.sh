#!/bin/bash
set -euo pipefail

# HotBox Database Backup
# Creates a daily SQLite backup with 7-day rotation.
# Runs via systemd timer as the hotbox user.

# Source configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF_FILE="$SCRIPT_DIR/../config/hotbox.conf"
if [ -f "$CONF_FILE" ]; then
  source "$CONF_FILE"
fi

APP_DIR="${HOTBOX_APP_DIR:-/home/hotbox/app}"
DATA_DIR="${APP_DIR}/data"
BACKUP_DIR="${DATA_DIR}/backups"
DB_PATH="${DATA_DIR}/hotbox.db"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Check database exists
if [ ! -f "$DB_PATH" ]; then
  logger -t hotbox-backup "WARNING: Database not found at ${DB_PATH}, skipping backup"
  exit 0
fi

# Create backup with timestamp
TIMESTAMP=$(date +%Y-%m-%d-%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/hotbox-${TIMESTAMP}.db"

logger -t hotbox-backup "Starting backup to ${BACKUP_PATH}"
sqlite3 "$DB_PATH" ".backup ${BACKUP_PATH}"
logger -t hotbox-backup "Backup complete: $(du -h "$BACKUP_PATH" | cut -f1)"

# Rotate: keep only last 7 backups
REMOVED=$(ls -t "${BACKUP_DIR}"/hotbox-*.db 2>/dev/null | tail -n +8)
if [ -n "$REMOVED" ]; then
  echo "$REMOVED" | xargs rm -f
  logger -t hotbox-backup "Rotated old backups, keeping last 7"
fi
