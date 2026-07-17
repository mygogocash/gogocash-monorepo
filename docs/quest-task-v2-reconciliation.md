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

## Required provider-identity index migration

Before enabling task-v2 for the first time, keep
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
rows as rollback; disable `QUEST_TASK_V2_ENABLED` to stop new task-v2 work and
preserve the immutable evidence for diagnosis.
