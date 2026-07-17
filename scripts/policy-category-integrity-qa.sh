#!/usr/bin/env bash
# Marker-owned dev/staging acceptance for policy/category integrity (#349/#350).
# Default invocation is deliberately inert. Hosted work needs every gate below.

set -Eeuo pipefail

if [[ "${EXECUTE:-0}" != "1" ]]; then
  cat <<'EOF'
Policy category integrity QA plan (DRY RUN ONLY; NO NETWORK; NO WRITES)

This is a two-stage, dev-first harness:
  1. PHASE=prepare-retire creates a marker-owned category and Default banner,
     proves aggregate replay, proves an exact referenced-retire 409 through a
     retained alias, runs real Admin same-origin save/lifecycle mutations, and
     exercises deterministic signed upstream removal plus no-resurrection.
  2. PHASE=purge is separately authorized after purge_after. It verifies the
     signed upstream removal, explicitly removes the exact signed disabled
     local fixture, purges with a superadmin token, and verifies final absence.

Both phases require exact dev/staging URLs, Railway deployment proof matching
CANDIDATE_SHA, an explicit Mongo target fingerprint, backup evidence, writer-
drain confirmation, marker ownership, and signed evidence. Staging additionally
requires signed passing dev evidence from the same SHA.
EOF
  exit 0
fi

refuse() {
  printf 'REFUSED: %s\n' "$1" >&2
  exit 64
}

PHASE="${PHASE:-}"
ENVIRONMENT="${ENVIRONMENT:-}"
API_URL="${API_URL:-}"
ADMIN_URL="${ADMIN_URL:-}"
CANDIDATE_SHA="${CANDIDATE_SHA:-}"
QA_OWNER="${QA_OWNER:-}"
QA_MARKER="${QA_MARKER:-}"
QA_CONFIRM="${QA_CONFIRM:-}"
MONGO_URI="${MONGO_URI:-}"
MONGO_TARGET_FINGERPRINT="${MONGO_TARGET_FINGERPRINT:-}"
BACKUP_EVIDENCE_FILE="${BACKUP_EVIDENCE_FILE:-}"
WRITER_DRAIN_CONFIRM="${WRITER_DRAIN_CONFIRM:-}"
QA_EVIDENCE_HMAC_KEY="${QA_EVIDENCE_HMAC_KEY:-}"
DEV_EVIDENCE_FILE="${DEV_EVIDENCE_FILE:-}"
PREPARE_EVIDENCE_FILE="${PREPARE_EVIDENCE_FILE:-}"
ADMIN_JWT="${ADMIN_JWT:-}"
SUPERADMIN_JWT="${SUPERADMIN_JWT:-}"
ADMIN_UI_EMAIL="${ADMIN_UI_EMAIL:-}"
ADMIN_UI_PASSWORD="${ADMIN_UI_PASSWORD:-}"
INVOLVE_QA_OFFER_ID="${INVOLVE_QA_OFFER_ID:-}"
INVOLVE_SYNC_CONFIRM="${INVOLVE_SYNC_CONFIRM:-}"
INVOLVE_REMOVE_HOOK="${INVOLVE_REMOVE_HOOK:-}"
INVOLVE_REMOVE_HOOK_SHA256="${INVOLVE_REMOVE_HOOK_SHA256:-}"
INVOLVE_REMOVE_CONFIRM="${INVOLVE_REMOVE_CONFIRM:-}"
POLICY_QA_FAILURE_INJECTION_SECRET="${POLICY_QA_FAILURE_INJECTION_SECRET:-}"
POLICY_QA_FAILURE_CONFIRM="${POLICY_QA_FAILURE_CONFIRM:-}"
EVIDENCE_DIR="${EVIDENCE_DIR:-evidence/policy-category-integrity}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-10}"
MAX_TIME="${MAX_TIME:-45}"
CLEANUP_POLL_ATTEMPTS="${CLEANUP_POLL_ATTEMPTS:-72}"
CLEANUP_POLL_INTERVAL="${CLEANUP_POLL_INTERVAL:-10}"

case "$PHASE" in
  prepare-retire | purge) ;;
  *) refuse 'PHASE must be prepare-retire or purge' ;;
esac

case "$ENVIRONMENT" in
  dev)
    EXPECTED_API_URL='https://api.dev.gogocash.co'
    EXPECTED_ADMIN_URL='https://admin.dev.gogocash.co'
    ;;
  staging)
    EXPECTED_API_URL='https://api-staging.gogocash.co'
    EXPECTED_ADMIN_URL='https://admin-staging.gogocash.co'
    ;;
  *) refuse 'ENVIRONMENT must be dev or staging' ;;
esac

[[ "$API_URL" == "$EXPECTED_API_URL" ]] ||
  refuse "API_URL must exactly equal $EXPECTED_API_URL"
[[ "$ADMIN_URL" == "$EXPECTED_ADMIN_URL" ]] ||
  refuse "ADMIN_URL must exactly equal $EXPECTED_ADMIN_URL"
[[ "$API_URL" != *'api.gogocash.co'* ]] || refuse 'production API is forbidden'
[[ "$CANDIDATE_SHA" =~ ^[a-f0-9]{40}$ ]] ||
  refuse 'CANDIDATE_SHA must be an exact lowercase 40-character Git SHA'
[[ "$QA_OWNER" =~ ^[a-z0-9][a-z0-9-]{1,30}$ ]] ||
  refuse 'QA_OWNER must be a 2-31 character lowercase slug'
[[ "$QA_MARKER" =~ ^policy-qa-${ENVIRONMENT}-[a-z0-9-]+-${QA_OWNER}$ ]] ||
  refuse 'QA_MARKER is not owned by the declared environment and owner'
[[ -n "$MONGO_URI" ]] || refuse 'MONGO_URI with an explicit database is required'
[[ "$MONGO_TARGET_FINGERPRINT" =~ ^[a-f0-9]{16}$ ]] ||
  refuse 'MONGO_TARGET_FINGERPRINT must be the reviewed 16-character fingerprint'
[[ ${#QA_EVIDENCE_HMAC_KEY} -ge 32 ]] ||
  refuse 'QA_EVIDENCE_HMAC_KEY must contain at least 32 characters'
[[ -f "$BACKUP_EVIDENCE_FILE" && -s "$BACKUP_EVIDENCE_FILE" ]] ||
  refuse 'BACKUP_EVIDENCE_FILE must identify a verified restorable backup'
grep -Fq "$CANDIDATE_SHA" "$BACKUP_EVIDENCE_FILE" ||
  refuse 'backup evidence is not bound to CANDIDATE_SHA'
grep -Fq "$MONGO_TARGET_FINGERPRINT" "$BACKUP_EVIDENCE_FILE" ||
  refuse 'backup evidence is not bound to MONGO_TARGET_FINGERPRINT'
[[ "$WRITER_DRAIN_CONFIRM" == "drained-old-writers:${ENVIRONMENT}:${CANDIDATE_SHA}:${MONGO_TARGET_FINGERPRINT}" ]] ||
  refuse 'WRITER_DRAIN_CONFIRM does not bind environment, SHA, and target'
[[ "$CLEANUP_POLL_ATTEMPTS" =~ ^[1-9][0-9]*$ ]] || refuse 'invalid cleanup poll count'
[[ "$CLEANUP_POLL_INTERVAL" =~ ^[1-9][0-9]*$ ]] || refuse 'invalid cleanup poll interval'

command -v curl >/dev/null 2>&1 || refuse 'curl is required'
command -v node >/dev/null 2>&1 || refuse 'Node 24 is required'
command -v npx >/dev/null 2>&1 || refuse 'npx is required for real Admin UI QA'
[[ "$(node -p 'process.versions.node.split(".")[0]')" == '24' ]] ||
  refuse 'Node 24 is required'

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR/.." rev-parse --show-toplevel 2>/dev/null)" ||
  refuse 'QA must run from a Git checkout'
FAILURE_QA_SCRIPT="$REPO_ROOT/scripts/staging-policy-lifecycle-qa.sh"
LOCAL_SHA="$(git -C "$REPO_ROOT" rev-parse --verify HEAD 2>/dev/null)" ||
  refuse 'local Git revision cannot be resolved'
[[ "$LOCAL_SHA" == "$CANDIDATE_SHA" ]] ||
  refuse 'local QA checkout does not match CANDIDATE_SHA'
for qa_artifact in \
  'scripts/policy-category-integrity-qa.sh' \
  'scripts/staging-policy-lifecycle-qa.sh' \
  'e2e/cross-system/policy-category-integrity-ui.spec.ts'; do
  git -C "$REPO_ROOT" ls-files --error-unmatch "$qa_artifact" >/dev/null 2>&1 ||
    refuse 'QA artifacts must be tracked by CANDIDATE_SHA'
  git -C "$REPO_ROOT" diff --quiet HEAD -- "$qa_artifact" ||
    refuse 'QA artifacts must be identical to CANDIDATE_SHA'
done

TARGET_FINGERPRINT="$(MONGO_URI="$MONGO_URI" node <<'NODE'
const { createHash } = require('node:crypto');
let parsed;
try { parsed = new URL(process.env.MONGO_URI); } catch { process.exit(2); }
if (!['mongodb:', 'mongodb+srv:'].includes(parsed.protocol)) process.exit(2);
const host = parsed.host.toLowerCase();
const database = decodeURIComponent(parsed.pathname.replace(/^\//, '')).trim();
if (!database) process.exit(3);
if (/(^|[-_.])(prod|production)([-_.]|$)/i.test(host) ||
    /^(gogocash[-_]?prod(uction)?|prod(uction)?)$/i.test(database)) process.exit(4);
process.stdout.write(createHash('sha256').update(`${host}/${database}`).digest('hex').slice(0, 16));
NODE
)" || refuse 'MONGO_URI is invalid, implicit, or production-looking'
[[ "$TARGET_FINGERPRINT" == "$MONGO_TARGET_FINGERPRINT" ]] ||
  refuse 'MONGO_URI does not match MONGO_TARGET_FINGERPRINT'

if [[ "$PHASE" == 'prepare-retire' ]]; then
  EXPECTED_CONFIRM="run-policy-category-integrity-qa:${ENVIRONMENT}:${CANDIDATE_SHA}:${QA_MARKER}:${MONGO_TARGET_FINGERPRINT}"
  [[ -n "$ADMIN_JWT" ]] || refuse 'ADMIN_JWT with approver-or-higher access is required'
  [[ -n "$ADMIN_UI_EMAIL" && -n "$ADMIN_UI_PASSWORD" ]] ||
    refuse 'real Admin UI credentials are required'
  [[ "$INVOLVE_QA_OFFER_ID" =~ ^[1-9][0-9]*$ ]] ||
    refuse 'INVOLVE_QA_OFFER_ID must identify the controlled upstream marker fixture'
  [[ "$INVOLVE_SYNC_CONFIRM" == "sync-involve-qa:${ENVIRONMENT}:${QA_MARKER}:${INVOLVE_QA_OFFER_ID}" ]] ||
    refuse 'INVOLVE_SYNC_CONFIRM does not authorize the controlled provider sync'
  [[ "$INVOLVE_REMOVE_HOOK" =~ ^scripts/[a-zA-Z0-9._/-]+$ && "$INVOLVE_REMOVE_HOOK" != *'..'* ]] ||
    refuse 'INVOLVE_REMOVE_HOOK must be a reviewed repo-relative scripts path'
  [[ "$INVOLVE_REMOVE_HOOK_SHA256" =~ ^[a-f0-9]{64}$ ]] ||
    refuse 'INVOLVE_REMOVE_HOOK_SHA256 must be an exact lowercase SHA-256'
  [[ "$INVOLVE_REMOVE_CONFIRM" == "remove-involve-qa:${ENVIRONMENT}:${CANDIDATE_SHA}:${QA_MARKER}:${INVOLVE_QA_OFFER_ID}:${INVOLVE_REMOVE_HOOK_SHA256}" ]] ||
    refuse 'INVOLVE_REMOVE_CONFIRM does not bind environment, SHA, marker, offer, and hook'
  FAILURE_MARKER="${QA_MARKER}-failure"
  FAILURE_REQUEST_KEY="${FAILURE_MARKER}-after-put"
  [[ ${#POLICY_QA_FAILURE_INJECTION_SECRET} -ge 32 ]] ||
    refuse 'POLICY_QA_FAILURE_INJECTION_SECRET must contain at least 32 characters'
  [[ "$POLICY_QA_FAILURE_CONFIRM" == "run-policy-failure-injection:${ENVIRONMENT}:${CANDIDATE_SHA}:${FAILURE_MARKER}:${FAILURE_REQUEST_KEY}:${MONGO_TARGET_FINGERPRINT}" ]] ||
    refuse 'POLICY_QA_FAILURE_CONFIRM does not authorize the exact after-Put proof'
  if [[ "$ENVIRONMENT" == 'staging' ]]; then
    [[ -f "$DEV_EVIDENCE_FILE" ]] ||
      refuse 'staging requires signed DEV_EVIDENCE_FILE from the same SHA'
  fi
else
  EXPECTED_CONFIRM="purge-policy-category-integrity-qa:${ENVIRONMENT}:${CANDIDATE_SHA}:${QA_MARKER}:${MONGO_TARGET_FINGERPRINT}"
  [[ -n "$SUPERADMIN_JWT" ]] || refuse 'SUPERADMIN_JWT is required for purge'
  ADMIN_JWT="$SUPERADMIN_JWT"
  [[ -f "$PREPARE_EVIDENCE_FILE" ]] ||
    refuse 'purge requires signed PREPARE_EVIDENCE_FILE'
  [[ "$INVOLVE_QA_OFFER_ID" =~ ^[1-9][0-9]*$ ]] ||
    refuse 'purge requires the exact INVOLVE_QA_OFFER_ID from prepare evidence'
fi
[[ "$QA_CONFIRM" == "$EXPECTED_CONFIRM" ]] ||
  refuse 'QA_CONFIRM does not exactly bind phase, environment, SHA, marker, and target'

if [[ "$PHASE" == 'prepare-retire' ]]; then
  INVOLVE_REMOVE_HOOK_PATH="$REPO_ROOT/$INVOLVE_REMOVE_HOOK"
  git -C "$REPO_ROOT" ls-files --error-unmatch "$INVOLVE_REMOVE_HOOK" >/dev/null 2>&1 ||
    refuse 'INVOLVE_REMOVE_HOOK must be tracked by CANDIDATE_SHA'
  git -C "$REPO_ROOT" diff --quiet HEAD -- "$INVOLVE_REMOVE_HOOK" ||
    refuse 'INVOLVE_REMOVE_HOOK must be identical to CANDIDATE_SHA'
  [[ -f "$INVOLVE_REMOVE_HOOK_PATH" && ! -L "$INVOLVE_REMOVE_HOOK_PATH" ]] ||
    refuse 'INVOLVE_REMOVE_HOOK must be a regular tracked file, not a symlink'
  [[ -x "$INVOLVE_REMOVE_HOOK_PATH" ]] ||
    refuse 'INVOLVE_REMOVE_HOOK must be executable'
  ACTUAL_INVOLVE_REMOVE_HOOK_SHA256="$(HOOK_PATH="$INVOLVE_REMOVE_HOOK_PATH" node -e '
    const {createHash}=require("node:crypto");
    const {readFileSync}=require("node:fs");
    process.stdout.write(createHash("sha256").update(readFileSync(process.env.HOOK_PATH)).digest("hex"));
  ')" || refuse 'INVOLVE_REMOVE_HOOK cannot be hashed'
  [[ "$ACTUAL_INVOLVE_REMOVE_HOOK_SHA256" == "$INVOLVE_REMOVE_HOOK_SHA256" ]] ||
    refuse 'INVOLVE_REMOVE_HOOK does not match INVOLVE_REMOVE_HOOK_SHA256'
fi

verify_evidence() {
  local file="$1" expected_phase="$2" expected_environment="$3" expected_marker="$4" expected_target="$5"
  EVIDENCE_FILE="$file" EXPECTED_PHASE="$expected_phase" \
    EXPECTED_ENVIRONMENT="$expected_environment" EXPECTED_MARKER="$expected_marker" \
    EXPECTED_TARGET="$expected_target" CANDIDATE_SHA="$CANDIDATE_SHA" \
    QA_EVIDENCE_HMAC_KEY="$QA_EVIDENCE_HMAC_KEY" node <<'NODE'
const { createHmac, timingSafeEqual } = require('node:crypto');
const { readFileSync } = require('node:fs');
const row = JSON.parse(readFileSync(process.env.EVIDENCE_FILE, 'utf8'));
const { signature, ...payload } = row;
const actual = createHmac('sha256', process.env.QA_EVIDENCE_HMAC_KEY)
  .update(JSON.stringify(payload)).digest('hex');
if (typeof signature !== 'string' || signature.length !== actual.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(actual))) process.exit(2);
if (payload.schema !== 'gogocash.policy-category-qa.v2' ||
    payload.phase !== process.env.EXPECTED_PHASE ||
    payload.environment !== process.env.EXPECTED_ENVIRONMENT ||
    payload.candidate_sha !== process.env.CANDIDATE_SHA ||
    (process.env.EXPECTED_TARGET && payload.mongo_target_fingerprint !== process.env.EXPECTED_TARGET) ||
    (process.env.EXPECTED_MARKER && payload.marker !== process.env.EXPECTED_MARKER) ||
    payload.passed !== true) process.exit(3);
NODE
}

if [[ "$ENVIRONMENT" == 'staging' && "$PHASE" == 'prepare-retire' ]]; then
  verify_evidence "$DEV_EVIDENCE_FILE" prepare-retire dev '' '' ||
    refuse 'DEV_EVIDENCE_FILE is invalid, stale, or from another SHA/target contract'
fi
if [[ "$PHASE" == 'purge' ]]; then
  verify_evidence "$PREPARE_EVIDENCE_FILE" prepare-retire "$ENVIRONMENT" "$QA_MARKER" "$MONGO_TARGET_FINGERPRINT" ||
    refuse 'PREPARE_EVIDENCE_FILE signature or ownership is invalid'
  PREPARE_EVIDENCE_FILE="$PREPARE_EVIDENCE_FILE" QA_MARKER="$QA_MARKER" node -e '
    const {readFileSync}=require("node:fs");
    const proof=JSON.parse(readFileSync(process.env.PREPARE_EVIDENCE_FILE,"utf8")).failure_injection_evidence;
    if (proof?.phase!=="after-put-failure" || proof?.passed!==true ||
        proof?.marker!==`${process.env.QA_MARKER}-failure` ||
        proof?.failure_point!=="after-media-put-before-db-commit" ||
        proof?.audit?.command_status!=="failed" || proof?.audit?.cleanup_status!=="deleted" ||
        proof?.audit?.failure_error!=="Controlled policy QA failure after media upload and before database commit" ||
        proof?.audit?.registry_state!=="deleted" || proof?.audit?.unresolved_cleanup_debt!==0)
      process.exit(2);
  ' || refuse 'PREPARE_EVIDENCE_FILE omits the required clean after-Put failure proof'
fi

# Deployment proof is the first network request. No hosted mutation is allowed
# until Railway attests the exact environment and candidate revision.
DEPLOYMENT_PROOF="$(curl -fsS --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
  "$API_URL/offer/deployment-proof")" || refuse 'Railway deployment proof request failed'
read -r DEPLOYED_ENVIRONMENT DEPLOYED_REVISION < <(
  printf '%s' "$DEPLOYMENT_PROOF" | node -e '
    let input=""; process.stdin.on("data", c => input += c); process.stdin.on("end", () => {
      const proof=JSON.parse(input);
      if (proof.schema !== "gogocash.deployment-revision.v1") process.exit(2);
      process.stdout.write(`${proof.environment ?? ""} ${proof.revision ?? ""}\n`);
    });
  '
) || refuse 'deployment proof schema is invalid'
[[ "$DEPLOYED_ENVIRONMENT" == "$ENVIRONMENT" ]] || refuse 'deployed environment does not match ENVIRONMENT'
[[ "$DEPLOYED_REVISION" == "$CANDIDATE_SHA" ]] || refuse 'deployed revision does not match CANDIDATE_SHA'

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/policy-category-qa.XXXXXX")"
AUTH_CFG="$TMP_DIR/auth.cfg"
chmod 700 "$TMP_DIR"
printf 'header = "Authorization: Bearer %s"\n' "$ADMIN_JWT" >"$AUTH_CFG"
chmod 600 "$AUTH_CFG"
RESPONSE_STATUS=''
RESPONSE_BODY=''
CATEGORY_ID=''
REFERENCE_OFFER_ID=''
INVOLVE_LOCAL_OFFER_ID=''
RETIRED=0

cleanup_local() {
  local code=$?
  trap - EXIT
  set +e
  if [[ $code -ne 0 && "$PHASE" == 'prepare-retire' && -n "$REFERENCE_OFFER_ID" ]]; then
    curl -sS --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
      --config "$AUTH_CFG" -X DELETE "$API_URL/offer/$REFERENCE_OFFER_ID" >/dev/null
  fi
  if [[ $code -ne 0 && "$PHASE" == 'prepare-retire' && "$RETIRED" != '1' && -n "$INVOLVE_LOCAL_OFFER_ID" ]]; then
    curl -sS --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
      --config "$AUTH_CFG" -X DELETE "$API_URL/offer/$INVOLVE_LOCAL_OFFER_ID" >/dev/null
  fi
  rm -rf "$TMP_DIR"
  if [[ $code -ne 0 && "$PHASE" == 'prepare-retire' && -n "$CATEGORY_ID" && "$RETIRED" != '1' ]]; then
    printf 'CLEANUP REQUIRED: marker=%s category_id=%s owner=%s\n' \
      "$QA_MARKER" "$CATEGORY_ID" "$QA_OWNER" >&2
  fi
  if [[ $code -ne 0 && "$PHASE" == 'prepare-retire' && "$RETIRED" == '1' ]]; then
    printf 'RESUME REQUIRED: retired marker=%s category_id=%s involve_local_offer_id=%s owner=%s\n' \
      "$QA_MARKER" "$CATEGORY_ID" "${INVOLVE_LOCAL_OFFER_ID:-pending}" "$QA_OWNER" >&2
  fi
  exit "$code"
}
trap cleanup_local EXIT

request_json() {
  local method="$1" path="$2" body="${3:-}" raw
  if [[ -n "$body" ]]; then
    raw="$(printf '%s' "$body" | curl -sS --connect-timeout "$CONNECT_TIMEOUT" \
      --max-time "$MAX_TIME" --config "$AUTH_CFG" -H 'Content-Type: application/json' \
      -X "$method" --data-binary @- -w $'\n%{http_code}' "$API_URL$path")"
  else
    raw="$(curl -sS --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
      --config "$AUTH_CFG" -X "$method" -w $'\n%{http_code}' "$API_URL$path")"
  fi
  RESPONSE_STATUS="${raw##*$'\n'}"
  RESPONSE_BODY="${raw%$'\n'*}"
}

json_get() {
  local path="$1"
  node -e '
    let input=""; process.stdin.on("data", c => input += c); process.stdin.on("end", () => {
      let value=JSON.parse(input);
      for (const key of process.argv[1].split(".")) value=value?.[key];
      if (value !== undefined && value !== null) process.stdout.write(String(value));
    });
  ' "$path"
}

json_body() {
  REQUEST_KEY="$1" REVISION="$2" node -e '
    process.stdout.write(JSON.stringify({
      request_key: process.env.REQUEST_KEY,
      expected_revision: Number(process.env.REVISION),
    }));
  '
}

request_json GET '/policy/aggregate-capability'
[[ "$RESPONSE_STATUS" == '200' ]] || refuse "aggregate capability returned HTTP $RESPONSE_STATUS"
printf '%s' "$RESPONSE_BODY" | node -e '
  let input=""; process.stdin.on("data", c => input += c); process.stdin.on("end", () => {
    const row=JSON.parse(input);
    if (row.supported !== true || !["replica-set","mongos"].includes(row.topology)) process.exit(2);
  });
' || refuse 'MongoDB is not a transaction-capable replica-set or mongos'

if [[ "$PHASE" == 'prepare-retire' ]]; then
  FAILURE_EVIDENCE_FILE="$TMP_DIR/after-put-failure.json"
  EXECUTE=1 ENVIRONMENT="$ENVIRONMENT" API_URL="$API_URL" \
    CANDIDATE_SHA="$CANDIDATE_SHA" FAILURE_MARKER="$FAILURE_MARKER" \
    FAILURE_REQUEST_KEY="$FAILURE_REQUEST_KEY" \
    POLICY_QA_FAILURE_INJECTION_SECRET="$POLICY_QA_FAILURE_INJECTION_SECRET" \
    POLICY_QA_FAILURE_CONFIRM="$POLICY_QA_FAILURE_CONFIRM" MONGO_URI="$MONGO_URI" \
    MONGO_TARGET_FINGERPRINT="$MONGO_TARGET_FINGERPRINT" ADMIN_JWT="$ADMIN_JWT" \
    QA_EVIDENCE_HMAC_KEY="$QA_EVIDENCE_HMAC_KEY" \
    FAILURE_EVIDENCE_FILE="$FAILURE_EVIDENCE_FILE" CONNECT_TIMEOUT="$CONNECT_TIMEOUT" \
    MAX_TIME="$MAX_TIME" CLEANUP_POLL_ATTEMPTS="$CLEANUP_POLL_ATTEMPTS" \
    CLEANUP_POLL_INTERVAL="$CLEANUP_POLL_INTERVAL" "$FAILURE_QA_SCRIPT" ||
    refuse 'hosted after-Put failure proof failed'
  verify_evidence "$FAILURE_EVIDENCE_FILE" after-put-failure "$ENVIRONMENT" \
    "$FAILURE_MARKER" "$MONGO_TARGET_FINGERPRINT" ||
    refuse 'after-Put failure evidence signature or target binding is invalid'
  FAILURE_INJECTION_EVIDENCE="$(<"$FAILURE_EVIDENCE_FILE")"
  FAILURE_INJECTION_EVIDENCE="$FAILURE_INJECTION_EVIDENCE" \
    FAILURE_REQUEST_KEY="$FAILURE_REQUEST_KEY" node -e '
      const row=JSON.parse(process.env.FAILURE_INJECTION_EVIDENCE);
      if (row.request_key!==process.env.FAILURE_REQUEST_KEY ||
          row.failure_point!=="after-media-put-before-db-commit" || row.one_shot!==true ||
          row.audit?.command_status!=="failed" || row.audit?.cleanup_status!=="deleted" ||
          row.audit?.failure_error!=="Controlled policy QA failure after media upload and before database commit" ||
          row.audit?.registry_state!=="deleted" || row.audit?.unresolved_cleanup_debt!==0)
        process.exit(2);
    ' || refuse 'after-Put failure evidence does not prove clean compensation'
fi

mongo_audit() {
  local mode="$1"
  (
    cd "$REPO_ROOT"
    AUDIT_MODE="$mode" MONGO_URI="$MONGO_URI" CATEGORY_ID="$CATEGORY_ID" \
      QA_MARKER="$QA_MARKER" RENAMED_MARKER="${RENAMED_MARKER:-}" \
      INVOLVE_QA_OFFER_ID="$INVOLVE_QA_OFFER_ID" \
      INVOLVE_LOCAL_OFFER_ID="${INVOLVE_LOCAL_OFFER_ID:-}" \
      DELETE_KEY="${DELETE_KEY:-}" RETIRE_KEY="${RETIRE_KEY:-}" node <<'NODE'
const mongoose = require('mongoose');
const fail = (message, code = 2) => { console.error(message); process.exitCode = code; };
(async () => {
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
  const db = mongoose.connection.db;
  const id = new mongoose.Types.ObjectId(process.env.CATEGORY_ID);
  const marker = process.env.QA_MARKER;
  const renamed = process.env.RENAMED_MARKER;
  const categories = db.collection('categories');
  const policies = db.collection('policies');
  const offers = db.collection('offers');
  const sources = db.collection('policy_category_sources');
  const commands = db.collection('policy_lifecycle_commands');
  const cleanup = db.collection('policy_media_cleanup');
  const hasExpectedAliases = (aliases) => {
    const keys = new Set(aliases.map((row) => row.source_key));
    return keys.has(marker) && keys.has(renamed);
  };
  if (process.env.AUDIT_MODE === 'involve-seeded') {
    const offer = await offers.findOne({ source: 'involve', offer_id: Number(process.env.INVOLVE_QA_OFFER_ID) });
    if (!offer || offer.categories !== marker || offer.categories_normalized != null) {
      fail('Involve raw offer was not preserved with categories_normalized=null'); return;
    }
    const active = await categories.countDocuments({
      name_normalized: { $in: [marker, renamed] }, lifecycle_status: 'active',
    });
    const aliases = await sources.find({ category_id: id }).toArray();
    if (active !== 0 || !hasExpectedAliases(aliases) || aliases.some((row) => row.active !== false || row.tombstoned !== true)) {
      fail('retained alias or no-resurrection invariant failed'); return;
    }
    process.stdout.write(String(offer._id));
    return;
  }
  if (process.env.AUDIT_MODE === 'involve-disabled') {
    if (!mongoose.Types.ObjectId.isValid(process.env.INVOLVE_LOCAL_OFFER_ID)) {
      fail('signed local Involve fixture id is invalid'); return;
    }
    const offer = await offers.findOne({
      _id: new mongoose.Types.ObjectId(process.env.INVOLVE_LOCAL_OFFER_ID),
      source: 'involve',
      offer_id: Number(process.env.INVOLVE_QA_OFFER_ID),
    });
    const aliases = await sources.find({ category_id: id }).toArray();
    if (!offer || offer.categories !== marker || offer.categories_normalized != null ||
        offer.disabled !== true || offer.type !== 'old' || !hasExpectedAliases(aliases) ||
        aliases.some((row) => row.active !== false || row.tombstoned !== true)) {
      fail('disabled local fixture or no-resurrection invariant failed'); return;
    }
    process.stdout.write(JSON.stringify({
      _id: String(offer._id), source: offer.source, offer_id: offer.offer_id,
      categories: offer.categories, categories_normalized: null,
      disabled: offer.disabled, type: offer.type,
    }));
    return;
  }
  const pending = await cleanup.countDocuments({ category_id: id, status: { $ne: 'deleted' } });
  if (pending > 0) { fail('cleanup is still pending', 75); return; }
  if (process.env.AUDIT_MODE === 'retired-clean') {
    const category = await categories.findOne({ _id: id });
    const policyCount = await policies.countDocuments({ category_id: id });
    const aliases = await sources.find({ category_id: id }).toArray();
    const badCommands = await commands.countDocuments({ category_id: id, status: { $ne: 'committed' } });
    const requiredCommandKeys = [
      `${marker}-create`, `${marker}-rename`, process.env.DELETE_KEY, process.env.RETIRE_KEY,
    ];
    if (requiredCommandKeys.some((key) => !key)) {
      fail('required lifecycle command keys are missing'); return;
    }
    const committedRequiredCommands = await commands.countDocuments({
      category_id: id, request_key: { $in: requiredCommandKeys }, status: 'committed',
    });
    const deletedCleanup = await cleanup.countDocuments({
      category_id: id, reason: 'content-delete', status: 'deleted',
    });
    const fixtureId = mongoose.Types.ObjectId.isValid(process.env.INVOLVE_LOCAL_OFFER_ID)
      ? new mongoose.Types.ObjectId(process.env.INVOLVE_LOCAL_OFFER_ID) : null;
    const markerOfferFilter = { $or: [{ categories: marker }, { categories: renamed }, { policy_category_id: String(id) }] };
    const markerOffers = await offers.countDocuments(fixtureId
      ? { $and: [markerOfferFilter, { _id: { $ne: fixtureId } }] }
      : markerOfferFilter);
    const retainedFixture = fixtureId ? await offers.findOne({
      _id: fixtureId, source: 'involve', offer_id: Number(process.env.INVOLVE_QA_OFFER_ID),
      categories: marker, categories_normalized: null, disabled: true, type: 'old',
    }) : null;
    if (!category || category.lifecycle_status !== 'retired' || policyCount !== 0 || markerOffers !== 0 || !retainedFixture ||
        !hasExpectedAliases(aliases) || aliases.some((row) => row.active !== false || row.tombstoned !== true) ||
        badCommands !== 0 || committedRequiredCommands !== requiredCommandKeys.length || deletedCleanup < 1) {
      fail('retired cleanup/compensation audit failed'); return;
    }
    process.stdout.write(JSON.stringify({ cleanup_deleted: deletedCleanup, committed_commands: committedRequiredCommands, tombstones: aliases.length }));
    return;
  }
  if (process.env.AUDIT_MODE === 'final-clean') {
    const categoryCount = await categories.countDocuments({ _id: id });
    const policyCount = await policies.countDocuments({ category_id: id });
    const offerCount = await offers.countDocuments({ $or: [{ categories: marker }, { categories: renamed }, { policy_category_id: String(id) }] });
    const aliases = await sources.find({ category_id: id }).toArray();
    if (categoryCount || policyCount || offerCount || !hasExpectedAliases(aliases) ||
        aliases.some((row) => row.active !== false || row.tombstoned !== true)) {
      fail('domain records remain or permanent tombstones are invalid'); return;
    }
    await commands.deleteMany({ category_id: id });
    await cleanup.deleteMany({ category_id: id, reason: { $in: [
      'precommit-failure', 'replaced-after-commit', 'content-delete', 'category-purge', 'retired-purge'
    ] } });
    const remainingCommands = await commands.countDocuments({ category_id: id });
    const remainingCleanup = await cleanup.countDocuments({ category_id: id });
    if (remainingCommands || remainingCleanup) {
      fail('marker-owned records remain after final cleanup'); return;
    }
    process.stdout.write(JSON.stringify({ category_absent: true, policy_absent: true, offers_absent: true, media_journals_absent: true, permanent_tombstones: aliases.length }));
    return;
  }
  fail('unknown audit mode');
})().catch((error) => { console.error(error.message); process.exitCode = 2; }).finally(() => mongoose.disconnect());
NODE
  )
}

wait_for_audit() {
  local mode="$1" attempt status
  for ((attempt = 1; attempt <= CLEANUP_POLL_ATTEMPTS; attempt += 1)); do
    set +e
    AUDIT_RESULT="$(mongo_audit "$mode" 2>"$TMP_DIR/audit.err")"
    status=$?
    set -e
    if [[ $status -eq 0 ]]; then return 0; fi
    if [[ $status -ne 75 ]]; then cat "$TMP_DIR/audit.err" >&2; return "$status"; fi
    sleep "$CLEANUP_POLL_INTERVAL"
  done
  printf 'cleanup worker did not finish within the bounded poll window\n' >&2
  return 75
}

assert_media_absent() {
  local media_url="$1" status separator='?'
  [[ "$media_url" == *'?'* ]] && separator='&'
  status="$(curl -sS -o /dev/null -H 'Cache-Control: no-cache' \
    --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
    -w '%{http_code}' "${media_url}${separator}policy-qa-deleted=${CANDIDATE_SHA}")" ||
    refuse 'Default banner absence probe failed; network errors are not deletion proof'
  case "$status" in
    '404' | '410') ;;
    '200') refuse 'Default banner media still exists after committed cleanup' ;;
    *) refuse "Default banner absence probe returned HTTP $status; expected 404 or 410" ;;
  esac
}

verify_involve_local_absent() {
  MONGO_URI="$MONGO_URI" INVOLVE_LOCAL_OFFER_ID="$1" \
    INVOLVE_QA_OFFER_ID="$INVOLVE_QA_OFFER_ID" node <<'NODE'
const mongoose = require('mongoose');
(async () => {
  if (!mongoose.Types.ObjectId.isValid(process.env.INVOLVE_LOCAL_OFFER_ID)) process.exit(2);
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
  const offers = mongoose.connection.db.collection('offers');
  const exact = await offers.countDocuments({
    _id: new mongoose.Types.ObjectId(process.env.INVOLVE_LOCAL_OFFER_ID),
  });
  const identity = await offers.countDocuments({
    source: 'involve', offer_id: Number(process.env.INVOLVE_QA_OFFER_ID),
  });
  if (exact !== 0 || identity !== 0) process.exitCode = 3;
})().catch((error) => { console.error(error.message); process.exitCode = 2; })
  .finally(() => mongoose.disconnect());
NODE
}

write_evidence() {
  local file="$1" payload="$2"
  EVIDENCE_PAYLOAD="$payload" QA_EVIDENCE_HMAC_KEY="$QA_EVIDENCE_HMAC_KEY" node <<'NODE' >"$file"
const { createHmac } = require('node:crypto');
const payload = JSON.parse(process.env.EVIDENCE_PAYLOAD);
const signature = createHmac('sha256', process.env.QA_EVIDENCE_HMAC_KEY)
  .update(JSON.stringify(payload)).digest('hex');
process.stdout.write(JSON.stringify({ ...payload, signature }, null, 2) + '\n');
NODE
}

write_atomic_evidence() {
  local file="$1" payload="$2" temporary="${file}.tmp.$$"
  [[ ! -L "$file" ]] || refuse 'refusing to replace a symlinked evidence file'
  write_evidence "$temporary" "$payload"
  chmod 600 "$temporary"
  mv -f "$temporary" "$file"
}

verify_involve_cleanup_checkpoint() {
  local file="$1"
  verify_evidence "$file" involve-local-cleanup-checkpoint "$ENVIRONMENT" \
    "$QA_MARKER" "$MONGO_TARGET_FINGERPRINT" || return 1
  CHECKPOINT_FILE="$file" CATEGORY_ID="$CATEGORY_ID" \
    SIGNED_INVOLVE_LOCAL_OFFER_ID="$SIGNED_INVOLVE_LOCAL_OFFER_ID" \
    INVOLVE_QA_OFFER_ID="$INVOLVE_QA_OFFER_ID" node -e '
      const {readFileSync}=require("node:fs");
      const row=JSON.parse(readFileSync(process.env.CHECKPOINT_FILE,"utf8"));
      if (row.category_id!==process.env.CATEGORY_ID ||
          row.involve_local_offer_id!==process.env.SIGNED_INVOLVE_LOCAL_OFFER_ID ||
          row.involve_qa_offer_id!==Number(process.env.INVOLVE_QA_OFFER_ID) ||
          row.local_fixture_removed!==true || row.absence_verified!==true)
        process.exit(2);
    '
}

if [[ "$PHASE" == 'prepare-retire' ]]; then
  CREATE_KEY="${QA_MARKER}-create"
  RENAME_KEY="${QA_MARKER}-rename"
  DELETE_KEY="${QA_MARKER}-delete-content"
  RETIRE_KEY="${QA_MARKER}-retire"
  RENAMED_MARKER="${QA_MARKER}-renamed"
  BANNER_FILE="$TMP_DIR/default-banner.png"
  BANNER_BASE64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
  BANNER_BASE64="$BANNER_BASE64" BANNER_FILE="$BANNER_FILE" node -e \
    'require("node:fs").writeFileSync(process.env.BANNER_FILE, Buffer.from(process.env.BANNER_BASE64, "base64"))'
  POLICY_JSON="$(QA_MARKER="$QA_MARKER" node -e '
    const marker=process.env.QA_MARKER;
    process.stdout.write(JSON.stringify({
      category_id:"__new__",
      terms:{primary_locale:"en",translations:{en:`Terms ${marker}`}},
      banner:{primary_locale:"en",translations:{en:`Banner ${marker}`}},
    }));
  ')"

  raw="$(curl -sS --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
    --config "$AUTH_CFG" -X PUT -F "request_key=$CREATE_KEY" \
    -F "category_name=$QA_MARKER" -F 'icon_key=travel' -F "policy=$POLICY_JSON" \
    -F "default_banner=@$BANNER_FILE;type=image/png" -w $'\n%{http_code}' \
    "$API_URL/policy/aggregate")"
  RESPONSE_STATUS="${raw##*$'\n'}"; RESPONSE_BODY="${raw%$'\n'*}"
  [[ "$RESPONSE_STATUS" =~ ^20[01]$ ]] || refuse "aggregate create returned HTTP $RESPONSE_STATUS"
  CREATE_RESPONSE="$RESPONSE_BODY"
  CATEGORY_ID="$(printf '%s' "$CREATE_RESPONSE" | json_get category._id)"
  REVISION="$(printf '%s' "$CREATE_RESPONSE" | json_get category.revision)"
  BANNER_URL="$(printf '%s' "$CREATE_RESPONSE" | json_get category.banner)"
  [[ "$CATEGORY_ID" =~ ^[a-f0-9]{24}$ && "$REVISION" =~ ^[1-9][0-9]*$ && "$BANNER_URL" == https://* ]] ||
    refuse 'aggregate create omitted category, revision, or persisted Default banner'

  # Same bytes + same request key must be an aggregate replay, not a second write.
  raw="$(curl -sS --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
    --config "$AUTH_CFG" -X PUT -F "request_key=$CREATE_KEY" \
    -F "category_name=$QA_MARKER" -F 'icon_key=travel' -F "policy=$POLICY_JSON" \
    -F "default_banner=@$BANNER_FILE;type=image/png" -w $'\n%{http_code}' \
    "$API_URL/policy/aggregate")"
  RESPONSE_STATUS="${raw##*$'\n'}"; REPLAY_RESPONSE="${raw%$'\n'*}"
  [[ "$RESPONSE_STATUS" =~ ^20[01]$ ]] || refuse "aggregate replay returned HTTP $RESPONSE_STATUS"
  CREATE_RESPONSE="$CREATE_RESPONSE" REPLAY_RESPONSE="$REPLAY_RESPONSE" node -e '
    const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==="object"?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])):v);
    if (JSON.stringify(stable(JSON.parse(process.env.CREATE_RESPONSE))) !== JSON.stringify(stable(JSON.parse(process.env.REPLAY_RESPONSE)))) process.exit(2);
  ' || refuse 'aggregate replay response changed'

  request_json GET "/policy/category/$CATEGORY_ID"
  [[ "$RESPONSE_STATUS" == '200' ]] || refuse 'persisted policy cannot be read back'
  [[ "$(printf '%s' "$RESPONSE_BODY" | json_get banner.translations.en)" == "Banner $QA_MARKER" ]] ||
    refuse 'banner text persistence check failed'
  curl -fsS --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" "$BANNER_URL" >/dev/null ||
    refuse 'persisted Default banner URL is not readable'

  # Rename through the aggregate boundary so the original source key becomes a
  # retained alias. The real Admin UI phase runs after the reference-block test
  # so it can own the successful delete-content and retire mutations.
  RENAME_POLICY_JSON="$(CATEGORY_ID="$CATEGORY_ID" QA_MARKER="$QA_MARKER" node -e '
    process.stdout.write(JSON.stringify({
      category_id:process.env.CATEGORY_ID,
      banner:{primary_locale:"en",translations:{en:`Banner ${process.env.QA_MARKER}`}},
    }));
  ')"
  raw="$(curl -sS --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
    --config "$AUTH_CFG" -X PUT -F "request_key=$RENAME_KEY" \
    -F "category_id=$CATEGORY_ID" -F "category_name=$RENAMED_MARKER" \
    -F 'icon_key=travel' -F "policy=$RENAME_POLICY_JSON" \
    -w $'\n%{http_code}' "$API_URL/policy/aggregate")"
  RESPONSE_STATUS="${raw##*$'\n'}"; RESPONSE_BODY="${raw%$'\n'*}"
  [[ "$RESPONSE_STATUS" =~ ^20[01]$ ]] || refuse "retained alias rename returned HTTP $RESPONSE_STATUS"
  REVISION="$(printf '%s' "$RESPONSE_BODY" | json_get category.revision)"

  raw="$(curl -sS --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
    --config "$AUTH_CFG" -X POST -F "brand_name=${QA_MARKER}-reference" \
    -F "affiliate_tracking_link=https://example.invalid/$QA_MARKER" \
    -F "categories=$QA_MARKER" -F 'policy_category_id=custom' -F 'product_type=[]' \
    -w $'\n%{http_code}' "$API_URL/offer")"
  RESPONSE_STATUS="${raw##*$'\n'}"; RESPONSE_BODY="${raw%$'\n'*}"
  [[ "$RESPONSE_STATUS" =~ ^20[01]$ ]] || refuse "reference offer create returned HTTP $RESPONSE_STATUS"
  REFERENCE_OFFER_ID="$(printf '%s' "$RESPONSE_BODY" | json_get _id)"
  [[ "$REFERENCE_OFFER_ID" =~ ^[a-f0-9]{24}$ ]] || refuse 'reference offer id is missing'

  request_json GET '/offer/get-category/list'
  REVISION="$(printf '%s' "$RESPONSE_BODY" | CATEGORY_ID="$CATEGORY_ID" node -e '
    let input=""; process.stdin.on("data",c=>input+=c); process.stdin.on("end",()=>{
      const row=JSON.parse(input).find(x=>String(x._id)===process.env.CATEGORY_ID);
      if (!row?.revision) process.exit(2); process.stdout.write(String(row.revision));
    });
  ')" || refuse 'current category revision cannot be read'
  retire_body="$(json_body "${QA_MARKER}-referenced-retire" "$REVISION")"
  request_json POST "/policy/category/$CATEGORY_ID/retire" "$retire_body"
  [[ "$RESPONSE_STATUS" == '409' ]] || refuse "referenced retire must return exact HTTP 409, got $RESPONSE_STATUS"
  RESPONSE_BODY="$RESPONSE_BODY" node -e '
    const body=JSON.parse(process.env.RESPONSE_BODY);
    const counts=body.reference_counts;
    if (body.code!=="POLICY_CATEGORY_REFERENCED" || counts?.offer_policy_category_id!==0 ||
        counts?.offer_categories_normalized!==1 || counts?.unique_offers!==1) process.exit(2);
  ' || refuse 'POLICY_CATEGORY_REFERENCED counts did not prove the retained alias reference'

  request_json DELETE "/offer/$REFERENCE_OFFER_ID"
  [[ "$RESPONSE_STATUS" == '200' ]] || refuse 'reference offer cleanup failed'
  REFERENCE_OFFER_ID=''

  PLAYWRIGHT_CONFIG="$TMP_DIR/playwright.config.cjs"
  POLICY_QA_UI_RESULT_FILE="$TMP_DIR/policy-category-ui-result.json"
  cat >"$PLAYWRIGHT_CONFIG" <<'EOF'
const { defineConfig, devices } = require('@playwright/test');
const path = require('node:path');
module.exports = defineConfig({
  testDir: path.join(process.env.POLICY_QA_REPO_ROOT, 'e2e/cross-system'),
  testMatch: 'policy-category-integrity-ui.spec.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: { ...devices['Desktop Chrome'], trace: 'on-first-retry' },
});
EOF
  (
    cd "$REPO_ROOT"
    POLICY_QA_UI_EXECUTE=1 POLICY_QA_ENVIRONMENT="$ENVIRONMENT" \
      POLICY_QA_REPO_ROOT="$REPO_ROOT" POLICY_QA_ADMIN_URL="$ADMIN_URL" \
      POLICY_QA_CANDIDATE_SHA="$CANDIDATE_SHA" POLICY_QA_MARKER="$RENAMED_MARKER" \
      POLICY_QA_ORIGINAL_MARKER="$QA_MARKER" POLICY_QA_CATEGORY_ID="$CATEGORY_ID" \
      POLICY_QA_UI_RESULT_FILE="$POLICY_QA_UI_RESULT_FILE" \
      POLICY_QA_ADMIN_EMAIL="$ADMIN_UI_EMAIL" POLICY_QA_ADMIN_PASSWORD="$ADMIN_UI_PASSWORD" \
      NODE_PATH="$REPO_ROOT/node_modules" \
      npx playwright test --config="$PLAYWRIGHT_CONFIG"
  )
  [[ -s "$POLICY_QA_UI_RESULT_FILE" ]] || refuse 'Admin UI did not emit its exact proxy exchange evidence'
  UI_RESULT="$(<"$POLICY_QA_UI_RESULT_FILE")"
  UI_RESULT="$UI_RESULT" ENVIRONMENT="$ENVIRONMENT" CANDIDATE_SHA="$CANDIDATE_SHA" \
    RENAMED_MARKER="$RENAMED_MARKER" CATEGORY_ID="$CATEGORY_ID" node -e '
      const row=JSON.parse(process.env.UI_RESULT);
      if (row.schema!=="gogocash.policy-category-ui.v1" || row.environment!==process.env.ENVIRONMENT ||
          row.candidate_sha!==process.env.CANDIDATE_SHA || row.marker!==process.env.RENAMED_MARKER ||
          row.category_id!==process.env.CATEGORY_ID || row.delete_content?.response?.operation!=="delete-content" ||
          row.retire?.response?.operation!=="retire") process.exit(2);
    ' || refuse 'Admin UI proxy exchange evidence is invalid or from another target'
  DELETE_KEY="$(printf '%s' "$UI_RESULT" | json_get delete_content.request.request_key)"
  DELETE_EXPECTED_REVISION="$(printf '%s' "$UI_RESULT" | json_get delete_content.request.expected_revision)"
  DELETE_RESPONSE="$(UI_RESULT="$UI_RESULT" node -e 'process.stdout.write(JSON.stringify(JSON.parse(process.env.UI_RESULT).delete_content.response))')"
  RETIRE_KEY="$(printf '%s' "$UI_RESULT" | json_get retire.request.request_key)"
  RETIRE_EXPECTED_REVISION="$(printf '%s' "$UI_RESULT" | json_get retire.request.expected_revision)"
  RETIRE_RESPONSE="$(UI_RESULT="$UI_RESULT" node -e 'process.stdout.write(JSON.stringify(JSON.parse(process.env.UI_RESULT).retire.response))')"
  [[ "$DELETE_KEY" == policy-lifecycle-* && "$RETIRE_KEY" == policy-lifecycle-* ]] ||
    refuse 'Admin UI lifecycle request keys are not marker-owned one-shot commands'
  [[ "$(printf '%s' "$DELETE_RESPONSE" | json_get category.icon_key)" == 'travel' ]] || refuse 'delete-content lost icon'
  [[ "$(printf '%s' "$DELETE_RESPONSE" | json_get cleanup_scheduled)" =~ ^[1-9][0-9]*$ ]] || refuse 'delete-content did not schedule Default banner cleanup'
  [[ "$(printf '%s' "$RETIRE_RESPONSE" | json_get category.lifecycle_status)" == 'retired' ]] || refuse 'retire lifecycle mismatch'
  [[ "$(printf '%s' "$RETIRE_RESPONSE" | json_get reference_counts.unique_offers)" == '0' ]] || refuse 'retire did not prove zero references'
  REVISION="$(printf '%s' "$RETIRE_RESPONSE" | json_get category.revision)"
  PURGE_AFTER="$(printf '%s' "$RETIRE_RESPONSE" | json_get category.purge_after)"
  RETIRED=1

  # Replay the exact UI commands through the API and require byte-equivalent
  # JSON semantics; the first execution itself was proven on the Admin BFF.
  delete_body="$(json_body "$DELETE_KEY" "$DELETE_EXPECTED_REVISION")"
  request_json POST "/policy/category/$CATEGORY_ID/delete-content" "$delete_body"
  [[ "$RESPONSE_STATUS" == '201' ]] || refuse 'delete-content replay failed'
  EXPECTED_RESPONSE="$DELETE_RESPONSE" ACTUAL_RESPONSE="$RESPONSE_BODY" node -e '
    const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==="object"?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])):v);
    if (JSON.stringify(stable(JSON.parse(process.env.EXPECTED_RESPONSE)))!==JSON.stringify(stable(JSON.parse(process.env.ACTUAL_RESPONSE)))) process.exit(2);
  ' || refuse 'delete-content replay changed response'

  retire_body="$(json_body "$RETIRE_KEY" "$RETIRE_EXPECTED_REVISION")"
  request_json POST "/policy/category/$CATEGORY_ID/retire" "$retire_body"
  [[ "$RESPONSE_STATUS" == '201' ]] || refuse 'retire replay failed'
  EXPECTED_RESPONSE="$RETIRE_RESPONSE" ACTUAL_RESPONSE="$RESPONSE_BODY" node -e '
    const stable=v=>Array.isArray(v)?v.map(stable):(v&&typeof v==="object"?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,stable(x)])):v);
    if (JSON.stringify(stable(JSON.parse(process.env.EXPECTED_RESPONSE)))!==JSON.stringify(stable(JSON.parse(process.env.ACTUAL_RESPONSE)))) process.exit(2);
  ' || refuse 'retire replay changed response'

  request_json GET '/offer/get-category/list'
  RESPONSE_BODY="$RESPONSE_BODY" CATEGORY_ID="$CATEGORY_ID" node -e '
    const rows=JSON.parse(process.env.RESPONSE_BODY);
    if (rows.some(row=>String(row._id)===process.env.CATEGORY_ID)) process.exit(2);
  ' || refuse 'selector exclusion failed for active category list'
  request_json GET '/policy/category-list'
  RESPONSE_BODY="$RESPONSE_BODY" CATEGORY_ID="$CATEGORY_ID" node -e '
    const rows=JSON.parse(process.env.RESPONSE_BODY);
    if (rows.some(row=>String(row.category_id)===process.env.CATEGORY_ID)) process.exit(2);
  ' || refuse 'selector exclusion failed for active policy list'

  request_json GET '/involve'
  [[ "$RESPONSE_STATUS" == '200' ]] || refuse "controlled Involve sync returned HTTP $RESPONSE_STATUS"
  RESPONSE_BODY="$RESPONSE_BODY" INVOLVE_QA_OFFER_ID="$INVOLVE_QA_OFFER_ID" QA_MARKER="$QA_MARKER" node -e '
    const rows=JSON.parse(process.env.RESPONSE_BODY);
    const row=rows.find(x=>String(x.offer_id)===process.env.INVOLVE_QA_OFFER_ID);
    if (!row || row.categories!==process.env.QA_MARKER) process.exit(2);
  ' || refuse 'controlled upstream Involve fixture was not returned with the marker raw category'
  INVOLVE_LOCAL_OFFER_ID="$(mongo_audit involve-seeded)" || refuse 'Involve raw preservation/no-resurrection audit failed'

  # The reviewed hook owns provider-side removal and must itself query Involve
  # after removal. Its signed evidence is verified before the sync below; this
  # makes provider cleanup deterministic rather than a manual purge-day claim.
  UPSTREAM_REMOVAL_EVIDENCE_FILE="$TMP_DIR/upstream-removal.json"
  ENVIRONMENT="$ENVIRONMENT" CANDIDATE_SHA="$CANDIDATE_SHA" \
    MONGO_TARGET_FINGERPRINT="$MONGO_TARGET_FINGERPRINT" QA_MARKER="$QA_MARKER" \
    INVOLVE_QA_OFFER_ID="$INVOLVE_QA_OFFER_ID" \
    INVOLVE_REMOVE_HOOK_SHA256="$INVOLVE_REMOVE_HOOK_SHA256" \
    INVOLVE_REMOVE_CONFIRM="$INVOLVE_REMOVE_CONFIRM" \
    QA_EVIDENCE_HMAC_KEY="$QA_EVIDENCE_HMAC_KEY" \
    "$INVOLVE_REMOVE_HOOK_PATH" >"$UPSTREAM_REMOVAL_EVIDENCE_FILE" ||
    refuse 'controlled upstream removal hook failed'
  [[ -s "$UPSTREAM_REMOVAL_EVIDENCE_FILE" ]] ||
    refuse 'controlled upstream removal hook emitted no signed evidence'
  verify_evidence "$UPSTREAM_REMOVAL_EVIDENCE_FILE" upstream-removal "$ENVIRONMENT" "$QA_MARKER" "$MONGO_TARGET_FINGERPRINT" ||
    refuse 'upstream removal evidence signature or target binding is invalid'
  REMOVAL_EVIDENCE="$(<"$UPSTREAM_REMOVAL_EVIDENCE_FILE")"
  REMOVAL_EVIDENCE="$REMOVAL_EVIDENCE" INVOLVE_QA_OFFER_ID="$INVOLVE_QA_OFFER_ID" \
    INVOLVE_REMOVE_HOOK_SHA256="$INVOLVE_REMOVE_HOOK_SHA256" node -e '
      const row=JSON.parse(process.env.REMOVAL_EVIDENCE);
      if (row.involve_qa_offer_id!==Number(process.env.INVOLVE_QA_OFFER_ID) ||
          row.hook_sha256!==process.env.INVOLVE_REMOVE_HOOK_SHA256 ||
          row.upstream_removed!==true || row.upstream_absent_verified!==true) process.exit(2);
    ' || refuse 'upstream removal hook did not prove exact provider absence'

  # Involve sync disables vanished rows; it does not delete them. Prove the
  # upstream row stays absent, then retain the exact disabled local fixture for
  # the separately authorized post-grace cleanup.
  request_json GET '/involve'
  [[ "$RESPONSE_STATUS" == '200' ]] || refuse 'post-removal Involve sync failed'
  RESPONSE_BODY="$RESPONSE_BODY" INVOLVE_QA_OFFER_ID="$INVOLVE_QA_OFFER_ID" node -e '
    const rows=JSON.parse(process.env.RESPONSE_BODY);
    if (rows.some(x=>String(x.offer_id)===process.env.INVOLVE_QA_OFFER_ID)) process.exit(2);
  ' || refuse 'removed upstream Involve fixture resurrected during sync'
  DISABLED_LOCAL_FIXTURE="$(mongo_audit involve-disabled)" ||
    refuse 'disabled local fixture/no-resurrection audit failed'

  wait_for_audit retired-clean || refuse 'compensation/no-orphans cleanup audit failed'
  assert_media_absent "$BANNER_URL"

  mkdir -p "$EVIDENCE_DIR"
  EVIDENCE_FILE="$EVIDENCE_DIR/${QA_MARKER}-prepare-retire.json"
  PAYLOAD="$(ENVIRONMENT="$ENVIRONMENT" CANDIDATE_SHA="$CANDIDATE_SHA" \
    MONGO_TARGET_FINGERPRINT="$MONGO_TARGET_FINGERPRINT" QA_MARKER="$QA_MARKER" \
    QA_OWNER="$QA_OWNER" CATEGORY_ID="$CATEGORY_ID" RETIRED_REVISION="$REVISION" \
    PURGE_AFTER="$PURGE_AFTER" BANNER_URL="$BANNER_URL" INVOLVE_QA_OFFER_ID="$INVOLVE_QA_OFFER_ID" \
    INVOLVE_LOCAL_OFFER_ID="$INVOLVE_LOCAL_OFFER_ID" DELETE_KEY="$DELETE_KEY" RETIRE_KEY="$RETIRE_KEY" \
    REMOVAL_EVIDENCE="$REMOVAL_EVIDENCE" DISABLED_LOCAL_FIXTURE="$DISABLED_LOCAL_FIXTURE" \
    FAILURE_INJECTION_EVIDENCE="$FAILURE_INJECTION_EVIDENCE" AUDIT_RESULT="$AUDIT_RESULT" node -e '
      process.stdout.write(JSON.stringify({
        schema:"gogocash.policy-category-qa.v2", phase:"prepare-retire", passed:true,
        environment:process.env.ENVIRONMENT, candidate_sha:process.env.CANDIDATE_SHA,
        mongo_target_fingerprint:process.env.MONGO_TARGET_FINGERPRINT,
        marker:process.env.QA_MARKER, owner:process.env.QA_OWNER,
        category_id:process.env.CATEGORY_ID, retired_revision:Number(process.env.RETIRED_REVISION),
        purge_after:process.env.PURGE_AFTER, default_banner_url:process.env.BANNER_URL,
        involve_qa_offer_id:Number(process.env.INVOLVE_QA_OFFER_ID),
        involve_local_offer_id:process.env.INVOLVE_LOCAL_OFFER_ID,
        upstream_removal_evidence:JSON.parse(process.env.REMOVAL_EVIDENCE),
        disabled_local_fixture:JSON.parse(process.env.DISABLED_LOCAL_FIXTURE),
        failure_injection_evidence:JSON.parse(process.env.FAILURE_INJECTION_EVIDENCE),
        request_keys:[`${process.env.QA_MARKER}-create`,`${process.env.QA_MARKER}-rename`,process.env.DELETE_KEY,process.env.RETIRE_KEY],
        reference_counts:{offer_policy_category_id:0,offer_categories_normalized:1,unique_offers:1},
        cleanup_audit:JSON.parse(process.env.AUDIT_RESULT), bearer_token_recorded:false,
        completed_at:new Date().toISOString(),
      }));
    ')"
  write_atomic_evidence "$EVIDENCE_FILE" "$PAYLOAD"
  printf 'PASS: prepare-retire completed; category is retained only as tombstoned identity.\n'
  printf 'Evidence: %s\n' "$EVIDENCE_FILE"
  exit 0
fi

# Separately authorized post-retention purge/final-cleanup phase.
REQUESTED_INVOLVE_QA_OFFER_ID="$INVOLVE_QA_OFFER_ID"
read -r CATEGORY_ID REVISION PURGE_AFTER BANNER_URL EVIDENCE_INVOLVE_QA_OFFER_ID INVOLVE_LOCAL_OFFER_ID < <(
  PREPARE_EVIDENCE_FILE="$PREPARE_EVIDENCE_FILE" node -e '
    const { readFileSync }=require("node:fs");
    const r=JSON.parse(readFileSync(process.env.PREPARE_EVIDENCE_FILE,"utf8"));
    process.stdout.write([r.category_id,r.retired_revision,r.purge_after,r.default_banner_url,r.involve_qa_offer_id,r.involve_local_offer_id].join(" ") + "\n");
  '
) || refuse 'prepare evidence payload cannot be read'
INVOLVE_QA_OFFER_ID="$EVIDENCE_INVOLVE_QA_OFFER_ID"
[[ "$INVOLVE_QA_OFFER_ID" == "$REQUESTED_INVOLVE_QA_OFFER_ID" ]] ||
  refuse 'INVOLVE_QA_OFFER_ID does not match signed prepare evidence'
RENAMED_MARKER="${QA_MARKER}-renamed"
[[ "$CATEGORY_ID" =~ ^[a-f0-9]{24}$ && "$INVOLVE_LOCAL_OFFER_ID" =~ ^[a-f0-9]{24}$ && "$REVISION" =~ ^[1-9][0-9]*$ ]] ||
  refuse 'prepare evidence lifecycle or signed local fixture identity is invalid'
UPSTREAM_REMOVAL_EVIDENCE_FILE="$TMP_DIR/upstream-removal-from-prepare.json"
PREPARE_EVIDENCE_FILE="$PREPARE_EVIDENCE_FILE" UPSTREAM_REMOVAL_EVIDENCE_FILE="$UPSTREAM_REMOVAL_EVIDENCE_FILE" node -e '
  const {readFileSync,writeFileSync}=require("node:fs");
  const row=JSON.parse(readFileSync(process.env.PREPARE_EVIDENCE_FILE,"utf8"));
  writeFileSync(process.env.UPSTREAM_REMOVAL_EVIDENCE_FILE, JSON.stringify(row.upstream_removal_evidence)+"\n", {mode:0o600});
' || refuse 'signed prepare evidence omits upstream removal evidence'
verify_evidence "$UPSTREAM_REMOVAL_EVIDENCE_FILE" upstream-removal "$ENVIRONMENT" "$QA_MARKER" "$MONGO_TARGET_FINGERPRINT" ||
  refuse 'embedded upstream removal evidence is invalid or stale'
REMOVAL_EVIDENCE="$(<"$UPSTREAM_REMOVAL_EVIDENCE_FILE")"
REMOVAL_EVIDENCE="$REMOVAL_EVIDENCE" INVOLVE_QA_OFFER_ID="$INVOLVE_QA_OFFER_ID" node -e '
  const row=JSON.parse(process.env.REMOVAL_EVIDENCE);
  if (row.involve_qa_offer_id!==Number(process.env.INVOLVE_QA_OFFER_ID) ||
      row.upstream_removed!==true || row.upstream_absent_verified!==true) process.exit(2);
' || refuse 'embedded removal evidence does not prove exact upstream absence'
PURGE_AFTER="$PURGE_AFTER" node -e '
  const due=Date.parse(process.env.PURGE_AFTER);
  if (!Number.isFinite(due) || due > Date.now()) process.exit(2);
' || refuse 'purge_after has not elapsed'

request_json GET '/involve'
[[ "$RESPONSE_STATUS" == '200' ]] || refuse 'post-removal Involve sync failed'
RESPONSE_BODY="$RESPONSE_BODY" INVOLVE_QA_OFFER_ID="$INVOLVE_QA_OFFER_ID" node -e '
  const rows=JSON.parse(process.env.RESPONSE_BODY);
  if (rows.some(x=>String(x.offer_id)===process.env.INVOLVE_QA_OFFER_ID)) process.exit(2);
' || refuse 'upstream Involve marker fixture still exists; purge is forbidden'

# Sync only disables vanished offers. Delete and verify the exact signed local
# fixture, then durably checkpoint that absence before the purge request. A
# rerun accepts only the same signed checkpoint or the already-absent exact row
# bound by signed prepare evidence; a changed extant row still fails closed.
SIGNED_INVOLVE_LOCAL_OFFER_ID="$INVOLVE_LOCAL_OFFER_ID"
mkdir -p "$EVIDENCE_DIR"
INVOLVE_CLEANUP_CHECKPOINT_FILE="$EVIDENCE_DIR/${QA_MARKER}-involve-local-cleanup-checkpoint.json"
if [[ -f "$INVOLVE_CLEANUP_CHECKPOINT_FILE" ]]; then
  verify_involve_cleanup_checkpoint "$INVOLVE_CLEANUP_CHECKPOINT_FILE" ||
    refuse 'existing exact local Involve cleanup checkpoint is invalid'
  verify_involve_local_absent "$SIGNED_INVOLVE_LOCAL_OFFER_ID" ||
    refuse 'checkpointed exact local Involve fixture is no longer absent'
else
  set +e
  mongo_audit involve-disabled >/dev/null 2>"$TMP_DIR/involve-disabled.err"
  involve_fixture_status=$?
  set -e
  if [[ $involve_fixture_status -eq 0 ]]; then
    request_json DELETE "/offer/$SIGNED_INVOLVE_LOCAL_OFFER_ID"
    [[ "$RESPONSE_STATUS" == '200' ]] || refuse 'exact signed local Involve fixture cleanup failed'
    verify_involve_local_absent "$SIGNED_INVOLVE_LOCAL_OFFER_ID" ||
      refuse 'exact signed local Involve fixture remains after cleanup'
  elif verify_involve_local_absent "$SIGNED_INVOLVE_LOCAL_OFFER_ID"; then
    # A prior run can terminate after the exact delete succeeds but before the
    # checkpoint rename. Signed prepare evidence still supplies the exact row
    # identity; verified total absence is safe and idempotent to checkpoint.
    :
  else
    cat "$TMP_DIR/involve-disabled.err" >&2
    refuse 'signed disabled local fixture changed before post-grace cleanup'
  fi
  INVOLVE_CLEANUP_CHECKPOINT_PAYLOAD="$(ENVIRONMENT="$ENVIRONMENT" \
    CANDIDATE_SHA="$CANDIDATE_SHA" MONGO_TARGET_FINGERPRINT="$MONGO_TARGET_FINGERPRINT" \
    QA_MARKER="$QA_MARKER" QA_OWNER="$QA_OWNER" CATEGORY_ID="$CATEGORY_ID" \
    SIGNED_INVOLVE_LOCAL_OFFER_ID="$SIGNED_INVOLVE_LOCAL_OFFER_ID" \
    INVOLVE_QA_OFFER_ID="$INVOLVE_QA_OFFER_ID" node -e '
      process.stdout.write(JSON.stringify({
        schema:"gogocash.policy-category-qa.v2", phase:"involve-local-cleanup-checkpoint", passed:true,
        environment:process.env.ENVIRONMENT, candidate_sha:process.env.CANDIDATE_SHA,
        mongo_target_fingerprint:process.env.MONGO_TARGET_FINGERPRINT,
        marker:process.env.QA_MARKER, owner:process.env.QA_OWNER,
        category_id:process.env.CATEGORY_ID,
        involve_local_offer_id:process.env.SIGNED_INVOLVE_LOCAL_OFFER_ID,
        involve_qa_offer_id:Number(process.env.INVOLVE_QA_OFFER_ID),
        local_fixture_removed:true, absence_verified:true,
        bearer_token_recorded:false, committed_at:new Date().toISOString(),
      }));
    ')"
  write_atomic_evidence "$INVOLVE_CLEANUP_CHECKPOINT_FILE" "$INVOLVE_CLEANUP_CHECKPOINT_PAYLOAD"
  verify_involve_cleanup_checkpoint "$INVOLVE_CLEANUP_CHECKPOINT_FILE" ||
    refuse 'new exact local Involve cleanup checkpoint cannot be verified'
fi
INVOLVE_LOCAL_OFFER_ID=''

purge_body="$(json_body "${QA_MARKER}-purge" "$REVISION")"
PURGE_CHECKPOINT_FILE="$EVIDENCE_DIR/${QA_MARKER}-purge-checkpoint.json"
if [[ -f "$PURGE_CHECKPOINT_FILE" ]]; then
  verify_evidence "$PURGE_CHECKPOINT_FILE" purge-checkpoint "$ENVIRONMENT" "$QA_MARKER" "$MONGO_TARGET_FINGERPRINT" ||
    refuse 'existing purge checkpoint is invalid'
else
  request_json POST "/policy/category/$CATEGORY_ID/purge" "$purge_body"
  [[ "$RESPONSE_STATUS" == '201' ]] || refuse "purge returned HTTP $RESPONSE_STATUS"
  [[ "$(printf '%s' "$RESPONSE_BODY" | json_get purged)" == 'true' ]] || refuse 'purge response did not confirm deletion'
  CHECKPOINT_PAYLOAD="$(ENVIRONMENT="$ENVIRONMENT" CANDIDATE_SHA="$CANDIDATE_SHA" \
    MONGO_TARGET_FINGERPRINT="$MONGO_TARGET_FINGERPRINT" QA_MARKER="$QA_MARKER" \
    QA_OWNER="$QA_OWNER" CATEGORY_ID="$CATEGORY_ID" node -e '
      process.stdout.write(JSON.stringify({
        schema:"gogocash.policy-category-qa.v2", phase:"purge-checkpoint", passed:true,
        environment:process.env.ENVIRONMENT, candidate_sha:process.env.CANDIDATE_SHA,
        mongo_target_fingerprint:process.env.MONGO_TARGET_FINGERPRINT,
        marker:process.env.QA_MARKER, owner:process.env.QA_OWNER,
        category_id:process.env.CATEGORY_ID, bearer_token_recorded:false,
        committed_at:new Date().toISOString(),
      }));
    ')"
  write_atomic_evidence "$PURGE_CHECKPOINT_FILE" "$CHECKPOINT_PAYLOAD"
fi

wait_for_audit final-clean || refuse 'final marker-owned cleanup/tombstone audit failed'
assert_media_absent "$BANNER_URL"

EVIDENCE_FILE="$EVIDENCE_DIR/${QA_MARKER}-purge.json"
INVOLVE_CLEANUP_CHECKPOINT="$(<"$INVOLVE_CLEANUP_CHECKPOINT_FILE")"
PAYLOAD="$(ENVIRONMENT="$ENVIRONMENT" CANDIDATE_SHA="$CANDIDATE_SHA" \
  MONGO_TARGET_FINGERPRINT="$MONGO_TARGET_FINGERPRINT" QA_MARKER="$QA_MARKER" \
  QA_OWNER="$QA_OWNER" CATEGORY_ID="$CATEGORY_ID" AUDIT_RESULT="$AUDIT_RESULT" \
  SIGNED_INVOLVE_LOCAL_OFFER_ID="$SIGNED_INVOLVE_LOCAL_OFFER_ID" \
  INVOLVE_CLEANUP_CHECKPOINT="$INVOLVE_CLEANUP_CHECKPOINT" node -e '
    process.stdout.write(JSON.stringify({
      schema:"gogocash.policy-category-qa.v2", phase:"purge", passed:true,
      environment:process.env.ENVIRONMENT, candidate_sha:process.env.CANDIDATE_SHA,
      mongo_target_fingerprint:process.env.MONGO_TARGET_FINGERPRINT,
      marker:process.env.QA_MARKER, owner:process.env.QA_OWNER,
      category_id:process.env.CATEGORY_ID, final_audit:JSON.parse(process.env.AUDIT_RESULT),
      involve_local_offer_id:process.env.SIGNED_INVOLVE_LOCAL_OFFER_ID,
      local_fixture_removed:true,
      local_cleanup_checkpoint:JSON.parse(process.env.INVOLVE_CLEANUP_CHECKPOINT),
      bearer_token_recorded:false, completed_at:new Date().toISOString(),
    }));
  ')"
write_atomic_evidence "$EVIDENCE_FILE" "$PAYLOAD"
rm -f "$PURGE_CHECKPOINT_FILE" "$INVOLVE_CLEANUP_CHECKPOINT_FILE"
printf 'PASS: post-retention purge and final marker-owned cleanup completed.\n'
printf 'Evidence: %s\n' "$EVIDENCE_FILE"
