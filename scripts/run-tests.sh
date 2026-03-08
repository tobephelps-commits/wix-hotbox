#!/usr/bin/env bash
# =============================================================================
# HotBox E2E Test Runner
#
# Detects whether running on a Raspberry Pi or a development machine and
# configures the test environment accordingly.
#
# On Pi:  Tests against localhost:3456 (production), UI project only
# On Dev: Tests against localhost:3457 (test server), all projects
#
# Usage:
#   ./scripts/run-tests.sh [--passes N] [--project api|ui|all] [--help]
# =============================================================================
set -euo pipefail

# --- Defaults ---
PASSES=""
PROJECT=""
HELP=false

# --- Parse args ---
while [[ $# -gt 0 ]]; do
  case "$1" in
    --passes)
      PASSES="$2"
      shift 2
      ;;
    --project)
      PROJECT="$2"
      shift 2
      ;;
    --help|-h)
      HELP=true
      shift
      ;;
    *)
      echo "Unknown argument: $1"
      exit 2
      ;;
  esac
done

if $HELP; then
  cat <<USAGE
HotBox E2E Test Runner

Usage: ./scripts/run-tests.sh [options]

Options:
  --passes N          Run iterative multi-pass mode with N passes
  --project <name>    Project filter: api, ui, or all
  --help, -h          Show this help message

Environment Detection:
  Pi (aarch64):       Tests against localhost:3456 (production port)
                      Defaults to --project ui (kiosk display tests)
                      Sets DISPLAY=:0 for headed browser tests
  Dev (other arch):   Tests against localhost:3457 (test server port)
                      Defaults to --project all (API + UI)
USAGE
  exit 0
fi

# --- Detect environment ---
is_pi() {
  # Check architecture
  if [[ "$(uname -m)" == "aarch64" ]]; then
    return 0
  fi
  # Check device tree model
  if [[ -f /proc/device-tree/model ]] && grep -qi "raspberry" /proc/device-tree/model 2>/dev/null; then
    return 0
  fi
  return 1
}

wait_for_server() {
  local url="$1"
  local max_attempts=30
  local attempt=0

  echo "Waiting for server at ${url}..."
  while [[ $attempt -lt $max_attempts ]]; do
    if curl -sf "${url}" > /dev/null 2>&1; then
      echo "Server is ready."
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done

  echo "Error: Server not ready after ${max_attempts}s at ${url}"
  return 1
}

# --- Main ---
echo "═══════════════════════════════════════"
echo "HotBox E2E Test Runner"
echo "═══════════════════════════════════════"

if is_pi; then
  echo "Environment: Raspberry Pi (aarch64)"
  echo "Target:      localhost:3456 (production)"

  # Set display for headed browser tests on kiosk
  export DISPLAY="${DISPLAY:-:0}"

  # Default to UI project on Pi (API tests use test server port)
  PROJECT="${PROJECT:-ui}"

  # Ensure server is running
  if systemctl is-active --quiet hotbox-server.service 2>/dev/null; then
    echo "Server:      hotbox-server.service is active"
  else
    echo "Server:      Starting hotbox-server.service..."
    sudo systemctl start hotbox-server.service || {
      echo "Warning: Could not start hotbox-server.service"
      echo "Attempting to test against existing server..."
    }
  fi

  # Wait for server health
  wait_for_server "http://localhost:3456/api/health"

  # Override base URL for production port
  export BASE_URL="http://localhost:3456"

else
  echo "Environment: Development machine ($(uname -m))"
  echo "Target:      localhost:3457 (test server)"

  # Default to all projects on dev
  PROJECT="${PROJECT:-all}"
fi

echo "Project:     ${PROJECT}"
echo "───────────────────────────────────────"

# Build test command
if [[ -n "$PASSES" ]]; then
  echo "Mode:        Iterative (${PASSES} passes)"
  echo ""

  CMD="npx tsx tests/iterative-runner.ts --passes ${PASSES}"
  if [[ "$PROJECT" != "all" ]]; then
    CMD="${CMD} --project ${PROJECT}"
  fi
else
  echo "Mode:        Single pass"
  echo ""

  CMD="npx playwright test"
  if [[ "$PROJECT" != "all" ]]; then
    CMD="${CMD} --project=${PROJECT}"
  fi
fi

echo "Running: ${CMD}"
echo ""

# Execute
exec $CMD
