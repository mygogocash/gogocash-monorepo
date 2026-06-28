#!/usr/bin/env bash
# Publish an EAS Update to the staging channel (preview / staging native builds).
# Requires EXPO_TOKEN and EXPO_PUBLIC_EAS_PROJECT_ID (see apps/app/.env.example).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_DIR="$ROOT/apps/app"
MESSAGE="${1:-ota-staging: $(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo manual)}"

if [ -z "${EXPO_TOKEN:-}" ]; then
  echo "EXPO_TOKEN is required. Create one at expo.dev → Account → Access Tokens."
  exit 1
fi

cd "$APP_DIR"
eas update --non-interactive --channel staging --message "$MESSAGE"
