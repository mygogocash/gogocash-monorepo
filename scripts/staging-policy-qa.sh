#!/usr/bin/env bash
#
# staging-policy-qa.sh — controlled, reversible staging acceptance run for
# GitHub issues #336 and #337 (Policy Management).
#
# Proves, against the DEPLOYED staging API:
#   1. Creating a new policy without terms is rejected with the exact message
#      "Terms & conditions are required for a new policy."          (#336)
#   2. A {data:{...}}-wrapped payload is rejected by API validation — the
#      original production bug shape.                                (#337)
#   3. A flat PUT /policy with terms creates the policy (GET round-trip).
#   4. One flat PUT /policy persists terms + banner text together.   (#337)
#   5. Cleanup: DELETE /policy/category/:id, final GET is null.
#
# Safety model:
#   - Only ever writes the policy document of ONE category that has no
#     policy yet; refuses a category that already has one.
#   - Never creates categories (no category DELETE endpoint exists, so that
#     would be irreversible).
#   - Every payload carries a "QA #336/#337 <timestamp>" marker; cleanup
#     refuses to DELETE a policy that does not carry the marker (protects a
#     concurrently authored real policy from being destroyed).
#   - Refuses production-looking API_URL values unless FORCE_API_URL=1.
#   - An EXIT trap runs the same cleanup on abort (Ctrl-C, dropped SSH).
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
#   FORCE_API_URL=1  allow a production-looking API_URL (writes!)
#
# Evidence (real runs only; truncated per run; tokens/passwords never written):
#   evidence/staging/policy-qa-336-terms-required.txt
#   evidence/staging/policy-qa-337-unified-save.txt
#   evidence/staging/policy-qa-cleanup.txt
#
# Exit codes:
#   0 all checks passed and cleanup verified
#   1 an assertion failed (cleanup verified)
#   2 setup failure: missing node, bad credentials, rejected/expired token
#   3 guardrail refusal: target category has a policy or cannot be verified
#   4 no eligible category found (pass CATEGORY_ID of a known-safe one)
#   5 CLEANUP FAILURE — manual action may be required (banner printed)
#   6 unsafe API_URL (production-looking; set FORCE_API_URL=1 to override)

set -uo pipefail

API_URL="${API_URL:-https://api-staging.gogocash.co}"
API_URL="${API_URL%/}"
ADMIN_JWT="${ADMIN_JWT:-}"
CATEGORY_ID="${CATEGORY_ID:-}"
DRY_RUN="${DRY_RUN:-}"
EVIDENCE_DIR="${EVIDENCE_DIR:-evidence/staging}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-10}"
MAX_TIME="${MAX_TIME:-30}"

RUN_STAMP="$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
QA_MARK="QA #336/#337 ${RUN_STAMP} — safe to delete"

EV_336="$EVIDENCE_DIR/policy-qa-336-terms-required.txt"
EV_337="$EVIDENCE_DIR/policy-qa-337-unified-save.txt"
EV_CLEAN="$EVIDENCE_DIR/policy-qa-cleanup.txt"

PASS_COUNT=0
FAIL_COUNT=0
POLICY_CREATED=0
CLEANUP_VERIFIED=0
AUTH_CFG=""

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
  {
    printf -- '--- %s (%s)\n' "$2" "$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
    printf '%s\n\n' "$3"
  } >>"$1"
}

# json_get <dot.path> — reads JSON on stdin, prints the value at the path
# (empty for missing/null/unparseable). No eval; body size unlimited (stdin).
json_get() {
  node -e '
    let d = "";
    process.stdin.on("data", (c) => (d += c));
    process.stdin.on("end", () => {
      let j = null;
      try { j = JSON.parse(d); } catch {}
      const v = process.argv[1]
        .split(".")
        .reduce((a, k) => (a && typeof a === "object" ? a[k] : undefined), j);
      process.stdout.write(v === undefined || v === null ? "" : String(v));
    });
  ' "$1" 2>/dev/null || true
}

# curl_api <method> <path> [json-body] — sets RESP_STATUS and RESP_BODY.
# The body goes via stdin (never argv); the bearer token via a curl config
# file (never argv) so neither shows up in `ps`.
curl_api() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-s -w '\n%{http_code}' --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" -X "$method" "$API_URL$path")
  [ -n "$AUTH_CFG" ] && args+=(--config "$AUTH_CFG")
  local raw
  if [ -n "$body" ]; then
    args+=(-H 'Content-Type: application/json' --data-binary @-)
    raw="$(printf '%s' "$body" | curl "${args[@]}" 2>/dev/null)" || raw=$'\n000'
  else
    raw="$(curl "${args[@]}" 2>/dev/null)" || raw=$'\n000'
  fi
  RESP_STATUS="${raw##*$'\n'}"
  RESP_BODY="${raw%$'\n'*}"
}

# get_with_retry <path> — curl_api GET with backoff on transient failures
# (429 from the 60/min public rate limit, 5xx edge blips, network drops).
get_with_retry() {
  local path="$1" attempt
  for attempt in 1 2 3; do
    curl_api GET "$path"
    case "$RESP_STATUS" in
      429|5[0-9][0-9]|000) [ "$attempt" -lt 3 ] && sleep $((attempt * 3)) ;;
      *) return 0 ;;
    esac
  done
  return 0
}

is_policyless_body() {
  [ -z "$RESP_BODY" ] || [ "$RESP_BODY" = "null" ]
}

manual_cleanup_banner() {
  printf '\n'
  c_red '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'; printf '\n'
  c_red '!!  MANUAL CLEANUP MAY BE REQUIRED — inspect the QA category  !!'; printf '\n'
  c_red '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'; printf '\n'
  printf 'Inspect:  GET %s/policy/category/%s\n' "$API_URL" "$CATEGORY_ID"
  printf 'If (and only if) the policy carries the marker "%s",\n' "$QA_MARK"
  printf 'delete it with an admin bearer token:\n'
  printf '  curl -X DELETE -H "Authorization: Bearer <ADMIN_JWT>" %s/policy/category/%s\n' "$API_URL" "$CATEGORY_ID"
  printf 'Then confirm the GET above returns null.\n\n'
}

# cleanup_policy <evidence-file> — single cleanup path used by both the main
# flow and the EXIT trap. Verifies the category ends policy-less.
# Returns 0 = verified clean; 1 = delete/verify failed; 2 = refused (a policy
# exists but does NOT carry our QA marker — do not destroy foreign content).
cleanup_policy() {
  local ev="$1"
  get_with_retry "/policy/category/$CATEGORY_ID"
  if [ "$RESP_STATUS" = "200" ] && is_policyless_body; then
    evidence "$ev" "GET /policy/category/$CATEGORY_ID (final state)" "status=$RESP_STATUS body=${RESP_BODY:-<empty>}"
    CLEANUP_VERIFIED=1
    return 0
  fi
  if [ "$RESP_STATUS" = "200" ] && ! printf '%s' "$RESP_BODY" | grep -qF 'QA #336/#337'; then
    evidence "$ev" "Cleanup REFUSED — policy exists without our QA marker" "status=$RESP_STATUS body[0:400]=$(printf '%s' "$RESP_BODY" | head -c 400)"
    return 2
  fi
  curl_api DELETE "/policy/category/$CATEGORY_ID"
  evidence "$ev" "DELETE /policy/category/$CATEGORY_ID" "status=$RESP_STATUS body=$RESP_BODY"
  local deleted
  deleted="$(printf '%s' "$RESP_BODY" | json_get deleted)"
  [ "$RESP_STATUS" = "200" ] && [ "$deleted" = "true" ] || return 1
  get_with_retry "/policy/category/$CATEGORY_ID"
  evidence "$ev" "GET /policy/category/$CATEGORY_ID (final state)" "status=$RESP_STATUS body=${RESP_BODY:-<empty>}"
  if [ "$RESP_STATUS" = "200" ] && is_policyless_body; then
    CLEANUP_VERIFIED=1
    return 0
  fi
  return 1
}

on_exit() {
  local code=$?
  [ -n "$AUTH_CFG" ] && rm -f "$AUTH_CFG"
  if [ "$POLICY_CREATED" = "1" ] && [ "$CLEANUP_VERIFIED" != "1" ]; then
    local rc=0
    cleanup_policy "$EV_CLEAN" || rc=$?
    if [ "$rc" -eq 0 ]; then
      printf '[%s] Late cleanup succeeded — staging restored.\n' "$(c_green PASS)"
    elif [ "$rc" -eq 2 ]; then
      printf '[%s] Cleanup refused: the policy on %s does not carry our QA marker — a real policy may have been authored concurrently. NOT deleting it.\n' "$(c_red WARN)" "$CATEGORY_ID"
      manual_cleanup_banner
      exit 5
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

# ------------------------------------------------------------ 0. preflight
if ! command -v node >/dev/null 2>&1; then
  fail "node is required on PATH (used for JSON parsing)"
  exit 2
fi
case "$API_URL" in
  *api.gogocash.co*|*production*)
    if [ "${FORCE_API_URL:-}" != "1" ]; then
      fail "API_URL looks like PRODUCTION ($API_URL) — this script performs writes. Set FORCE_API_URL=1 only if you really mean it."
      exit 6
    fi
    ;;
esac

# ---------------------------------------------------------------- 1. login
if [ -z "$ADMIN_JWT" ]; then
  if [ -z "${ADMIN_EMAIL:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; then
    fail "No credentials: set ADMIN_EMAIL + ADMIN_PASSWORD, or ADMIN_JWT"
    exit 2
  fi
  # Body built by node from env (correct JSON escaping) and piped to curl
  # (never in argv, so the password does not appear in `ps`).
  login_body="$(ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASSWORD="$ADMIN_PASSWORD" node -e '
    process.stdout.write(JSON.stringify({
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
    }));
  ')"
  curl_api POST "/admin/login" "$login_body"
  if [ "$RESP_STATUS" = "429" ]; then
    fail "POST /admin/login rate-limited (5/min per IP) — wait a minute and retry"
    exit 2
  fi
  ADMIN_JWT="$(printf '%s' "$RESP_BODY" | json_get token)"
  if [ -z "$ADMIN_JWT" ]; then
    fail "POST /admin/login did not return a token" \
         "status=$RESP_STATUS body[0:120]=$(printf '%s' "$RESP_BODY" | head -c 120)"
    exit 2
  fi
  pass "POST /admin/login returned a token (redacted)"
else
  pass "Using ADMIN_JWT from environment (redacted)"
fi

# Bearer token goes into a curl config file so it never appears in argv.
AUTH_CFG="$(mktemp)"
chmod 600 "$AUTH_CFG"
printf 'header = "Authorization: Bearer %s"\n' "$ADMIN_JWT" >"$AUTH_CFG"

# Auth probe: an empty body fails DTO validation (400) when the token is
# accepted, and 401s when it is not — validates ADMIN_JWT without writing.
curl_api PUT "/policy" '{}'
if [ "$RESP_STATUS" = "401" ]; then
  fail "Admin token rejected (401) — expired or wrong environment"
  exit 2
elif [ "$RESP_STATUS" = "400" ]; then
  pass "Admin token accepted (auth probe returned 400 validation, not 401)"
else
  fail "Unexpected auth-probe response" "status=$RESP_STATUS body[0:120]=$(printf '%s' "$RESP_BODY" | head -c 120)"
  exit 2
fi

# ------------------------------------------------- 2. pick target category
get_with_retry "/offer/get-category/list"
categories_json="$RESP_BODY"
[ "$RESP_STATUS" = "200" ] || { fail "GET /offer/get-category/list failed" "status=$RESP_STATUS"; exit 4; }

if [ -z "$CATEGORY_ID" ]; then
  get_with_retry "/policy/category-list"
  policies_json="$RESP_BODY"
  [ "$RESP_STATUS" = "200" ] || { fail "GET /policy/category-list failed" "status=$RESP_STATUS"; exit 4; }
  # Both lists go via stdin — env vars are capped at ~128 KiB per string and
  # real policy documents (50k chars/locale) can exceed that.
  picked="$(printf '{"cats":%s,"pols":%s}' "$categories_json" "$policies_json" | node -e '
    let d = "";
    process.stdin.on("data", (c) => (d += c));
    process.stdin.on("end", () => {
      let j = { cats: [], pols: [] };
      try { j = JSON.parse(d); } catch {}
      const used = new Set((j.pols || []).map((p) => String(p.category_id)));
      const free = (j.cats || []).find((c) => !used.has(String(c._id)));
      process.stdout.write(free ? String(free._id) + "\t" + String(free.name) : "");
    });
  ' 2>/dev/null || true)"
  CATEGORY_ID="${picked%%$'\t'*}"
  category_name="${picked#*$'\t'}"
  if [ -z "$CATEGORY_ID" ]; then
    fail "No category without a policy found — pass CATEGORY_ID of a known-safe category"
    exit 4
  fi
else
  category_name="$(printf '%s' "$categories_json" | CID="$CATEGORY_ID" node -e '
    let d = "";
    process.stdin.on("data", (c) => (d += c));
    process.stdin.on("end", () => {
      let cats = [];
      try { cats = JSON.parse(d) || []; } catch {}
      const hit = cats.find((c) => String(c._id) === process.env.CID);
      process.stdout.write(hit ? String(hit.name) : "");
    });
  ' 2>/dev/null || true)"
  if [ -z "$category_name" ]; then
    fail "CATEGORY_ID $CATEGORY_ID not found in /offer/get-category/list on $API_URL"
    exit 4
  fi
fi

# Guardrail (hard stop): the target category must have NO policy.
get_with_retry "/policy/category/$CATEGORY_ID"
if [ "$RESP_STATUS" != "200" ]; then
  fail "Guardrail: could not verify category $CATEGORY_ID is policy-less (GET status=$RESP_STATUS) — refusing to write"
  exit 3
fi
if ! is_policyless_body; then
  fail "Guardrail: category $CATEGORY_ID ('$category_name') already has a policy — refusing to touch it" \
       "body[0:120]=$(printf '%s' "$RESP_BODY" | head -c 120)"
  exit 3
fi
pass "Target category: $CATEGORY_ID ('$category_name') — verified policy-less"

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

# Evidence files are per-run: truncate with a header now, append below.
mkdir -p "$EVIDENCE_DIR"
for ev_file in "$EV_336" "$EV_337" "$EV_CLEAN"; do
  printf '# staging-policy-qa %s\n# API_URL=%s\n# category_id=%s (%s)\n\n' \
    "$RUN_STAMP" "$API_URL" "$CATEGORY_ID" "$category_name" >"$ev_file"
done

# From the first write attempt on, assume a policy may exist on the target
# category (even if the API responds unexpectedly or the response is lost),
# so the EXIT trap always verifies/cleans.
POLICY_CREATED=1

# --------------------------- 3. #336 negative: banner-only first write -> 400
REQUIRED_MSG='Terms & conditions are required for a new policy.'
payload="{\"category_id\":\"$CATEGORY_ID\",\"banner\":{\"primary_locale\":\"en\",\"translations\":{\"en\":\"$QA_MARK\"}}}"
curl_api PUT "/policy" "$payload"
evidence "$EV_336" "PUT /policy banner-only (no terms) — expect 400" "request=$payload
status=$RESP_STATUS body=$RESP_BODY"
msg="$(printf '%s' "$RESP_BODY" | json_get message)"
if [ "$RESP_STATUS" = "400" ] && [ "$msg" = "$REQUIRED_MSG" ]; then
  pass "#336 empty-terms creation rejected with exact message" "\"$msg\""
else
  fail "#336 empty-terms creation NOT rejected as expected" "status=$RESP_STATUS body[0:200]=$(printf '%s' "$RESP_BODY" | head -c 200)"
fi

# ------------------------- 4. #337 regression: {data:{...}} wrapper -> 400
payload="{\"data\":{\"category_id\":\"$CATEGORY_ID\",\"terms\":{\"primary_locale\":\"en\",\"translations\":{\"en\":\"$QA_MARK\"}}}}"
curl_api PUT "/policy" "$payload"
evidence "$EV_337" "PUT /policy with {data:{...}} wrapper — expect 400 (original #337 bug shape)" "request=$payload
status=$RESP_STATUS body=$RESP_BODY"
if [ "$RESP_STATUS" = "400" ] && printf '%s' "$RESP_BODY" | grep -q 'property data should not exist'; then
  pass "#337 wrapped payload rejected by validation" "property data should not exist"
else
  fail "#337 wrapped payload NOT rejected as expected" "status=$RESP_STATUS body[0:200]=$(printf '%s' "$RESP_BODY" | head -c 200)"
fi

# ------------------------------- 5. #336 positive: flat terms create -> 200
payload="{\"category_id\":\"$CATEGORY_ID\",\"terms\":{\"primary_locale\":\"en\",\"translations\":{\"en\":\"Terms v1 — $QA_MARK\",\"th\":\"เงื่อนไข v1 — $QA_MARK\"}}}"
curl_api PUT "/policy" "$payload"
evidence "$EV_336" "PUT /policy flat terms payload — expect 200" "request=$payload
status=$RESP_STATUS body=$RESP_BODY"
if [ "$RESP_STATUS" = "200" ]; then
  pass "#336 new policy created with non-empty terms"
else
  fail "#336 flat terms creation failed" "status=$RESP_STATUS body[0:200]=$(printf '%s' "$RESP_BODY" | head -c 200)"
fi

get_with_retry "/policy/category/$CATEGORY_ID"
evidence "$EV_336" "GET /policy/category/$CATEGORY_ID — terms round-trip" "status=$RESP_STATUS body=$RESP_BODY"
roundtrip="$(printf '%s' "$RESP_BODY" | json_get terms.translations.en)"
if [ "$RESP_STATUS" = "200" ] && printf '%s' "$roundtrip" | grep -q "Terms v1"; then
  pass "#336 terms persisted and read back" "terms.translations.en=\"$(printf '%s' "$roundtrip" | head -c 60)…\""
else
  fail "#336 terms did not round-trip" "status=$RESP_STATUS terms.en[0:80]=$(printf '%s' "$roundtrip" | head -c 80)"
fi

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

get_with_retry "/policy/category/$CATEGORY_ID"
evidence "$EV_337" "GET /policy/category/$CATEGORY_ID — terms+banner round-trip" "status=$RESP_STATUS body=$RESP_BODY"
terms_rt="$(printf '%s' "$RESP_BODY" | json_get terms.translations.en)"
banner_rt="$(printf '%s' "$RESP_BODY" | json_get banner.translations.en)"
if printf '%s' "$terms_rt" | grep -q "Terms v2" && printf '%s' "$banner_rt" | grep -q "Banner v2"; then
  pass "#337 terms + banner text both persisted from one save"
else
  fail "#337 terms/banner round-trip mismatch" "terms.en[0:60]=$(printf '%s' "$terms_rt" | head -c 60) banner.en[0:60]=$(printf '%s' "$banner_rt" | head -c 60)"
fi

# --------------------------------------------------- 7 + 8. cleanup + verify
cleanup_rc=0
cleanup_policy "$EV_CLEAN" || cleanup_rc=$?
if [ "$cleanup_rc" -eq 0 ]; then
  pass "Cleanup: policy deleted; final state policy-less — ALL CLEAN"
elif [ "$cleanup_rc" -eq 2 ]; then
  fail "Cleanup refused: policy on $CATEGORY_ID lacks our QA marker — possibly authored concurrently; NOT deleting it"
else
  fail "Cleanup did not verify clean state"
fi

echo "================================================================"
echo " $PASS_COUNT passed, $FAIL_COUNT failed"
echo "================================================================"

if [ "$CLEANUP_VERIFIED" != "1" ]; then
  # on_exit retries cleanup once more and escalates to exit 5 if still dirty.
  exit 1
fi
[ "$FAIL_COUNT" -eq 0 ] || exit 1
exit 0
