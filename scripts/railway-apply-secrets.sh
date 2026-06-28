#!/usr/bin/env bash
# Apply .env.railway.production vars to Railway services (GoGoCash / production).
# Usage: ./scripts/railway-apply-secrets.sh [--dry-run]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${RAILWAY_ENV_FILE:-$ROOT/.env.railway.production}"
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    -h|--help)
      echo "Usage: $0 [--dry-run]"
      echo "Reads $ENV_FILE and sets variables per service mapping."
      exit 0
      ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE — copy from .env.railway.production.example" >&2
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

API_VARS=(
  MONGO_URI JWT_SECRET JWT_ADMIN_SECRET FIREBASE_PROJECT_ID
  INVOLVE_SECRET INVOLVE_POSTBACK_SECRET INVOLVE_AI_API_KEY
  POSTHOG_KEY TELEGRAM_BOT_TOKEN
  CROSSMINT_AUTH_BASE CROSSMINT_PROJECT_ID CROSSMINT_SECRET
  RESEND_API_KEY OPTIMISE_API_KEY
  API_BASE_URL ADMIN_APP_URL WEB_APP_URL CUSTOMER_FRONTEND_URL
  GCS_CATALOG_BUCKET GCS_CATALOG_PUBLIC_BASE_URL GCS_MAX_UPLOAD_BYTES
  GOOGLE_APPLICATION_CREDENTIALS_JSON
  MEDIA_STORAGE_DRIVER R2_BUCKET R2_ENDPOINT R2_PUBLIC_BASE_URL
  R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY
  POSTHOG_HOST POSTHOG_ENABLED POSTHOG_DEBUG
  STRIPE_BILLING_ENABLED OPTIMISE_CONTACT_ID OPTIMISE_API_BASE MAIL_FROM
)

ADMIN_VARS=(
  NEXTAUTH_SECRET NEXTAUTH_URL NEXT_PUBLIC_API_URL NEXT_PUBLIC_APP_URL
)

MOBILE_VARS=(
  EXPO_PUBLIC_API_URL EXPO_PUBLIC_APP_ENV EXPO_PUBLIC_ACCOUNT_DATA_SOURCE
  EXPO_PUBLIC_FRONTEND_URL
)

apply_service() {
  local service="$1"
  shift
  local -a keys=("$@")
  local -a sets=()
  local key val

  for key in "${keys[@]}"; do
    val="${!key-}"
    if [[ -z "${val// }" ]]; then
      continue
    fi
    if $DRY_RUN; then
      echo "  $key -> $service"
    else
      sets+=(--set "${key}=${val}")
    fi
  done

  if $DRY_RUN; then
    return 0
  fi
  if ((${#sets[@]} == 0)); then
    echo "No non-empty vars for $service — skip"
    return 0
  fi
  echo "Applying ${#sets[@]} var(s) to $service …"
  railway variables "${sets[@]}" --service "$service"
}

echo "Railway secrets apply (dry_run=$DRY_RUN) from $ENV_FILE"
echo ""
echo "[gogocash-api]"
apply_service gogocash-api "${API_VARS[@]}"
echo ""
echo "[gogocash-admin]"
apply_service gogocash-admin "${ADMIN_VARS[@]}"
echo ""
echo "[@gogocash/mobile]"
apply_service '@gogocash/mobile' "${MOBILE_VARS[@]}"
echo ""
if $DRY_RUN; then
  echo "Dry run complete — no values were sent to Railway."
else
  echo "Done. Redeploy admin + mobile if NEXT_PUBLIC_* / EXPO_PUBLIC_* changed:"
  echo "  railway redeploy --service gogocash-admin"
  echo "  railway redeploy --service '@gogocash/mobile'"
fi
