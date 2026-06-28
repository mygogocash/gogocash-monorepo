#!/usr/bin/env bash
#
# railway-apply-secrets.sh — apply GoGoCash secrets/config to Railway services.
#
# Reads a gitignored KEY=VALUE file (default: .env.railway.production at repo
# root) and pushes each variable to the correct Railway service via the
# authenticated `railway` CLI. Values are never printed.
#
# WHY THIS EXISTS
#   The Railway MCP token is expired; the local `railway` CLI (v5.23) is the
#   authenticated path for variable mutations. Non-secret config has already
#   been applied by the migration (see docs/railway-env-matrix.md); this script
#   applies the SECRETS plus the build-time public vars that must exist before
#   a build runs.
#
# BUILD-TIME vs RUNTIME (read before running)
#   - gogocash-admin: NEXT_PUBLIC_API_URL is inlined by Next at build time. The
#     Dockerfile (apps/admin/Dockerfile:32) declares `ARG NEXT_PUBLIC_API_URL`
#     with a STAGING default, so Railway forwards the service var as a build-arg.
#     Setting/changing it triggers a rebuild. NEXTAUTH_SECRET / NEXTAUTH_URL are
#     RUNTIME (read by the Node server), no rebuild needed for those.
#   - app-web (@gogocash/mobile): every EXPO_PUBLIC_* is inlined at `expo export`
#     (Dockerfile.web.railway:23-46 declares matching ARGs). They MUST exist
#     before the build; changing any of them triggers a rebuild.
#
# USAGE
#   1. Create the env file (gitignored — matched by `.env.*` in .gitignore):
#        cp .env.railway.production.example .env.railway.production   # then fill it
#   2. Link once per shell is NOT required — this script passes --service on
#      every call so it is project/service explicit. It DOES require the project
#      to be selectable; run from the repo with the Railway CLI logged in.
#   3. Dry run first (prints which KEY goes to which service, never values):
#        ./scripts/railway-apply-secrets.sh --dry-run
#   4. Apply:
#        ./scripts/railway-apply-secrets.sh
#
# SAFETY
#   - Only sets keys that are present (non-empty) in the env file.
#   - Never echoes a value. Logs `KEY -> service` only.
#   - Skips the non-secret config already applied by the migration.
#
set -euo pipefail

ENV_FILE="${ENV_FILE:-.env.railway.production}"
PROJECT="${RAILWAY_PROJECT:-GoGoCash}"
ENVIRONMENT="${RAILWAY_ENVIRONMENT:-production}"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: env file '$ENV_FILE' not found." >&2
  echo "Create it from the example and fill in real secret values." >&2
  exit 1
fi

# Load KEY=VALUE pairs into the environment WITHOUT printing them.
# `set -a` exports every assignment; we source the file in a subshell-safe way.
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

# set_var SERVICE KEY
#   Sets $KEY on $SERVICE only if the variable is defined and non-empty.
#   Uses Railway's KEY=VALUE form; the value is taken from the loaded env so it
#   is never expanded onto the command line in logs.
set_var() {
  local service="$1" key="$2"
  local value="${!key:-}"
  if [[ -z "$value" ]]; then
    echo "skip   $key -> $service (not set in $ENV_FILE)"
    return 0
  fi
  echo "set    $key -> $service"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    return 0
  fi
  railway variables \
    --project "$PROJECT" \
    --environment "$ENVIRONMENT" \
    --service "$service" \
    --set "${key}=${value}"
}

echo "== GoGoCash Railway secrets apply =="
echo "   project=$PROJECT env=$ENVIRONMENT file=$ENV_FILE dry_run=$DRY_RUN"
echo

# ───────────────────────────────────────────────────────────────────────────
# gogocash-api  (NestJS)
# ───────────────────────────────────────────────────────────────────────────
# MINIMAL-TO-USABLE secrets (auth + Mongo-touching routes function).
#   JWT_SECRET        customer JWT signing  (apps/api/src/auth/auth.service.ts:482)
#   JWT_ADMIN_SECRET  admin   JWT signing   (apps/api/src/admin/admin.module.ts:201)
#   CROSSMINT_SECRET  Crossmint backend JWT (apps/api/src/auth/auth.module.ts:40)
set_var gogocash-api JWT_SECRET
set_var gogocash-api JWT_ADMIN_SECRET
set_var gogocash-api CROSSMINT_SECRET

# FULL-FUNCTIONALITY secrets (feature-gated; safe to omit a feature you don't run).
#   Spelling matters: code reads INVOLVE_* (NOT the .env.example INVOVLE_* typo).
set_var gogocash-api CROSSMINT_AUTH_BASE
set_var gogocash-api CROSSMINT_PROJECT_ID
set_var gogocash-api FIREBASE_PROJECT_ID
set_var gogocash-api INVOLVE_SECRET
set_var gogocash-api INVOLVE_POSTBACK_SECRET   # FAILS CLOSED if empty (involve-postback-token.guard.ts:20)
set_var gogocash-api INVOLVE_AI_API_KEY        # FAILS CLOSED on /involve/create-affiliate-ai (api-key.guard.ts:23)
set_var gogocash-api RESEND_API_KEY            # email OTP / admin invites / password reset
set_var gogocash-api POSTHOG_KEY               # empty = analytics disabled (no crash)
set_var gogocash-api TELEGRAM_BOT_TOKEN        # CHANGES MODULE GRAPH: loads TelegramBotModule only when set & != PLACEHOLDER (app.module.ts:51)

# Cross-origin browser access from the admin's Railway host (exact-match list,
# comma-separated, no wildcards — apps/api/src/main.ts ~line 92). Needed so the
# admin BROWSER calls (not the server-side login) are not CORS-blocked.
set_var gogocash-api CORS_EXTRA_ORIGINS

# ───────────────────────────────────────────────────────────────────────────
# gogocash-admin  (Next.js standalone)
# ───────────────────────────────────────────────────────────────────────────
# BUILD-TIME: NEXT_PUBLIC_API_URL is inlined at build (Dockerfile ARG). Setting
# it triggers a rebuild. If unset, the Dockerfile default points at STAGING API
# (so it will NOT silently fall back to /api/mock — the fallback only triggers
# when the baked value is empty).
set_var gogocash-admin NEXT_PUBLIC_API_URL

# RUNTIME (Node server): without NEXTAUTH_SECRET every protected route loops back
# to /signin even though the port binds. NEXTAUTH_URL must be the exact public
# HTTPS origin, no trailing slash.
set_var gogocash-admin NEXTAUTH_SECRET
set_var gogocash-admin NEXTAUTH_URL

# ───────────────────────────────────────────────────────────────────────────
# app-web  (@gogocash/mobile — Expo web static export)
# ───────────────────────────────────────────────────────────────────────────
# ALL build-time. Must exist BEFORE the export; any change triggers a rebuild.
set_var app-web EXPO_PUBLIC_API_URL
set_var app-web EXPO_PUBLIC_APP_ENV
set_var app-web EXPO_PUBLIC_ACCOUNT_DATA_SOURCE
set_var app-web EXPO_PUBLIC_FRONTEND_URL
set_var app-web EXPO_PUBLIC_FIREBASE_API_KEY
set_var app-web EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN
set_var app-web EXPO_PUBLIC_FIREBASE_PROJECT_ID
set_var app-web EXPO_PUBLIC_FIREBASE_APP_ID
# optional analytics/telemetry (set only if used)
set_var app-web EXPO_PUBLIC_POSTHOG_KEY
set_var app-web EXPO_PUBLIC_POSTHOG_HOST
set_var app-web EXPO_PUBLIC_SENTRY_DSN
set_var app-web EXPO_PUBLIC_EAS_PROJECT_ID

echo
echo "== done =="
if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "(dry run — no variables were written)"
else
  echo "Reminder: admin NEXT_PUBLIC_API_URL and every app-web EXPO_PUBLIC_* are"
  echo "build-time. Trigger a redeploy of those services so the new build inlines"
  echo "them:  railway redeploy --service gogocash-admin   (and  --service app-web)"
fi
