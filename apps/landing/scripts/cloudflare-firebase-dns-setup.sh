#!/usr/bin/env bash
# Apply Firebase Hosting "Quick setup" apex DNS on Cloudflare:
# - Remove old A/AAAA (e.g. Framer behind Cloudflare proxy)
# - Add A @ -> 199.36.158.100 (DNS only / not proxied)
# - If that A already exists but is orange-cloud proxied, turn proxy off (fixes Firebase ACME / SSL 526)
#
# Requires: curl, jq
# Do NOT commit API tokens. Run locally:
#
#   export CLOUDFLARE_API_TOKEN='your-token'
#   export CLOUDFLARE_ZONE_ID='your-zone-id'
#   ./scripts/cloudflare-firebase-dns-setup.sh
#
# Optional: DRY_RUN=1 ./scripts/...  (print actions only)
# Optional: ROOT_DOMAIN=gogocash.co (default)

set -euo pipefail

ROOT_DOMAIN="${ROOT_DOMAIN:-gogocash.co}"
TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"
ZONE_ID="${CLOUDFLARE_ZONE_ID:-}"

if [[ -z "$TOKEN" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN (or CF_API_TOKEN) to a token with Zone → DNS → Edit for this zone." >&2
  exit 1
fi
if [[ -z "$ZONE_ID" ]]; then
  echo "Set CLOUDFLARE_ZONE_ID." >&2
  exit 1
fi

if ! command -v jq &>/dev/null; then
  echo "Install jq (e.g. brew install jq)." >&2
  exit 1
fi

API_BASE="https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records"
AUTH=(-H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json")

# Values Firebase asked to remove (apex / Framer-on-Cloudflare style)
REMOVE_CONTENTS=(
  "104.21.36.139"
  "172.67.194.216"
  "2606:4700:3033::6815:248b"
  "2606:4700:3033::ac43:c2d8"
)

# Firebase quick-setup apex target
FIREBASE_A="199.36.158.100"

cf_get() {
  curl -fsS "${API_BASE}?per_page=500" "${AUTH[@]}"
}

cf_delete() {
  local id="$1"
  if [[ -n "${DRY_RUN:-}" ]]; then
    echo "DRY_RUN: would DELETE dns_records/${id}"
    return 0
  fi
  curl -fsS -X DELETE "${API_BASE}/${id}" "${AUTH[@]}" | jq -e '.success == true' >/dev/null
}

cf_post() {
  if [[ -n "${DRY_RUN:-}" ]]; then
    echo "DRY_RUN: would POST $*"
    return 0
  fi
  curl -fsS -X POST "${API_BASE}" "${AUTH[@]}" -d "$1" | jq -e '.success == true' >/dev/null
}

cf_patch_proxied_off() {
  local id="$1"
  if [[ -n "${DRY_RUN:-}" ]]; then
    echo "DRY_RUN: would PATCH dns_records/${id} -> proxied=false"
    return 0
  fi
  curl -fsS -X PATCH "${API_BASE}/${id}" "${AUTH[@]}" -d '{"proxied":false}' | jq -e '.success == true' >/dev/null
}

echo "Fetching DNS records for zone ${ZONE_ID} (${ROOT_DOMAIN})..."

RESPONSE="$(cf_get)"
if ! echo "$RESPONSE" | jq -e '.success == true' >/dev/null; then
  echo "Cloudflare API error:" >&2
  echo "$RESPONSE" | jq . >&2
  exit 1
fi

# Delete matching apex records (name must be apex FQDN)
REMOVE_JSON="$(printf '%s\n' "${REMOVE_CONTENTS[@]}" | jq -R . | jq -s .)"
IDS="$(echo "$RESPONSE" | jq -r --arg d "$ROOT_DOMAIN" --argjson remove "$REMOVE_JSON" '
  .result[]
  | select(.name == $d)
  | select(.type == "A" or .type == "AAAA")
  | select(.content as $c | $remove | index($c) != null)
  | .id
')"

if [[ -z "${IDS// }" ]]; then
  echo "No matching A/AAAA records to remove (already clean or different IPs)."
else
  while IFS= read -r id; do
    [[ -z "$id" ]] && continue
    echo "Removing record id=${id}..."
    cf_delete "$id"
  done <<< "$IDS"
  echo "Re-fetching records after deletes..."
  RESPONSE="$(cf_get)"
fi

HAS_FIREBASE="$(echo "$RESPONSE" | jq -r --arg d "$ROOT_DOMAIN" --arg ip "$FIREBASE_A" '
  [.result[] | select(.name == $d and .type == "A" and .content == $ip)] | length
')"

if [[ "$HAS_FIREBASE" -gt 0 ]]; then
  echo "A record ${ROOT_DOMAIN} -> ${FIREBASE_A} already exists; skipping create."
else
  echo "Adding A ${ROOT_DOMAIN} -> ${FIREBASE_A} (proxied=false)..."
  PAYLOAD="$(jq -n \
    --arg name "$ROOT_DOMAIN" \
    --arg content "$FIREBASE_A" \
    '{type:"A", name:$name, content:$content, ttl:1, proxied:false}')"
  cf_post "$PAYLOAD"
  RESPONSE="$(cf_get)"
fi

PROXIED_FIREBASE_IDS="$(echo "$RESPONSE" | jq -r --arg d "$ROOT_DOMAIN" --arg ip "$FIREBASE_A" '
  .result[]
  | select(.name == $d and .type == "A" and .content == $ip and .proxied == true)
  | .id
')"
if [[ -n "${PROXIED_FIREBASE_IDS// }" ]]; then
  while IFS= read -r pid; do
    [[ -z "$pid" ]] && continue
    echo "Disabling Cloudflare proxy on Firebase apex A (id=${pid}) so ACME can reach Firebase..."
    cf_patch_proxied_off "$pid"
  done <<< "$PROXIED_FIREBASE_IDS"
fi

echo "Done. In Firebase Hosting, click **Verify**. If SSL step follows, add those records too (same idea: DNS only unless Google says otherwise)."
