#!/usr/bin/env bash
# Wait for the admin and customer web servers before browser tests.
#
# e2e-wait-api.sh gates on the API only. Admin (Next dev) and the customer app
# (Expo/Metro) are started in the background by e2e-stack.sh and compile ON
# DEMAND, so the suite could reach them cold:
#
#   - admin/e2e/global-setup.ts goes straight to /signin; if the route is still
#     compiling the sign-in POST never resolves, no redirect happens, and
#     waitForURL fails after 60s.
#   - e2e-02-top-brands goes to the customer home; if Metro is still bundling,
#     the seeded brand is not painted inside the 30s expect.
#
# Both are timeouts against an un-warmed server, which is why they pass on a
# re-run with no code change. This warms each route so the gate is real: for the
# customer app that means pulling the JS bundle itself, since the HTML returns
# long before Metro has finished compiling it.
set -euo pipefail

ADMIN_URL="${ADMIN_URL:-http://localhost:3000}"
APP_URL="${APP_URL:-http://localhost:8081}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-10}"
# Metro's first bundle is slow on a cold CI runner; 180 * 2s = 6 minutes.
MAX_ATTEMPTS="${MAX_ATTEMPTS:-180}"

http_status() {
  curl -s -o /dev/null -w '%{http_code}' \
    --connect-timeout "$CONNECT_TIMEOUT" --max-time "$1" \
    "$2" 2>/dev/null || echo "000"
}

wait_for_route() {
  local label="$1" url="$2" max_time="$3"

  echo "[e2e] waiting for ${label} at ${url}..."
  for _ in $(seq 1 "$MAX_ATTEMPTS"); do
    if [ "$(http_status "$max_time" "$url")" = "200" ]; then
      echo "[e2e] ${label} ready"
      return 0
    fi
    sleep 2
  done

  echo "[e2e] ERROR: ${label} not ready at ${url}" >&2
  return 1
}

# Next dev compiles /signin on first request — that is the route global-setup uses.
wait_for_route "admin signin" "${ADMIN_URL}/signin" 30

wait_for_route "customer app" "${APP_URL}/" 30

# The HTML above is served before the bundle exists. Pull the bundle so Metro has
# actually finished compiling by the time Playwright opens the page.
echo "[e2e] warming the customer JS bundle..."
BUNDLE_PATH="$(curl -s --max-time 30 "${APP_URL}/" \
  | grep -oE '/_expo/static/js/web/[^"]+\.js' \
  | head -1 || true)"

if [ -n "$BUNDLE_PATH" ]; then
  if [ "$(http_status 600 "${APP_URL}${BUNDLE_PATH}")" = "200" ]; then
    echo "[e2e] customer bundle compiled"
  else
    echo "[e2e] ERROR: customer bundle failed to compile" >&2
    exit 1
  fi
else
  # Dev-server HTML shape changed; do not fail the gate on a missing warm-up.
  echo "[e2e] WARN: no bundle URL found in the app HTML; skipping warm-up" >&2
fi

echo "[e2e] web servers ready"
