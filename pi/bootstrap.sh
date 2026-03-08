#!/usr/bin/env bash
# HotBox Pi Appliance — Master Bootstrap Script
# Runs on a fresh Pi OS Lite 64-bit (Bookworm) install.
# Usage: sudo bash bootstrap.sh
#
# OS choice: Raspberry Pi OS Lite 64-bit (Bookworm)
#   - No desktop environment — lighter, fewer attack surfaces, faster boot
#   - We install only what we need (Chromium, X11 minimal in later phases)
#   - ARM64 for Node.js 20+ compatibility

set -euo pipefail

# ---------- Root check ----------
if [[ $EUID -ne 0 ]]; then
  echo "ERROR: This script must be run as root (use sudo)." >&2
  exit 1
fi

# ---------- Logging ----------
LOG_FILE="/var/log/hotbox-bootstrap.log"
exec > >(tee -a "$LOG_FILE") 2>&1
echo ""
echo "========================================"
echo " HotBox Bootstrap — $(date -Iseconds)"
echo "========================================"

# ---------- Load configuration ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config/hotbox.conf"

if [[ -f "$CONFIG_FILE" ]]; then
  echo "[config] Loading $CONFIG_FILE"
  # shellcheck source=config/hotbox.conf
  source "$CONFIG_FILE"
else
  echo "[config] Warning: $CONFIG_FILE not found, using defaults"
fi

# Defaults (may be overridden by hotbox.conf or env vars)
HOTBOX_USER="${HOTBOX_USER:-hotbox}"
HOTBOX_APP_DIR="${HOTBOX_APP_DIR:-/home/$HOTBOX_USER/app}"
HOTBOX_HOSTNAME="${HOTBOX_HOSTNAME:-hotbox}"
HOTBOX_TIMEZONE="${HOTBOX_TIMEZONE:-America/New_York}"

# ---------- 1. System updates & base packages ----------
echo ""
echo "[1/5] Updating system packages..."
apt-get update -y
apt-get upgrade -y

echo "[1/5] Installing base packages..."
apt-get install -y \
  git \
  curl \
  unzip \
  build-essential

# ---------- 2. Node.js 20 LTS via NodeSource ----------
echo ""
echo "[2/5] Installing Node.js 20 LTS..."
if command -v node &>/dev/null && node --version | grep -q "^v20"; then
  echo "[2/5] Node.js 20 already installed ($(node --version)), skipping."
else
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
  echo "[2/5] Node.js $(node --version) installed."
fi

echo "[2/5] npm version: $(npm --version)"

# ---------- 3. User setup ----------
echo ""
echo "[3/5] Setting up $HOTBOX_USER user..."
if id "$HOTBOX_USER" &>/dev/null; then
  echo "[3/5] User $HOTBOX_USER already exists, skipping creation."
else
  useradd --create-home --shell /bin/bash "$HOTBOX_USER"
  echo "[3/5] User $HOTBOX_USER created."
fi

# Ensure application directory exists
mkdir -p "$HOTBOX_APP_DIR"
chown -R "$HOTBOX_USER:$HOTBOX_USER" "$HOTBOX_APP_DIR"
chmod 755 "$HOTBOX_APP_DIR"
echo "[3/5] Application directory: $HOTBOX_APP_DIR"

# ---------- 4. Hostname ----------
echo ""
echo "[4/5] Setting hostname to $HOTBOX_HOSTNAME..."
if [[ "$(hostname)" != "$HOTBOX_HOSTNAME" ]]; then
  hostnamectl set-hostname "$HOTBOX_HOSTNAME"
  echo "[4/5] Hostname set to $HOTBOX_HOSTNAME."
else
  echo "[4/5] Hostname already set, skipping."
fi

# ---------- 5. Locale & Timezone ----------
echo ""
echo "[5/5] Configuring locale and timezone..."

# Locale
if locale -a 2>/dev/null | grep -q "en_US.utf8"; then
  echo "[5/5] Locale en_US.UTF-8 already available."
else
  sed -i 's/^# *en_US.UTF-8/en_US.UTF-8/' /etc/locale.gen
  locale-gen
  echo "[5/5] Locale en_US.UTF-8 generated."
fi
update-locale LANG=en_US.UTF-8

# Timezone
timedatectl set-timezone "$HOTBOX_TIMEZONE"
echo "[5/5] Timezone set to $HOTBOX_TIMEZONE."

# ---------- Run SSH setup if available ----------
SSH_SETUP="$SCRIPT_DIR/config/ssh-setup.sh"
if [[ -f "$SSH_SETUP" ]]; then
  echo ""
  echo "[ssh] Running SSH hardening..."
  bash "$SSH_SETUP"
fi

# ---------- Done ----------
echo ""
echo "========================================"
echo " HotBox Bootstrap COMPLETE"
echo " Node.js: $(node --version)"
echo " npm:     $(npm --version)"
echo " User:    $HOTBOX_USER"
echo " App dir: $HOTBOX_APP_DIR"
echo " Log:     $LOG_FILE"
echo "========================================"
echo ""
