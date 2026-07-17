#!/usr/bin/env bash
#
# Controlled nonproduction acceptance for GitHub issue #34.
#
# Default behavior is a no-network dry run. A live run requires MODE=apply,
# an exact confirmation string, dedicated QA credentials, and an existing
# coupon whose name begins with "QA #34". The script proves:
#   - bank account numbers retain leading zeroes through create/read/update;
#   - the exact legacy string "false" reaches the coupon boundary as false;
#   - a signed nonproduction JWT with an invalid userId receives an actionable
#     400, while raw before/after Mongo counts prove no deeplink row was added.
#
# Safety model:
#   - production hosts are always refused; there is no force override;
#   - the bank fixture is synthetic and marker-owned, and an EXIT trap deletes
#     it only after confirming the exact marker;
#   - the coupon must already be marker-owned; its allow-listed fields are
#     snapshotted and restored by the EXIT trap (the API has no coupon delete);
#   - bearer tokens are stored in mode-600 curl config files, never argv/logs;
#   - MONGO_URI is consumed only from process env by a raw read-only count;
#   - the malformed JWT is decoded locally and refused unless userId is present
#     and is not a valid ObjectId, guaranteeing the request cannot write.
#
# Plan only (default; no network):
#   ./scripts/staging-money-contract-qa.sh
#
# Live nonproduction run:
#   MODE=apply CONFIRM_NONPROD_WRITE=issue-34 \
#   MONGO_URI=... CUSTOMER_JWT=... ADMIN_JWT=... INVALID_SUB_CUSTOMER_JWT=... \
#   QA_COUPON_ID=... ./scripts/staging-money-contract-qa.sh
# Run this inside an authorized Railway shell when MONGO_URI uses an internal
# Railway hostname. The URI value is never printed, logged, or put in argv.
#
# Optional:
#   API_URL=https://api.dev.gogocash.co      # default: staging
#   EVIDENCE_DIR=evidence/issue-34
#
# Exit codes: 0 pass, 2 missing prerequisites, 3 guard refusal,
#             5 cleanup failure, 6 unsafe/production URL.

set -Eeuo pipefail

API_URL="${API_URL:-https://api-staging.gogocash.co}"
MODE="${MODE:-dry-run}"
EVIDENCE_DIR="${EVIDENCE_DIR:-evidence/issue-34}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-10}"
MAX_TIME="${MAX_TIME:-30}"

RUN_ID="$(date -u '+%Y%m%dT%H%M%SZ')-$$"
FIXTURE_MARKER="QA #34 ${RUN_ID}"
STAMP="$(date -u '+%s')"
STAMP_SUFFIX="${STAMP: -8}"
printf -v PID_SUFFIX '%04d' "$(( $$ % 10000 ))"
ACCOUNT_NO_CREATE="00${STAMP_SUFFIX}${PID_SUFFIX}"
ACCOUNT_NO_UPDATE="000${STAMP_SUFFIX}${PID_SUFFIX}"
DEEPLINK_OFFER_ID="9${STAMP_SUFFIX}${PID_SUFFIX}"
DEEPLINK_MERCHANT_ID="8${STAMP_SUFFIX}${PID_SUFFIX}"
# DTO-required but deliberately not URL-shaped. createAffiliate validates the
# JWT-derived user id before reading this field, any model, or the Involve API.
DEEPLINK_INPUT_MARKER="${FIXTURE_MARKER} inert deeplink"

CUSTOMER_AUTH_CFG=""
ADMIN_AUTH_CFG=""
INVALID_AUTH_CFG=""
COUPON_SNAPSHOT=""
ACCOUNT_METHOD_ID=""
ACCOUNT_MAY_EXIST=0
COUPON_TOUCHED=0
CLEANUP_FAILED=0
RESP_STATUS=""
RESP_BODY=""
EVIDENCE_FILE=""
DEEPLINK_COUNT_BEFORE=""
DEEPLINK_COUNT_AFTER=""

fail() {
  printf '[FAIL] %s\n' "$1" >&2
}

pass() {
  printf '[PASS] %s\n' "$1"
}

json_get() {
  node -e '
    let raw = "";
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => {
      try {
        const value = process.argv[1].split(".").reduce(
          (current, key) => current == null ? undefined : current[key],
          JSON.parse(raw),
        );
        process.stdout.write(value == null ? "" : String(value));
      } catch {}
    });
  ' "$1"
}

make_auth_config() {
  local token="$1" file
  file="$(mktemp "${TMPDIR:-/tmp}/gogocash-issue34-auth.XXXXXX")"
  chmod 600 "$file"
  printf 'header = "Authorization: Bearer %s"\n' "$token" >"$file"
  printf '%s' "$file"
}

curl_api() {
  local auth_cfg="$1" method="$2" path="$3" body="${4:-}"
  local args=(
    -sS
    -w $'\n%{http_code}'
    --connect-timeout "$CONNECT_TIMEOUT"
    --max-time "$MAX_TIME"
    --config "$auth_cfg"
    -X "$method"
    "$API_URL$path"
  )
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

find_account_fixture() {
  curl_api "$CUSTOMER_AUTH_CFG" GET '/withdraw/methods-list'
  [ "$RESP_STATUS" = "200" ] || return 1
  printf '%s' "$RESP_BODY" | FIXTURE_MARKER="$FIXTURE_MARKER" node -e '
    let raw = "";
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => {
      try {
        const rows = JSON.parse(raw);
        const match = Array.isArray(rows)
          ? rows.find((row) => row?.account_name === process.env.FIXTURE_MARKER)
          : undefined;
        if (match) process.stdout.write(JSON.stringify(match));
      } catch {}
    });
  '
}

fetch_coupon_fixture() {
  curl_api "$ADMIN_AUTH_CFG" GET \
    '/offer/get-coupon?page=1&limit=200&search=QA%20%2334'
  [ "$RESP_STATUS" = "200" ] || return 1
  printf '%s' "$RESP_BODY" | QA_COUPON_ID="$QA_COUPON_ID" node -e '
    let raw = "";
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => {
      try {
        const payload = JSON.parse(raw);
        const match = Array.isArray(payload?.data)
          ? payload.data.find((row) => String(row?._id) === process.env.QA_COUPON_ID)
          : undefined;
        if (match) process.stdout.write(JSON.stringify(match));
      } catch {}
    });
  '
}

count_deeplink_marker() {
  DEEPLINK_OFFER_ID="$DEEPLINK_OFFER_ID" \
    DEEPLINK_MERCHANT_ID="$DEEPLINK_MERCHANT_ID" \
    MONGO_COUNT_TIMEOUT_MS="$((MAX_TIME * 1000))" \
    node -e '
      const { MongoClient } = require("mongodb");

      const client = new MongoClient(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: Number(process.env.MONGO_COUNT_TIMEOUT_MS),
      });
      const filter = {
        offer_id: Number(process.env.DEEPLINK_OFFER_ID),
        merchant_id: Number(process.env.DEEPLINK_MERCHANT_ID),
      };

      (async () => {
        try {
          await client.connect();
          const count = await client.db().collection("deeplinks").countDocuments(filter);
          process.stdout.write(String(count));
        } catch {
          process.stderr.write("Raw deeplink count query failed.\n");
          process.exitCode = 1;
        } finally {
          await client.close().catch(() => undefined);
        }
      })();
    '
}

coupon_restore_preflight() {
  node -e '
    let raw = "";
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => {
      const reject = (reasons) => {
        process.stderr.write(`canonical coupon rejected: ${[...new Set(reasons)].join(",")}\n`);
        process.exit(1);
      };

      let coupon;
      try {
        coupon = JSON.parse(raw);
      } catch {
        reject(["invalid_json"]);
        return;
      }
      if (!coupon || typeof coupon !== "object" || Array.isArray(coupon)) {
        reject(["invalid_document"]);
        return;
      }

      const fields = [
        "offer_id", "discount", "quantity", "disabled", "name", "code",
        "code_enabled", "description", "start_date", "end_date", "start_time",
        "end_time", "eligibility", "min_spend", "min_spend_currency", "max_cap",
        "max_cap_enabled", "max_cap_currency", "discount_type",
        "discount_currency", "one_time_use_enabled", "usage_per_user",
        "unlimited_amount_enabled", "link", "terms_and_conditions",
      ];
      const stringFields = [
        "name", "code", "description", "start_date", "end_date", "start_time",
        "end_time", "eligibility", "min_spend", "min_spend_currency",
        "max_cap_currency", "discount_type", "discount_currency", "link",
        "terms_and_conditions",
      ];
      const booleanFields = [
        "disabled", "code_enabled", "max_cap_enabled", "one_time_use_enabled",
        "unlimited_amount_enabled",
      ];
      const numberFields = ["discount", "quantity", "max_cap", "usage_per_user"];
      const reasons = [];
      const owns = (field) => Object.prototype.hasOwnProperty.call(coupon, field);

      for (const field of ["_id", ...fields]) {
        if (!owns(field)) reasons.push(`missing:${field}`);
      }
      for (const field of stringFields) {
        if (owns(field) && typeof coupon[field] !== "string") reasons.push(`type:${field}`);
      }
      for (const field of booleanFields) {
        if (owns(field) && typeof coupon[field] !== "boolean") reasons.push(`type:${field}`);
      }
      for (const field of numberFields) {
        if (owns(field) && (typeof coupon[field] !== "number" || !Number.isFinite(coupon[field]))) {
          reasons.push(`type:${field}`);
        }
      }

      const objectId = (value) => String(value?._id ?? value ?? "");
      const idPattern = /^[0-9a-fA-F]{24}$/;
      const offerId = objectId(coupon.offer_id);
      if (!idPattern.test(String(coupon._id ?? ""))) reasons.push("value:_id");
      if (!idPattern.test(offerId)) reasons.push("value:offer_id");
      if (typeof coupon.name === "string" && !coupon.name.startsWith("QA #34")) {
        reasons.push("value:name_marker");
      }
      if (coupon.name === "" || coupon.start_date === "" || coupon.end_date === "") {
        reasons.push("value:required_string");
      }
      if (
        (typeof coupon.start_time === "string" &&
          (coupon.start_time.length > 8 || coupon.start_time !== coupon.start_time.trim())) ||
        (typeof coupon.end_time === "string" &&
          (coupon.end_time.length > 8 || coupon.end_time !== coupon.end_time.trim()))
      ) {
        reasons.push("normalization:time");
      }
      if (
        typeof coupon.terms_and_conditions === "string" &&
        (coupon.terms_and_conditions.length > 50000 ||
          coupon.terms_and_conditions !== coupon.terms_and_conditions.trim())
      ) {
        reasons.push("normalization:terms_and_conditions");
      }
      for (const field of [
        "min_spend_currency", "max_cap_currency", "discount_currency",
      ]) {
        if (typeof coupon[field] === "string" && coupon[field].length > 12) {
          reasons.push(`value:${field}`);
        }
      }
      if (!(["percent", "cash"]).includes(coupon.discount_type)) {
        reasons.push("value:discount_type");
      }
      if (!(Number.isInteger(coupon.usage_per_user) && coupon.usage_per_user >= 1)) {
        reasons.push("value:usage_per_user");
      }
      if (!(typeof coupon.max_cap === "number" && coupon.max_cap >= 0)) {
        reasons.push("value:max_cap");
      }
      if (coupon.code_enabled === false && coupon.code !== "") {
        reasons.push("normalization:code");
      }
      if (coupon.max_cap_enabled === false && coupon.max_cap !== 0) {
        reasons.push("normalization:max_cap");
      }
      if (coupon.one_time_use_enabled === true && coupon.usage_per_user !== 1) {
        reasons.push("normalization:usage_per_user");
      }

      if (reasons.length > 0) {
        reject(reasons);
        return;
      }

      const simulatedPatch = {
        offer_id: offerId,
        discount: coupon.discount ? Number(coupon.discount) : 0,
        quantity: coupon.quantity ? Number(coupon.quantity) : 0,
        disabled: coupon.disabled,
        name: coupon.name,
        code: coupon.code_enabled ? coupon.code : "",
        code_enabled: coupon.code_enabled,
        description: coupon.description,
        start_date: coupon.start_date,
        end_date: coupon.end_date,
        start_time: coupon.start_time.trim(),
        end_time: coupon.end_time.trim(),
        eligibility: coupon.eligibility,
        min_spend: coupon.min_spend,
        min_spend_currency: coupon.min_spend_currency,
        max_cap: coupon.max_cap_enabled ? coupon.max_cap : 0,
        max_cap_enabled: coupon.max_cap_enabled,
        max_cap_currency: coupon.max_cap_currency,
        discount_type: coupon.discount_type === "cash" ? "cash" : "percent",
        discount_currency: coupon.discount_currency,
        one_time_use_enabled: coupon.one_time_use_enabled,
        usage_per_user: coupon.one_time_use_enabled ? 1 : coupon.usage_per_user,
        unlimited_amount_enabled: coupon.unlimited_amount_enabled,
        link: coupon.link,
        terms_and_conditions: coupon.terms_and_conditions.trim(),
      };
      const current = Object.fromEntries(fields.map((field) => [
        field,
        field === "offer_id" ? offerId : coupon[field],
      ]));
      const restored = Object.fromEntries(fields.map((field) => [field, simulatedPatch[field]]));
      if (JSON.stringify(current) !== JSON.stringify(restored)) {
        reject(["round_trip_mismatch"]);
        return;
      }
    });
  '
}

coupon_payload() {
  local disabled_mode="$1"
  DISABLED_MODE="$disabled_mode" node -e '
    const fs = require("node:fs");
    const coupon = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const fields = [
      "name", "description", "code", "code_enabled", "start_date",
      "end_date", "start_time", "end_time", "eligibility", "min_spend",
      "min_spend_currency", "max_cap", "max_cap_enabled", "max_cap_currency",
      "discount", "discount_type", "discount_currency", "quantity",
      "unlimited_amount_enabled", "one_time_use_enabled", "usage_per_user",
      "link", "terms_and_conditions",
    ];
    const payload = { id: String(coupon._id) };
    for (const field of fields) {
      payload[field] = coupon[field];
    }
    payload.offer_id = String(coupon.offer_id?._id ?? coupon.offer_id);
    if (process.env.DISABLED_MODE === "true") payload.disabled = true;
    else if (process.env.DISABLED_MODE === "false-string") payload.disabled = "false";
    else payload.disabled = coupon.disabled === true;
    process.stdout.write(JSON.stringify(payload));
  ' "$COUPON_SNAPSHOT"
}

coupon_matches_snapshot() {
  local current="$1"
  printf '%s' "$current" | node -e '
    const fs = require("node:fs");
    let raw = "";
    process.stdin.on("data", (chunk) => (raw += chunk));
    process.stdin.on("end", () => {
      try {
        const expected = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
        const actual = JSON.parse(raw);
        const fields = [
          "offer_id", "name", "description", "code", "code_enabled", "start_date",
          "end_date", "start_time", "end_time", "eligibility", "min_spend",
          "min_spend_currency", "max_cap", "max_cap_enabled", "max_cap_currency",
          "discount", "discount_type", "discount_currency", "quantity",
          "unlimited_amount_enabled", "one_time_use_enabled", "usage_per_user",
          "link", "terms_and_conditions", "disabled",
        ];
        const normalize = (coupon) => Object.fromEntries(fields.map((field) => [
          field,
          field === "offer_id"
            ? String(coupon.offer_id?._id ?? coupon.offer_id ?? "")
            : coupon[field] === undefined ? null : coupon[field],
        ]));
        process.exit(JSON.stringify(normalize(expected)) === JSON.stringify(normalize(actual)) ? 0 : 1);
      } catch {
        process.exit(1);
      }
    });
  ' "$COUPON_SNAPSHOT"
}

cleanup_account() {
  [ "$ACCOUNT_MAY_EXIST" = "1" ] || return 0
  local fixture
  fixture="$(find_account_fixture)" || return 1
  if [ -z "$fixture" ]; then
    return 0
  fi
  local marker fixture_id
  marker="$(printf '%s' "$fixture" | json_get account_name)"
  fixture_id="$(printf '%s' "$fixture" | json_get _id)"
  [ "$marker" = "$FIXTURE_MARKER" ] || return 1
  [ -n "$fixture_id" ] || return 1

  curl_api "$CUSTOMER_AUTH_CFG" DELETE "/withdraw/methods/$fixture_id"
  case "$RESP_STATUS" in
    200|204) ;;
    *) return 1 ;;
  esac
  fixture="$(find_account_fixture)" || return 1
  [ -z "$fixture" ]
}

cleanup_coupon() {
  [ "$COUPON_TOUCHED" = "1" ] || return 0
  local restore current
  restore="$(coupon_payload restore)" || return 1
  curl_api "$ADMIN_AUTH_CFG" POST '/offer/update-coupon' "$restore"
  case "$RESP_STATUS" in
    200|201) ;;
    *) return 1 ;;
  esac
  current="$(fetch_coupon_fixture)" || return 1
  [ -n "$current" ] || return 1
  coupon_matches_snapshot "$current"
}

on_exit() {
  local code=$?
  trap - EXIT
  set +e
  if ! cleanup_account; then
    fail 'Bank fixture cleanup could not be verified.'
    CLEANUP_FAILED=1
  elif [ "$ACCOUNT_MAY_EXIST" = "1" ]; then
    pass 'Bank fixture cleanup verified.'
    [ -n "$EVIDENCE_FILE" ] && printf 'account_cleanup=passed\n' >>"$EVIDENCE_FILE"
  fi
  if ! cleanup_coupon; then
    fail 'Coupon snapshot restore could not be verified.'
    CLEANUP_FAILED=1
  elif [ "$COUPON_TOUCHED" = "1" ]; then
    pass 'Coupon snapshot restore verified.'
    [ -n "$EVIDENCE_FILE" ] && printf 'coupon_restore=passed\n' >>"$EVIDENCE_FILE"
  fi
  rm -f "$CUSTOMER_AUTH_CFG" "$ADMIN_AUTH_CFG" "$INVALID_AUTH_CFG" "$COUPON_SNAPSHOT"
  if [ "$CLEANUP_FAILED" = "1" ]; then
    exit 5
  fi
  exit "$code"
}
trap on_exit EXIT

for command in node curl grep mktemp; do
  if ! command -v "$command" >/dev/null 2>&1; then
    fail "$command is required"
    exit 2
  fi
done

URL_PARTS="$(API_URL_INPUT="$API_URL" node -e '
  try {
    const url = new URL(process.env.API_URL_INPUT);
    if (url.username || url.password || url.search || url.hash) process.exit(1);
    if (url.pathname !== "/" && url.pathname !== "") process.exit(1);
    process.stdout.write([url.hostname, url.protocol, url.origin].join("\t"));
  } catch {
    process.exit(1);
  }
')" || {
  fail 'API_URL is not permitted by the nonproduction safety policy.'
  exit 6
}
IFS=$'\t' read -r API_HOST API_PROTOCOL SAFE_API_ORIGIN <<<"$URL_PARTS"

case "$API_HOST" in
  api.dev.gogocash.co|api-staging.gogocash.co)
    if [ "$API_PROTOCOL" != "https:" ]; then
      fail 'API_URL is not permitted by the nonproduction safety policy.'
      exit 6
    fi
    ;;
  localhost|127.0.0.1)
    case "$API_PROTOCOL" in
      http:|https:) ;;
      *)
        fail 'API_URL is not permitted by the nonproduction safety policy.'
        exit 6
        ;;
    esac
    ;;
  api.gogocash.co|*production*)
    fail "Production target is forbidden: $API_HOST"
    exit 6
    ;;
  *)
    fail "Only explicit dev/staging/local hosts are allowed: $API_HOST"
    exit 6
    ;;
esac
API_URL="$SAFE_API_ORIGIN"

if [ "$MODE" = "validate-coupon-json" ]; then
  if coupon_restore_preflight; then
    pass 'Coupon restore preflight passed without network access.'
    exit 0
  fi
  fail 'Coupon restore preflight failed; fixture would not restore exactly.'
  exit 3
fi

if [ "$MODE" != "apply" ]; then
  printf 'GoGoCash issue #34 acceptance plan (NO NETWORK / NO WRITES)\n'
  printf 'Target: %s\n' "$API_URL"
  printf 'Live mode requires MODE=apply and CONFIRM_NONPROD_WRITE=issue-34.\n'
  printf 'Required secret names: MONGO_URI, CUSTOMER_JWT, ADMIN_JWT, INVALID_SUB_CUSTOMER_JWT.\n'
  printf 'Required marker-owned fixture: QA_COUPON_ID (name must begin "QA #34").\n'
  exit 0
fi

if [ "${CONFIRM_NONPROD_WRITE:-}" != "issue-34" ]; then
  fail 'Set CONFIRM_NONPROD_WRITE=issue-34 for a live nonproduction run.'
  exit 3
fi

for variable in MONGO_URI CUSTOMER_JWT ADMIN_JWT INVALID_SUB_CUSTOMER_JWT QA_COUPON_ID; do
  if [ -z "${!variable:-}" ]; then
    fail "Missing required variable: $variable"
    exit 2
  fi
done

if ! [[ "$QA_COUPON_ID" =~ ^[0-9a-fA-F]{24}$ ]]; then
  fail 'QA_COUPON_ID must be a 24-character hexadecimal ObjectId.'
  exit 3
fi

if ! printf '%s' "$INVALID_SUB_CUSTOMER_JWT" | node -e '
  let token = "";
  process.stdin.on("data", (chunk) => (token += chunk));
  process.stdin.on("end", () => {
    try {
      const part = token.trim().split(".")[1];
      const payload = JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
      const userId = payload.userId;
      if (typeof userId !== "string" || userId.length === 0) process.exit(1);
      process.exit(/^[0-9a-fA-F]{24}$/.test(userId) ? 1 : 0);
    } catch {
      process.exit(1);
    }
  });
'; then
  fail 'INVALID_SUB_CUSTOMER_JWT must decode to a nonempty, non-ObjectId userId.'
  exit 3
fi

CUSTOMER_AUTH_CFG="$(make_auth_config "$CUSTOMER_JWT")"
ADMIN_AUTH_CFG="$(make_auth_config "$ADMIN_JWT")"
INVALID_AUTH_CFG="$(make_auth_config "$INVALID_SUB_CUSTOMER_JWT")"
mkdir -p "$EVIDENCE_DIR"
EVIDENCE_FILE="$EVIDENCE_DIR/money-contract-${RUN_ID}.txt"
umask 077
: >"$EVIDENCE_FILE"
chmod 600 "$EVIDENCE_FILE"
printf 'issue=34\ntarget=%s\nrun_id=%s\n' "$API_URL" "$RUN_ID" >"$EVIDENCE_FILE"

# 1. Invalid deeplink identity: use marker-unique numeric keys and prove the
# raw collection remains empty before and after the actionable 400.
DEEPLINK_COUNT_BEFORE="$(count_deeplink_marker)" || {
  fail 'Could not obtain the raw pre-request deeplink count.'
  exit 1
}
if ! [[ "$DEEPLINK_COUNT_BEFORE" =~ ^[0-9]+$ ]] || \
  [ "$DEEPLINK_COUNT_BEFORE" != "0" ]; then
  fail 'Raw pre-request deeplink count must be exactly zero for the marker.'
  exit 3
fi
DEEPLINK_BODY="$(
  DEEPLINK_OFFER_ID="$DEEPLINK_OFFER_ID" \
    DEEPLINK_MERCHANT_ID="$DEEPLINK_MERCHANT_ID" \
    DEEPLINK_INPUT_MARKER="$DEEPLINK_INPUT_MARKER" \
    node -e '
      process.stdout.write(JSON.stringify({
        offer_id: Number(process.env.DEEPLINK_OFFER_ID),
        merchant_id: Number(process.env.DEEPLINK_MERCHANT_ID),
        deeplink: process.env.DEEPLINK_INPUT_MARKER,
      }));
    '
)"
curl_api "$INVALID_AUTH_CFG" POST '/involve/create-affiliate' "$DEEPLINK_BODY"
DEEPLINK_RESPONSE_OK=0
if [ "$RESP_STATUS" = "400" ] && printf '%s' "$RESP_BODY" | grep -qF 'Invalid user_id'; then
  DEEPLINK_RESPONSE_OK=1
fi
DEEPLINK_COUNT_AFTER="$(count_deeplink_marker)" || {
  fail 'Could not obtain the raw post-request deeplink count.'
  exit 1
}
if ! [[ "$DEEPLINK_COUNT_AFTER" =~ ^[0-9]+$ ]] || \
  [ "$DEEPLINK_COUNT_AFTER" != "0" ] || \
  [ "$DEEPLINK_COUNT_AFTER" != "$DEEPLINK_COUNT_BEFORE" ]; then
  fail 'Raw deeplink count changed or was nonzero after invalid identity rejection.'
  exit 1
fi
if [ "$DEEPLINK_RESPONSE_OK" != "1" ]; then
  fail "Invalid deeplink identity did not return the expected actionable 400 (status=$RESP_STATUS)."
  exit 1
fi
printf 'deeplink_invalid_status=400\ndeeplink_raw_count_before=0\ndeeplink_raw_count_after=0\n' \
  >>"$EVIDENCE_FILE"
pass 'Invalid deeplink identity returned 400 and raw count remained 0 -> 0.'

# 2. Leading-zero account number create/read/update. Mark possible existence
# before POST so even a dropped response triggers marker search during cleanup.
ACCOUNT_MAY_EXIST=1
CREATE_BODY="$(
  FIXTURE_MARKER="$FIXTURE_MARKER" ACCOUNT_NO="$ACCOUNT_NO_CREATE" node -e '
    process.stdout.write(JSON.stringify({
      account_no: process.env.ACCOUNT_NO,
      account_name: process.env.FIXTURE_MARKER,
      bank_name: "QA Bank",
      bank_code: "000",
      is_default: false,
    }));
  '
)"
curl_api "$CUSTOMER_AUTH_CFG" POST '/withdraw/methods' "$CREATE_BODY"
if [ "$RESP_STATUS" != "201" ]; then
  fail "Bank fixture create failed (status=$RESP_STATUS)."
  exit 1
fi
ACCOUNT_METHOD_ID="$(printf '%s' "$RESP_BODY" | json_get data._id)"
if [ -z "$ACCOUNT_METHOD_ID" ]; then
  fixture="$(find_account_fixture)" || true
  ACCOUNT_METHOD_ID="$(printf '%s' "$fixture" | json_get _id)"
fi
if [ -z "$ACCOUNT_METHOD_ID" ]; then
  fail 'Bank fixture id could not be recovered after create.'
  exit 1
fi
curl_api "$CUSTOMER_AUTH_CFG" GET "/withdraw/methods/$ACCOUNT_METHOD_ID"
if [ "$RESP_STATUS" != "200" ] || \
  [ "$(printf '%s' "$RESP_BODY" | json_get account_no)" != "$ACCOUNT_NO_CREATE" ]; then
  fail 'Leading-zero bank account did not survive create/read exactly.'
  exit 1
fi

UPDATE_BODY="$(
  FIXTURE_MARKER="$FIXTURE_MARKER" ACCOUNT_NO="$ACCOUNT_NO_UPDATE" node -e '
    process.stdout.write(JSON.stringify({
      account_no: process.env.ACCOUNT_NO,
      account_name: process.env.FIXTURE_MARKER,
      bank_name: "QA Bank",
      bank_code: "000",
      is_default: false,
    }));
  '
)"
curl_api "$CUSTOMER_AUTH_CFG" PATCH "/withdraw/methods/$ACCOUNT_METHOD_ID" "$UPDATE_BODY"
if [ "$RESP_STATUS" != "200" ]; then
  fail "Bank fixture update failed (status=$RESP_STATUS)."
  exit 1
fi
curl_api "$CUSTOMER_AUTH_CFG" GET "/withdraw/methods/$ACCOUNT_METHOD_ID"
if [ "$RESP_STATUS" != "200" ] || \
  [ "$(printf '%s' "$RESP_BODY" | json_get account_no)" != "$ACCOUNT_NO_UPDATE" ]; then
  fail 'Leading-zero bank account did not survive update/read exactly.'
  exit 1
fi
printf 'account_round_trip=passed\n' >>"$EVIDENCE_FILE"
pass 'Leading-zero account number survived create, read, and update.'

# 3. Strict coupon false parsing on an existing marker-owned QA fixture.
COUPON_JSON="$(fetch_coupon_fixture)" || {
  fail 'Could not read the marker-owned QA coupon.'
  exit 1
}
if [ -z "$COUPON_JSON" ] || \
  [[ "$(printf '%s' "$COUPON_JSON" | json_get name)" != 'QA #34'* ]]; then
  fail 'QA_COUPON_ID is absent or its name is not marker-owned (QA #34...).'
  exit 3
fi
if ! printf '%s' "$COUPON_JSON" | coupon_restore_preflight; then
  fail 'Coupon restore preflight failed; refusing to mutate a lossy fixture.'
  exit 3
fi
COUPON_SNAPSHOT="$(mktemp "${TMPDIR:-/tmp}/gogocash-issue34-coupon.XXXXXX")"
chmod 600 "$COUPON_SNAPSHOT"
printf '%s' "$COUPON_JSON" >"$COUPON_SNAPSHOT"
COUPON_TOUCHED=1

COUPON_TRUE_BODY="$(coupon_payload true)"
curl_api "$ADMIN_AUTH_CFG" POST '/offer/update-coupon' "$COUPON_TRUE_BODY"
case "$RESP_STATUS" in
  200|201) ;;
  *) fail "QA coupon true setup failed (status=$RESP_STATUS)."; exit 1 ;;
esac

COUPON_FALSE_BODY="$(coupon_payload false-string)"
curl_api "$ADMIN_AUTH_CFG" POST '/offer/update-coupon' "$COUPON_FALSE_BODY"
case "$RESP_STATUS" in
  200|201) ;;
  *) fail "QA coupon string-false update failed (status=$RESP_STATUS)."; exit 1 ;;
esac
COUPON_JSON="$(fetch_coupon_fixture)" || {
  fail 'Could not re-read the QA coupon after string-false update.'
  exit 1
}
if [ "$(printf '%s' "$COUPON_JSON" | json_get disabled)" != "false" ]; then
  fail 'The exact string "false" did not persist as boolean false.'
  exit 1
fi
printf 'coupon_string_false=passed\n' >>"$EVIDENCE_FILE"
pass 'The exact coupon string "false" persisted as boolean false.'

pass 'All issue #34 live checks passed; EXIT cleanup will now verify restoration.'
