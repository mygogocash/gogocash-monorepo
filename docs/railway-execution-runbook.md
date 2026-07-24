# Railway Production Execution Runbook

> Operator runbook for cutting GoGoCash over to Railway (project **GoGoCash**, id `9b10473a-2831-4115-a69d-091e41f0511f`, environment **production**). Synthesizes phases 2a (secrets), 2b (Mongo replica set + data), 2c (Cloudflare R2), 3 (cron/always-on), 4 (cutover/cleanup).
>
> **Tag legend** — each step is one of: `[CLAUDE-CAN-DO]` automatable via authed `railway` CLI or a repo change · `[USER-ONLY: secret]` real secret value · `[USER-ONLY: DNS]` · `[USER-ONLY: GCP]` · `[USER-ONLY: dashboard]` Railway service-config the CLI can't set · `[USER-ONLY: data]` live DB shell / real auth token / funded test user · `[USER-ONLY: account-token]` Railway account API token (dashboard → Account → Tokens).
>
> **Services:** `gogocash-api` (912b6753), `gogocash-admin` (d51b463c), `@gogocash/mobile` (app-web, eb0903f8), `MongoDB` (d545beca).
> **Companion docs:** [railway-env-matrix.md](railway-env-matrix.md), [railway-mongo-replica-set.md](railway-mongo-replica-set.md), [railway-migration.md](railway-migration.md). **Scripts:** `scripts/railway-apply-secrets.sh`, `scripts/railway-acceptance.sh`.

## 0. Dependency map & hard sequencing rules

```
2a CORS_EXTRA_ORIGINS code  ── applied (main.ts, tested)
2a apply secrets ───────────→ A2/A3 admin login + bundle
2c R2 token + bucket ───────→ C1/C2 media upload
2b Mongo replica set ───────→ B1/B2/B3 transactions  ── MUST precede any real withdrawal
2b data migration (after B) →  B4 counts
3  disable sleep + replicas=1 → D1/D2/D3 cron always-on
4  custom domains + DNS ─────→ E1 TLS + CORS  ── BEFORE end-to-end browser acceptance
4  rebuild front-ends ───────→ only AFTER api.gogocash.co live
4  decommission Cloud Run ───→ only AFTER each host validates (scale-to-zero, ≥7-day window)
4  scratch cleanup (independent)
```

1. **Mongo replica set (B1→B3) BEFORE any real withdrawal.** `runSerializedWithdraw` (`withdraw.service.ts:1941`) uses `session.withTransaction()`; standalone Mongo throws `Transaction numbers are only allowed on a replica set member or mongos`.
2. **Secrets BEFORE login (A2).** Missing `NEXTAUTH_SECRET` + `JWT_ADMIN_SECRET` ⇒ `/signin` loop.
3. **CORS + custom domains BEFORE end-to-end browser acceptance.** Post-login admin fetches run in the browser; without `CORS_EXTRA_ORIGINS` they're blocked.
4. **`api.gogocash.co` live BEFORE rebuilding front-ends.** `NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL` are build-time inlined.
5. **Each host validates on Railway BEFORE scaling its Cloud Run to zero.** Scale-to-zero (not delete) for ≥7 days.
6. **Disable app-sleep AND pin replicas=1.** Sleep-off so cron fires; replicas=1 because in-process `@nestjs/schedule` has no distributed lock and money jobs would double-fire.

## ⚠️ Decisions to confirm before execution

- **R2 bucket (staging vs prod).** Provision and review a production bucket and
  bucket-scoped token; never reuse the staging bucket/token silently.
- **Custom domains.** Phase 4 assumes `admin.gogocash.co`, `app.gogocash.co`, `api.gogocash.co`. Confirm.
- **app-web host.** Confirm its real preview/custom host (`railway domain --service @gogocash/mobile`) before wiring CORS/DNS.

## 1. Phase 2a — Secrets & config

- **1.1** `[CLAUDE-CAN-DO]` CORS env-driven allow-list — **applied** to `apps/api/src/main.ts` via `common/cors-origins.ts` (exact-match, empty env = prior behavior; unit-tested in `cors-origins.spec.ts`).
- **1.2** `[USER-ONLY: secret]` API secrets on `gogocash-api`: `JWT_SECRET` (`openssl rand -hex 32`), `JWT_ADMIN_SECRET` (`openssl rand -hex 32`).
- **1.3** `[USER-ONLY: secret]` `gogocash-admin`: `NEXTAUTH_SECRET` (`openssl rand -base64 32`).
- **1.4** `[CLAUDE-CAN-DO]` non-secret admin vars: `NEXTAUTH_URL=https://gogocash-admin-production.up.railway.app`, `NEXT_PUBLIC_API_URL=https://gogocash-api-production.up.railway.app` (build-time → `railway redeploy --service gogocash-admin`).
- **1.5** `[CLAUDE-CAN-DO]` `CORS_EXTRA_ORIGINS` on `gogocash-api` (admin + app-web preview hosts).
- **1.6** `[USER-ONLY: secret]` feature secrets as needed: `INVOLVE_SECRET`, `INVOLVE_POSTBACK_SECRET` (fails closed empty), `INVOLVE_AI_API_KEY` (fails closed), `RESEND_API_KEY`, `FIREBASE_PROJECT_ID`, `POSTHOG_KEY`, `EXPO_PUBLIC_FIREBASE_*`. Leave both Telegram tokens unset until their separate rollouts are approved: `TELEGRAM_LOGIN_BOT_TOKEN` enables only Login Widget signature verification, while `TELEGRAM_BOT_TOKEN` enables Mini App verification and makes that API the Telegram poller owner. Never set the poller token on more than one API instance. Code reads `INVOLVE_*` (the `.env.example` `INVOVLE_*` is a typo).

Use `scripts/railway-apply-secrets.sh` (reads gitignored `.env.railway.production`; `--dry-run` first; never prints values). Template: `.env.railway.production.example`.

## 2. Phase 2c — Cloudflare R2 credentials

Without the complete R2 contract every upload fails closed with `503`.

- **2.1** `[USER-ONLY: secret]` create an R2 token scoped to Object Read & Write on the reviewed bucket only.
- **2.2** `[USER-ONLY: dashboard]` seal `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` on `gogocash-api`; never copy them into evidence.
- **2.3** `[CLAUDE-CAN-DO]` set and verify `R2_BUCKET`, `R2_ENDPOINT`, and `R2_PUBLIC_BASE_URL`.

## 3. Phase 2b — Mongo replica set (R0)

See [railway-mongo-replica-set.md](railway-mongo-replica-set.md). Summary: stop ingress and every writer → restore-tested backup → pin `mongo:8.0.4` with `GLIBC_TUNABLES=glibc.pthread.rseq=1` → create the keyFile on `/data/db` → start authenticated `rs0` → initiate from a Railway dashboard shell or `railway ssh` using the exact internal host already present in the candidate API `MONGO_URI` → verify PRIMARY plus a real transaction → redeploy the exact candidate with an explicit database and `replicaSet=rs0` (never API `directConnection=true`) → acceptance B1/B2/B3 → restore candidate-only traffic. Do not revert the database to standalone after initiation; recover forward.

### Quest membership-audience preflight (#353)

- Production only: keep `QUEST_TASK_V2_ENABLED=false` while deploying the
  membership schema, fail-closed predicate, and atomic `changeTier` boundary
  update, until the production preflight is executed. Back up the exact
  production database, then follow the guarded dry-run/apply/rerun commands in
  `docs/quest-task-v2-rollout.md`. (Dev and staging: COMPLETE 2026-07-18 —
  `QUEST_TASK_V2_ENABLED=true` in both Railway envs; issue #353 closed with
  acceptance evidence. See the status note below.)
- The membership boundary apply requires a strict UTC rollout baseline no more
  than 15 minutes old, exact `--confirm-database`, `--backup-confirmed`, and
  `--confirm=APPLY_ISSUE_353_MEMBERSHIP_TIER_ASSIGNMENT_BOUNDARY`. It uses an
  absent-only CAS, never logs URI credentials, and refuses production-looking
  targets/hosts unless an approved operator adds `--allow-production`.
- Gate satisfied on dev and staging 2026-07-18 (`rerun.matched: 0`,
  `rerun.modified: 0`, `remaining_missing: 0`, `remaining_malformed: 0`,
  `ready_to_enable_task_v2: true`); membership audiences are enabled there.
  For production, do not enable until production evidence shows the same
  values. The backfill uses rollout time, not billing `start_date`;
  pre-baseline history is intentionally ineligible.
- Inventory every task-v2 quest whose audience is `membership_tiers` before
  production activation (completed for dev/staging as part of the 2026-07-18
  rollout). Each `tier_ids` entry must be a canonical `MembershipTier._id`
  hex string; old name/slug or malformed values fail closed at runtime and
  must be corrected before rollout.
- A tier must exist and be active when new quest economics are saved. Later
  global tier deactivation does not rewrite a frozen quest; runtime eligibility
  comes from the beneficiary's `Membership` record at the immutable event time.
- `MembershipService.changeTier` atomically advances
  `tier_assignment_started_at` only for a real tier change. The single row does
  not reconstruct any earlier tier; missing/malformed boundaries and events
  before the current boundary intentionally fail closed. Do not infer history
  from `User.privilege` or billing `start_date`.
- Cleanup/fixture ownership is N/A: the migration creates no QA documents and
  only sets the durable boundary on existing missing rows. Do not unset it
  after event evaluation; disable task-v2 and leave the additive field in
  place. Use separately approved point-in-time recovery/reconciliation only for
  a genuine database incident.

#### Status — task-v2 rollout COMPLETE on dev & staging (2026-07-18); production NOT yet enabled

- `QUEST_TASK_V2_ENABLED=true` in Railway envs **dev** and **staging** since
  2026-07-18 (production remains false). GitHub issue #353 closed 2026-07-18
  with acceptance evidence.
- Dev + staging Mongo are authenticated single-node replica sets (`rs0`;
  mongo 8.0.4 dev / 8.3.4 staging); transactions commit. The conversion is
  complete, not pending.
- All 18 `QUEST_TASK_V2_REQUIRED_INDEXES` plus the canonical fence doc
  `quest_source_config_fence` (`_id`/fence_key `task-v2-source-config-v1`,
  revision 0) are in place on both envs.
- Index migration executed on both envs: legacy `conversions.conversion_id_1`
  was `unique: true`; the task-v2 contract requires it NON-unique, so it was
  dropped and recreated non-unique. Identity uniqueness is now enforced by the
  composite unique index `uniq_conversion_provider_identity` on (`source`,
  `provider_account`, `provider_conversion_id`), partial-filtered to string
  identity fields. Staging pre-check found 0 duplicate identity groups across
  2907 string-identity conversions (all `source=involve`).
- Legacy quest backfill + membership reconciliation were no-ops at rollout
  time (0 quests, 0 memberships, 0 membership tiers, 0 legacy reward
  manifests/resolution commands/social rewards on both envs).
- Exact-once acceptance passed 7/7 on BOTH envs on 2026-07-18:
  `friend_referral` (account_created) credited the referrer 100 pts;
  `spend_target` (THB) credited the buyer 200 pts; `brand_purchase`
  completed=true with 0 pts (progress-only by design); replaying the same
  conversion `source_event_id` credited ZERO additional points.
- **Known failure mode (watch for this in production):** if any required index
  conflicts (e.g. `conversion_id_1` still unique), `createIndex` silently
  no-ops against the same-name index,
  `QuestTaskTransactionService.assertReady()` throws every tick, and the
  outbox consumer's drain loop swallows the error — outbox rows sit
  `status: pending`, `attempts: 0` with NO error logs.
- **Outbox payload contract:** `affiliate_conversion` outbox payloads MUST
  carry top-level `source` / `provider_account` / `provider_conversion_id` /
  `occurred_at` (not only nested under `payload.current`), else
  `canonicalConversionIdentity` throws "Conversion provider identity is
  missing."
- **Rollback:** set `QUEST_TASK_V2_ENABLED=false` (consumer no-ops instantly).
  The added indexes are harmless while disabled, BUT `conversion_id_1` must
  stay non-unique — `uniq_conversion_provider_identity` now carries the
  identity-uniqueness guarantee.

## 4. Phase 3 — cron always-on, and Phase 4 — cutover & cleanup

### Cron (in-process `@nestjs/schedule`, `app.module.ts:29`)

| Job                                          | Schedule (UTC) | Money?  | Break-glass route                      |
| -------------------------------------------- | -------------- | ------- | -------------------------------------- |
| `withdraw/tasksService.ts:15` syncConversion | every 12h      | no      | `/tasks/update-conversions/:id`        |
| `withdraw/tasksService.ts:30` quest reward   | 7th @01:00     | **yes** | `/tasks/update-conversions-reward/:id` |
| `point/tasksService.ts:22` award points      | daily @00:00   | **yes** | `/tasks/update-points/:id`             |
| `offer/tasksService.ts:28` refresh offers    | 1st @12:00     | no      | `/tasks/update-offers/:id`             |

- **3.1** `[USER-ONLY: dashboard]` disable App Sleeping on `gogocash-api` (a passing `/health` does NOT prevent sleep — sleep triggers on inbound idleness).
- **3.2** `[USER-ONLY: dashboard]` pin replicas = 1 (quest-reward job not verified idempotent — a replica bump >1 is a money-correctness incident).
- Acceptance harness: `scripts/railway-acceptance.sh` (ran 4/4 read-only PASS).

### Cutover

- **4.1** `[CLAUDE-CAN-DO]` `railway domain --service <svc> <host>` for admin/app-web/api → each returns a CNAME target.
- **4.2** `[USER-ONLY: DNS]` CNAME each host to its Railway target (record the old Cloud Run target = rollback). Railway auto-issues TLS.
- **4.3** Cutover order **admin → app-web → api** (API last; its hostname is unchanged so the Involve postback URL is unaffected). Per host: flip DNS → wait TLS → run E1.
- **4.4** `[CLAUDE-CAN-DO]` after `api.gogocash.co` live: rebuild front-ends (`NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL=https://api.gogocash.co` + redeploy). Helper: `scripts/railway-rebuild-frontends.sh`.
- **4.5** `[CLAUDE-CAN-DO]` after E1 api: `CORS_EXTRA_ORIGINS=https://admin.gogocash.co,https://app.gogocash.co`.
- **4.6** decommission Cloud Run: `[USER-ONLY: GCP]` scale to zero after each host validates (≥7-day window); `[CLAUDE-CAN-DO]` disable (not delete) the GCP deploy workflows; keep `ci.yml`/`codeql.yml`.
- **4.7** `[CLAUDE-CAN-DO]` scratch cleanup in project `attractive-enjoyment` (`ed82ec6c`): delete the `api`/`admin`/`app-web` services + `staging` env I created, NOT `urban-radio` or its production env. Safety-check (no custom domains, nothing in prod references them), confirm each name at the prompt.

## 5. Acceptance test table

| ID  | Criterion                      | Verify                                                                              | Expected                                             |
| --- | ------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| A1  | DB route returns data          | `curl -sS $API/gototrack/merchants`                                                 | 200 + JSON array (`[]`+200 still proves DB up)       |
| A2  | Admin login mints token        | `curl -i -X POST $API/admin/login -d '{"email","password"}'`                        | 200 + non-empty `token`; needs admin doc in Mongo    |
| A3  | Admin bundle calls prod API    | grep built chunks for the API URL                                                   | only `gogocash-api-production.up.railway.app`        |
| B1  | `rs.status()` PRIMARY          | `rs.status().set` / `members[].stateStr` / `rs.conf().members[0].host`              | `rs0` / `PRIMARY` / exact host from API `MONGO_URI`  |
| B2  | Transaction commits in mongosh | startSession→txn→commit (snippet in mongo doc)                                      | `2`, no RS error                                     |
| B3  | Withdrawal exercises txn       | `POST /withdraw/bank-transfer` (Firebase token, funded user)                        | 200/201, logs show no `Transaction numbers…`         |
| B4  | Restore counts match           | per-collection `countDocuments()` both sides                                        | identical map                                        |
| C1  | Media upload round-trips       | `PATCH /admin/update-category/:id -F image=@test.png` (admin token, `support` role) | 200 (not 503) + bucket object                        |
| C2  | R2 object publicly served      | `curl -sI "$R2_PUBLIC_BASE_URL/categories/<key>"`                                  | 200 image/png                                        |
| D1  | API doesn't sleep              | status Active; `sleep 900; curl $API/health`                                        | Active; 200 no cold start                            |
| D2  | Cron fires / force-trigger     | trigger route, then `railway logs --service gogocash-api \| grep '<event>'`         | matched log line                                     |
| D3  | Exactly 1 replica              | `railway status --json` numReplicas                                                 | `1`                                                  |
| E1  | Custom domains HTTPS + CORS    | per-host curl + OPTIONS preflight (allowed vs forged origin)                        | 200; ACAO for allowed; none for forged               |
| E2  | Involve postback survives flip | wrong token vs correct token                                                        | 401 vs OK 200 (guard checks only `?token=`)          |
| E3  | Scratch gone, others intact    | status of all three projects                                                        | scratch services gone; urban-radio + prod Online     |

## 6. Execution queue — `[CLAUDE-CAN-DO]` only (in order)

1. Non-secret admin vars (`NEXTAUTH_URL`, `NEXT_PUBLIC_API_URL`) + redeploy.
2. `CORS_EXTRA_ORIGINS` (confirm app-web host first).
3. R2 bucket/endpoint/public-base vars after bucket review; seal its token.
4. Add custom domains (`railway domain`).
5. Rebuild front-ends against `api.gogocash.co` (gated on E1 api).
6. Switch CORS to real origins (after E1 api).
7. Disable GCP deploy workflows.
8. Scratch cleanup after safety-check.
9. Run `scripts/railway-acceptance.sh` for the read-only subset; tail logs for B3/D2.

## 7. Risk register

- **R0 untested money path** — B3 before real withdrawals; replica-set steps restart the money DB (backup first).
- **R0 cron double-fire** — no distributed lock; quest-reward not verified idempotent; never run >1 replica.
- **R2 public-route drift** — a write can succeed while a wrong
  `R2_PUBLIC_BASE_URL` makes the resulting object unreadable; C1/C2 must use the
  same marker-owned key.
- **Build-time inlining** — `*_API_URL` take effect only on rebuild; API flips last.
- **Reversibility** — every cutover step is DNS-reversible only while Cloud Run is scaled-to-zero (not deleted) — keep the ≥7-day window.

## Appendix A — Staging DNS cutover (current)

Staging hostnames are registered on Railway but may still CNAME to `ghs.googlehosted.com` (GCP/Firebase). Until DNS flips, use `*.up.railway.app` URLs for acceptance.

| Host                        | CNAME target (Railway)                                                  |
| --------------------------- | ----------------------------------------------------------------------- |
| `api-staging.gogocash.co`   | `i313nfy0.up.railway.app`                                               |
| `admin-staging.gogocash.co` | `hs31ua3b.up.railway.app`                                               |
| `app-staging.gogocash.co`   | `dwxmdvrr.up.railway.app` (Railway custom domain on `@gogocash/mobile`) |

**Point API at external Atlas staging data — HISTORICAL (pre replica-set
conversion); do not repoint staging at Atlas.** Staging now runs on the
authenticated single-node `rs0` replica set (mongo 8.3.4; conversion complete,
transactions commit); the staging `MONGO_URI` must keep targeting it with
`replicaSet=rs0`. Kept for the record only:

```bash
railway variables --set 'MONGO_URI=<atlas-staging-uri>' --service gogocash-api
```

Atlas → Network Access → allow `0.0.0.0/0` (Railway egress is dynamic).

**After `api-staging` resolves to Railway**, rebuild front-ends (API URL is build-time):

```bash
railway variables --service gogocash-admin \
  --set 'NEXT_PUBLIC_API_URL=https://api-staging.gogocash.co' \
  --set 'NEXTAUTH_URL=https://admin-staging.gogocash.co'
railway redeploy --service gogocash-admin

railway variables --service app-web \
  --set 'EXPO_PUBLIC_API_URL=https://api-staging.gogocash.co'
railway redeploy --service app-web
```

**Media (Cloudflare R2):** `R2_BUCKET`, `R2_ENDPOINT`, `R2_PUBLIC_BASE_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `MEDIA_MAX_UPLOAD_BYTES` on `gogocash-api`. Staging: bucket `gogocash-catalog-staging`, public domain **`https://media-staging.gogocash.co`**. Create S3 API token in Cloudflare → R2 → **Manage R2 API Tokens** (**Object Read & Write** on the bucket). **Migrate legacy GCS URLs in Mongo:** inventory first with `npm run media:inventory -w gogocash-api`, then audit with either `npm run media:migrate-gcs-to-r2 -w gogocash-api` (safe default) or the explicit alias `npm run media:migrate-gcs-to-r2:dry -w gogocash-api`. Review the complete dry-run result before applying with `npm run media:migrate-gcs-to-r2 -w gogocash-api -- --apply`. Apply requires `MONGO_URI` plus the R2 environment above and must run from a host that reaches Mongo (Railway shell or TCP proxy). The migration fails closed for Offer/Category structured ownership proof, any current or prospective `policy_media_asset_registry` row, or a concurrent document change; route those records through the durable API/service instead of bypassing the fence. GCS upload code removed; `@google-cloud/storage` dependency dropped.

**Common blockers:** empty `[]` merchants (wrong/empty Mongo), missing JWT secrets (login fails), DNS still on Google Frontend (custom domain 500).
