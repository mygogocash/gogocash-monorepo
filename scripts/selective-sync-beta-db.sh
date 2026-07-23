#!/usr/bin/env bash
#
# Refresh beta's Railway MongoDB from production Atlas — WITHOUT destroying the
# configuration that only exists on beta.
#
# WHY THIS EXISTS
# ---------------
# beta (Railway "production" env) is the test stack; real users are on a separate
# Google Cloud stack backed by Atlas. beta was seeded from Atlas, and the intent is
# to refresh it periodically until cutover.
#
# A wholesale `mongorestore --drop` from Atlas DESTROYS everything configured on
# beta, because that config lives only in the Railway copy and Atlas will never
# have it: curated Top Brands, home banners, categories, coupons, and the media
# ownership registry. The whole point of beta is to set those up.
#
# So this script refreshes ONLY user/transaction data and never touches config.
#
# USAGE
#   ./scripts/selective-sync-beta-db.sh --dry-run     # show what would happen
#   ./scripts/selective-sync-beta-db.sh --apply
#
# Requires: railway CLI, logged in, with access to the GoGoCash project.
# The copy runs SERVER-SIDE inside the Mongo container, so production user data
# never transits your laptop. The Atlas URI is staged as a temporary variable on
# the mongodb service and removed afterwards.
set -euo pipefail

SERVICE_DB="mongodb"
SERVICE_API="gogocash-api"
ENVIRONMENT="production"
DB="gogocash"

# ---------------------------------------------------------------------------
# REFRESHED FROM ATLAS — user and transaction records. Beta never authors these.
# ---------------------------------------------------------------------------
SYNC_COLLECTIONS=(
  usermycashbacks
  conversions
  points
  users
  withdraws
  withdrawmethods
  favoriteoffers
  emailotpverifications
  deeplinks
  socialrewards
  useradmins
  missionorders
)

# ---------------------------------------------------------------------------
# NEVER TOUCHED — configuration authored on beta. Losing these is the failure
# mode this script exists to prevent. Listed explicitly, not by exclusion, so a
# new collection defaults to "not synced" rather than "silently wiped".
# ---------------------------------------------------------------------------
# topbrandconfigs banners categories coupons quests rewardlists referralconfigs
# feerates creditscoreconfigs discoversections all_brand_banners catalog_banners
# policy_media_asset_registry policy_media_cleanup policy_media_write_commands
# policy_lifecycle_commands policy_category_sources policy_integrity_states policies
#
# `offers` is DELIBERATELY EXCLUDED and is the one judgement call here. It is both
# catalog (imported from the affiliate feed) and config (brand fields edited in beta
# admin: banners, logos, tracking links, cashback overrides). Syncing it would
# refresh the catalog but discard every brand edit made on beta. If you need new
# production brands on beta, add `offers` to SYNC_COLLECTIONS for one run and accept
# losing beta's brand edits — or copy the specific documents by hand.

MODE="${1:---dry-run}"

echo "=== selective sync: Atlas -> Railway Mongo (${ENVIRONMENT}) ==="
echo "  collections to REFRESH : ${#SYNC_COLLECTIONS[@]}"
printf '     %s\n' "${SYNC_COLLECTIONS[@]}"
echo "  everything else is left untouched, including offers and all config."

NS_ARGS=""
for c in "${SYNC_COLLECTIONS[@]}"; do
  NS_ARGS="${NS_ARGS} --nsInclude=${DB}.${c}"
done

if [[ "$MODE" != "--apply" ]]; then
  echo
  echo "DRY RUN. Would run, inside the ${SERVICE_DB} container:"
  echo "  mongodump --uri=\"\$ATLAS_SRC_URI\" --archive --gzip${NS_ARGS} \\"
  echo "    | mongorestore --host localhost --port 27017 -u ... --archive --gzip --drop${NS_ARGS}"
  echo
  echo "Re-run with --apply to execute."
  exit 0
fi

echo
echo "--- staging the Atlas URI on ${SERVICE_DB} (removed at the end) ---"
SRC=$(railway variables --service "${SERVICE_API}" --environment "${ENVIRONMENT}" --json \
  | python3 -c 'import sys,json;print(json.load(sys.stdin)["ATLAS_ROLLBACK_URI"])' 2>/dev/null || true)
if [[ -z "${SRC}" ]]; then
  echo "ERROR: no ATLAS_ROLLBACK_URI on ${SERVICE_API}/${ENVIRONMENT}." >&2
  echo "       Set it to the Atlas connection string first — this script will not" >&2
  echo "       guess a source database." >&2
  exit 1
fi
railway variables --service "${SERVICE_DB}" --environment "${ENVIRONMENT}" --set "ATLAS_SRC_URI=${SRC}" >/dev/null
trap 'railway variable delete ATLAS_SRC_URI --service "'"${SERVICE_DB}"'" --environment "'"${ENVIRONMENT}"'" >/dev/null 2>&1 || true' EXIT

echo "--- waiting for the container to come back after the variable change ---"
for _ in $(seq 1 8); do
  if railway ssh --service "${SERVICE_DB}" --environment "${ENVIRONMENT}" 'test -n "$ATLAS_SRC_URI" && echo READY' 2>/dev/null | grep -q READY; then
    break
  fi
done

echo "--- copying (server-side; data never transits this machine) ---"
railway ssh --service "${SERVICE_DB}" --environment "${ENVIRONMENT}" \
  "mongodump --uri=\"\$ATLAS_SRC_URI\" --archive --gzip${NS_ARGS} \
   | mongorestore --host localhost --port 27017 \
       -u \"\$MONGO_INITDB_ROOT_USERNAME\" -p \"\$MONGO_INITDB_ROOT_PASSWORD\" \
       --authenticationDatabase admin --archive --gzip --drop${NS_ARGS} 2>&1 | tail -5"

echo
echo "--- verifying config collections survived ---"
railway ssh --service "${SERVICE_DB}" --environment "${ENVIRONMENT}" \
  "mongosh --quiet -u \"\$MONGO_INITDB_ROOT_USERNAME\" -p \"\$MONGO_INITDB_ROOT_PASSWORD\" \
   --authenticationDatabase admin ${DB} --eval '
     var cfg=[\"topbrandconfigs\",\"banners\",\"categories\",\"coupons\",\"offers\",\"policy_media_asset_registry\"];
     cfg.forEach(function(c){ print(\"  \"+c+\" = \"+db.getCollection(c).estimatedDocumentCount()+\" docs\"); });'"

echo
echo "Done. If topbrandconfigs is 0, the home Top Brands rail will be empty —"
echo "that means a config collection was wiped and you should restore it."
