# Quest task-v2 rollout gate (#353)

Last updated: 2026-07-18

Keep missing `reward_model` reads compatible as `legacy_v1`. Do not create a
`task_v2` quest until the task engine flag is enabled and MongoDB reports
replica-set transaction support. As of 2026-07-18, dev and staging satisfy
both conditions (`QUEST_TASK_V2_ENABLED=true`; authenticated single-node
replica sets, transactions commit — see rollout status below). Production
does not yet meet this gate and the flag stays off there.

## Rollout status (2026-07-18)

- Rollout complete on dev and staging; production NOT yet enabled.
- `QUEST_TASK_V2_ENABLED=true` in Railway dev and staging since 2026-07-18.
- Dev and staging Mongo are authenticated single-node replica sets (`rs0`;
  Mongo 8.0.4 dev / 8.3.4 staging); transactions commit. Conversion complete.
- All 18 `QUEST_TASK_V2_REQUIRED_INDEXES` plus the canonical fence doc
  `quest_source_config_fence` (_id/fence_key `task-v2-source-config-v1`,
  revision 0) are in place on both envs.
- Index migration executed on both envs: legacy `conversions.conversion_id_1`
  was unique and the task-v2 contract requires it NON-unique; it was dropped
  and recreated non-unique. Identity uniqueness is now enforced by the
  composite unique index `uniq_conversion_provider_identity` on
  (source, provider_account, provider_conversion_id), partial-filtered to
  string identity fields. Staging pre-check found 0 duplicate identity groups
  across 2907 string-identity conversions (all source=involve).
- Legacy quest backfill and membership reconciliation were no-ops (0 quests,
  0 memberships, 0 membership tiers, 0 legacy reward manifests/resolution
  commands/social rewards on both envs).
- Exact-once acceptance passed 7/7 on dev and staging on 2026-07-18:
  friend_referral (account_created) credited the referrer 100 pts;
  spend_target (THB) credited the buyer 200 pts; brand_purchase reached
  completed=true with 0 pts (progress-only by design); replaying the same
  conversion source_event_id credited zero additional points.
- GitHub issue #353 closed 2026-07-18 with acceptance evidence.
- Rollback: set `QUEST_TASK_V2_ENABLED=false` (the consumer no-ops
  instantly). The added indexes are harmless while disabled, but
  `conversion_id_1` must stay non-unique — the composite index now carries
  the identity-uniqueness guarantee.

### Known failure mode: conflicting required index

If any required index conflicts (e.g. `conversion_id_1` still unique),
`createIndex` silently no-ops against the same-name index,
`QuestTaskTransactionService.assertReady()` throws every tick, and the outbox
consumer's drain loop swallows the error — outbox rows sit `status: pending`,
`attempts: 0` with no error logs.

### Outbox payload identity contract

`affiliate_conversion` outbox payloads must carry top-level `source` /
`provider_account` / `provider_conversion_id` / `occurred_at` (not only
nested under `payload.current`), otherwise `canonicalConversionIdentity`
throws "Conversion provider identity is missing."

## Legacy contract backfill

> Status: executed as a no-op on dev and staging on 2026-07-18 (0 quests;
> 0 legacy reward manifests, resolution commands, or social rewards on both
> envs). The steps below remain the runbook for production.

1. Back up the target database and count all quests.
2. Capture the zero-write inventory:

   ```bash
   npm run backfill:quest-tasks:dry -w gogocash-api > quest-task-backfill-dry.json
   ```

3. Review every quest id and the counts for reward models and task keys. The
   command fails closed on duplicate legacy brand tasks, invalid point values,
   and unknown models or task types; repair those records manually before
   continuing.
4. During an approved write window, run:

   ```bash
   npm run backfill:quest-tasks:apply -w gogocash-api -- --confirm-legacy-quest-backfill \
     > quest-task-backfill-apply.json
   ```

5. The apply uses compare-and-set filters for the inventoried reward model and
   task array, then performs its own rerun. Require `rerun_would_update: 0` and
   independently capture another dry run with `would_update: 0`.

The migration only adds `reward_model: legacy_v1` and canonical legacy brand
task fields. It preserves array order, `sort_order`, enabled state, wording,
notes, points, and offer identity. It skips existing task-v2 quests.

## Membership-tier audience contract

- `audience.tier_ids` stores canonical `MembershipTier._id` ObjectId hex
  strings, never tier names or slugs. Inventory existing task-v2 quests and
  correct any malformed/name-based values before activation; runtime evaluation
  fails those records closed without retrying an ObjectId cast error.
- Any new quest-economic revision with a membership audience revalidates, in
  the fenced write transaction, that every selected tier still exists and has
  `is_active: true`. A wording/notes-only edit may retain an already-frozen tier
  ID after that tier is deactivated or deleted.
- Event qualification reads the beneficiary/referrer's real `Membership` row at
  the immutable outbox `occurred_at`. Customer reads use the same predicate at
  their requested `at` time (current time by default). Runtime does not infer a
  tier from `User.privilege`, and later `MembershipTier.is_active` changes do not
  rewrite frozen quest eligibility.
- `Membership.tier_assignment_started_at` is the durable boundary for the
  currently assigned tier. It is distinct from the billing `start_date`. New
  rows default it to creation time; `MembershipService.changeTier` advances it
  atomically only when the tier changes. A same-tier request preserves the
  boundary, including a missing legacy boundary that the migration must own.
- Membership evaluation requires a valid assignment boundary at or before the
  event/read time. Missing, null, malformed, or future boundaries fail closed.
  Therefore an event from before an A-to-B change cannot become eligible for a
  tier-B quest when it is replayed later.
- Conversion state persists monotonic `ever_audience_qualified` evidence. Once
  a positive conversion qualified, later corrections, reversals, and valid
  in-window requalification retain that lineage even after membership loss.
  Pending, zero-only, or otherwise ineligible state never creates lineage.
- The single membership row still does not retain tier history before its
  current assignment boundary. Do not backfill that boundary from billing
  `start_date` or `User.privilege`; doing so would invent historical
  eligibility.

### Assignment-boundary backfill gate

Keep `QUEST_TASK_V2_ENABLED=false` throughout this procedure in any
environment where the gate has not yet run (currently production). The gate
completed on dev and staging on 2026-07-18 as a no-op (0 memberships,
0 membership tiers); the flag is now `true` there. Deploy the schema, runtime
predicate, and atomic `changeTier` update first so new rows cannot add to the
missing-boundary inventory. Then perform this gate in production before
enabling task-v2 there:

1. Back up the exact target database and record the backup identifier.
2. Capture one rollout baseline in strict UTC. It must not be in the future and
   the tool rejects it after 15 minutes, preventing an operator from backdating
   the boundary to an old membership start:

   ```bash
   ROLLOUT_BASELINE_UTC=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
   ```

3. Run the zero-write inventory. Replace the target and exact database name for
   dev as appropriate:

   ```bash
   npm run backfill:membership-tier-assignment:dry -w gogocash-api -- \
     --target=staging \
     --confirm-database=gogocash-staging \
     --baseline="$ROLLOUT_BASELINE_UTC" \
     > membership-boundary-dry.json
   ```

   The JSON includes `issue: 353`, a random `run_id`, UTC capture/baseline
   timestamps, database name, and before/after/remaining counts. It never emits
   the Mongo URI. Any `remaining_malformed` value requires manual review; apply
   refuses to overwrite malformed or existing values.

4. While the same baseline is no more than 15 minutes old, apply with both
   explicit acknowledgements:

   ```bash
   npm run backfill:membership-tier-assignment:apply -w gogocash-api -- \
     --target=staging \
     --confirm-database=gogocash-staging \
     --baseline="$ROLLOUT_BASELINE_UTC" \
     --backup-confirmed \
     --confirm=APPLY_ISSUE_353_MEMBERSHIP_TIER_ASSIGNMENT_BOUNDARY \
     > membership-boundary-apply.json
   ```

   The write is compare-and-set on
   `tier_assignment_started_at: { $exists: false }` and applies the same
   baseline to every missing row, including cancelled or expired memberships.
   It never overwrites an existing value and immediately runs the absent-only
   update again.

5. Require `applied.modified` to match the dry-run missing count,
   `rerun.matched: 0`, `rerun.modified: 0`, `remaining_missing: 0`,
   `remaining_malformed: 0`, and `ready_to_enable_task_v2: true`. Run the apply
   command once more with the same baseline and capture its zero-write result,
   then capture a final dry run. If the 15-minute window elapsed, capture a new
   baseline and repeat the dry-run review before any apply.

The baseline is intentionally rollout time, never original membership or
billing start. Pre-baseline events fail closed; an otherwise active membership
can qualify for post-baseline events. Production-like targets and URI hosts are
refused unless `--allow-production` is also present; that override is only for
an explicitly approved production change window.

No QA fixture or cleanup ownership is created by this migration: it updates one
durable field on existing membership rows and creates no temporary documents.
Consequently cleanup is N/A. Do not unset the boundary as a rollback after
events have been evaluated. Disable task-v2 and leave the additive boundary in
place; use the separately approved point-in-time recovery and reconciliation
process only for a genuine database incident.

## Reward-model version boundary

- `legacy_v1` accepts only `audience.kind=all` and null per-user reward caps.
  The API returns an actionable 400 for a membership audience or either
  non-null cap; it never silently upgrades the request.
- Admin requests `task_v2` whenever the audience is not `all`, either cap is
  non-null, or a referral/spend task is present. A brand-only quest with the
  default all/null configuration remains compatible with `legacy_v1`.

## Activation order

This sequence was completed on dev and staging on 2026-07-18 (both backfills
were no-ops; task-v2 is enabled on authenticated replica sets in both envs).
It remains the activation order for production. After legacy payout
reconciliation and Point partial-index preflight are clean, deploy
missing-as-legacy plus assignment-boundary code with
`QUEST_TASK_V2_ENABLED=false`; complete the legacy quest backfill; complete
the membership dry-run/apply/zero-rerun gates above; enable the keyed legacy
scheduler; only then enable task-v2 on a replica set. A disabled flag or
unsupported topology must return 503 before a task-v2 config mutation.
#353 was closed on 2026-07-18 with the acceptance evidence captured on the
thread (7/7 exact-once acceptance on dev and staging, including a replayed
conversion source_event_id crediting zero additional points).
