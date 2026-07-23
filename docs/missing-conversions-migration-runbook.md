# Missing conversions canonical migration and QA runbook (#351)

This runbook consolidates historical `missionorders` and `missingorders` rows
into schema-v2 records in `missionorders`, then creates four marker-owned QA
claims. Run every gate in **development first**. Staging requires a fresh
backup and explicit owner authorization after the development evidence passes.
Production is not a supported target.

The migration and seed never create conversions, wallet entries, points,
cashback, commissions, or payment transactions. Approval/rejection of the QA
records changes only the claim workflow fields.

## Stop conditions and privacy boundary

- Never pass a Mongo URI, token, receipt, customer document, or other secret on
  the command line. `MONGO_URI` is environment-only. Apply rollback metadata
  necessarily includes replaced before-documents, so keep reports under the
  restricted evidence directory, redact them before sharing, and never commit
  them.
- Seed records have `evidence_refs: []`. Do not attach a real receipt or any
  sensitive file during QA.
- The current R2 adapter uses one public bucket/base URL. Its `private` upload
  mode sets private cache headers but still returns the bucket's public URL; R2
  has no per-object ACL enforcement in this path. The API therefore fails
  closed with HTTP 503 before database or storage I/O whenever a missing-order
  request contains evidence, and backend-mode customer UI accepts metadata-only
  claims. Do not re-enable evidence until storage persists opaque object refs in
  a genuinely non-public bucket/domain and reads them through the existing
  authenticated Admin stream (or another reviewed signed-read design).
- Keep GitHub issue #351 open if staging migration is not authorized, any
  quarantine entry lacks an explicit disposition, or the private-evidence R2
  boundary remains unresolved. Local proof is not staging acceptance.

## 1. Runtime and target preflight

Run from `apps/api` with Node 26. Build first; the operational entry is emitted
inside `dist` and runs with plain Node.js, without `@swc-node/register` or any
other TypeScript loader:

```bash
export PATH=/Users/kunanonjarat/.nvm/versions/node/v24.14.1/bin:$PATH
npm run build
node dist/admin/missing-orders/missing-orders.cli.js --help
node dist/admin/missing-orders/missing-orders.cli.js migrate --help
node dist/admin/missing-orders/missing-orders.cli.js rollback --help
node dist/admin/missing-orders/missing-orders.cli.js seed --help
```

Confirm the build emits
`dist/admin/missing-orders/missing-orders.cli.js`. Do not substitute the thin
TypeScript wrappers under `scripts/`, patch `node_modules`, downgrade
TypeScript ad hoc, or introduce an unreviewed loader.

For Railway staging, run inside the API service shell so the internal Mongo
hostname resolves and confirm `RAILWAY_ENVIRONMENT_NAME=staging`. For a local
development DB, leave `NODE_ENV` unset or non-production. The scripts reject a
production environment and reject a target that disagrees with Railway's
environment name.

## 2. Backup, counts, and checksums

Set the URI without printing it, create a restricted evidence directory, and
back up both source collections before any apply:

```bash
umask 077
export MONGO_URI='<development Mongo URI with the intended database path>'
export EVIDENCE_DIR="evidence/issue-351/development-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$EVIDENCE_DIR"
export ROLLBACK_JOURNAL="$EVIDENCE_DIR/migration-reverse-cas.ndjson"

mongodump --uri="$MONGO_URI" --collection=missionorders \
  --archive="$EVIDENCE_DIR/missionorders.archive" --gzip
mongodump --uri="$MONGO_URI" --collection=missingorders \
  --archive="$EVIDENCE_DIR/missingorders.archive" --gzip
shasum -a 256 "$EVIDENCE_DIR"/*.archive \
  > "$EVIDENCE_DIR/archive-sha256.txt"
```

Capture the migration's read-only inventory. Its JSON contains source and
canonical counts plus stable SHA-256 checksums for `missionorders`,
`missingorders`, and canonical before/projected state:

```bash
node dist/admin/missing-orders/missing-orders.cli.js migrate \
  --target=development \
  --run-id="issue-351-development-$(date -u +%Y%m%dT%H%M%SZ)" \
  > "$EVIDENCE_DIR/migration-dry-run.json"

jq '{mode,sourceCounts,canonicalCounts,planned,checksums,backup,quarantine,malformed,conflicts}' \
  "$EVIDENCE_DIR/migration-dry-run.json"
```

Verify `mode == "dry-run"`, `applied.inserted == 0`,
`applied.updated == 0`, and that Mongo counts are unchanged. Review every
malformed, conflict, and quarantine record. A numeric provider offer is mapped
only through exact `(source, offer_id)`; missing source, zero matches, or
multiple matches must remain quarantined. Never infer a provider from the
numeric ID alone.

## 3. Owner-authorized guarded apply

Record the owner, timestamp, target, dry-run report checksum, backup checksum,
and authorization ticket in the change record. Drain API/Admin claim writers
for the apply window and record that drain in the change ticket. The migration
also anchors each replacement by `_id` and compares the complete BSON preimage
as an unordered set of top-level key/value entries. This protects every legacy
alias and canonical field, distinguishes absence from null, and rejects changed,
removed, or newly added fields even when the row has no timestamp or version.
An undefined, sparse, cyclic, or otherwise unsupported preimage is quarantined
as `unsafe_preimage`; it is never reduced to a partial predicate. A concurrent
approval, assignment, note, attachment, order edit, or any other write therefore
yields `concurrent_write_conflict` instead of being overwritten. Then apply
using the exact confirmation phrase:

This exact CAS protects replacement paths in the canonical `missionorders`
collection. A legacy row read from `missingorders` is inserted into a different
collection, so a target replacement predicate cannot atomically protect that
source row. The recorded writer drain is therefore mandatory for the entire
apply window; do not treat CAS as a substitute for the drain.

```bash
node dist/admin/missing-orders/missing-orders.cli.js migrate \
  --apply \
  --target=development \
  --confirm=APPLY_MISSING_ORDERS_SCHEMA_V2 \
  --rollback-journal="$ROLLBACK_JOURNAL" \
  --run-id="issue-351-development-apply-$(date -u +%Y%m%dT%H%M%SZ)" \
  > "$EVIDENCE_DIR/migration-apply.json"

jq '{ok,mode,sourceCounts,canonicalCounts,planned,applied,checksums,quarantine,malformed,conflicts,rollback}' \
  "$EVIDENCE_DIR/migration-apply.json"

shasum -a 256 "$EVIDENCE_DIR/migration-apply.json" \
  > "$EVIDENCE_DIR/migration-apply.sha256"
shasum -a 256 "$ROLLBACK_JOURNAL" \
  > "$EVIDENCE_DIR/migration-reverse-cas.sha256"
```

Require `ok == true`, exact applied counts, no unexplained errors, and a
rollback entry for every insert/replace. Legacy rows already in
`missionorders` are replaced at their existing `_id`; legacy rows from
`missingorders` are inserted with immutable `(legacy_collection, legacy_id)`
provenance. Treat every `concurrent_write_conflict` as a stop condition: keep
the live row, restore the writer drain, inspect the conflicting preimage, and
rerun dry-run before considering another apply.

The compiled apply stops all later database mutations immediately after its
first CAS miss, while retaining the conflict and reverse-CAS intent in the
report/journal for diagnosis. The abort latch is set before the journal's
`not_applied` record is fsynced; a journal-finalization failure therefore still
fail-stops the mutation pass and is surfaced as an apply error. Do not retry the
same command with writers active.

The apply report is the executable rollback authority. It contains an internal
`rollback.manifestChecksum` over the apply run identity, collection checksums,
and canonical Extended JSON before/after snapshots. The separate
`migration-apply.sha256` binds the exact restricted report file. Do not edit,
reformat, redact in place, or regenerate that file; make a separate redacted
copy for review. The required append-only `--rollback-journal` is fsynced
**before every insert or replacement** and carries the same reverse full-record
CAS snapshots. It is independently executable if stdout redirection, a final
read, or disconnect fails after a write. Both artifacts are restricted evidence
and capped at 50 MiB during report generation/output, before allocation/read,
and before each journal append. Every successful mutation receives a separate
fsynced `commit` record. A CAS miss receives a fsynced `not_applied` record;
rollback classifies that intent as `already_reverted`, never as a concurrent
live-row modification.

The CLI serializes each migrate/rollback result exactly once as pretty JSON plus
its final newline, rejects that exact stdout buffer above 50 MiB, and writes the
same checked bytes. Preserve the raw redirected file as the authority artifact.

The apply report and journal bind `--target` and the Mongo database name parsed
from `MONGO_URI`. Rollback rejects a mismatched target or database identity
before opening Mongo. Guarded apply and every rollback require a non-empty
database name in `MONGO_URI`; this comparison is unconditional. Preallocated `_id` values make every inserted-row journal
entry executable before the insert can be observed.

Use this machine-checkable gate; any CAS conflict is a failure and gives the
compiled CLI a nonzero exit code:

```bash
jq -e '
  .ok == true and
  .applied.errors == 0 and
  ([.conflicts[]? | select(.reason == "concurrent_write_conflict")] | length) == 0 and
  (.rollback.changes | length) == (.applied.inserted + .applied.updated)
' "$EVIDENCE_DIR/migration-apply.json"
```

Rerun the same guarded apply. It must make **zero changes**:

```bash
node dist/admin/missing-orders/missing-orders.cli.js migrate \
  --apply --target=development \
  --confirm=APPLY_MISSING_ORDERS_SCHEMA_V2 \
  --rollback-journal="$EVIDENCE_DIR/migration-rerun-reverse-cas.ndjson" \
  --run-id="issue-351-development-rerun-$(date -u +%Y%m%dT%H%M%SZ)" \
  > "$EVIDENCE_DIR/migration-rerun.json"

jq -e '.applied.inserted == 0 and .applied.updated == 0 and .applied.errors == 0' \
  "$EVIDENCE_DIR/migration-rerun.json"
```

Skipped rows are acceptable only when the report explains them. Resolve each
quarantine mapping or record an owner-approved decision to leave that source
row unmodified before staging.

## 4. Post-migration mapping proof

Use read-only queries to compare counts/provenance and sample mappings. For each
sample, verify the canonical `offer_id` joins the Offer whose `source` and
numeric `offer_id` match the persisted snapshot:

```javascript
// Run in mongosh against the same MONGO_URI/database.
db.missionorders.aggregate([
  { $match: { schema_version: 2, legacy_collection: { $exists: true } } },
  { $sample: { size: 10 } },
  {
    $lookup: {
      from: "offers",
      localField: "offer_id",
      foreignField: "_id",
      as: "offer",
    },
  },
  {
    $project: {
      legacy_collection: 1,
      legacy_id: 1,
      offer_id: 1,
      "offer_snapshot.source": 1,
      "offer_snapshot.provider_offer_id": 1,
      joined_offer_source: { $first: "$offer.source" },
      joined_provider_offer_id: { $first: "$offer.offer_id" },
    },
  },
]);
```

Also prove uniqueness of `(legacy_collection, legacy_id)`, `dedupe_key`, and
that migrated `investigating` rows are now `under_review`.

## 5. Marker-owned QA seed

Choose an existing non-sensitive QA User and canonical Offer. The Offer must
have `_id`, `source`, numeric `offer_id`, and `offer_name`. Generate a unique
marker; never reuse it for another run:

```bash
export ISSUE351_MARKER="issue-351-development-$(openssl rand -hex 12)"
export ISSUE351_USER_ID='<QA User ObjectId>'
export ISSUE351_OFFER_ID='<canonical Offer ObjectId>'

node dist/admin/missing-orders/missing-orders.cli.js seed \
  --target=development \
  --marker="$ISSUE351_MARKER" \
  --user-id="$ISSUE351_USER_ID" \
  --offer-id="$ISSUE351_OFFER_ID" \
  > "$EVIDENCE_DIR/seed-dry-run.json"

jq -e '.mode == "dry-run" and .planned == 4 and .written == 0 and .financialWrites == 0' \
  "$EVIDENCE_DIR/seed-dry-run.json"

node dist/admin/missing-orders/missing-orders.cli.js seed \
  --apply --target=development \
  --marker="$ISSUE351_MARKER" \
  --user-id="$ISSUE351_USER_ID" \
  --offer-id="$ISSUE351_OFFER_ID" \
  --confirm=SEED_MISSING_CONVERSIONS_QA \
  > "$EVIDENCE_DIR/seed-apply.json"
```

The result must contain exactly four schema-v2 records: pending, approved,
rejected, and under-review with two durable notes. All four have the exact
marker, deterministic `seed_record_key`, empty evidence refs, canonical User
and Offer ObjectIds/snapshots, and `financialWrites: 0`. A repeated seed apply
must report four updates and zero new records.

## 6. Authenticated real-API acceptance

Point Admin and customer apps at the same development API URL; Admin mock mode
does not persist or prove this flow. Using authenticated QA sessions:

1. Admin **Missing conversions** list shows all four marker-owned claims.
2. Detail and stats agree with the list; provider source and Offer snapshot are
   correct.
3. Assign the under-review case, add a note, reload, and prove both assignment
   and durable note persisted through the API.
4. Exercise approve and reject on marker-owned claims only. Confirm only claim
   status/resolution fields change; wallet, conversion, point, and transaction
   counts/checksums remain unchanged.
5. Submit a new customer missing-conversion claim without an attachment and
   prove it appears in Admin through the same API/`missionorders` collection.
6. Prove the Admin **empty** state with a filter/search that has no matches.
7. Prove the distinct **failure** state by blocking the list request in browser
   developer tools (or using an approved unavailable test endpoint), then
   restore the request and confirm the real API error/status is shown rather
   than fake rows.
8. Verify the customer list shows canonical statuses and reports an exact API
   failure distinctly from an empty result.
9. Run E2E-08 only with exact cleanup access. It opens the Mongo cleanup
   connection before submission, approves the claim, proves wallet invariance,
   and deletes the exact `(user_id, order_id, _id)` claim in `finally`, then
   proves the marker has zero remaining rows. A remote run without an authorized
   `MONGO_URI` stops before creating the claim.

Save screenshots/HAR only after redacting tokens and customer data. Do not
capture or upload receipt evidence while the private-R2 boundary is unresolved.

## 7. Exact cleanup and absence proof

Seed cleanup deletes by the single exact filter `{seed_marker: <marker>}`. It
does not delete an additional customer-submitted acceptance claim; remove that
row only through a separately authorized, identity-specific cleanup such as
the E2E-08 exact `finally` fence above.

```bash
node dist/admin/missing-orders/missing-orders.cli.js seed \
  --cleanup --target=development \
  --marker="$ISSUE351_MARKER" \
  --confirm=CLEANUP_MISSING_CONVERSIONS_QA \
  > "$EVIDENCE_DIR/seed-cleanup.json"

jq -e '.deleted == 4 and .cleanupFilter == {seed_marker: env.ISSUE351_MARKER}' \
  "$EVIDENCE_DIR/seed-cleanup.json"

mongosh "$MONGO_URI" --quiet --eval \
  'EJSON.stringify({remaining: db.missionorders.countDocuments({seed_marker: process.env.ISSUE351_MARKER})})' \
  > "$EVIDENCE_DIR/seed-absence.json"
jq -e '.remaining == 0' "$EVIDENCE_DIR/seed-absence.json"
```

## 8. Reverse-CAS rollback and staging promotion

Preserve the archive hashes, dry-run/apply/rerun reports, authorization, and QA
evidence together. The supported rollback is record-scoped and executable; it
never drops a collection, restores an entire archive, or overwrites unrelated
data. The `mongodump` archives remain disaster-recovery evidence, not the
normal migration rollback mechanism.

Rollback requires the exact apply report and its operator-recorded file
SHA-256. First drain API/Admin claim writers again and retain evidence of the
drain. Recompute the file checksum and require it to equal the recorded value:

```bash
export APPLY_REPORT="$EVIDENCE_DIR/migration-apply.json"
export APPLY_REPORT_SHA256="$(awk '{print $1}' "$EVIDENCE_DIR/migration-apply.sha256")"

test "$(shasum -a 256 "$APPLY_REPORT" | awk '{print $1}')" = \
  "$APPLY_REPORT_SHA256"

node dist/admin/missing-orders/missing-orders.cli.js rollback \
  --target=development \
  --report="$APPLY_REPORT" \
  --report-sha256="$APPLY_REPORT_SHA256" \
  --dry-run \
  > "$EVIDENCE_DIR/rollback-dry-run.json"

jq '{ok,mode,sourceRunId,sourceManifestChecksum,sourceChecksums,planned,applied,skipped,errors,changes}' \
  "$EVIDENCE_DIR/rollback-dry-run.json"
```

The CLI validates the external file checksum, JSON structure, apply-mode/run
identity, internal rollback manifest checksum, unique canonical IDs, snapshot
provenance, and each snapshot checksum before connecting to Mongo. Dry-run then
reads each exact canonical `_id` but performs zero writes. Require:

- `ok == true`;
- `mode == "dry-run"`;
- `applied.deleted == 0` and `applied.restored == 0`;
- all expected rows are represented by `would_delete`, `would_restore`, or an
  explicitly understood `already_reverted` outcome;
- `skipped.concurrentModified == 0`;
- `skipped.concurrentWriteConflict == 0`; and
- `errors` is empty.

Stop without applying if the report/file checksum is rejected, a row is
missing unexpectedly, any current row differs from its recorded full
after-state, provenance/ID validation fails, or the writer drain cannot be
proved. Investigate the live record and obtain a new owner decision; never edit
the report to make it pass.

If the process lost or could not write the final JSON report after a mutation,
use the fsynced journal instead. It contains only append-only reverse-CAS
records, including entries written before a CAS loses a race; those stale
entries safely resolve as `already_reverted`. Never combine `--report` and
`--journal` in one command:

```bash
export ROLLBACK_JOURNAL_SHA256="$(awk '{print $1}' "$EVIDENCE_DIR/migration-reverse-cas.sha256")"
test "$(shasum -a 256 "$ROLLBACK_JOURNAL" | awk '{print $1}')" = \
  "$ROLLBACK_JOURNAL_SHA256"

node dist/admin/missing-orders/missing-orders.cli.js rollback \
  --target=development \
  --journal="$ROLLBACK_JOURNAL" \
  --journal-sha256="$ROLLBACK_JOURNAL_SHA256" \
  --dry-run \
  > "$EVIDENCE_DIR/rollback-journal-dry-run.json"
```

The journal path is capped at 50 MiB and its target/database binding is checked
before Mongo connects, just like the final report. Retain it even when the
normal report is available.

An interrupted append may leave one malformed record fragment at EOF. Rollback
ignores that fragment only when it is the final unterminated line. Malformed
interior records and malformed newline-terminated records invalidate the whole
journal. Each change may have at most one terminal record (`commit` or
`not_applied`); duplicate or contradictory terminal records invalidate the
journal before Mongo is opened. A pending change followed by a torn EOF fragment
remains conservatively rollback-eligible. Do not trim or repair the authority
file by hand.

After an owner explicitly authorizes the rollback, run the same exact report
with the separate rollback confirmation phrase:

```bash
node dist/admin/missing-orders/missing-orders.cli.js rollback \
  --target=development \
  --report="$APPLY_REPORT" \
  --report-sha256="$APPLY_REPORT_SHA256" \
  --apply \
  --confirm=ROLLBACK_MISSING_ORDERS_SCHEMA_V2 \
  > "$EVIDENCE_DIR/rollback-apply.json"

jq -e '
  .ok == true and
  .applied.deleted == .planned.deleted and
  .applied.restored == .planned.restored and
  .skipped.concurrentModified == 0 and
  .skipped.concurrentWriteConflict == 0 and
  (.errors | length) == 0
' "$EVIDENCE_DIR/rollback-apply.json"
```

For an inserted migration row, rollback deletes only when the complete current
document still matches the reported after checksum and the exact Mongo CAS
preimage. For a replaced row, it restores the canonical Extended JSON
before-snapshot under the same two checks. A customer/Admin write before the
read yields `concurrent_modified`; a write between read and mutation yields
`concurrent_write_conflict`. Both preserve the live row and make `ok == false`.

Rerun the exact rollback command and report. It must make zero writes and mark
every entry `already_reverted`; retain this idempotency evidence alongside fresh
post-rollback counts/checksums. Do not use rollback to erase QA seed records;
section 7's exact marker cleanup remains the only supported seed cleanup.

Only after development passes may the owner repeat sections 2-7 with:

- a fresh staging backup and evidence directory;
- `--target=staging`;
- a marker beginning `issue-351-staging-`;
- staging-specific QA User/Offer ObjectIds;
- authenticated `admin-staging.gogocash.co` and
  `app-staging.gogocash.co` against `api-staging.gogocash.co`.

Do not reuse development authorization or evidence. Close #351 only after the
staging apply is authorized, rerun proves zero changes, quarantines have an
explicit disposition, marker cleanup/absence passes, and the evidence privacy
boundary is resolved or explicitly accepted by the owner.
