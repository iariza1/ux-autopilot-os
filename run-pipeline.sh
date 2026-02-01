#!/usr/bin/env bash
set -euo pipefail

# UX AutoPilot Pipeline Runner
#
# Usage:
#   ./run-pipeline.sh
#
# For cron (daily at 9 AM):
#   0 9 * * * /path/to/UX_AutoPilot/run-pipeline.sh >> /var/log/ux-pipeline.log 2>&1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== UX AutoPilot Pipeline ==="
echo "Started: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Working directory: $SCRIPT_DIR"
echo ""

# Load environment variables
if [ -f .env ]; then
  set -a
  source .env
  set +a
else
  echo "Warning: .env file not found. Ensure environment variables are set."
fi

# Check prerequisites
if ! command -v node &>/dev/null; then
  echo "Error: Node.js is not installed."
  echo "Install with: brew install node"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "Error: Node.js 18+ required. Found: $(node -v)"
  exit 1
fi

if ! command -v npx &>/dev/null; then
  echo "Error: npx not found. Install Node.js 18+."
  exit 1
fi

# Install dependencies if needed
if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
  echo ""
fi

# Run the pipeline
echo "Running pipeline..."
npx tsx src/index.ts
PIPELINE_EXIT=$?

# Cleanup temporary clone
if [ -d /tmp/toma-app-web-2 ]; then
  echo "Cleaning up temporary repo clone..."
  rm -rf /tmp/toma-app-web-2
fi

echo ""
echo "Completed: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "Exit code: $PIPELINE_EXIT"

exit $PIPELINE_EXIT
