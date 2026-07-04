#!/usr/bin/env bash
# Cut over https://app-staging.gogocash.co from Firebase/GCP to Railway app-web.
#
# Prerequisites:
#   railway login && railway link   # project GoGoCash, environment staging
#   Optional: .env.railway.production with EXPO_PUBLIC_FIREBASE_* (see .env.railway.production.example)
#
# Usage:
#   ./scripts/railway-cutover-app-staging.sh
#   ./scripts/railway-cutover-app-staging.sh --dns-only   # print Cloudflare CNAME after Railway is live
#   DRY_RUN=1 ./scripts/railway-cutover-app-staging.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PROJECT="${RAILWAY_PROJECT:-GoGoCash}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT:-staging}"
SERVICE="${RAILWAY_APP_WEB_SERVICE:-@gogocash/mobile}"
HOST="${APP_STAGING_HOST:-app-staging.gogocash.co}"
API_URL="${STAGING_API_URL:-https://api-staging.gogocash.co}"
ENV_FILE="${ENV_FILE:-.env.railway.production}"
DRY_RUN="${DRY_RUN:-0}"
DNS_ONLY=0
[[ "${1:-}" == "--dns-only" ]] && DNS_ONLY=1

railway_cmd() {
  if [[ "$DRY_RUN" == "1" ]]; then
    printf '[dry-run] railway %s\n' "$*"
  else
    railway "$@"
  fi
}

require_railway_auth() {
  if ! railway whoami >/dev/null 2>&1; then
    echo "Railway CLI is not authenticated. Run: railway login"
    exit 1
  fi
}

load_dotenv_key() {
  local key="$1"
  [[ -f "$ENV_FILE" ]] || return 1
  local line
  line="$(grep -E "^${key}=" "$ENV_FILE" | tail -1 || true)"
  [[ -n "$line" ]] || return 1
  printf '%s' "${line#*=}"
}

set_app_web_var() {
  local key="$1"
  local value="$2"
  [[ -n "$value" ]] || return 0
  railway_cmd variables --project "$PROJECT" --environment "$ENVIRONMENT" \
    --service "$SERVICE" --set "${key}=${value}"
}

apply_build_vars() {
  echo "==> Applying app-web build-time EXPO_PUBLIC_* on $SERVICE ($ENVIRONMENT)"

  set_app_web_var EXPO_PUBLIC_API_URL "$(load_dotenv_key EXPO_PUBLIC_API_URL || echo "$API_URL")"
  set_app_web_var EXPO_PUBLIC_APP_ENV "$(load_dotenv_key EXPO_PUBLIC_APP_ENV || echo staging)"
  set_app_web_var EXPO_PUBLIC_ACCOUNT_DATA_SOURCE "$(load_dotenv_key EXPO_PUBLIC_ACCOUNT_DATA_SOURCE || echo backend)"
  set_app_web_var EXPO_PUBLIC_FRONTEND_URL "$(load_dotenv_key EXPO_PUBLIC_FRONTEND_URL || echo "https://${HOST}")"
  set_app_web_var EXPO_PUBLIC_EAS_PROJECT_ID "$(load_dotenv_key EXPO_PUBLIC_EAS_PROJECT_ID || echo 0039c25f-f88e-491d-8da9-85b8d6e66558)"

  for key in EXPO_PUBLIC_FIREBASE_API_KEY EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN \
    EXPO_PUBLIC_FIREBASE_PROJECT_ID EXPO_PUBLIC_FIREBASE_APP_ID \
    EXPO_PUBLIC_POSTHOG_KEY EXPO_PUBLIC_POSTHOG_HOST EXPO_PUBLIC_SENTRY_DSN; do
    local val
    val="$(load_dotenv_key "$key" || true)"
    if [[ -n "$val" ]]; then
      set_app_web_var "$key" "$val"
    else
      echo "    (skip $key — not in $ENV_FILE; web login OTP may fail until set)"
    fi
  done
}

scale_and_deploy() {
  echo "==> Scaling $SERVICE to 1 replica (southeast-asia)"
  railway_cmd scale --project "$PROJECT" --environment "$ENVIRONMENT" \
    --service "$SERVICE" southeast-asia=1

  echo "==> Redeploying $SERVICE from source (expo export + nginx)"
  railway_cmd redeploy --project "$PROJECT" --environment "$ENVIRONMENT" \
    --service "$SERVICE" --from-source -y
}

register_custom_domain() {
  echo "==> Registering custom domain $HOST on $SERVICE"
  if [[ "$DRY_RUN" == "1" ]]; then
    railway_cmd domain "$HOST" --service "$SERVICE"
    return 0
  fi
  railway domain "$HOST" --service "$SERVICE" --json 2>/dev/null || \
    railway domain list --service "$SERVICE" --json 2>/dev/null || true
  echo ""
  railway domain status "$HOST" --service "$SERVICE" 2>/dev/null || \
    railway domain list --service "$SERVICE" 2>/dev/null || true
}

print_dns_instructions() {
  local railway_target="${1:-}"
  echo ""
  echo "================================================================"
  echo " Cloudflare DNS cutover (owner) — $HOST → Railway"
  echo "================================================================"
  echo "1. Cloudflare → gogocash.co → DNS"
  echo "2. Edit record for app-staging (currently points at Firebase/Google):"
  echo "     Type: CNAME"
  echo "     Name: app-staging"
  echo "     Target: ${railway_target:-<run: railway domain status $HOST --service $SERVICE>}"
  echo "     Proxy: ON (orange cloud) — same as api-staging / admin-staging"
  echo "3. Remove Cloudflare Worker route app-staging.gogocash.co/* (script: app-staging-proxy)"
  echo "   if present — it proxies to Firebase *.hosted.app and breaks Railway cutover."
  echo "4. Wait 2–10 min, then verify:"
  echo "     curl -sI https://${HOST}/ | head -5"
  echo "     (expect HTTP/2 200, server: cloudflare, NOT Firebase 'Backend Not Found')"
  echo "5. Optional API CORS (if browser calls fail): ensure gogocash-api has"
  echo "     CORS_EXTRA_ORIGINS including https://${HOST}"
  echo "================================================================"
}

wait_for_railway_url() {
  local url="$1"
  local attempt
  for attempt in $(seq 1 30); do
    local status
    status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url/" 2>/dev/null || echo 000)"
    if [[ "$status" == "200" ]]; then
      echo "==> Railway app-web responds 200 at $url"
      return 0
    fi
    echo "    waiting for $url (attempt $attempt/30, status=$status)..."
    sleep 20
  done
  echo "WARN: $url did not return 200 yet — check Railway deploy logs"
  return 1
}

main() {
  require_railway_auth

  if [[ "$DNS_ONLY" == "1" ]]; then
    register_custom_domain
    print_dns_instructions
    exit 0
  fi

  echo "Project=$PROJECT environment=$ENVIRONMENT service=$SERVICE host=$HOST"
  apply_build_vars
  scale_and_deploy

  echo "==> Railway-generated domain (verify before DNS flip):"
  railway_cmd domain list --service "$SERVICE" 2>/dev/null || true

  local railway_host="${RAILWAY_APP_WEB_HOST:-}"
  if [[ -z "$railway_host" ]]; then
    railway_host="$(railway domain list --service "$SERVICE" --json 2>/dev/null \
      | python3 -c "import json,sys; d=json.load(sys.stdin); print(next((x.get('domain','') for x in d if x.get('domain','').endswith('.up.railway.app')), ''))" 2>/dev/null || true)"
  fi
  if [[ -n "$railway_host" ]]; then
    wait_for_railway_url "https://${railway_host}" || true
  fi

  register_custom_domain
  print_dns_instructions "${railway_host:-cs1bxvuq.up.railway.app}"

  echo ""
  echo "After DNS propagates, run:"
  echo "  APP_WEB_URL=https://${HOST} STAGING_API_URL=${API_URL} ./scripts/railway-acceptance.sh"
}

main "$@"
