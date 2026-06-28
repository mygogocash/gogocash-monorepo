#!/usr/bin/env bash
# Wait for API health + public offer endpoint before browser tests.
set -euo pipefail

API_URL="${API_URL:-http://localhost:8080}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-5}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-90}"

http_status() {
  curl -s -o /dev/null -w '%{http_code}' \
    --connect-timeout "$CONNECT_TIMEOUT" --max-time "$CONNECT_TIMEOUT" \
    "$1" 2>/dev/null || echo "000"
}

echo "[e2e] waiting for API at ${API_URL}..."
for _ in $(seq 1 "$MAX_ATTEMPTS"); do
  ROOT=$(http_status "${API_URL}/")
  HEALTH=$(http_status "${API_URL}/health")
  if [ "$ROOT" = "200" ] && [ "$HEALTH" = "200" ]; then
    OFFERS=$(http_status "${API_URL}/offer/top-brands")
    if [ "$OFFERS" = "200" ]; then
      echo "[e2e] API ready (${API_URL})"
      exit 0
    fi
  fi
  sleep 2
done

echo "[e2e] ERROR: API not ready at ${API_URL}" >&2
exit 1
