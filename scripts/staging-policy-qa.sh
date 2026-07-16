#!/usr/bin/env bash
#
# staging-policy-qa.sh — controlled, reversible staging acceptance run for
# GitHub issues #336 and #337 (Policy Management).
#
# Proves, against the DEPLOYED staging API:
#   1. Creating a new policy without terms is rejected with the exact message
#      "Terms & conditions are required for a new policy."          (#336)
#   2. A {data:{...}}-wrapped payload is rejected by validation — the
#      original production bug shape.                                (#337)
#   3. A flat PUT /policy with terms creates the policy (GET round-trip).
#   4. One flat PUT /policy persists terms + banner text together.   (#337)
#   5. Cleanup: DELETE /policy/category/:id, final GET is null.
#
# The script only ever writes the policy document of ONE category that has
# no policy yet, and deletes it afterwards. It never creates categories
# (there is no category DELETE endpoint, so that would be irreversible)
# and refuses to touch a category that already has a policy.
#
# Usage:
#   ADMIN_EMAIL=... ADMIN_PASSWORD=... ./scripts/staging-policy-qa.sh
#   ADMIN_JWT=<admin bearer token>     ./scripts/staging-policy-qa.sh
#
# Options (env):
#   API_URL       target API (default https://api-staging.gogocash.co)
#   CATEGORY_ID   force a specific target category (must have NO policy)
#   DRY_RUN=1     login + pick target only; print planned writes; no writes
#   EVIDENCE_DIR  where to write evidence files (default evidence/staging)
#
# Evidence (real runs only; tokens redacted):
#   evidence/staging/T-023-issue-336-policy-terms-required.txt
#   evidence/staging/T-024-issue-337-policy-unified-save.txt
#   evidence/staging/T-025-policy-qa-cleanup.txt
#
# Exit codes:
#   0 all checks passed and cleanup verified
#   1 an assertion failed (cleanup verified)
#   2 login / credentials failure
#   3 guardrail refusal: target category already has a policy
#   4 no eligible category found (pass CATEGORY_ID of a known-safe one)
#   5 CLEANUP FAILURE — manual action required (banner printed)

set -uo pipefail

API_URL="${API_URL:-https://api-staging.gogocash.co}"
ADMIN_JWT="${ADMIN_JWT:-}"
CATEGORY_ID="${CATEGORY_ID:-}"
DRY_RUN="${DRY_RUN:-}"
EVIDENCE_DIR="${EVIDENCE_DIR:-evidence/staging}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-10}"
MAX_TIME="${MAX_TIME:-30}"

RUN_STAMP="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
QA_MARK="QA #336/#337 ${RUN_STAMP} — safe to delete"

EV_336="$EVIDENCE_DIR/T-023-issue-336-policy-terms-required.txt"
EV_337="$EVIDENCE_DIR/T-024-issue-337-policy-unified-save.txt"
EV_CLEAN="$EVIDENCE_DIR/T-025-policy-qa-cleanup.txt"

PASS_COUNT=0
FAIL_COUNT=0
POLICY_CREATED=0
CLEANUP_VERIFIED=0

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

# evidence <file> <label> <text> — append a labelled block to an evidence file.
evidence() {
  [ -n "$DRY_RUN" ] && return 0
  mkdir -p "$(dirname "$1")"
  {
    printf -- '--- %s (%s)\n' "$2" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    printf '%s\n\n' "$3"
  } >>"$1"
}

# json_get <json> <js-expression over parsed `j`> — prints result or empty.
json_get() {
  JSON_IN="$1" node -e '
    let j = null;
    try { j = JSON.parse(process.env.JSON_IN); } catch {}
    let out = "";
    try { out = (function (j) { return eval(process.argv[1]); })(j); } catch {}
    if (out === undefined || out === null) out = "";
    process.stdout.write(String(out));
  ' "$2" 2>/dev/null || true
}

# curl_api <method> <path> [json-body] — sets RESP_STATUS and RESP_BODY.
curl_api() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-s -w '\n%{http_code}' --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" -X "$method" "$API_URL$path")
  [ -n "$ADMIN_JWT" ] && args+=(-H "Authorization: Bearer $ADMIN_JWT")
  [ -n "$body" ] && args+=(-H 'Content-Type: application/json' -d "$body")
  local raw
  raw="$(curl "${args[@]}" 2>/dev/null)" || raw="
000"
  RESP_STATUS="${raw##*$'\n'}"
  RESP_BODY="${raw%$'\n'*}"
}

manual_cleanup_banner() {
  printf '\n'
  c_red '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'; printf '\n'
  c_red '!!  MANUAL CLEANUP REQUIRED — the QA policy may still exist   !!'; printf '\n'
  c_red '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'; printf '\n'
  printf 'Run (with an admin bearer token):\n'
  printf '  curl -X DELETE -H "Authorization: Bearer <ADMIN_JWT>" %s/policy/category/%s\n' "$API_URL" "$CATEGORY_ID"
  printf 'Then confirm GET %s/policy/category/%s returns null.\n\n' "$API_URL" "$CATEGORY_ID"
}

cleanup_policy() {
  [ "$POLICY_CREATED" = "1" ] || return 0
  [ "$CLEANUP_VERIFIED" = "1" ] && return 0
  curl_api DELETE "/policy/category/$CATEGORY_ID"
  evidence "$EV_CLEAN" "DELETE /policy/category/$CATEGORY_ID" "status=$RESP_STATUS body=$RESP_BODY"
  sleep 1
  curl_api GET "/policy/category/$CATEGORY_ID"
  evidence "$EV_CLEAN" "GET /policy/category/$CATEGORY_ID (final state)" "status=$RESP_STATUS body=${RESP_BODY:-<empty>}"
  if [ "$RESP_STATUS" = "200" ] && { [ -z "$RESP_BODY" ] || [ "$RESP_BODY" = "null" ]; }; then
    CLEANUP_VERIFIED=1
    return 0
  fi
  return 1
}

on_exit() {
  local code=$?
  if [ "$POLICY_CREATED" = "1" ] && [ "$CLEANUP_VERIFIED" != "1" ]; then
    if cleanup_policy; then
      printf '[%s] Late cleanup succeeded — staging restored.\n' "$(c_green PASS)"
    else
      manual_cleanup_banner
      exit 5
    fi
  fi
  exit "$code"
}
trap on_exit EXIT

echo "================================================================"
echo " GoGoCash staging policy QA — issues #336 / #337"
echo " API_URL = $API_URL"
echo " $RUN_STAMP  ${DRY_RUN:+(DRY RUN)}"
echo "================================================================"

# ---------------------------------------------------------------- 1. login
if [ -z "$ADMIN_JWT" ]; then
  if [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; then
    fail "No credentials: set ADMIN_EMAIL + ADMIN_PASSWORD, or ADMIN_JWT"
    exit 2
  fi
  login_body="$(curl -s --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
    -X POST "$API_URL/admin/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" 2>/dev/null || true)"
  ADMIN_JWT="$(json_get "$login_body" 'j && j.token')"
  if [ -z "$ADMIN_JWT" ]; then
    fail "POST /admin/login did not return a token" \
         "body[0:120]=$(printf '%s' "$login_body" | head -c 120)"
    exit 2
  fi
  pass "POST /admin/login returned a token (redacted)"
else
  pass "Using ADMIN_JWT from environment (redacted)"
fi
sleep 1

# ------------------------------------------------- 2. pick target category
curl_api GET "/offer/get-category/list"
categories_json="$RESP_BODY"
[ "$RESP_STATUS" = "200" ] || { fail "GET /offer/get-category/list failed" "status=$RESP_STATUS"; exit 4; }
sleep 1

curl_api GET "/policy/category-list"
policies_json="$RESP_BODY"
[ "$RESP_STATUS" = "200" ] || { fail "GET /policy/category-list failed" "status=$RESP_STATUS"; exit 4; }
sleep 1

if [ -z "$CATEGORY_ID" ]; then
  CATEGORY_ID="$(CATS="$categories_json" POLS="$policies_json" node -e '
    let cats = [], pols = [];
    try { cats = JSON.parse(process.env.CATS) || []; } catch {}
    try { pols = JSON.parse(process.env.POLS) || []; } catch {}
    const used = new Set(pols.map((p) => String(p.category_id)));
    const free = cats.find((c) => !used.has(String(c._id)));
    process.stdout.write(free ? String(free._id) : "");
  ' 2>/dev/null || true)"
fi
if [ -z "$CATEGORY_ID" ]; then
  fail "No category without a policy found — pass CATEGORY_ID of a known-safe category"
  exit 4
fi
category_name="$(CATS="$categories_json" CID="$CATEGORY_ID" node -e '
  let cats = [];
  try { cats = JSON.parse(process.env.CATS) || []; } catch {}
  const hit = cats.find((c) => String(c._id) === process.env.CID);
  process.stdout.write(hit ? String(hit.name) : "<unknown>");
' 2>/dev/null || true)"

# Guardrail: the target category must have NO policy (covers CATEGORY_ID overrides too).
curl_api GET "/policy/category/$CATEGORY_ID"
if [ "$RESP_STATUS" != "200" ] || { [ -n "$RESP_BODY" ] && [ "$RESP_BODY" != "null" ]; }; then
  fail "Guardrail: category $CATEGORY_ID ('$category_name') already has a policy (or GET failed) — refusing to touch it" \
       "status=$RESP_STATUS body[0:120]=$(printf '%s' "$RESP_BODY" | head -c 120)"
  exit 3
fi
pass "Target category: $CATEGORY_ID ('$category_name') — verified policy-less"
evidence "$EV_336" "Target category selection" "category_id=$CATEGORY_ID name=$category_name
GET /policy/category/$CATEGORY_ID -> status=$RESP_STATUS body=${RESP_BODY:-<empty>} (no existing policy)"
sleep 1

if [ -n "$DRY_RUN" ]; then
  echo
  echo "DRY RUN — no writes performed. A real run would:"
  echo "  1. PUT /policy  banner-only (no terms)      -> expect 400 required-terms message   (#336)"
  echo "  2. PUT /policy  {data:{...}} wrapper        -> expect 400 whitelist rejection      (#337)"
  echo "  3. PUT /policy  flat terms payload          -> expect 200 + GET round-trip         (#336)"
  echo "  4. PUT /policy  flat terms+banner payload   -> expect 200 + GET shows both blocks  (#337)"
  echo "  5. DELETE /policy/category/$CATEGORY_ID     -> expect {deleted:true}, final GET null"
  exit 0
fi

# --------------------------- 3. #336 negative: banner-only first write -> 400
REQUIRED_MSG='Terms & conditions are required for a new policy.'
payload="{\"category_id\":\"$CATEGORY_ID\",\"banner\":{\"primary_locale\":\"en\",\"translations\":{\"en\":\"$QA_MARK\"}}}"
curl_api PUT "/policy" "$payload"
evidence "$EV_336" "PUT /policy banner-only (no terms) — expect 400" "request=$payload
status=$RESP_STATUS body=$RESP_BODY"
msg="$(json_get "$RESP_BODY" 'j && j.message')"
if [ "$RESP_STATUS" = "400" ] && [ "$msg" = "$REQUIRED_MSG" ]; then
  pass "#336 empty-terms creation rejected with exact message" "\"$msg\""
else
  fail "#336 empty-terms creation NOT rejected as expected" "status=$RESP_STATUS body[0:200]=$(printf '%s' "$RESP_BODY" | head -c 200)"
fi
sleep 1

# ------------------------- 4. #337 regression: {data:{...}} wrapper -> 400
payload="{\"data\":{\"category_id\":\"$CATEGORY_ID\",\"terms\":{\"primary_locale\":\"en\",\"translations\":{\"en\":\"$QA_MARK\"}}}}"
curl_api PUT "/policy" "$payload"
evidence "$EV_336" "PUT /policy with {data:{...}} wrapper — expect 400 (original #337 bug shape)" "request=$payload
status=$RESP_STATUS body=$RESP_BODY"
if [ "$RESP_STATUS" = "400" ] && printf '%s' "$RESP_BODY" | grep -q 'property data should not exist'; then
  pass "#337 wrapped payload rejected by validation" "property data should not exist"
else
  fail "#337 wrapped payload NOT rejected as expected" "status=$RESP_STATUS body[0:200]=$(printf '%s' "$RESP_BODY" | head -c 200)"
fi
sleep 1

# ------------------------------- 5. #336 positive: flat terms create -> 200
payload="{\"category_id\":\"$CATEGORY_ID\",\"terms\":{\"primary_locale\":\"en\",\"translations\":{\"en\":\"Terms v1 — $QA_MARK\",\"th\":\"เงื่อนไข v1 — $QA_MARK\"}}}"
curl_api PUT "/policy" "$payload"
evidence "$EV_336" "PUT /policy flat terms payload — expect 200" "request=$payload
status=$RESP_STATUS body=$RESP_BODY"
if [ "$RESP_STATUS" = "200" ]; then
  POLICY_CREATED=1
  pass "#336 new policy created with non-empty terms"
else
  fail "#336 flat terms creation failed" "status=$RESP_STATUS body[0:200]=$(printf '%s' "$RESP_BODY" | head -c 200)"
fi
sleep 1

curl_api GET "/policy/category/$CATEGORY_ID"
evidence "$EV_336" "GET /policy/category/$CATEGORY_ID — terms round-trip" "status=$RESP_STATUS body=$RESP_BODY"
roundtrip="$(json_get "$RESP_BODY" 'j && j.terms && j.terms.translations && j.terms.translations.en')"
if [ "$RESP_STATUS" = "200" ] && printf '%s' "$roundtrip" | grep -q "Terms v1"; then
  pass "#336 terms persisted and read back" "terms.translations.en=\"$(printf '%s' "$roundtrip" | head -c 60)…\""
else
  fail "#336 terms did not round-trip" "status=$RESP_STATUS terms.en[0:80]=$(printf '%s' "$roundtrip" | head -c 80)"
fi
sleep 1

# ---------------- 6. #337 positive: one flat PUT with terms + banner text
payload="{\"category_id\":\"$CATEGORY_ID\",\"terms\":{\"primary_locale\":\"en\",\"translations\":{\"en\":\"Terms v2 — $QA_MARK\"}},\"banner\":{\"primary_locale\":\"en\",\"translations\":{\"en\":\"Banner v2 — $QA_MARK\"}}}"
curl_api PUT "/policy" "$payload"
evidence "$EV_337" "PUT /policy flat terms+banner (single save) — expect 200" "request=$payload
status=$RESP_STATUS body=$RESP_BODY"
if [ "$RESP_STATUS" = "200" ]; then
  pass "#337 single PUT with terms + banner text accepted"
else
  fail "#337 single PUT with terms + banner text failed" "status=$RESP_STATUS body[0:200]=$(printf '%s' "$RESP_BODY" | head -c 200)"
fi
sleep 1

curl_api GET "/policy/category/$CATEGORY_ID"
evidence "$EV_337" "GET /policy/category/$CATEGORY_ID — terms+banner round-trip" "status=$RESP_STATUS body=$RESP_BODY"
terms_rt="$(json_get "$RESP_BODY" 'j && j.terms && j.terms.translations && j.terms.translations.en')"
banner_rt="$(json_get "$RESP_BODY" 'j && j.banner && j.banner.translations && j.banner.translations.en')"
if printf '%s' "$terms_rt" | grep -q "Terms v2" && printf '%s' "$banner_rt" | grep -q "Banner v2"; then
  pass "#337 terms + banner text both persisted from one save"
else
  fail "#337 terms/banner round-trip mismatch" "terms.en[0:60]=$(printf '%s' "$terms_rt" | head -c 60) banner.en[0:60]=$(printf '%s' "$banner_rt" | head -c 60)"
fi
sleep 1

# --------------------------------------------------- 7 + 8. cleanup + verify
curl_api DELETE "/policy/category/$CATEGORY_ID"
evidence "$EV_CLEAN" "DELETE /policy/category/$CATEGORY_ID" "status=$RESP_STATUS body=$RESP_BODY"
deleted="$(json_get "$RESP_BODY" 'j && j.deleted')"
if [ "$RESP_STATUS" = "200" ] && [ "$deleted" = "true" ]; then
  pass "Cleanup: policy deleted"
else
  fail "Cleanup DELETE did not confirm deletion" "status=$RESP_STATUS body[0:120]=$(printf '%s' "$RESP_BODY" | head -c 120)"
fi
sleep 1

curl_api GET "/policy/category/$CATEGORY_ID"
evidence "$EV_CLEAN" "GET /policy/category/$CATEGORY_ID — final state" "status=$RESP_STATUS body=${RESP_BODY:-<empty>}"
if [ "$RESP_STATUS" = "200" ] && { [ -z "$RESP_BODY" ] || [ "$RESP_BODY" = "null" ]; }; then
  CLEANUP_VERIFIED=1
  pass "Final state: category has no policy — ALL CLEAN"
else
  fail "Final state check did not return null" "status=$RESP_STATUS body[0:120]=$(printf '%s' "$RESP_BODY" | head -c 120)"
fi

echo "================================================================"
echo " $PASS_COUNT passed, $FAIL_COUNT failed"
echo "================================================================"

if [ "$CLEANUP_VERIFIED" != "1" ]; then
  # on_exit will retry once more and escalate to exit 5 if still dirty.
  exit 1
fi
[ "$FAIL_COUNT" -eq 0 ] || exit 1
exit 0
