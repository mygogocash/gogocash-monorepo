#!/usr/bin/env bash
# Guarded dev/staging proof for the after-Put/before-commit policy failure path.

set -Eeuo pipefail

if [[ "${EXECUTE:-0}" != '1' ]]; then
  cat <<'EOF'
Policy after-Put failure QA plan (DRY RUN ONLY; NO NETWORK; NO WRITES)

With every explicit gate present, this harness verifies the deployed revision,
arms one signed short-lived failure, uploads one marker-owned Default banner,
expects the aggregate to fail after Put but before Mongo commit, always disarms,
then proves the command failed cleanly, no category/policy committed, the exact
object returns 404/410, and no unresolved cleanup debt remains.
EOF
  exit 0
fi

refuse() {
  printf 'REFUSED: %s\n' "$1" >&2
  exit 64
}

ENVIRONMENT="${ENVIRONMENT:-}"
API_URL="${API_URL:-}"
CANDIDATE_SHA="${CANDIDATE_SHA:-}"
FAILURE_MARKER="${FAILURE_MARKER:-}"
FAILURE_REQUEST_KEY="${FAILURE_REQUEST_KEY:-}"
POLICY_QA_FAILURE_INJECTION_SECRET="${POLICY_QA_FAILURE_INJECTION_SECRET:-}"
POLICY_QA_FAILURE_CONFIRM="${POLICY_QA_FAILURE_CONFIRM:-}"
MONGO_URI="${MONGO_URI:-}"
MONGO_TARGET_FINGERPRINT="${MONGO_TARGET_FINGERPRINT:-}"
ADMIN_JWT="${ADMIN_JWT:-}"
QA_EVIDENCE_HMAC_KEY="${QA_EVIDENCE_HMAC_KEY:-}"
FAILURE_EVIDENCE_FILE="${FAILURE_EVIDENCE_FILE:-}"
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-10}"
MAX_TIME="${MAX_TIME:-45}"
FAILURE_TTL_SECONDS="${FAILURE_TTL_SECONDS:-60}"
CLEANUP_POLL_ATTEMPTS="${CLEANUP_POLL_ATTEMPTS:-72}"
CLEANUP_POLL_INTERVAL="${CLEANUP_POLL_INTERVAL:-10}"

case "$ENVIRONMENT" in
  dev) EXPECTED_API_URL='https://api.dev.gogocash.co' ;;
  staging) EXPECTED_API_URL='https://api-staging.gogocash.co' ;;
  *) refuse 'ENVIRONMENT must be dev or staging' ;;
esac

[[ "$API_URL" == "$EXPECTED_API_URL" ]] ||
  refuse "API_URL must exactly equal $EXPECTED_API_URL"
[[ "$API_URL" != *'api.gogocash.co'* ]] || refuse 'production API is forbidden'
[[ "$CANDIDATE_SHA" =~ ^[a-f0-9]{40}$ ]] ||
  refuse 'CANDIDATE_SHA must be an exact lowercase 40-character Git SHA'
[[ "$FAILURE_MARKER" =~ ^policy-qa-${ENVIRONMENT}-[a-z0-9-]{3,96}$ ]] ||
  refuse 'FAILURE_MARKER is not owned by the declared environment'
[[ "$FAILURE_REQUEST_KEY" =~ ^[a-z0-9][a-z0-9:-]{9,179}$ && "$FAILURE_REQUEST_KEY" == "${FAILURE_MARKER}-"* ]] ||
  refuse 'FAILURE_REQUEST_KEY must be an exact marker-owned request key'
[[ ${#POLICY_QA_FAILURE_INJECTION_SECRET} -ge 32 ]] ||
  refuse 'POLICY_QA_FAILURE_INJECTION_SECRET must contain at least 32 characters'
[[ -n "$ADMIN_JWT" ]] || refuse 'ADMIN_JWT with support-or-higher access is required'
[[ -n "$MONGO_URI" ]] || refuse 'MONGO_URI with an explicit database is required'
[[ "$MONGO_TARGET_FINGERPRINT" =~ ^[a-f0-9]{16}$ ]] ||
  refuse 'MONGO_TARGET_FINGERPRINT must be the reviewed 16-character fingerprint'
[[ ${#QA_EVIDENCE_HMAC_KEY} -ge 32 ]] ||
  refuse 'QA_EVIDENCE_HMAC_KEY must contain at least 32 characters'
[[ "$FAILURE_TTL_SECONDS" =~ ^[1-9][0-9]?$ && "$FAILURE_TTL_SECONDS" -le 60 ]] ||
  refuse 'FAILURE_TTL_SECONDS must be an integer from 1 to 60'
[[ "$CLEANUP_POLL_ATTEMPTS" =~ ^[1-9][0-9]*$ ]] || refuse 'invalid cleanup poll count'
[[ "$CLEANUP_POLL_INTERVAL" =~ ^[1-9][0-9]*$ ]] || refuse 'invalid cleanup poll interval'
EXPECTED_FAILURE_CONFIRM="run-policy-failure-injection:${ENVIRONMENT}:${CANDIDATE_SHA}:${FAILURE_MARKER}:${FAILURE_REQUEST_KEY}:${MONGO_TARGET_FINGERPRINT}"
[[ "$POLICY_QA_FAILURE_CONFIRM" == "$EXPECTED_FAILURE_CONFIRM" ]] ||
  refuse 'POLICY_QA_FAILURE_CONFIRM does not bind environment, SHA, marker, request, and target'
[[ -n "$FAILURE_EVIDENCE_FILE" && -d "$(dirname -- "$FAILURE_EVIDENCE_FILE")" ]] ||
  refuse 'FAILURE_EVIDENCE_FILE must be inside an existing directory'
[[ ! -L "$FAILURE_EVIDENCE_FILE" ]] || refuse 'FAILURE_EVIDENCE_FILE must not be a symlink'

command -v curl >/dev/null 2>&1 || refuse 'curl is required'
command -v node >/dev/null 2>&1 || refuse 'Node 24 is required'
[[ "$(node -p 'process.versions.node.split(".")[0]')" == '24' ]] ||
  refuse 'Node 24 is required'

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR/.." rev-parse --show-toplevel 2>/dev/null)" ||
  refuse 'QA must run from a Git checkout'
LOCAL_SHA="$(git -C "$REPO_ROOT" rev-parse --verify HEAD 2>/dev/null)" ||
  refuse 'local Git revision cannot be resolved'
[[ "$LOCAL_SHA" == "$CANDIDATE_SHA" ]] ||
  refuse 'local QA checkout does not match CANDIDATE_SHA'
git -C "$REPO_ROOT" ls-files --error-unmatch 'scripts/staging-policy-lifecycle-qa.sh' >/dev/null 2>&1 ||
  refuse 'failure QA script must be tracked by CANDIDATE_SHA'
git -C "$REPO_ROOT" diff --quiet HEAD -- 'scripts/staging-policy-lifecycle-qa.sh' ||
  refuse 'failure QA script must be identical to CANDIDATE_SHA'

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

# Deployment proof is always the first network request and precedes every arm.
DEPLOYMENT_PROOF="$(curl -fsS --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
  "$API_URL/offer/deployment-proof")" || refuse 'Railway deployment proof request failed'
DEPLOYMENT_PROOF="$DEPLOYMENT_PROOF" ENVIRONMENT="$ENVIRONMENT" CANDIDATE_SHA="$CANDIDATE_SHA" node -e '
  const row=JSON.parse(process.env.DEPLOYMENT_PROOF);
  if (row.schema!=="gogocash.deployment-revision.v1" || row.environment!==process.env.ENVIRONMENT ||
      row.revision!==process.env.CANDIDATE_SHA) process.exit(2);
' || refuse 'deployed environment or revision does not match the requested target'

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/policy-failure-qa.XXXXXX")"
AUTH_CFG="$TMP_DIR/auth.cfg"
chmod 700 "$TMP_DIR"
printf 'header = "Authorization: Bearer %s"\n' "$ADMIN_JWT" >"$AUTH_CFG"
chmod 600 "$AUTH_CFG"
ARM_ATTEMPTED=0
DISARMED=0
CONTROL_STATUS=''
CONTROL_BODY=''

failure_control_body() {
  local method="$1"
  METHOD="$method" ENVIRONMENT="$ENVIRONMENT" CANDIDATE_SHA="$CANDIDATE_SHA" \
    FAILURE_MARKER="$FAILURE_MARKER" FAILURE_REQUEST_KEY="$FAILURE_REQUEST_KEY" \
    FAILURE_TTL_SECONDS="$FAILURE_TTL_SECONDS" node -e '
      const body={
        environment:process.env.ENVIRONMENT,
        candidate_sha:process.env.CANDIDATE_SHA,
        marker:process.env.FAILURE_MARKER,
        request_key:process.env.FAILURE_REQUEST_KEY,
      };
      if (process.env.METHOD==="POST") Object.assign(body,{
        failure_point:"after-media-put-before-db-commit",
        ttl_seconds:Number(process.env.FAILURE_TTL_SECONDS),
        one_shot:true,
      });
      process.stdout.write(JSON.stringify(body));
    '
}

failure_control_confirmation() {
  local method="$1"
  METHOD="$method" ENVIRONMENT="$ENVIRONMENT" CANDIDATE_SHA="$CANDIDATE_SHA" \
    FAILURE_MARKER="$FAILURE_MARKER" FAILURE_REQUEST_KEY="$FAILURE_REQUEST_KEY" \
    FAILURE_TTL_SECONDS="$FAILURE_TTL_SECONDS" \
    POLICY_QA_FAILURE_INJECTION_SECRET="$POLICY_QA_FAILURE_INJECTION_SECRET" node -e '
      const {createHmac}=require("node:crypto");
      const fields=[process.env.METHOD,process.env.ENVIRONMENT,process.env.CANDIDATE_SHA,
        process.env.FAILURE_MARKER,process.env.FAILURE_REQUEST_KEY];
      if (process.env.METHOD==="POST") fields.push(
        "after-media-put-before-db-commit",process.env.FAILURE_TTL_SECONDS,"true");
      process.stdout.write(createHmac("sha256",process.env.POLICY_QA_FAILURE_INJECTION_SECRET)
        .update(fields.join("\n")).digest("hex"));
    '
}

request_failure_control() {
  local method="$1" body confirmation raw
  body="$(failure_control_body "$method")"
  confirmation="$(failure_control_confirmation "$method")"
  raw="$(printf '%s' "$body" | curl -sS --connect-timeout "$CONNECT_TIMEOUT" \
    --max-time "$MAX_TIME" --config "$AUTH_CFG" -H 'Content-Type: application/json' \
    -H "x-policy-qa-failure-confirmation: $confirmation" -X "$method" \
    --data-binary @- -w $'\n%{http_code}' "$API_URL/policy/qa/failure-injection")"
  CONTROL_STATUS="${raw##*$'\n'}"
  CONTROL_BODY="${raw%$'\n'*}"
}

disarm_failure_injection() {
  [[ "$DISARMED" == '1' ]] && return 0
  request_failure_control DELETE || return 1
  [[ "$CONTROL_STATUS" == '200' ]] || return 1
  CONTROL_BODY="$CONTROL_BODY" ENVIRONMENT="$ENVIRONMENT" CANDIDATE_SHA="$CANDIDATE_SHA" \
    FAILURE_MARKER="$FAILURE_MARKER" FAILURE_REQUEST_KEY="$FAILURE_REQUEST_KEY" node -e '
      const row=JSON.parse(process.env.CONTROL_BODY);
      if (row.environment!==process.env.ENVIRONMENT || row.candidate_sha!==process.env.CANDIDATE_SHA ||
          row.marker!==process.env.FAILURE_MARKER || row.request_key!==process.env.FAILURE_REQUEST_KEY ||
          typeof row.disarmed!=="boolean") process.exit(2);
    ' || return 1
  DISARMED=1
}

cleanup() {
  local code=$?
  trap - EXIT INT TERM
  set +e
  if [[ "$ARM_ATTEMPTED" == '1' && "$DISARMED" != '1' ]]; then
    if ! disarm_failure_injection >/dev/null 2>&1; then
      printf 'CLEANUP REQUIRED: failure injection disarm could not be confirmed for marker=%s request_key=%s\n' \
        "$FAILURE_MARKER" "$FAILURE_REQUEST_KEY" >&2
    fi
  fi
  rm -rf "$TMP_DIR"
  exit "$code"
}
trap cleanup EXIT INT TERM

ARM_ATTEMPTED=1
request_failure_control POST
[[ "$CONTROL_STATUS" == '201' ]] || refuse "failure injection arm returned HTTP $CONTROL_STATUS"
CONTROL_BODY="$CONTROL_BODY" ENVIRONMENT="$ENVIRONMENT" CANDIDATE_SHA="$CANDIDATE_SHA" \
  FAILURE_MARKER="$FAILURE_MARKER" FAILURE_REQUEST_KEY="$FAILURE_REQUEST_KEY" node -e '
    const row=JSON.parse(process.env.CONTROL_BODY);
    if (row.armed!==true || row.one_shot!==true || row.environment!==process.env.ENVIRONMENT ||
        row.candidate_sha!==process.env.CANDIDATE_SHA || row.marker!==process.env.FAILURE_MARKER ||
        row.request_key!==process.env.FAILURE_REQUEST_KEY ||
        row.failure_point!=="after-media-put-before-db-commit") process.exit(2);
  ' || refuse 'failure injection arm response is invalid'
BANNER_FILE="$TMP_DIR/after-put-banner.png"
BANNER_BASE64='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
BANNER_BASE64="$BANNER_BASE64" BANNER_FILE="$BANNER_FILE" node -e \
  'require("node:fs").writeFileSync(process.env.BANNER_FILE,Buffer.from(process.env.BANNER_BASE64,"base64"))'
POLICY_JSON="$(FAILURE_MARKER="$FAILURE_MARKER" node -e '
  process.stdout.write(JSON.stringify({
    category_id:"__new__",
    terms:{primary_locale:"en",translations:{en:`Failure terms ${process.env.FAILURE_MARKER}`}},
    banner:{primary_locale:"en",translations:{en:`Failure banner ${process.env.FAILURE_MARKER}`}},
  }));
')"

raw="$(curl -sS --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" \
  --config "$AUTH_CFG" -X PUT -F "request_key=$FAILURE_REQUEST_KEY" \
  -F "category_name=$FAILURE_MARKER" -F 'icon_key=travel' -F "policy=$POLICY_JSON" \
  -F "default_banner=@$BANNER_FILE;type=image/png" -w $'\n%{http_code}' \
  "$API_URL/policy/aggregate")"
AGGREGATE_STATUS="${raw##*$'\n'}"
[[ "$AGGREGATE_STATUS" == '500' ]] ||
  refuse "controlled after-Put aggregate must fail with HTTP 500, got $AGGREGATE_STATUS"

# The one-shot arm has been consumed, but DELETE is still mandatory so a
# mismatched/non-consumed arm can never survive a successful harness run.
disarm_failure_injection || refuse 'failure injection disarm failed'

audit_failure_command() {
  (
    cd "$REPO_ROOT"
    MONGO_URI="$MONGO_URI" FAILURE_MARKER="$FAILURE_MARKER" \
      FAILURE_REQUEST_KEY="$FAILURE_REQUEST_KEY" node <<'NODE'
const { createHash } = require('node:crypto');
const mongoose = require('mongoose');
const pending = (message) => { console.error(message); process.exitCode = 75; };
const fail = (message) => { console.error(message); process.exitCode = 2; };
(async () => {
  await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
  const db = mongoose.connection.db;
  const commands = db.collection('policy_lifecycle_commands');
  const categories = db.collection('categories');
  const policies = db.collection('policies');
  const cleanupRows = db.collection('policy_media_cleanup');
  const registries = db.collection('policy_media_asset_registry');
  const rows = await commands.find({ request_key: process.env.FAILURE_REQUEST_KEY }).toArray();
  if (rows.length === 0) return pending('failed command has not become visible yet');
  if (rows.length !== 1) return fail('exact request key resolved to multiple commands');
  const command = rows[0];
  if (command.status !== 'failed' || command.operation !== 'aggregate-save' ||
      typeof command.payload_hash !== 'string' || typeof command.attempt_token !== 'string' ||
      typeof command.last_error !== 'string') return pending('command.status !== \'failed\' or its exact fence is incomplete');
  const expectedFailure = 'Controlled policy QA failure after media upload and before database commit';
  if (command.last_error !== expectedFailure)
    return fail('failed command was not caused by the controlled after-Put injection');
  if (!mongoose.Types.ObjectId.isValid(command.category_id))
    return fail('failed command category fence is invalid');
  const categoryCount = await categories.countDocuments({
    $or: [{ _id: command.category_id }, { name_normalized: process.env.FAILURE_MARKER }],
  });
  const policyCount = await policies.countDocuments({ category_id: command.category_id });
  if (categoryCount !== 0 || policyCount !== 0) return fail('failed aggregate committed a category or policy');
  const cleanup = await cleanupRows.find({
    request_key: command.request_key,
    payload_hash: command.payload_hash,
    attempt_token: command.attempt_token,
    reason: 'precommit-failure',
  }).toArray();
  if (cleanup.length === 0) return pending('compensation cleanup journal is not visible yet');
  if (cleanup.length !== 1) return fail('exact command fence resolved to multiple cleanup rows');
  if (cleanup[0].status !== 'deleted' || cleanup[0].reconciliation_required === true)
    return pending("cleanup.status !== 'deleted' or unresolved cleanup debt remains");
  const unresolved = await cleanupRows.countDocuments({
    request_key: command.request_key,
    $or: [{ status: { $ne: 'deleted' } }, { reconciliation_required: true }],
  });
  if (unresolved !== 0) return pending('unresolved cleanup debt remains');
  const asset = cleanup[0].asset;
  if (!asset || asset.ownership !== 'command-owned' || asset.owner_key !== command.request_key ||
      asset.owner_attempt_token !== command.attempt_token || typeof asset.url !== 'string' ||
      typeof asset.object_key !== 'string' || typeof asset.sha256 !== 'string' ||
      typeof asset.bucket !== 'string') return fail('cleanup asset does not exactly match the failed command');
  const urlHash = createHash('sha256').update(asset.url).digest('hex');
  const registry = await registries.findOne({ url_hash: urlHash });
  if (!registry || registry.state !== 'deleted' || registry.owner_key !== command.request_key ||
      registry.owner_attempt_token !== command.attempt_token || registry.object_key !== asset.object_key ||
      registry.bucket !== asset.bucket || registry.content_sha256 !== asset.sha256)
    return pending("registry.state !== 'deleted' or its ownership fence is incomplete");
  process.stdout.write(JSON.stringify({
    request_key:command.request_key,
    category_id:String(command.category_id),
    command_status:command.status,
    failure_error:command.last_error,
    cleanup_status:cleanup[0].status,
    registry_state:registry.state,
    media_url:asset.url,
    object_key:asset.object_key,
    content_sha256:asset.sha256,
    unresolved_cleanup_debt:unresolved,
  }));
})().catch((error) => fail(error.message)).finally(() => mongoose.disconnect());
NODE
  )
}

AUDIT_RESULT=''
for ((attempt = 1; attempt <= CLEANUP_POLL_ATTEMPTS; attempt += 1)); do
  set +e
  AUDIT_RESULT="$(audit_failure_command 2>"$TMP_DIR/audit.err")"
  audit_status=$?
  set -e
  if [[ $audit_status -eq 0 ]]; then break; fi
  if [[ $audit_status -ne 75 ]]; then cat "$TMP_DIR/audit.err" >&2; refuse 'failed-command audit is invalid'; fi
  if [[ $attempt -eq $CLEANUP_POLL_ATTEMPTS ]]; then
    cat "$TMP_DIR/audit.err" >&2
    refuse 'cleanup did not converge within the bounded poll window'
  fi
  sleep "$CLEANUP_POLL_INTERVAL"
done

MEDIA_URL="$(printf '%s' "$AUDIT_RESULT" | node -e '
  let input=""; process.stdin.on("data",c=>input+=c); process.stdin.on("end",()=>{
    const row=JSON.parse(input); if (typeof row.media_url!=="string") process.exit(2);
    process.stdout.write(row.media_url);
  });
')" || refuse 'failed-command audit omitted the exact media URL'

assert_media_absent() {
  local media_url="$1" status separator='?'
  [[ "$media_url" == *'?'* ]] && separator='&'
  status="$(curl -sS -o /dev/null -H 'Cache-Control: no-cache' \
    --connect-timeout "$CONNECT_TIMEOUT" --max-time "$MAX_TIME" -w '%{http_code}' \
    "${media_url}${separator}policy-qa-deleted=${CANDIDATE_SHA}")" ||
    refuse 'compensated media absence probe failed; a network error is not deletion proof'
  case "$status" in
    '404' | '410') ;;
    *) refuse "compensated media returned HTTP $status; expected 404 or 410" ;;
  esac
}
assert_media_absent "$MEDIA_URL"

write_signed_evidence() {
  local file="$1" temporary="${file}.tmp.$$"
  ENVIRONMENT="$ENVIRONMENT" CANDIDATE_SHA="$CANDIDATE_SHA" \
    MONGO_TARGET_FINGERPRINT="$MONGO_TARGET_FINGERPRINT" FAILURE_MARKER="$FAILURE_MARKER" \
    FAILURE_REQUEST_KEY="$FAILURE_REQUEST_KEY" AUDIT_RESULT="$AUDIT_RESULT" \
    QA_EVIDENCE_HMAC_KEY="$QA_EVIDENCE_HMAC_KEY" node <<'NODE' >"$temporary"
const { createHmac } = require('node:crypto');
const payload={
  schema:"gogocash.policy-category-qa.v2", phase:"after-put-failure", passed:true,
  environment:process.env.ENVIRONMENT, candidate_sha:process.env.CANDIDATE_SHA,
  mongo_target_fingerprint:process.env.MONGO_TARGET_FINGERPRINT,
  marker:process.env.FAILURE_MARKER, request_key:process.env.FAILURE_REQUEST_KEY,
  failure_point:"after-media-put-before-db-commit", one_shot:true,
  audit:JSON.parse(process.env.AUDIT_RESULT), bearer_token_recorded:false,
  failure_injection_secret_recorded:false, completed_at:new Date().toISOString(),
};
const signature=createHmac('sha256',process.env.QA_EVIDENCE_HMAC_KEY)
  .update(JSON.stringify(payload)).digest('hex');
process.stdout.write(JSON.stringify({...payload,signature},null,2)+'\n');
NODE
  chmod 600 "$temporary"
  mv -f "$temporary" "$file"
}

write_signed_evidence "$FAILURE_EVIDENCE_FILE"
printf 'PASS: after-Put failure compensated with zero category/policy and zero cleanup debt.\n'
printf 'Evidence: %s\n' "$FAILURE_EVIDENCE_FILE"
