#!/usr/bin/env bash
# Read-only Railway staging acceptance checks.
# Usage:
#   ./scripts/railway-acceptance.sh
#   ADMIN_JWT=<token> ./scripts/railway-acceptance.sh   # adds cron break-glass check
set -euo pipefail

API_URL="${API_URL:-https://api-staging.gogocash.co}"
ADMIN_URL="${ADMIN_URL:-https://admin-staging.gogocash.co}"
# Fallback when custom DNS still points at GCP/Firebase:
RAILWAY_API_URL="${RAILWAY_API_URL:-https://gogocash-api-production.up.railway.app}"
RAILWAY_ADMIN_URL="${RAILWAY_ADMIN_URL:-https://gogocash-admin-production.up.railway.app}"

pass=0
fail=0
warn=0

check() {
  local id="$1"
  local desc="$2"
  shift 2
  if "$@"; then
    echo "PASS  $id — $desc"
    pass=$((pass + 1))
  else
    echo "FAIL  $id — $desc"
    fail=$((fail + 1))
  fi
}

warn_check() {
  local id="$1"
  local desc="$2"
  shift 2
  if "$@"; then
    echo "PASS  $id — $desc"
    pass=$((pass + 1))
  else
    echo "WARN  $id — $desc"
    warn=$((warn + 1))
  fi
}

http_code() {
  curl -sS -o /dev/null -w '%{http_code}' --max-time 25 "$1"
}

echo "=== Railway acceptance ==="
echo "API (custom):  $API_URL"
echo "API (railway): $RAILWAY_API_URL"
echo "Admin:         $ADMIN_URL"
echo ""

# A1 — API health (custom domain)
check A1 "API health on custom domain returns 200" \
  test "$(http_code "$API_URL/health")" = "200"

# A1b — API health (railway.app fallback)
warn_check A1b "API health on railway.app returns 200" \
  test "$(http_code "$RAILWAY_API_URL/health")" = "200"

# A2 — DB-backed route returns non-empty JSON array (merchants)
merchants="$(curl -sS --max-time 25 "$RAILWAY_API_URL/gogosense/merchants" 2>/dev/null || true)"
check A2 "gogosense/merchants is non-empty (real Mongo)" \
  bash -c 'test "${#1}" -gt 2 && test "$1" != "[]"' _ "$merchants"

# B1 — Admin sign-in page loads (custom domain or railway.app)
admin_signin_code="$(http_code "$ADMIN_URL/signin" || echo 000)"
if [[ "$admin_signin_code" != "200" ]]; then
  admin_signin_code="$(http_code "$RAILWAY_ADMIN_URL/signin" || echo 000)"
fi
check B1 "admin /signin returns 200" test "$admin_signin_code" = "200"

# B2 — Admin login API (optional — needs credentials)
if [[ -n "${ADMIN_EMAIL:-}" && -n "${ADMIN_PASSWORD:-}" ]]; then
  login_body="$(curl -sS --max-time 25 -X POST "$RAILWAY_API_URL/admin/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" || true)"
  check B2 "POST /admin/login returns token" \
    echo "$login_body" | grep -q '"token"'
else
  echo "SKIP  B2 — set ADMIN_EMAIL + ADMIN_PASSWORD to test login"
fi

# C1 — Cron break-glass (admin JWT)
if [[ -n "${ADMIN_JWT:-}" ]]; then
  cron_code="$(http_code -H "Authorization: Bearer $ADMIN_JWT" \
    "$RAILWAY_API_URL/tasks/update-offers/dummy" || true)"
  warn_check C1 "tasks route reachable with admin JWT (not 401)" \
    test "$cron_code" != "401"
else
  echo "SKIP  C1 — set ADMIN_JWT to test cron break-glass route auth"
fi

# D1 — TLS on custom API (when DNS cut over)
tls_ok=false
if curl -sSI --max-time 25 "$API_URL/health" 2>/dev/null | grep -qi 'server: railway'; then
  tls_ok=true
fi
warn_check D1 "api-staging.gogocash.co served by Railway (DNS cutover)" "$tls_ok"

echo ""
echo "Summary: $pass passed, $fail failed, $warn warnings"
if (( fail > 0 )); then
  exit 1
fi
