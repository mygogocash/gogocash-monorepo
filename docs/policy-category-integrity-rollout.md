# Policy category integrity rollout (#349 / #350)

This is the Wave 2B release contract. It has been executed on dev, staging, and
production Atlas (see Execution status). Production apply is gated in
`apps/api/scripts/policy-category-integrity-migration.cjs` (reviewed Atlas
fingerprint + `POLICY_CATEGORY_INTEGRITY_PRODUCTION_AUTHORIZE` sentinel).

## Execution status (as of 2026-07-20)

- The policy/category integrity migration has been applied on **dev**,
  **staging**, and **production Atlas** (`gogocash.4prpd9j.mongodb.net/gogocash`,
  fingerprint `f3a5dff559dda931`): quarantine=0; durable marker
  `key=category-integrity`, `status=ready`, `migration_version=2`.
- `api-beta` / admin-beta use **Atlas** (not the Railway MongoDB service).
  Converting Railway Mongo does not affect beta policy saves — see #407.
- Dev and staging Railway Mongo remain authenticated single-node replica sets
  (`rs0`; MongoDB 8.0.4 on dev, 8.3.4 on staging) with committing transactions.
- Production apply remains fail-closed without the authorize sentinel and the
  reviewed fingerprint; do not broaden that allowlist without a fresh dry-run.

## Non-negotiable safety contract

- MongoDB must report replica-set or mongos topology with session support.
- The migration dry run is zero-write. Apply is permitted only after a reviewed
  empty quarantine, a verified backup, and all old writer binaries are drained.
- Railway `GET /offer/deployment-proof` must attest the requested environment
  and the exact 40-character `CANDIDATE_SHA` before the QA harness makes any
  hosted mutation.
- The QA checkout, script, and hosted Playwright spec must be tracked, clean,
  and byte-identical to that SHA.
- Every fixture is marker-owned. The harness never selects an existing human
  category, policy, offer, command, cleanup row, or media object.
- Category tombstones are permanent integrity records. Final cleanup must not
  delete them.
- Credentials, Mongo URIs, bearer tokens, and the evidence HMAC key must stay in
  environment variables and must never be copied into evidence.

## 1. Topology, backup, and writer drain

For each environment, record the candidate SHA and run:

```javascript
db.adminCommand({ hello: 1 });
```

`setName` or `msg: "isdbgrid"`, plus `logicalSessionTimeoutMinutes`, is
required. A standalone MongoDB deployment blocks migration and acceptance.
(Status 2026-07-18: dev and staging now run authenticated single-node replica
sets — rs0; MongoDB 8.0.4 dev / 8.3.4 staging — with committing transactions,
so this gate passes on both; it remains a hard gate for any future environment,
including production.)

Take a restorable backup without printing its URI:

```bash
mongodump --uri "$MONGO_URI" \
  --archive="policy-integrity-${ENVIRONMENT}-${CANDIDATE_SHA}.archive" --gzip
```

Restore that archive into an isolated database and run the migration dry run
against the restore. Create a credential-free `BACKUP_EVIDENCE_FILE` containing
at least the candidate SHA, the reviewed Mongo target fingerprint, archive
digest, restore target, restore timestamp, and successful verification result.
The hosted harness checks that the file contains both the SHA and fingerprint.

Apply requires a full maintenance window, not a rolling deploy. Inventory every
service that can write the target database, including API instances, cron jobs,
queue consumers, one-off workers, and both old and candidate deployments. Save
the reviewed inventory and current deployment SHAs before changing scale:

```bash
railway status --environment "$ENVIRONMENT" --json \
  > "railway-${ENVIRONMENT}-before-writer-drain.json"
railway service list --environment "$ENVIRONMENT" --json \
  > "railway-${ENVIRONMENT}-writer-services.json"
```

Do not copy provider variables or Mongo credentials into either file. Block new
API ingress at the routing layer, stop every scheduler/background trigger, and
then scale every writer service to zero in every configured region. Derive the
region IDs from the reviewed status output; do not assume a default region:

```bash
railway scale --environment "$ENVIRONMENT" --service "$WRITER_SERVICE" \
  "$WRITER_REGION=0"
```

Repeat the scale command for every writer service and region. Wait until
Railway reports zero running replicas, the ingress path is blocked or returns
the maintenance response, all background triggers are stopped, and the
load-balancer/application metrics report zero in-flight requests. The candidate
API must also be at zero replicas. Run the migration from a separate operator
shell; `railway run` executes on the operator machine and is not proof of
private-network access.

Create a credential-free JSON evidence file no larger than 64 KiB. It must be a
regular file, not a symlink. It must be recorded during the maintenance window
and is accepted for at most 30 minutes:

```json
{
  "schema": "gogocash-policy-writer-drain-v1",
  "environment": "dev",
  "candidate_sha": "0123456789012345678901234567890123456789",
  "target_fingerprint": "0123456789abcdef",
  "recorded_at": "2026-07-17T12:00:00.000Z",
  "ingress": "blocked",
  "inflight_requests": 0,
  "background_jobs": "stopped",
  "writer_deployments": [
    {
      "service": "gogocash-api",
      "deployment_sha": "0123456789012345678901234567890123456789",
      "replicas": 0,
      "state": "stopped"
    }
  ]
}
```

`writer_deployments` must enumerate every reviewed writer, not merely one
example service. Re-read the file, compare it with Railway state, and bind its
exact bytes to apply:

```bash
export POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_EVIDENCE_FILE="writer-drain-${ENVIRONMENT}-${CANDIDATE_SHA}.json"
export POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_EVIDENCE_SHA256="$({ shasum -a 256 "$POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_EVIDENCE_FILE" || sha256sum "$POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_EVIDENCE_FILE"; } | awk 'NR == 1 { print $1 }')"
export POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_CONFIRM="drained-all-writers:${ENVIRONMENT}:${CANDIDATE_SHA}:${MONGO_TARGET_FINGERPRINT}:${POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_EVIDENCE_SHA256}"
```

Do not restore traffic until migration apply succeeds, the candidate API is the
only writer version, and its readiness endpoint proves the published marker.
For the later hosted QA phase, separately record that no old writer returned:

```bash
export WRITER_DRAIN_CONFIRM="drained-old-writers:${ENVIRONMENT}:${CANDIDATE_SHA}:${MONGO_TARGET_FINGERPRINT}"
```

## 2. Mandatory migration dry run and apply

Run from `apps/api` with Node 24:

```bash
node scripts/policy-category-integrity-migration.cjs
```

Review the sanitized target, explicit database, fingerprint, counts, every
backfill, and `quarantine: []`. Do not apply unexplained quarantine rows.

```bash
export POLICY_CATEGORY_INTEGRITY_APPLY=1
export POLICY_CATEGORY_INTEGRITY_ENVIRONMENT="$ENVIRONMENT" # dev or staging
export POLICY_CATEGORY_INTEGRITY_TARGET_FINGERPRINT="$MONGO_TARGET_FINGERPRINT"
export POLICY_CATEGORY_INTEGRITY_CANDIDATE_SHA="$CANDIDATE_SHA"
# Set POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_EVIDENCE_FILE,
# POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_EVIDENCE_SHA256, and
# POLICY_CATEGORY_INTEGRITY_WRITER_DRAIN_CONFIRM exactly as shown above.
export POLICY_CATEGORY_INTEGRITY_CONFIRM="apply-category-integrity-v2:${ENVIRONMENT}:${CANDIDATE_SHA}:<database>:${MONGO_TARGET_FINGERPRINT}"
node scripts/policy-category-integrity-migration.cjs --apply
```

Apply publishes readiness last. If interrupted, keep writers drained, retain
the failed marker, investigate, rerun dry-run, and resume idempotently.

## 3. Prepare the controlled upstream Involve fixture and removal hook

The deployed API has no marker-only Involve injection endpoint. The harness
therefore refuses to pretend that a manual offer proves the Involve writer.
Before `PHASE=prepare-retire`, create a controlled upstream Involve QA offer
whose numeric ID is `INVOLVE_QA_OFFER_ID` and whose raw `categories` value is
exactly `QA_MARKER`.

The phase explicitly authorizes one normal admin Involve sync:

```bash
export INVOLVE_SYNC_CONFIRM="sync-involve-qa:${ENVIRONMENT}:${QA_MARKER}:${INVOLVE_QA_OFFER_ID}"
```

Provider removal is part of prepare, not an unsigned purge-day assertion.
Supply a reviewed executable regular-file hook (symlinks are refused) tracked
by `CANDIDATE_SHA`. Its digest and operator confirmation are bound to the
environment, SHA, marker, and offer:

```bash
export INVOLVE_REMOVE_HOOK='scripts/<reviewed-involve-remove-hook>.sh'
export INVOLVE_REMOVE_HOOK_SHA256='<lowercase 64-character SHA-256>'
export INVOLVE_REMOVE_CONFIRM="remove-involve-qa:${ENVIRONMENT}:${CANDIDATE_SHA}:${QA_MARKER}:${INVOLVE_QA_OFFER_ID}:${INVOLVE_REMOVE_HOOK_SHA256}"
```

The hook receives those values, `MONGO_TARGET_FINGERPRINT`, and
`QA_EVIDENCE_HMAC_KEY` through its environment. It must remove only the exact
controlled provider fixture, query the provider again, and emit one signed
`gogocash.policy-category-qa.v2` JSON document with phase
`upstream-removal`, `passed: true`, `upstream_removed: true`,
`upstream_absent_verified: true`, the exact offer ID and hook digest, plus the
same environment/SHA/marker/target binding. Missing, dirty, non-executable,
wrong-digest, unsigned, or target-mismatched hooks fail before hosted mutation.

After retirement, the script first proves the fixture arrived through a real
sync and that its raw category survived with `categories_normalized: null`.
It then runs the removal hook immediately, verifies its signed provider-absence
evidence, syncs again, and proves no resurrection. Involve sync only marks a
vanished local row `disabled: true, type: old`; it does not delete it. The exact
local `_id` and disabled document are therefore preserved in signed prepare
evidence for post-grace cleanup.

## 3.1 Required hosted failure-injection control plane

Prepare evidence cannot pass without this proof. The API exposes
`POST`/`DELETE /policy/qa/failure-injection` solely to arm or
disarm one short-lived `after-media-put-before-db-commit` failure. It is denied
by default and in production. Enabling it requires all of:

- Railway environment exactly `dev` or `staging` and its exact 40-character
  `RAILWAY_GIT_COMMIT_SHA` in the body;
- `POLICY_QA_FAILURE_INJECTION_ENABLED=policy-qa-failure-injection-v1`;
- `POLICY_QA_FAILURE_INJECTION_SECRET` containing at least 32 bytes;
- support-or-higher admin authentication;
- a marker-owned request key, `one_shot: true`, and TTL from 1 to 60 seconds;
- a timing-safe SHA-256 HMAC in `x-policy-qa-failure-confirmation`, bound to the
  HTTP action and every body field.

The injectable `PolicyQaFailureInjectionHook.consumeOnce()` deletes a matched
arm before returning `true`, so a throwing caller cannot inject twice. The
aggregate service must consume it immediately after the command-owned media Put
and before beginning the Mongo transaction. Keep the sentinel unset outside an
explicit, signed failure-recovery exercise.

The candidate-tracked `scripts/staging-policy-lifecycle-qa.sh` performs the
exercise. It verifies deployment proof before arming, always sends a signed
DELETE from its exit trap after any arm attempt (including a malformed or
truncated successful arm response), and accepts evidence only after the exact
command is `failed` with the controlled after-Put error, category and policy
counts are zero, the command-owned cleanup and URL registry rows are `deleted`,
unresolved cleanup debt is zero, and a cache-bypassed media probe returns
exactly `404` or `410`.

## 4. Prepare-retire phase

The safe default is always inert:

```bash
./scripts/policy-category-integrity-qa.sh
```

It prints `NO NETWORK; NO WRITES` and creates no temp or evidence directory.

For a real run, use a unique marker such as
`policy-qa-dev-20260717t120000z-alice`. The admin token must be approver-or-
higher because the phase creates and deletes its marker-owned reference offer.
The UI credentials are used only by real Playwright against the real Admin and
API; the spec installs no route mocks.

```bash
export EXECUTE=1
export PHASE=prepare-retire
export ENVIRONMENT=dev
export API_URL=https://api.dev.gogocash.co
export ADMIN_URL=https://admin.dev.gogocash.co
export CANDIDATE_SHA='<40-char deployed SHA>'
export QA_OWNER=alice
export QA_MARKER=policy-qa-dev-20260717t120000z-alice
export MONGO_URI='<explicit dev database URI>'
export MONGO_TARGET_FINGERPRINT='<reviewed dry-run fingerprint>'
export BACKUP_EVIDENCE_FILE='<verified backup evidence file>'
export WRITER_DRAIN_CONFIRM="drained-old-writers:${ENVIRONMENT}:${CANDIDATE_SHA}:${MONGO_TARGET_FINGERPRINT}"
export QA_EVIDENCE_HMAC_KEY='<secret, at least 32 characters>'
export ADMIN_JWT='<approver-or-higher API token>'
export ADMIN_UI_EMAIL='<real dev admin email>'
export ADMIN_UI_PASSWORD='<real dev admin password>'
export INVOLVE_QA_OFFER_ID='<controlled upstream numeric offer id>'
export INVOLVE_SYNC_CONFIRM="sync-involve-qa:${ENVIRONMENT}:${QA_MARKER}:${INVOLVE_QA_OFFER_ID}"
export INVOLVE_REMOVE_HOOK='scripts/<reviewed-involve-remove-hook>.sh'
export INVOLVE_REMOVE_HOOK_SHA256='<reviewed hook SHA-256>'
export INVOLVE_REMOVE_CONFIRM="remove-involve-qa:${ENVIRONMENT}:${CANDIDATE_SHA}:${QA_MARKER}:${INVOLVE_QA_OFFER_ID}:${INVOLVE_REMOVE_HOOK_SHA256}"
export POLICY_QA_FAILURE_INJECTION_SECRET='<same 32-byte-or-longer value configured on the target API>'
export POLICY_QA_FAILURE_CONFIRM="run-policy-failure-injection:${ENVIRONMENT}:${CANDIDATE_SHA}:${QA_MARKER}-failure:${QA_MARKER}-failure-after-put:${MONGO_TARGET_FINGERPRINT}"
export QA_CONFIRM="run-policy-category-integrity-qa:${ENVIRONMENT}:${CANDIDATE_SHA}:${QA_MARKER}:${MONGO_TARGET_FINGERPRINT}"
./scripts/policy-category-integrity-qa.sh
```

The phase proves, in order:

1. Railway deployment proof equals the requested environment and SHA.
2. Aggregate capability reports replica-set or mongos.
3. A separately marker-owned one-shot aggregate fails after media Put and before
   database commit; signed evidence proves exact clean compensation, zero owner
   data, media `404`/`410`, and zero unresolved cleanup debt.
4. A marker-owned aggregate persists category, terms, banner text, icon, and a
   real one-pixel Default banner; the media URL is readable.
5. Repeating the exact multipart body and request key returns the identical
   aggregate response.
6. Aggregate rename retains the original alias.
7. A marker-owned offer referencing only that retained alias causes exact
   `409 POLICY_CATEGORY_REFERENCED` counts: direct 0, normalized 1, unique 1.
8. After exact-ID offer deletion, real Admin UI Playwright proves Save/reload,
   unsaved Close, section Cancel, persisted Clear and Default banner
   persistence through same-origin `/api/backend/policy/aggregate`. It then
   performs Delete content and Retire through their exact same-origin lifecycle
   proxies, asserting URL, method, request JSON and authoritative response.
   Browser traffic to the direct API origin is forbidden.
9. Both exact UI lifecycle commands replay identically through the API; Delete
   content preserves the icon and schedules media cleanup.
10. Retire succeeds only at zero references and active category/policy selectors
    exclude the result.
11. The controlled upstream Involve fixture preserves raw data without category
    resurrection; the signed hook removes it upstream immediately, a second
    sync proves absence, and the exact disabled local fixture is retained only
    for the signed post-grace cleanup.
12. The cleanup journal reaches `deleted`, the Default banner URL is gone, all
    commands are committed, no unexpected marker offers/policy remain, and only
    the retired category, the exact signed disabled Involve row, and permanent
    tombstones remain.

Media absence requires an exact cache-bypassed `404` or `410`. A timeout,
connection failure, `403`, or `5xx` is not accepted as deletion evidence.

Replacement cleanup is deliberately fail-safe. Only an R2 asset carrying an
exact command owner key, attempt token, object key, content hash, and a matching
committed lifecycle command is eligible for automatic physical deletion. A
string-only legacy URL is never deleted from a reference scan: it remains
`pending` with `reconciliation_required: true`, even when Category, Offer, and
Brand currently show no reference. Record these retained rows as storage debt
and reconcile ownership manually; never clear the flag merely to make a
rollout green. The marker-owned Default banner used by this harness is
command-owned, so its cleanup must still reach `deleted`. An
`ambiguous-upload` row has the same manual-reconciliation contract: it records
a fresh URL retained because the primary read or transaction commit outcome
could not prove that compensation was safe.

The signed output is
`evidence/policy-category-integrity/<marker>-prepare-retire.json`. Preserve it;
it is required for post-retention purge.

## 5. Promote the same SHA to staging

Do not start staging until dev has a signed passing prepare-retire evidence
file. Use a distinct staging marker and staging Mongo fingerprint/backup. Set:

```bash
export ENVIRONMENT=staging
export API_URL=https://api-staging.gogocash.co
export ADMIN_URL=https://admin-staging.gogocash.co
export DEV_EVIDENCE_FILE='<signed passing dev prepare-retire evidence>'
```

Keep `CANDIDATE_SHA` identical to dev. The HMAC verifier checks the dev file's
signature, phase, environment, pass status, and SHA. It intentionally does not
require the dev and staging Mongo fingerprints to match; they are different
targets. Repeat backup, writer drain, dry-run, apply, deploy, and the entire
prepare-retire phase.

## 6. Separately authorized post-30-day purge

Purge cannot be performed by the prepare phase. Wait until the recorded
`purge_after` (the 30-day retention boundary) and take a fresh verified backup.
The controlled upstream fixture was already removed and signed during prepare.
Use a superadmin token:

```bash
export EXECUTE=1
export PHASE=purge
export ENVIRONMENT=dev # or staging, matching the evidence
export API_URL=https://api.dev.gogocash.co
export ADMIN_URL=https://admin.dev.gogocash.co
export CANDIDATE_SHA='<same accepted SHA>'
export QA_OWNER=alice
export QA_MARKER='<exact marker from prepare-retire>'
export MONGO_URI='<same explicit database URI>'
export MONGO_TARGET_FINGERPRINT='<same target fingerprint>'
export BACKUP_EVIDENCE_FILE='<fresh verified backup evidence file>'
export WRITER_DRAIN_CONFIRM="drained-old-writers:${ENVIRONMENT}:${CANDIDATE_SHA}:${MONGO_TARGET_FINGERPRINT}"
export QA_EVIDENCE_HMAC_KEY='<same evidence key>'
export PREPARE_EVIDENCE_FILE='<signed prepare-retire evidence>'
export SUPERADMIN_JWT='<superadmin API token>'
export INVOLVE_QA_OFFER_ID='<same upstream fixture id>'
export QA_CONFIRM="purge-policy-category-integrity-qa:${ENVIRONMENT}:${CANDIDATE_SHA}:${QA_MARKER}:${MONGO_TARGET_FINGERPRINT}"
./scripts/policy-category-integrity-qa.sh
```

The phase verifies both the prepare signature, its required embedded after-Put
failure proof, and its embedded signed upstream removal evidence. It checks
`purge_after`, runs a real Involve sync, and refuses if the provider fixture
returned. Because sync only disables, it re-verifies and explicitly deletes the
exact signed local fixture `_id`, proves both that ID and the source/offer/marker
identity are absent, and atomically writes a signed local-cleanup checkpoint.
A rerun accepts only that exact valid checkpoint, or the verified already-absent
row identity from signed prepare evidence when a process stopped between delete
and checkpoint rename. Only then does it purge
through the superadmin API, wait for committed media cleanup, verify media
absence, and remove exact category-owned command/cleanup QA journals. Final
Mongo audit requires category, policy, offers, media, command, and cleanup rows
to be absent while original and renamed aliases remain inactive permanent
tombstones. It writes separately signed purge evidence.

## Rollback

If migration, deploy, UI, API, Involve, or audit acceptance fails:

1. Drain writers immediately; do not continue promotion.
2. Preserve failed responses, signed evidence, marker IDs, cleanup rows, and the
   migration state. Never print secrets while collecting evidence.
3. If the prepare phase created a category but did not retire it, use the exact
   printed marker/category ID to remove marker offers, delete content, and
   retire. Do not purge early or delete tombstones.
4. If prepare fails after retirement, its exit trap preserves the exact local
   Involve fixture and prints `RESUME REQUIRED`; do not delete that row outside
   the signed, post-retention purge checkpoint flow.
5. If no data/index mutation occurred, correct the issue and resume the
   idempotent operation.
6. Before the first data/index mutation, a failed maintenance attempt may be
   abandoned only after proving the target is unchanged. Old writers may return
   only in that proven pre-mutation state.
7. After any data, index, or marker mutation, rollback is forward-only. Keep all
   writers drained and either repair/resume the idempotent v2 migration on the
   same target, or restore the verified pre-apply archive into an isolated
   replacement target, fully migrate that replacement through v2, and verify
   it before switching the candidate-only writers to it.
8. Never point old code at a mutated or replacement target, remove the v2
   marker to force readiness, or restore a standalone/legacy target in place.
   Re-enable ingress only after the candidate is ready and every writer
   deployment is again inventoried.

Never drop normalized identity indexes, source tombstones, or non-QA journals
ad hoc. Those are integrity records, not disposable fixtures.
