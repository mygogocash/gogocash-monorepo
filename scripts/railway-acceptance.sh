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
# Optional (enables the cron force-trigger / break-glass check, D2):
#   ADMIN_JWT=<a valid admin Bearer token>   ./scripts/railway-acceptance.sh
#
# This script is READ-ONLY against the platform. It performs HTTP GETs only.
# The admin /tasks/* routes it can call are idempotent re-syncs (guarded by
# add_point/conversion_status idempotency in the controller).

set -uo pipefail

# ─── Config (override via env) ───────────────────────────────────────────────
API_URL="${API_URL:-https://gogocash-api-production.up.railway.app}"
ADMIN_URL="${ADMIN_URL:-https://gogocash-admin-production.up.railway.app}"
ADMIN_JWT="${ADMIN_JWT:-}"
# curl timeouts: fail fast rather than hang a CI job.
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-10}"
MAX_TIME="${MAX_TIME:-30}"

PASS_COUNT=0
FAIL_COUNT=0

# ─── Helpers ─────────────────────────────────────────────────────────────────
c_green() { printf '\033[0;32m%s\033[0m' "$1"; }
c_red()   { printf '\033[0;31m%s\033[0m' "$1"; }
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

# http_status URL -> prints the numeric HTTP status (000 on connection failure)
http_status() {
  curl -s -o /dev/null -w '%{http_code}' \
    --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
    "$1" 2>/dev/null || echo "000"
}

# http_body URL -> prints the response body (empty on failure)
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

# ─── Check 1: API liveness (/health => 200 {"status":"ok"}) ──────────────────
# Phase: cross-phase. Proves the API container is up and serving.
body="$(http_body "$API_URL/health")"
status="$(http_status "$API_URL/health")"
if [ "$status" = "200" ] && printf '%s' "$body" | grep -q '"status":"ok"'; then
  pass "API /health returns 200 ok" "body=$body"
else
  fail "API /health did not return 200 ok" "status=$status body=$body"
fi

# ─── Check 2: API DB-backed route (offer/top-brands => 200, JSON) ────────────
# Phase 2/3. Public route that reads MongoDB (getDisplayTopBrands). A 200 with a
# JSON body proves the app connected to Mongo and a query succeeded — this is the
# real "DB route" check (the lazy Mongo connection has handshaked).
status="$(http_status "$API_URL/offer/top-brands")"
body="$(http_body "$API_URL/offer/top-brands" | head -c 200)"
if [ "$status" = "200" ] && printf '%s' "$body" | grep -qE '^\s*[\[{]'; then
  pass "API DB route /offer/top-brands returns 200 JSON (Mongo reachable)" \
       "status=$status body[0:80]=$(printf '%s' "$body" | head -c 80)"
else
  fail "API DB route /offer/top-brands failed (Mongo unreachable?)" \
       "status=$status body[0:120]=$body"
fi

# ─── Check 3: Admin app signin page (=> 200) ─────────────────────────────────
# Phase 2. Proves the Next.js standalone admin is serving (HOSTNAME=0.0.0.0 fix).
status="$(http_status "$ADMIN_URL/signin")"
if [ "$status" = "200" ]; then
  pass "Admin /signin returns 200" "status=$status"
else
  fail "Admin /signin did not return 200" "status=$status"
fi

# ─── Check 4: Admin auth fails CLOSED on /tasks/* without a token (=> 401) ───
# Phase 3 security. The cron break-glass routes are behind AuthAdminGuard. An
# unauthenticated call MUST be rejected (proves the public FIREBASE_API_KEY gate
# is gone and money mutation is not exposed).
status="$(http_status "$API_URL/tasks/update-conversions/anything")"
if [ "$status" = "401" ]; then
  pass "Admin /tasks/* rejects unauthenticated calls (401)" "status=$status"
else
  fail "Admin /tasks/* did NOT reject unauthenticated call (expected 401)" \
       "status=$status — money-mutation routes may be exposed"
fi

# ─── Check 5 (optional): cron force-trigger / break-glass (=> 200/201) ───────
# Phase 3 (D2). Only runs when ADMIN_JWT is provided. Force-fires the conversion
# sync cron via its admin HTTP route; a 2xx proves the cron code path executes on
# demand. Pair this with `railway logs` grep (see runbook) to confirm the log line.
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

# ─── Summary ─────────────────────────────────────────────────────────────────
echo "----------------------------------------------------------------"
printf 'RESULT: %s passed, %s failed\n' \
  "$(c_green "$PASS_COUNT")" "$([ "$FAIL_COUNT" -gt 0 ] && c_red "$FAIL_COUNT" || c_green "$FAIL_COUNT")"
echo "================================================================"

[ "$FAIL_COUNT" -eq 0 ]
