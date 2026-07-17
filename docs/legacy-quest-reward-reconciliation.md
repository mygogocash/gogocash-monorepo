# Legacy quest reward reconciliation and manifest resolution

This runbook freezes historical legacy quest payouts before any keyed scheduler
is enabled. It is deliberately fail-closed: a missing key or missing row is not
evidence that a user was unpaid.

The commands below default to dry-run. Do not use them against a hosted database
until a database backup, the reviewed evidence file, the change ticket, and a
rollback owner are all recorded. This implementation was verified only against
isolated local standalone MongoDB and replica-set test databases; no hosted
apply was performed.

## Safety contract

- `reward_model: task_v2` is never read or modified by this workflow.
- A legacy scheduler runs only for reconciliation version `1` with status
  `ready`.
- Historical rows remain unkeyed unless their lineage is proven. The partial
  unique indexes intentionally permit multiple unkeyed rows.
- Rank and special-point schedulers replay immutable recipient manifests. They
  never recompute a leaderboard during a retry.
- Both the `rank` and `special-next-round` manifests are required for every
  legacy quest. Every reviewed candidate is either included or explicitly
  excluded with a reason.
- The first resolver write freezes the quest's payout configuration checksum,
  config/campaign revisions, command key, and plan checksum. Legacy economics,
  schedule, and configured social destinations cannot change after resolution
  starts.
- A resolution command is `preparing` until the exact reviewed pair is durable.
  Reconciliation withholds `ready` unless that one command is `complete` and
  names both immutable manifest hashes.
- Purchase Point creation runs only from durable conversion state `ready`; the
  canonical provider identity and frozen amount are persisted before payout.
- An empty recipient set requires a written `no_recipient_reason` based on
  reviewed external evidence. Database absence alone is not an acceptable
  reason.
- Apply commands require the dry-run checksum, credential-free target
  fingerprint, and explicit quest id. Any drift aborts before a write.

## 1. Run the base reconciliation dry-run

Run from `apps/api` with `MONGO_URI` injected by the approved secret mechanism.
Do not paste credentials into shell history or the evidence file.

```bash
node -r ./scripts/register-swc-runtime.cjs scripts/reconcile-legacy-quest-rewards.ts \
  --dry-run \
  --run-id=<change-ticket>-inventory
```

Archive the complete JSON report. Review:

- `target_fingerprint` and `evidence_checksum`;
- every planned operation and preimage in `backup`;
- every quarantine reason and record id;
- confirmation that `task_v2_quests_excluded` is correct;
- confirmation that no identity was derived from an absent row.

The first confirmed apply is allowed to backfill proven row identities, create
the partial unique indexes, and publish `quarantined` state. It must not make a
quest `ready` while either immutable manifest is missing.

```bash
node -r ./scripts/register-swc-runtime.cjs scripts/reconcile-legacy-quest-rewards.ts \
  --apply \
  --run-id=<change-ticket>-quarantine \
  --confirm-checksum=<dry-run-evidence-checksum> \
  --confirm-target=<dry-run-target-fingerprint> \
  > /absolute/path/to/confirmed-apply-report.json
```

Any CAS conflict or index failure is a stop condition. Archive the apply report
and rerun dry-run; never reuse the old checksum.

## 2. Prepare reviewed manifest evidence

Use one JSON file per quest. The file is an audit input, not an export inferred
from current database absence. It must name the source review and contain both
manifest types. Payout keys are not accepted from the operator; the resolver
derives them from quest, user, reward type, and rank.

```json
{
  "quest_id": "<24-character quest ObjectId>",
  "reconciliation_version": 1,
  "reviewed_by": "<operator identity>",
  "review_reference": "<ticket or immutable evidence location>",
  "completeness_attestation": "reviewed_complete_recipient_and_exclusion_set",
  "manifests": [
    {
      "reward_type": "rank",
      "recipients": [
        {
          "user_id": "<included user ObjectId>",
          "rank": 1,
          "amount": 1200,
          "currency": "THB"
        },
        {
          "user_id": "<excluded user ObjectId>",
          "rank": 2,
          "amount": 800,
          "currency": "THB",
          "excluded": true,
          "exclusion_reason": "<reviewed reason>"
        }
      ]
    },
    {
      "reward_type": "special-next-round",
      "recipients": [],
      "no_recipient_reason": "<reviewed evidence proving an intentional empty set>"
    }
  ]
}
```

For an included rank recipient, amount and currency must match the quest's
immutable `rewards` snapshot. Excluded candidates do not mint an effect but stay
in the manifest as evidence. A manifest may use `no_recipient_reason` only when
its recipient list is empty.

## 3. Resolve the two manifests with guarded CAS

The quest must still be `pending` or `quarantined` at reconciliation version
`1`. Dry-run validates the complete evidence, derives payout identities, hashes
empty-set reasons, verifies rank economics, and reports manifest hashes.

```bash
node -r ./scripts/register-swc-runtime.cjs scripts/resolve-legacy-reward-manifests.ts \
  --dry-run \
  --quest-id=<quest-id> \
  --evidence-file=</absolute/path/to/reviewed-evidence.json>
```

Have a second reviewer compare the reported included/excluded counts and hashes
to the evidence source. Apply only the unchanged plan:

```bash
node -r ./scripts/register-swc-runtime.cjs scripts/resolve-legacy-reward-manifests.ts \
  --apply \
  --quest-id=<quest-id> \
  --evidence-file=</absolute/path/to/reviewed-evidence.json> \
  --confirm-quest=<quest-id> \
  --confirm-checksum=<dry-run-plan-checksum> \
  --confirm-target=<dry-run-target-fingerprint>
```

The resolver is a standalone-safe, recoverable state machine. It performs these
guarded writes in order:

1. Revalidate the live payout configuration and quest snapshot, then CAS-freeze
   the command key, plan/config checksums, and resolution start time at the
   expected config/campaign revisions.
2. Idempotently create the immutable resolution command in `preparing` state.
3. Insert each manifest independently with `$setOnInsert`, then compare every
   persisted immutable evidence field to the confirmed plan.
4. Verify that the quest has exactly the two confirmed manifest hashes, then
   mark the command `complete`.

Concurrent identical applies produce one `inserted` result and idempotent
`already_applied` results. If a process stops after the freeze, command insert,
or first manifest, rerun the same confirmed evidence: the resolver validates
the durable prefix, inserts only the missing manifest, and completes the
command. A conflicting command or manifest is an immutable-evidence conflict
and is never overwritten. A partial command never makes the quest `ready`.

## 4. Rerun reconciliation before enabling schedulers

Manifest resolution does not set a quest to `ready`. Run the base reconciliation
again, review the new report, and confirm that the target quest has no remaining
quarantine entries. Apply its new checksum and target using the command in step

1. Quest readiness is the final write, after data backfills and index checks.

If a quarantine remains:

- `missing_recipient_manifest`: the evidence file omitted a manifest or the
  resolver was not applied.
- `invalid_recipient_manifest`: stop. Compare the stored document with its
  archived resolver output and database backup. Do not replace immutable
  evidence with a newly inferred list.
- `incomplete_manifest_resolution`: rerun the same confirmed resolver plan if
  its command and existing manifest are compatible. Stop for any command,
  checksum, or manifest conflict.
- `quest_config_checksum_mismatch`: stop. The quest economics, schedule, or
  configured social destinations changed after review; do not refresh the
  checksum from the mutated row.
- `rank_manifest_coverage_mismatch` or `rank_user_identity_conflict`: stop.
  Resolve the exact manifest/effect coverage or `user_id`/`aff_sub1` conflict;
  zero, partial, orphaned, or extra rank effects cannot publish readiness.
- `purchase_identity_conflict`, `duplicate_purchase_effect`, or
  `purchase_missing_effect`: stop. A purchase Point must map to exactly one
  canonical provider conversion and durable conversion payout state.
- `unsupported_purchase_currency`: stop. An unpaid non-THB/non-USD conversion
  has no immutable quote and must not enter `ready` state.
- `amount_currency_rank_mismatch`, `partial_round`, or `duplicate_round`:
  reconcile the reviewed payout export against the named source rows; correct
  only a proven source-data error under its own audited migration, then rerun.
- `missing_quest_lineage`, `social_referral_ambiguity`,
  `purchase_lineage_mismatch`, or `overlapping_quest_windows`: obtain external
  lineage evidence and perform a separately reviewed identity backfill. A
  manifest does not override ambiguous Point or Conversion provenance.
- `absence_does_not_prove_unpaid`: supply a complete reviewed manifest,
  including an explicit reviewed empty-set reason when appropriate. Never clear
  this quarantine because no row was found.
- `task_v2_legacy_effect` or `unknown_reward_model`: stop and investigate the
  model classification; this workflow must not override it.

## 5. Acceptance and rerun checks

Before allowing the scheduled/manual endpoints to run, verify:

- both manifest documents exist with the dry-run hashes and review metadata;
- the named quest is `ready`, version `1`, and not `task_v2`;
- the six unique indexes exist:
  `uniq_point_idempotency_key`, `uniq_conversion_quest_payout_key`,
  `uniq_social_reward_legacy_payout_key`,
  `uniq_legacy_reward_manifest_key`,
  `uniq_legacy_reward_manifest_quest_type`, and
  `uniq_legacy_reward_resolution_command`;
- the resolution command is `complete`, its plan/config checksums match the
  frozen quest markers, and its expected hashes are exactly the two stored
  manifests;
- another reconciliation dry-run plans zero writes for the quest;
- rerunning the manifest resolver reports `already_applied`;
- a crash/retry test uses the same payout keys and does not complete the quest
  before all recipient effects exist.

After the first scheduler run, compare manifest recipients to keyed Point,
SocialReward, and Conversion effects. Included recipients must have exactly one
effect; excluded recipients must have none.

## Rollback and incident handling

The apply report contains exact changed-field preimages, reverse-order rollback
operations, and a `rollback_checksum`. Archive the complete apply JSON to an
absolute path. With schedulers disabled and an approved incident owner, execute
only that artifact against its original target:

```bash
node -r ./scripts/register-swc-runtime.cjs scripts/reconcile-legacy-quest-rewards.ts \
  --rollback \
  --run-id=<change-ticket>-rollback \
  --report-file=</absolute/path/to/confirmed-apply-report.json> \
  --confirm-checksum=<apply-report-rollback-checksum> \
  --confirm-target=<apply-report-target-fingerprint>
```

Rollback restores exact preimages in reverse CAS order. A row already at its
preimage is an idempotent `already_restored`; any third-party drift is a
`cas_conflict` and a stop condition. Never edit the archived report or invent a
replacement preimage. The JSON marker `__gogocash_legacy_reward_absent__`
preserves fields that were absent before apply so rollback can issue an exact
`$unset`; do not remove or rewrite that marker.

A failed resolver can leave a frozen `preparing` command and one compatible
manifest. This is an expected recoverable prefix, not readiness: rerun the same
confirmed manifest plan to complete the exact pair. Do not delete the command
or partial manifest.

If reviewed manifest evidence is later proven wrong, immediately set the quest
back to a non-ready state through an audited incident change and preserve the
stored manifests and reports as evidence. Do not delete or overwrite them in
place. Determine compensating ledger actions with Finance; keyed idempotency
prevents duplication but does not authorize silently reversing a paid reward.
