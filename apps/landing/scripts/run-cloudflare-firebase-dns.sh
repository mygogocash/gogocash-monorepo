#!/usr/bin/env bash
# Load CLOUDFLARE_* from repo-root .env.cloudflare (gitignored), then apply apex DNS for Firebase.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env.cloudflare"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi
exec "${ROOT}/scripts/cloudflare-firebase-dns-setup.sh"
