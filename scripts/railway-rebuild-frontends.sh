#!/usr/bin/env bash
# Print Railway redeploy steps after API hostname cutover.
# Frontends bake NEXT_PUBLIC_* / EXPO_PUBLIC_* at build time.
set -euo pipefail

API_URL="${API_URL:-https://api.gogocash.co}"

echo "After API is live at: $API_URL"
echo ""
echo "Redeploy these Railway services with matching build-time env:"
echo ""
echo "  gogocash-admin:"
echo "    NEXT_PUBLIC_API_URL=$API_URL"
echo "    railway redeploy --service gogocash-admin"
echo ""
echo "  @gogocash/mobile (app-web):"
echo "    EXPO_PUBLIC_API_URL=$API_URL"
echo "    railway redeploy --service @gogocash/mobile"
echo ""
echo "Then update API CORS_EXTRA_ORIGINS for admin + app custom domains."
echo "See docs/railway-execution-runbook.md §4.4–4.5"
