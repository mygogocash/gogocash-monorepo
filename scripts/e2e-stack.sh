#!/usr/bin/env bash
# Start API + admin + customer app with E2E-aligned env (background PIDs in .e2e/pids).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_DIR="${ROOT}/.e2e"
mkdir -p "$PID_DIR"

export MONGO_URI="${MONGO_URI:-mongodb://localhost:27017/gogocash-e2e?replicaSet=rs0}"
export JWT_SECRET="${JWT_SECRET:-e2e-local-jwt-secret-change-me}"
export JWT_ADMIN_SECRET="${JWT_ADMIN_SECRET:-e2e-local-admin-jwt-secret-change-me}"
export STRIPE_BILLING_ENABLED="${STRIPE_BILLING_ENABLED:-false}"
export E2E_DISABLE_RATE_LIMIT="${E2E_DISABLE_RATE_LIMIT:-1}"

API_URL="${API_URL:-http://localhost:8080}"
ADMIN_URL="${ADMIN_URL:-http://localhost:3000}"
APP_URL="${APP_URL:-http://localhost:8081}"

stop_stack() {
  for f in api admin app; do
    if [ -f "${PID_DIR}/${f}.pid" ]; then
      pid=$(cat "${PID_DIR}/${f}.pid")
      if kill -0 "$pid" 2>/dev/null; then
        kill "$pid" 2>/dev/null || true
      fi
      rm -f "${PID_DIR}/${f}.pid"
    fi
  done
}

if [ "${1:-}" = "stop" ]; then
  stop_stack
  echo "[e2e:stack] stopped background services"
  exit 0
fi

stop_stack

echo "[e2e:stack] starting API on :8080..."
(
  cd "${ROOT}/apps/api"
  MONGO_URI="$MONGO_URI" JWT_SECRET="$JWT_SECRET" JWT_ADMIN_SECRET="$JWT_ADMIN_SECRET" \
    STRIPE_BILLING_ENABLED="$STRIPE_BILLING_ENABLED" E2E_DISABLE_RATE_LIMIT="$E2E_DISABLE_RATE_LIMIT" \
    npm run start:dev > "${PID_DIR}/api.log" 2>&1 &
  echo $! > "${PID_DIR}/api.pid"
)

echo "[e2e:stack] starting admin on :3000..."
(
  cd "${ROOT}/apps/admin"
  NEXT_PUBLIC_API_URL="$API_URL" NEXTAUTH_URL="$ADMIN_URL" \
    NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-e2e-local-nextauth-secret-change-me}" \
    NEXT_PUBLIC_APP_URL="$APP_URL" \
    npm run dev > "${PID_DIR}/admin.log" 2>&1 &
  echo $! > "${PID_DIR}/admin.pid"
)

echo "[e2e:stack] starting customer app on :8081..."
(
  cd "${ROOT}/apps/app"
  EXPO_PUBLIC_API_URL="$API_URL" EXPO_PUBLIC_ACCOUNT_DATA_SOURCE=backend \
    EXPO_PUBLIC_FRONTEND_URL="$APP_URL" EXPO_PUBLIC_APP_ENV=development \
    npx expo start --web --port 8081 --non-interactive > "${PID_DIR}/app.log" 2>&1 &
  echo $! > "${PID_DIR}/app.pid"
)

echo "[e2e:stack] logs: ${PID_DIR}/*.log — stop with: npm run e2e:stack:stop"
