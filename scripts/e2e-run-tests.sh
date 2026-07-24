#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/gogocash-e2e?replicaSet=rs0}"
export MONGO_REPLICA_SET="${MONGO_REPLICA_SET:-1}"
export JWT_SECRET="${JWT_SECRET:-e2e-local-jwt-secret-change-me}"
export JWT_ADMIN_SECRET="${JWT_ADMIN_SECRET:-e2e-local-admin-jwt-secret-change-me}"
export FIREBASE_PROJECT_ID="${FIREBASE_PROJECT_ID:-demo-e2e}"
export RESEND_API_KEY="${RESEND_API_KEY:-re_e2e_dummy}"
export E2E_SEED_OUT="${ROOT}/.e2e/seed.json"
export E2E_API_URL="${E2E_API_URL:-http://localhost:8080}"
export E2E_ADMIN_URL="${E2E_ADMIN_URL:-http://localhost:3000}"
export E2E_APP_URL="${E2E_APP_URL:-http://localhost:8081}"

if [ -f "$E2E_SEED_OUT" ]; then
  export E2E_CUSTOMER_TOKEN="$(node -p "JSON.parse(require('fs').readFileSync('${E2E_SEED_OUT}','utf8')).customerToken")"
  export E2E_ADMIN_TOKEN="$(node -p "JSON.parse(require('fs').readFileSync('${E2E_SEED_OUT}','utf8')).adminToken")"
fi

echo "[e2e] API integration tests..."
npm run test:e2e -w gogocash-api -- --runInBand

echo "[e2e] Cross-system Playwright..."
npx playwright test --config e2e/playwright.config.ts

echo "[e2e] Admin Playwright..."
E2E_REUSE_ADMIN_STORAGE_STATE=1 ADMIN_PLAYWRIGHT_NO_SERVER=1 npm run test:e2e -w gogocash-admin

echo "[e2e] Customer Playwright (backend specs only; design-parity excluded)..."
MOBILE_PLAYWRIGHT_NO_SERVER=1 npm run test:e2e -w @gogocash/mobile -- --project=backend-desktop --project=backend-mobile

echo "[e2e] All test phases completed."
