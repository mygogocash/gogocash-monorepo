#!/usr/bin/env bash
# Local dev: install deps (optional clean) then Next dev server.
# Usage:
#   npm run dev:local
#   CLEAN_INSTALL=1 npm run dev:local   # rm -rf node_modules first
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

MIN_NODE_MAJOR=20
CURRENT="$(
  node -p "parseInt(process.versions.node.split('.')[0], 10)" 2>/dev/null || echo 0
)"
if [ "${CURRENT}" -lt "${MIN_NODE_MAJOR}" ]; then
  echo "error: Node.js >= ${MIN_NODE_MAJOR} required (got: $(node -v 2>/dev/null || echo 'not found'))"
  exit 1
fi

if [ "${CLEAN_INSTALL:-}" = "1" ]; then
  echo "Removing node_modules (CLEAN_INSTALL=1)..."
  rm -rf node_modules
fi

echo "Installing dependencies..."
npm install --no-audit --no-fund

echo "Starting dev server at http://localhost:3000 (0.0.0.0:3000) — Ctrl+C to stop"
exec npm run dev
