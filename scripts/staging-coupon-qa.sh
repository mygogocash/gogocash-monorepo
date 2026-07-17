#!/usr/bin/env bash
# Issue #339 coupon contract QA. Default: plan only, no file/network/DB writes.
# The database sentinel is provisioned separately; this script never creates it.

set -Eeuo pipefail

MODE="${MODE:-dry-run}"
QA_ENV="${QA_ENV:-dev}"
API_URL="${API_URL:-https://api.dev.gogocash.co}"
EVIDENCE_DIR="${EVIDENCE_DIR:-evidence/issue-339}"
CONFIRM_NONPROD_WRITE="${CONFIRM_NONPROD_WRITE:-}"
DEV_EVIDENCE_FILE="${DEV_EVIDENCE_FILE:-}"
QA_EVIDENCE_HMAC_KEY="${QA_EVIDENCE_HMAC_KEY:-}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-10}"
MAX_TIME="${MAX_TIME:-30}"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
MONGO_HELPER="$SCRIPT_DIR/staging-coupon-qa-mongo.cjs"
EVIDENCE_HELPER="$SCRIPT_DIR/staging-coupon-qa-evidence.cjs"
QA_SCRIPT_PATH="$SCRIPT_DIR/staging-coupon-qa.sh"

if [[ "$API_URL" == "https://api.gogocash.co" ]] ||
  [[ "$API_URL" == *"app.gogocash.co"* ]]; then
  printf '[FAIL] Production target is forbidden.\n' >&2
  exit 6
fi

case "$QA_ENV:$API_URL" in
  dev:https://api.dev.gogocash.co|staging:https://api-staging.gogocash.co) ;;
  *)
    printf '[FAIL] API_URL is not permitted for QA_ENV.\n' >&2
    exit 6
    ;;
esac

if [[ "$MODE" == "dry-run" ]]; then
  printf '[PLAN] Issue #339 coupon QA — NO NETWORK / NO WRITES\n'
  printf 'Target: %s (%s)\n' "$API_URL" "$QA_ENV"
  printf 'Apply requires confirmation, MONGO_URI, and a separately provisioned matching DB sentinel.\n'
  printf 'Apply also requires a secret QA_EVIDENCE_HMAC_KEY and an exact deployed Git revision match.\n'
  printf 'Staging additionally requires fresh signed DEV_EVIDENCE_FILE from the same revision.\n'
  exit 0
fi

if [[ "$MODE" != "apply" ]]; then
  printf '[FAIL] MODE must be dry-run or apply.\n' >&2
  exit 3
fi
if [[ "$CONFIRM_NONPROD_WRITE" != "issue-339" ]]; then
  printf '[FAIL] Apply requires CONFIRM_NONPROD_WRITE=issue-339.\n' >&2
  exit 3
fi
if [[ -z "${MONGO_URI:-}" ]]; then
  printf '[FAIL] Missing required variable: MONGO_URI.\n' >&2
  exit 2
fi
if [[ "$QA_ENV" == "staging" ]]; then
  if [[ -z "$DEV_EVIDENCE_FILE" ]] || [[ ! -f "$DEV_EVIDENCE_FILE" ]]; then
    printf '[FAIL] Staging requires DEV_EVIDENCE_FILE containing signed evidence from a passing dev run.\n' >&2
    exit 3
  fi
fi
if [[ ${#QA_EVIDENCE_HMAC_KEY} -lt 32 ]]; then
  printf '[FAIL] Apply requires QA_EVIDENCE_HMAC_KEY with at least 32 characters.\n' >&2
  exit 2
fi

REPO_ROOT="$(git -C "$SCRIPT_DIR/.." rev-parse --show-toplevel 2>/dev/null)" || {
  printf '[FAIL] QA script must run from a Git checkout.\n' >&2
  exit 4
}
EXPECTED_REVISION="$(git -C "$REPO_ROOT" rev-parse --verify HEAD 2>/dev/null)" || {
  printf '[FAIL] Unable to resolve the local Git revision.\n' >&2
  exit 4
}
if [[ ! "$EXPECTED_REVISION" =~ ^[0-9a-f]{40}$ ]]; then
  printf '[FAIL] Local Git revision is not a full SHA.\n' >&2
  exit 4
fi
for qa_artifact in "$QA_SCRIPT_PATH" "$MONGO_HELPER" "$EVIDENCE_HELPER"; do
  qa_relative="${qa_artifact#"$REPO_ROOT"/}"
  if ! git -C "$REPO_ROOT" ls-files --error-unmatch "$qa_relative" >/dev/null 2>&1 ||
    ! git -C "$REPO_ROOT" diff --quiet HEAD -- "$qa_relative"; then
    printf '[FAIL] QA artifacts must be tracked and identical to the expected revision.\n' >&2
    exit 4
  fi
done

export EXPECTED_REVISION QA_SCRIPT_PATH
export QA_MONGO_HELPER_PATH="$MONGO_HELPER"
export QA_EVIDENCE_HELPER_PATH="$EVIDENCE_HELPER"
export DEV_EVIDENCE_FILE QA_EVIDENCE_HMAC_KEY
if [[ "$QA_ENV" == "staging" ]]; then
  node "$EVIDENCE_HELPER" verify
fi

# Check the persisted environment identity before even creating local temp
# files. prepare and cleanup repeat this check immediately before DB writes.
export QA_ENV
node "$MONGO_HELPER" sentinel

RUN_ID="$(date -u '+%Y%m%dT%H%M%SZ')-$$"
QA_MARKER="QA #339 $QA_ENV $RUN_ID"
QA_STATE_FILE="$(mktemp "${TMPDIR:-/tmp}/gogocash-issue339-state.XXXXXX")"
QA_RESPONSE_FILE="$(mktemp "${TMPDIR:-/tmp}/gogocash-issue339-response.XXXXXX")"
QA_REVISION_RESPONSE_FILE="$(mktemp "${TMPDIR:-/tmp}/gogocash-issue339-revision.XXXXXX")"
QA_CLEANUP_RESULT_FILE="$(mktemp "${TMPDIR:-/tmp}/gogocash-issue339-cleanup.XXXXXX")"
chmod 600 "$QA_STATE_FILE" "$QA_RESPONSE_FILE" "$QA_REVISION_RESPONSE_FILE" "$QA_CLEANUP_RESULT_FILE"
export QA_MARKER QA_STATE_FILE QA_RESPONSE_FILE QA_REVISION_RESPONSE_FILE
export QA_CLEANUP_RESULT_FILE QA_RUN_ID="$RUN_ID"
PUBLIC_CONTRACT_VERIFIED=0

cleanup() {
  local original_status=$?
  local cleanup_status=0
  local evidence_status=0
  trap - EXIT
  set +e
  node "$MONGO_HELPER" cleanup >"$QA_CLEANUP_RESULT_FILE"
  cleanup_status=$?
  if [[ $cleanup_status -ne 0 ]]; then
    rm -f "$QA_STATE_FILE" "$QA_RESPONSE_FILE" "$QA_REVISION_RESPONSE_FILE" "$QA_CLEANUP_RESULT_FILE"
    exit 5
  fi
  if [[ $original_status -eq 0 ]]; then
    if [[ "$PUBLIC_CONTRACT_VERIFIED" != "1" ]]; then
      evidence_status=1
    elif [[ "$QA_ENV" == "dev" ]]; then
      mkdir -p "$EVIDENCE_DIR"
      export QA_EVIDENCE_OUTPUT_FILE="$EVIDENCE_DIR/dev-evidence.json"
      node "$EVIDENCE_HELPER" create
      evidence_status=$?
    fi
  fi
  rm -f "$QA_STATE_FILE" "$QA_RESPONSE_FILE" "$QA_REVISION_RESPONSE_FILE" "$QA_CLEANUP_RESULT_FILE"
  if [[ $evidence_status -ne 0 ]]; then
    exit 5
  fi
  if [[ $original_status -eq 0 ]]; then
    printf '[PASS] Fixture cleanup exact-ID final-absence check passed.\n'
  fi
  exit "$original_status"
}
trap cleanup EXIT

curl -fsS --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
  "$API_URL/offer/deployment-proof" >"$QA_REVISION_RESPONSE_FILE"
DEPLOYED_REVISION="$(node "$EVIDENCE_HELPER" revision)"
export DEPLOYED_REVISION

node "$MONGO_HELPER" prepare

OFFER_ID="$(node -e '
  const { readFileSync } = require("node:fs");
  const state = JSON.parse(readFileSync(process.env.QA_STATE_FILE, "utf8"));
  process.stdout.write(state.offerId);
')"
curl -fsS --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
  "$API_URL/offer/get-coupon-id/$OFFER_ID" >"$QA_RESPONSE_FILE"

node <<'NODE'
const { readFileSync } = require('node:fs');
const state = JSON.parse(readFileSync(process.env.QA_STATE_FILE, 'utf8'));
const rows = JSON.parse(readFileSync(process.env.QA_RESPONSE_FILE, 'utf8'));
if (!Array.isArray(rows)) throw new Error('public coupon response is not an array');
const byId = new Map(rows.map((row) => [String(row?._id), row]));
const visible = byId.get(state.couponIds[0]);
const linkOnly = byId.get(state.couponIds[1]);
if (!visible || visible.code_enabled !== true || !visible.code ||
    !visible.terms_and_conditions) {
  throw new Error('visible-code contract failed');
}
if (!linkOnly || linkOnly.code_enabled !== false || linkOnly.code !== '' ||
    linkOnly.destination_url !== state.destination ||
    !linkOnly.terms_and_conditions) {
  throw new Error('link-only destination/terms contract failed');
}
process.stdout.write('[PASS] public visible-code and link-only contracts\n');
NODE
PUBLIC_CONTRACT_VERIFIED=1

printf '[PASS] Issue #339 %s QA complete; cleanup will verify exact-ID absence.\n' "$QA_ENV"
