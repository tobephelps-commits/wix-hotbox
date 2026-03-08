#!/usr/bin/env bash
# HotBox Pi Appliance — Read-Only / Power-Cycle Protection Setup
# Protects SD card from corruption due to unexpected power loss.
# Usage: sudo bash setup-readonly.sh
#
# What this does:
#   - tmpfs overlays for /tmp, /var/tmp, /var/log (volatile on reboot)
#   - noatime + commit=120 on root partition (reduce SD write frequency)
#   - Disables swap (SD card swap is a reliability/performance killer)
#   - Creates a graceful shutdown service to sync before power-off
#   - Leaves /home/hotbox/app/data and /logs writable (app data persists)

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
  echo "[readonly] Loading $CONFIG_FILE"
  # shellcheck source=../config/hotbox.conf
  source "$CONFIG_FILE"
else
  echo "[readonly] Warning: $CONFIG_FILE not found, using defaults"
fi

HOTBOX_USER="${HOTBOX_USER:-hotbox}"
HOTBOX_APP_DIR="${HOTBOX_APP_DIR:-/home/$HOTBOX_USER/app}"

# ---------- Logging ----------
LOG_FILE="/var/log/hotbox-readonly-setup.log"
exec > >(tee -a "$LOG_FILE") 2>&1
echo ""
echo "========================================"
echo " HotBox Read-Only Setup — $(date -Iseconds)"
echo "========================================"

# ---------- 1. Backup fstab ----------
echo ""
echo "[1/5] Backing up /etc/fstab..."
FSTAB="/etc/fstab"
FSTAB_BACKUP="/etc/fstab.hotbox-backup.$(date +%Y%m%d%H%M%S)"

if [[ -f "$FSTAB" ]]; then
  cp "$FSTAB" "$FSTAB_BACKUP"
  echo "[1/5] Backed up to $FSTAB_BACKUP"
else
  echo "[1/5] WARNING: /etc/fstab not found — creating new one."
  touch "$FSTAB"
fi

# ---------- 2. tmpfs overlays ----------
echo ""
echo "[2/5] Configuring tmpfs overlays..."

add_tmpfs_mount() {
  local mount_point="$1"
  local size="$2"
  local extra_opts="${3:-}"
  local opts="defaults,noatime,nosuid,size=${size}"
  [[ -n "$extra_opts" ]] && opts="${opts},${extra_opts}"
  local entry="tmpfs ${mount_point} tmpfs ${opts} 0 0"

  if grep -q "^tmpfs ${mount_point} " "$FSTAB" 2>/dev/null; then
    echo "[2/5] tmpfs ${mount_point} already in fstab, updating..."
    sed -i "\|^tmpfs ${mount_point} |c\\${entry}" "$FSTAB"
  else
    echo "$entry" >> "$FSTAB"
  fi
  echo "[2/5] Added: $entry"
}

add_tmpfs_mount "/tmp" "100m"
add_tmpfs_mount "/var/tmp" "50m"
add_tmpfs_mount "/var/log" "50m" "mode=0755"

# ---------- 3. Root partition mount options ----------
echo ""
echo "[3/5] Optimizing root partition mount options..."

# Add noatime and commit=120 to root partition entry
if grep -q "^\S\+\s\+/\s" "$FSTAB"; then
  # Check if noatime already set
  if grep "^\S\+\s\+/\s" "$FSTAB" | grep -q "noatime"; then
    echo "[3/5] noatime already set on root partition."
  else
    # Add noatime,commit=120 to existing mount options
    sed -i '/^\S\+\s\+\/\s/ s/defaults/defaults,noatime,commit=120/' "$FSTAB"
    # If no 'defaults' keyword, append to options field
    if ! grep "^\S\+\s\+/\s" "$FSTAB" | grep -q "noatime"; then
      sed -i '/^\S\+\s\+\/\s/ s/\(\S\+\s\+\/\s\+\S\+\s\+\)\(\S\+\)/\1\2,noatime,commit=120/' "$FSTAB"
    fi
    echo "[3/5] Added noatime,commit=120 to root partition."
  fi
else
  echo "[3/5] WARNING: Could not find root partition in fstab. Manual configuration needed."
fi

# ---------- 4. Disable swap ----------
echo ""
echo "[4/5] Disabling swap..."

# Turn off swap immediately
swapoff -a 2>/dev/null || true

# Disable dphys-swapfile if it exists
if command -v dphys-swapfile &>/dev/null; then
  dphys-swapfile swapoff 2>/dev/null || true
  dphys-swapfile uninstall 2>/dev/null || true
  echo "[4/5] dphys-swapfile disabled and uninstalled."
fi

if systemctl list-unit-files | grep -q "dphys-swapfile.service"; then
  systemctl disable dphys-swapfile.service 2>/dev/null || true
  systemctl mask dphys-swapfile.service 2>/dev/null || true
  echo "[4/5] dphys-swapfile.service disabled and masked."
else
  echo "[4/5] dphys-swapfile.service not found (already removed or not installed)."
fi

# Remove swap entries from fstab
if grep -q "swap" "$FSTAB" 2>/dev/null; then
  sed -i '/swap/d' "$FSTAB"
  echo "[4/5] Removed swap entries from fstab."
fi

echo "[4/5] Swap disabled."

# ---------- 5. Graceful shutdown service ----------
echo ""
echo "[5/5] Creating graceful shutdown service..."

cat > /etc/systemd/system/hotbox-shutdown.service <<'SHUTDOWN'
[Unit]
Description=HotBox Graceful Shutdown
DefaultDependencies=no
Before=shutdown.target reboot.target halt.target
After=hotbox-server.service

[Service]
Type=oneshot
RemainAfterExit=true
ExecStart=/bin/true
ExecStop=/bin/bash -c 'echo "[hotbox] Syncing filesystems before shutdown..."; sync; sleep 1; sync'

[Install]
WantedBy=multi-user.target
SHUTDOWN

systemctl daemon-reload
systemctl enable hotbox-shutdown.service 2>/dev/null || true
echo "[5/5] hotbox-shutdown.service created and enabled."

# ---------- Writable data directories reminder ----------
echo ""
echo "[readonly] Writable directories (persist across reboots):"
echo "  $HOTBOX_APP_DIR/data/   — application data, orders, config"
echo "  $HOTBOX_APP_DIR/logs/   — application logs"
echo ""
echo "[readonly] Volatile directories (cleared on reboot):"
echo "  /tmp          — 100M tmpfs"
echo "  /var/tmp      — 50M tmpfs"
echo "  /var/log      — 50M tmpfs (system logs volatile; app logs in $HOTBOX_APP_DIR/logs/)"

# ---------- Done ----------
echo ""
echo "========================================"
echo " HotBox Read-Only Setup COMPLETE"
echo " fstab backup: $FSTAB_BACKUP"
echo " Swap: disabled"
echo " Shutdown hook: enabled"
echo " Log: $LOG_FILE"
echo "========================================"
echo ""
