# Quest task-v2 event reconciliation

Use this command when task-v2 source transitions exist but their outbox rows
were missed, base referral rows are marked for repair, or provider-verified
conversion quarantine needs an authoritative retry.

Prerequisites:

- `QUEST_TASK_V2_ENABLED=true`
- `MONGO_URI` points to the intended replica set or mongos
- Node.js 24 or newer (the API package engine requirement)
- run against one environment at a time; confirm dev/staging/production before
  proceeding

## Rollout status (2026-07-18)

`QUEST_TASK_V2_ENABLED=true` on Railway dev and staging since 2026-07-18;
production is NOT yet enabled. Dev and staging Mongo are authenticated
single-node replica sets (rs0; mongo 8.0.4 dev / 8.3.4 staging) and
transactions commit.

The provider-identity index migration below was executed on both envs:
`conversions.conversion_id_1` (legacy `unique: true`) was dropped and recreated
non-unique; identity uniqueness is now enforced by the composite unique index
`uniq_conversion_provider_identity` on
(source, provider_account, provider_conversion_id), partial-filtered to string
identity fields. The staging pre-check found 0 duplicate identity groups across
2907 string-identity conversions (all `source=involve`). All 18
`QUEST_TASK_V2_REQUIRED_INDEXES` plus the canonical fence doc
`quest_source_config_fence` (fence_key `task-v2-source-config-v1`, revision 0)
are in place on both envs. Legacy quest backfill and membership reconciliation
were no-ops at rollout time (0 quests, 0 memberships, 0 membership tiers, 0
legacy reward manifests/resolution commands/social rewards on both envs).

Exact-once acceptance passed 7/7 on both dev and staging on 2026-07-18:
friend_referral (account_created) credited the referrer 100 pts; spend_target
(THB) credited the buyer 200 pts; brand_purchase completed=true with 0 pts
(progress-only by design); replaying the same conversion `source_event_id`
credited zero additional points. GitHub issue #353 was closed 2026-07-18 with
acceptance evidence.

## Required provider-identity index migration

Before enabling task-v2 for the first time in an environment (as of 2026-07-18
this applies only to production — dev and staging have already completed this
migration and run with `QUEST_TASK_V2_ENABLED=true`), keep
`QUEST_TASK_V2_ENABLED=false`, pause conversion writers, and inspect the target
database:

```sh
npm run migrate:conversion-provider-identity -w gogocash-api
```

The dry run reports legacy rows, canonical provider-identity collisions, and
whether the old raw `conversion_id` uniqueness is still present. Resolve any
reported duplicate canonical identities before applying. Then apply with the
exact database name printed by the dry run:

```sh
npm run migrate:conversion-provider-identity -w gogocash-api -- --apply --confirm-database=<database>
```

The controlled order is: backfill `source/provider_account/provider_conversion_id`,
create the compound unique provider index, drop the old raw-id unique index,
recreate `conversion_id` as a non-unique lookup index, create every task-v2
transition/outbox/ingestion/progress/contribution/state/Point identity index,
and seed the deterministic source/config fence. The Conversion schema disables
automatic index creation so application bootstrap cannot race the provider
identity swap. Task-v2 readiness re-verifies the exact index names, keys,
uniqueness, and partial filters before every source mutation. Resume writers
only after the apply report shows `provider_index_ready: true`,
`legacy_unique_index_present: false`, `task_v2_indexes_ready: true`, and
`canonical_fence_ready: true`.

### Known failure mode

If any required index conflicts with an existing same-name index (e.g.
`conversion_id_1` still unique), `createIndex` silently no-ops against the
same-name index, `QuestTaskTransactionService.assertReady()` throws on every
tick, and the outbox consumer's drain loop swallows the error — outbox rows
sit at `status: pending` with `attempts: 0` and NO error logs. If pending
counts do not drain and attempts stay at 0 with nothing in the logs, re-run
the index migration dry run and check the report before investigating anything
else. Related payload contract: `affiliate_conversion` outbox payloads must
carry top-level `source` / `provider_account` / `provider_conversion_id` /
`occurred_at` (not only nested under `payload.current`), otherwise
`canonicalConversionIdentity` throws "Conversion provider identity is
missing."

## Event repair

From `apps/api`:

```sh
node -r ./scripts/register-swc-runtime.cjs scripts/reconcile-quest-task-events.ts --limit=500 --quarantine-limit=100
```

The command is idempotent. It immediately requeues bounded `retryable` outbox
rows, creates only missing deterministic outbox rows,
marks base-referral repair on recovered account events when the unchanged +50
row is absent, and asks the authoritative lifecycle to resolve only quarantine
rows that a provider pull has populated with both `authoritative_payload` and
`authoritative_verified_at`. It never promotes the original non-authoritative
postback payload. The normal outbox consumer then performs progress and Point
effects transactionally. It does not expose an arbitrary award command.

Verify after each run:

```javascript
db.quest_outbox.countDocuments({ status: "retryable" })
db.quest_outbox.countDocuments({ status: "pending" })
db.quest_conversion_quarantine.countDocuments({ status: "pending" })
db.quest_event_ingestions.countDocuments({ status: "retryable" })
```

Re-run the command after correcting a transient provider, FX, or topology
failure. Do not delete source transitions, outbox rows, progress rows, or Point
rows as rollback; disable `QUEST_TASK_V2_ENABLED` to stop new task-v2 work
(the outbox consumer no-ops instantly) and preserve the immutable evidence for
diagnosis. The added task-v2 indexes are harmless while the flag is disabled,
but do NOT restore the legacy unique `conversion_id_1` index — identity
uniqueness is now enforced by the composite unique index
`uniq_conversion_provider_identity` on
(source, provider_account, provider_conversion_id).
