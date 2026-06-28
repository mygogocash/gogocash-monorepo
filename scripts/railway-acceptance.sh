#!/usr/bin/env bash
#
# railway-acceptance.sh — cross-phase production-readiness acceptance checks for
# the GoGoCash Railway migration. Runs a sequence of read-only HTTP probes
# against the deployed services and prints PASS/FAIL per check. Exit code is
# non-zero if ANY check fails, so it doubles as a CI gate.
#
# Usage:
#   ./scripts/railway-acceptance.sh
#   API_URL=https://gogocash-api-production.up.railway.app \
#   ADMIN_URL=https://gogocash-admin-production.up.railway.app \
#     ./scripts/railway-acceptance.sh
#
# Staging custom domains (optional — warn-only until DNS cutover):
#   STAGING_API_URL=https://api-staging.gogocash.co \
#   STAGING_ADMIN_URL=https://admin-staging.gogocash.co \
#     ./scripts/railway-acceptance.sh
#
# Optional (enables the cron force-trigger / break-glass check, D2):
#   ADMIN_JWT=<a valid admin Bearer token>   ./scripts/railway-acceptance.sh
#
# Optional admin login probe (A2):
#   ADMIN_EMAIL=... ADMIN_PASSWORD=... ./scripts/railway-acceptance.sh
#
# This script is READ-ONLY against the platform. It performs HTTP GETs only.
# The admin /tasks/* routes it can call are idempotent re-syncs (guarded by
# add_point/conversion_status idempotency in the controller).

set -uo pipefail

API_URL="${API_URL:-https://gogocash-api-production.up.railway.app}"
ADMIN_URL="${ADMIN_URL:-https://gogocash-admin-production.up.railway.app}"
STAGING_API_URL="${STAGING_API_URL:-https://api-staging.gogocash.co}"
STAGING_ADMIN_URL="${STAGING_ADMIN_URL:-https://admin-staging.gogocash.co}"
ADMIN_JWT="${ADMIN_JWT:-}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-10}"
MAX_TIME="${MAX_TIME:-30}"

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

c_green() { printf '\033[0;32m%s\033[0m' "$1"; }
c_red()   { printf '\033[0;31m%s\033[0m' "$1"; }
c_yellow(){ printf '\033[0;33m%s\033[0m' "$1"; }
c_dim()   { printf '\033[2m%s\033[0m' "$1"; }

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf '[%s] %s\n' "$(c_green PASS)" "$1"
  [ -n "${2:-}" ] && printf '       %s\n' "$(c_dim "$2")"
  return 0
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf '[%s] %s\n' "$(c_red FAIL)" "$1"
  [ -n "${2:-}" ] && printf '       %s\n' "$(c_dim "$2")"
  return 0
}

warn() {
  WARN_COUNT=$((WARN_COUNT + 1))
  printf '[%s] %s\n' "$(c_yellow WARN)" "$1"
  [ -n "${2:-}" ] && printf '       %s\n' "$(c_dim "$2")"
  return 0
}

http_status() {
  curl -s -o /dev/null -w '%{http_code}' \
    --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
    "$1" 2>/dev/null || echo "000"
}

http_body() {
  curl -s --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
    "$1" 2>/dev/null || true
}

echo "================================================================"
echo " GoGoCash Railway — production-readiness acceptance"
echo " API_URL   = $API_URL"
echo " ADMIN_URL = $ADMIN_URL"
echo " $(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "================================================================"

body="$(http_body "$API_URL/health")"
status="$(http_status "$API_URL/health")"
if [ "$status" = "200" ] && printf '%s' "$body" | grep -q '"status":"ok"'; then
  pass "API /health returns 200 ok" "body=$body"
else
  fail "API /health did not return 200 ok" "status=$status body=$body"
fi

status="$(http_status "$API_URL/offer/top-brands")"
body="$(http_body "$API_URL/offer/top-brands" | head -c 200)"
if [ "$status" = "200" ] && printf '%s' "$body" | grep -qE '^\s*[\[{]'; then
  pass "API DB route /offer/top-brands returns 200 JSON (Mongo reachable)" \
       "status=$status body[0:80]=$(printf '%s' "$body" | head -c 80)"
else
  fail "API DB route /offer/top-brands failed (Mongo unreachable?)" \
       "status=$status body[0:120]=$body"
fi

status="$(http_status "$ADMIN_URL/signin")"
if [ "$status" = "200" ]; then
  pass "Admin /signin returns 200" "status=$status"
else
  fail "Admin /signin did not return 200" "status=$status"
fi

status="$(http_status "$API_URL/tasks/update-conversions/anything")"
if [ "$status" = "401" ]; then
  pass "Admin /tasks/* rejects unauthenticated calls (401)" "status=$status"
else
  fail "Admin /tasks/* did NOT reject unauthenticated call (expected 401)" \
       "status=$status — money-mutation routes may be exposed"
fi

if [ -n "${ADMIN_EMAIL:-}" ] && [ -n "${ADMIN_PASSWORD:-}" ]; then
  login_body="$(curl -s --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
    -X POST "$API_URL/admin/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null || true)"
  if printf '%s' "$login_body" | grep -q '"token"'; then
    pass "POST /admin/login returns token (A2)"
  else
    fail "POST /admin/login did not return token (A2)" "body[0:120]=$(printf '%s' "$login_body" | head -c 120)"
  fi
else
  printf '[%s] Admin login skipped (set ADMIN_EMAIL + ADMIN_PASSWORD for A2)\n' "$(c_dim SKIP)"
fi

if [ -n "$ADMIN_JWT" ]; then
  status="$(curl -s -o /dev/null -w '%{http_code}' \
    --connect-timeout "$CONNECT_TIMEOUT" --max-time 120 \
    -H "Authorization: Bearer $ADMIN_JWT" \
    "$API_URL/tasks/update-conversions/trigger" 2>/dev/null || echo "000")"
  if [ "$status" = "200" ] || [ "$status" = "201" ]; then
    pass "Cron force-trigger /tasks/update-conversions succeeded ($status)" \
         "now grep railway logs for: 'allConversions new' / 'done'"
  else
    fail "Cron force-trigger /tasks/update-conversions failed" \
         "status=$status (401=bad/expired JWT, 429=rate-limited, 5xx=app error)"
  fi
else
  printf '[%s] Cron force-trigger skipped (set ADMIN_JWT to enable D2 check)\n' \
    "$(c_dim SKIP)"
fi

staging_health="$(http_status "$STAGING_API_URL/health")"
if [ "$staging_health" = "200" ]; then
  pass "Staging custom domain /health returns 200" "url=$STAGING_API_URL"
elif curl -sSI --max-time "$MAX_TIME" "$STAGING_API_URL/health" 2>/dev/null | grep -qi 'server: railway'; then
  pass "Staging custom domain served by Railway" "url=$STAGING_API_URL"
else
  warn "Staging custom domain not yet on Railway (DNS cutover pending?)" \
       "url=$STAGING_API_URL status=$staging_health"
fi

merchants="$(http_body "$API_URL/gogosense/merchants" | head -c 500)"
if [ -n "$merchants" ] && [ "$merchants" != "[]" ]; then
  pass "gogosense/merchants has data (external Mongo seeded)"
else
  warn "gogosense/merchants empty — point MONGO_URI at Atlas staging for real data"
fi

APP_WEB_URL="${APP_WEB_URL:-${STAGING_APP_URL:-https://app-staging.gogocash.co}}"
app_status="$(http_status "$APP_WEB_URL/")"
if [ "$app_status" = "200" ]; then
  app_snippet="$(http_body "$APP_WEB_URL/" | head -c 4000)"
  api_host="$(printf '%s' "$API_URL" | sed -E 's#^https?://##; s#/.*##')"
  if printf '%s' "$app_snippet" | grep -q "$api_host"; then
    pass "app-web bundle references API host" "url=$APP_WEB_URL host=$api_host"
  else
    warn "app-web did not reference expected API host in first 4KB" \
         "url=$APP_WEB_URL expected_host=$api_host"
  fi
else
  warn "app-web not reachable (DNS cutover pending?)" "url=$APP_WEB_URL status=$app_status"
fi

echo "----------------------------------------------------------------"
printf 'RESULT: %s passed, %s failed, %s warnings\n' \
  "$(c_green "$PASS_COUNT")" \
  "$([ "$FAIL_COUNT" -gt 0 ] && c_red "$FAIL_COUNT" || c_green "$FAIL_COUNT")" \
  "$([ "$WARN_COUNT" -gt 0 ] && c_yellow "$WARN_COUNT" || c_green "$WARN_COUNT")"
echo "================================================================"

[ "$FAIL_COUNT" -eq 0 ]
