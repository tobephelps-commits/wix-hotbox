#!/usr/bin/env bash
# HotBox Pi Appliance — Touchscreen Configuration & Calibration
# Detects touchscreen, maps input to display, handles rotation.
#
# Usage:
#   ./touch-calibrate.sh              Auto-detect and configure
#   ./touch-calibrate.sh --list       List detected touch devices
#   ./touch-calibrate.sh --rotate left|right|normal|inverted

set -euo pipefail

# ---------- Load configuration ----------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/../config/hotbox.conf"

if [[ -f "$CONFIG_FILE" ]]; then
  # shellcheck source=../config/hotbox.conf
  source "$CONFIG_FILE"
fi

HOTBOX_USER="${HOTBOX_USER:-hotbox}"

# ---------- Helpers ----------
usage() {
  echo "HotBox Touch Calibration Utility"
  echo ""
  echo "Usage:"
  echo "  $0              Auto-detect and configure touchscreen"
  echo "  $0 --list       List detected touch devices"
  echo "  $0 --rotate <rotation>  Rotate display and touch input"
  echo ""
  echo "Rotations: normal, left, right, inverted"
}

# Known touchscreen device name patterns
TOUCH_PATTERNS=("WaveShare" "eGalax" "ILITEK" "Goodix" "Touch" "touch" "FT5406" "HID")

detect_touch_devices() {
  local devices=()
  local all_devices
  all_devices=$(xinput list --name-only 2>/dev/null || true)

  while IFS= read -r device; do
    [[ -z "$device" ]] && continue
    for pattern in "${TOUCH_PATTERNS[@]}"; do
      if [[ "$device" == *"$pattern"* ]]; then
        devices+=("$device")
        break
      fi
    done
  done <<< "$all_devices"

  printf '%s\n' "${devices[@]}"
}

get_touch_device_id() {
  local device_name="$1"
  xinput list --id-only "$device_name" 2>/dev/null || true
}

detect_display_output() {
  # Find the connected display output via xrandr
  local output
  output=$(xrandr --query 2>/dev/null | grep " connected" | head -1 | awk '{print $1}')
  echo "$output"
}

get_rotation_matrix() {
  local rotation="$1"
  case "$rotation" in
    normal)   echo "1 0 0 0 1 0 0 0 1" ;;
    left)     echo "0 -1 1 1 0 0 0 0 1" ;;
    right)    echo "0 1 0 -1 0 1 0 0 1" ;;
    inverted) echo "-1 0 1 0 -1 1 0 0 1" ;;
    *)
      echo "ERROR: Unknown rotation '$rotation'. Use: normal, left, right, inverted" >&2
      return 1
      ;;
  esac
}

# ---------- Command: --list ----------
if [[ "${1:-}" == "--list" ]]; then
  echo "Detected touch devices:"
  echo ""
  devices=$(detect_touch_devices)
  if [[ -z "$devices" ]]; then
    echo "  (none found)"
    echo ""
    echo "All input devices:"
    xinput list 2>/dev/null || echo "  xinput not available (X server not running?)"
  else
    while IFS= read -r dev; do
      dev_id=$(get_touch_device_id "$dev")
      echo "  [$dev_id] $dev"
    done <<< "$devices"
  fi
  exit 0
fi

# ---------- Command: --rotate ----------
ROTATION="${HOTBOX_DISPLAY_ROTATION:-normal}"

if [[ "${1:-}" == "--rotate" ]]; then
  if [[ -z "${2:-}" ]]; then
    echo "ERROR: --rotate requires a value: normal, left, right, inverted" >&2
    exit 1
  fi
  ROTATION="$2"
fi

if [[ "${1:-}" == "--help" ]] || [[ "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi

# ---------- Auto-detect and configure ----------
echo "========================================"
echo " HotBox Touch Calibration"
echo "========================================"
echo ""

# Detect display output
DISPLAY_OUTPUT=$(detect_display_output)
if [[ -z "$DISPLAY_OUTPUT" ]]; then
  echo "[touch] WARNING: No connected display detected via xrandr."
  echo "[touch] Touch mapping may need manual configuration."
  DISPLAY_OUTPUT="HDMI-1"
  echo "[touch] Defaulting to $DISPLAY_OUTPUT"
fi
echo "[touch] Display output: $DISPLAY_OUTPUT"

# Detect touch devices
echo "[touch] Scanning for touch input devices..."
TOUCH_DEVICES=$(detect_touch_devices)

if [[ -z "$TOUCH_DEVICES" ]]; then
  echo "[touch] No touchscreen devices detected."
  echo "[touch] If you have a touchscreen, it may use a non-standard name."
  echo "[touch] Run '$0 --list' after connecting the display."
  echo "[touch] Skipping touch mapping."
  echo ""
  # Still handle rotation if requested
  if [[ "$ROTATION" != "normal" ]]; then
    echo "[touch] Applying display rotation: $ROTATION"
    xrandr --output "$DISPLAY_OUTPUT" --rotate "$ROTATION" 2>/dev/null || \
      echo "[touch] WARNING: Could not apply rotation (display may not be active)."
  fi
  exit 0
fi

echo "[touch] Found touch device(s):"
while IFS= read -r dev; do
  echo "  - $dev"
done <<< "$TOUCH_DEVICES"

# Map each touch device to the display
echo ""
echo "[touch] Mapping touch input to display $DISPLAY_OUTPUT..."
while IFS= read -r dev; do
  echo "[touch] Mapping: $dev -> $DISPLAY_OUTPUT"
  xinput map-to-output "$dev" "$DISPLAY_OUTPUT" 2>/dev/null || \
    echo "[touch] WARNING: Could not map '$dev' to $DISPLAY_OUTPUT"
done <<< "$TOUCH_DEVICES"

# Apply rotation
echo ""
echo "[touch] Applying rotation: $ROTATION"
if [[ "$ROTATION" != "normal" ]]; then
  xrandr --output "$DISPLAY_OUTPUT" --rotate "$ROTATION" 2>/dev/null || \
    echo "[touch] WARNING: Could not apply display rotation."
fi

# Apply coordinate transformation matrix for touch rotation
MATRIX=$(get_rotation_matrix "$ROTATION")
echo "[touch] Coordinate transform matrix: $MATRIX"

while IFS= read -r dev; do
  # shellcheck disable=SC2086
  xinput set-prop "$dev" "Coordinate Transformation Matrix" $MATRIX 2>/dev/null || \
    echo "[touch] WARNING: Could not set transform matrix for '$dev'"
done <<< "$TOUCH_DEVICES"

# ---------- Persist calibration ----------
echo ""
echo "[touch] Persisting configuration..."

# Write xorg.conf.d touch config
TOUCH_CONF="/etc/X11/xorg.conf.d/40-touch.conf"
if [[ $EUID -eq 0 ]] || command -v sudo &>/dev/null; then
  FIRST_TOUCH_DEV=$(echo "$TOUCH_DEVICES" | head -1)

  CONF_CONTENT=$(cat <<XORGTOUCH
# HotBox: Touchscreen input mapping
# Auto-generated by touch-calibrate.sh at $(date -Iseconds)
# Device: $FIRST_TOUCH_DEV
# Display: $DISPLAY_OUTPUT
# Rotation: $ROTATION

Section "InputClass"
    Identifier "HotBox Touchscreen"
    MatchProduct "$FIRST_TOUCH_DEV"
    Option "CalibrationMatrix" "$MATRIX"
    Option "TransformationMatrix" "$MATRIX"
EndSection
XORGTOUCH
)

  if [[ $EUID -eq 0 ]]; then
    mkdir -p /etc/X11/xorg.conf.d
    echo "$CONF_CONTENT" > "$TOUCH_CONF"
  else
    sudo mkdir -p /etc/X11/xorg.conf.d
    echo "$CONF_CONTENT" | sudo tee "$TOUCH_CONF" > /dev/null
  fi
  echo "[touch] Wrote $TOUCH_CONF"
else
  echo "[touch] WARNING: Cannot write $TOUCH_CONF (not root and sudo unavailable)"
fi

# Save rotation preference to hotbox.conf
if [[ -f "$CONFIG_FILE" ]]; then
  if grep -q "^HOTBOX_DISPLAY_ROTATION=" "$CONFIG_FILE" 2>/dev/null; then
    if [[ $EUID -eq 0 ]]; then
      sed -i "s/^HOTBOX_DISPLAY_ROTATION=.*/HOTBOX_DISPLAY_ROTATION=\"$ROTATION\"/" "$CONFIG_FILE"
    else
      sudo sed -i "s/^HOTBOX_DISPLAY_ROTATION=.*/HOTBOX_DISPLAY_ROTATION=\"$ROTATION\"/" "$CONFIG_FILE"
    fi
  else
    if [[ $EUID -eq 0 ]]; then
      echo "HOTBOX_DISPLAY_ROTATION=\"$ROTATION\"" >> "$CONFIG_FILE"
    else
      echo "HOTBOX_DISPLAY_ROTATION=\"$ROTATION\"" | sudo tee -a "$CONFIG_FILE" > /dev/null
    fi
  fi
  echo "[touch] Saved HOTBOX_DISPLAY_ROTATION=$ROTATION to $CONFIG_FILE"
fi

# ---------- Done ----------
echo ""
echo "========================================"
echo " Touch Calibration COMPLETE"
echo " Device:   $(echo "$TOUCH_DEVICES" | head -1)"
echo " Display:  $DISPLAY_OUTPUT"
echo " Rotation: $ROTATION"
echo "========================================"
echo ""
