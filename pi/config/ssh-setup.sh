#!/usr/bin/env bash
# HotBox Pi Appliance — SSH Hardening Script
# Enables SSH, disables password auth, sets up authorized keys.
# Called by bootstrap.sh or can be run standalone.

set -euo pipefail

# ---------- Root check ----------
if [[ $EUID -ne 0 ]]; then
  echo "ERROR: This script must be run as root (use sudo)." >&2
  exit 1
fi

# ---------- Load configuration ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/hotbox.conf"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck source=hotbox.conf
  source "$CONFIG_FILE"
fi

HOTBOX_USER="${HOTBOX_USER:-hotbox}"

# ---------- 1. Enable SSH service ----------
echo "[ssh] Enabling SSH service..."
systemctl enable ssh
systemctl start ssh

# ---------- 2. Generate host keys if missing ----------
echo "[ssh] Checking SSH host keys..."
if [[ ! -f /etc/ssh/ssh_host_rsa_key ]]; then
  ssh-keygen -A
  echo "[ssh] SSH host keys generated."
else
  echo "[ssh] SSH host keys already exist, skipping."
fi

# ---------- 3. Set up authorized_keys for hotbox user ----------
HOTBOX_HOME="/home/$HOTBOX_USER"
SSH_DIR="$HOTBOX_HOME/.ssh"
AUTH_KEYS="$SSH_DIR/authorized_keys"

mkdir -p "$SSH_DIR"
chmod 700 "$SSH_DIR"
chown "$HOTBOX_USER:$HOTBOX_USER" "$SSH_DIR"

if [[ -n "${HOTBOX_SSH_PUBKEY:-}" ]]; then
  # Add public key if not already present
  if [[ ! -f "$AUTH_KEYS" ]] || ! grep -qF "$HOTBOX_SSH_PUBKEY" "$AUTH_KEYS"; then
    echo "$HOTBOX_SSH_PUBKEY" >> "$AUTH_KEYS"
    echo "[ssh] Public key added to $AUTH_KEYS."
  else
    echo "[ssh] Public key already in authorized_keys, skipping."
  fi
  chmod 600 "$AUTH_KEYS"
  chown "$HOTBOX_USER:$HOTBOX_USER" "$AUTH_KEYS"
else
  echo "[ssh] HOTBOX_SSH_PUBKEY not set — skipping authorized_keys setup."
  echo "[ssh] Set HOTBOX_SSH_PUBKEY env var and re-run to add your key."
fi

# ---------- 4. Disable password auth (key-only) ----------
SSHD_CONFIG="/etc/ssh/sshd_config"

echo "[ssh] Hardening SSH configuration..."

# Only disable password auth if an authorized key exists (safety check)
if [[ -f "$AUTH_KEYS" ]] && [[ -s "$AUTH_KEYS" ]]; then
  # Disable password authentication
  if grep -q "^PasswordAuthentication" "$SSHD_CONFIG"; then
    sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
  else
    echo "PasswordAuthentication no" >> "$SSHD_CONFIG"
  fi

  # Disable challenge-response authentication
  if grep -q "^ChallengeResponseAuthentication" "$SSHD_CONFIG"; then
    sed -i 's/^ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' "$SSHD_CONFIG"
  else
    echo "ChallengeResponseAuthentication no" >> "$SSHD_CONFIG"
  fi

  echo "[ssh] Password authentication disabled (key-only access)."
else
  echo "[ssh] WARNING: No authorized keys found. Keeping password auth enabled."
  echo "[ssh] Add your SSH public key first, then re-run to lock down."
fi

# ---------- 5. Restart sshd ----------
echo "[ssh] Restarting SSH service..."
systemctl restart ssh

echo "[ssh] SSH hardening complete."
