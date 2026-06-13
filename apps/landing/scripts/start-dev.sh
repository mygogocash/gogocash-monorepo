#!/usr/bin/env bash
# Start the Next dev server: Node if available, else Docker Compose.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

run_node() {
  echo "Starting Next.js (Node) at http://localhost:3000 — Ctrl+C to stop"
  exec npm run dev
}

run_docker() {
  echo "Starting Next.js (Docker) at http://localhost:3000 — Ctrl+C to stop"
  if docker compose version >/dev/null 2>&1; then
    exec docker compose up --build
  fi
  exec docker-compose up --build
}

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  MIN_NODE_MAJOR=20
  CURRENT="$(node -p "parseInt(process.versions.node.split('.')[0], 10)" 2>/dev/null || echo 0)"
  if [ "${CURRENT}" -lt "${MIN_NODE_MAJOR}" ]; then
    echo "error: Node.js >= ${MIN_NODE_MAJOR} required (got: $(node -v))"
    exit 1
  fi
  if [ ! -d node_modules ]; then
    echo "Installing dependencies..."
    npm install --no-audit --no-fund
  fi
  run_node
fi

if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1; then
    run_docker
  fi
fi

cat <<'EOF'
Could not start the dev server.

Option A — Install Node.js 20+ (https://nodejs.org/), then from this folder:
  npm install
  npm run dev

Option B — Install Docker Desktop, then from this folder:
  npm run dev:docker
  # or: docker compose up --build

Then open http://localhost:3000/
EOF
exit 1
