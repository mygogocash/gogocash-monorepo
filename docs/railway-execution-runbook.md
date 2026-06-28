# Railway Production Execution Runbook

> Operator runbook for cutting GoGoCash over to Railway (project **GoGoCash**, id `9b10473a-2831-4115-a69d-091e41f0511f`, environment **production**). Synthesizes phases 2a (secrets), 2b (Mongo replica set + data), 2c (GCS), 3 (cron/always-on), 4 (cutover/cleanup).
>
> **Tag legend** — each step is one of: `[CLAUDE-CAN-DO]` automatable via authed `railway` CLI or a repo change · `[USER-ONLY: secret]` real secret value · `[USER-ONLY: DNS]` · `[USER-ONLY: GCP]` · `[USER-ONLY: dashboard]` Railway service-config the CLI can't set · `[USER-ONLY: data]` live DB shell / real auth token / funded test user · `[USER-ONLY: account-token]` Railway account API token (dashboard → Account → Tokens).
>
> **Services:** `gogocash-api` (912b6753), `gogocash-admin` (d51b463c), `@gogocash/mobile` (app-web, eb0903f8), `MongoDB` (d545beca).
> **Companion docs:** [railway-env-matrix.md](railway-env-matrix.md), [railway-mongo-replica-set.md](railway-mongo-replica-set.md), [railway-migration.md](railway-migration.md). **Scripts:** `scripts/railway-apply-secrets.sh`, `scripts/railway-acceptance.sh`.

## 0. Dependency map & hard sequencing rules

```
2a CORS_EXTRA_ORIGINS code  ── applied (main.ts, tested)
2a apply secrets ───────────→ A2/A3 admin login + bundle
2c GCS creds + bucket ──────→ C1/C2 media upload
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
- **GCS bucket (staging vs prod).** `GCS_CATALOG_BUCKET` is `gogocash-catalog-staging` in the **production** env. Provision `gogocash-catalog-prod` (recommended) or knowingly reuse staging. The SA is scoped to one bucket.
- **Custom domains.** Phase 4 assumes `admin.gogocash.co`, `app.gogocash.co`, `api.gogocash.co`. Confirm.
- **app-web host.** Confirm its real preview/custom host (`railway domain --service @gogocash/mobile`) before wiring CORS/DNS.

## 1. Phase 2a — Secrets & config
- **1.1** `[CLAUDE-CAN-DO]` CORS env-driven allow-list — **applied** to `apps/api/src/main.ts` via `common/cors-origins.ts` (exact-match, empty env = prior behavior; unit-tested in `cors-origins.spec.ts`).
- **1.2** `[USER-ONLY: secret]` API secrets on `gogocash-api`: `JWT_SECRET` (`openssl rand -hex 32`), `JWT_ADMIN_SECRET` (`openssl rand -hex 32`), `CROSSMINT_SECRET`.
- **1.3** `[USER-ONLY: secret]` `gogocash-admin`: `NEXTAUTH_SECRET` (`openssl rand -base64 32`).
- **1.4** `[CLAUDE-CAN-DO]` non-secret admin vars: `NEXTAUTH_URL=https://gogocash-admin-production.up.railway.app`, `NEXT_PUBLIC_API_URL=https://gogocash-api-production.up.railway.app` (build-time → `railway redeploy --service gogocash-admin`).
- **1.5** `[CLAUDE-CAN-DO]` `CORS_EXTRA_ORIGINS` on `gogocash-api` (admin + app-web preview hosts).
- **1.6** `[USER-ONLY: secret]` feature secrets as needed: `INVOLVE_SECRET`, `INVOLVE_POSTBACK_SECRET` (fails closed empty), `INVOLVE_AI_API_KEY` (fails closed), `RESEND_API_KEY`, `FIREBASE_PROJECT_ID`, `CROSSMINT_*`, `POSTHOG_KEY`, `EXPO_PUBLIC_FIREBASE_*`. Leave `TELEGRAM_BOT_TOKEN` unset to keep Telegram off. Code reads `INVOLVE_*` (the `.env.example` `INVOVLE_*` is a typo).

Use `scripts/railway-apply-secrets.sh` (reads gitignored `.env.railway.production`; `--dry-run` first; never prints values). Template: `.env.railway.production.example`.

## 2. Phase 2c — GCS credentials
Without this every upload 503s (`gcs-object-storage.service.ts:138`); `new Storage()` relies on ADC and Railway has no GCP identity.
- **2.1** `[USER-ONLY: GCP]` create a bucket-scoped SA (`roles/storage.objectAdmin` on the bucket only) + JSON key (`gcloud`). If creating a prod bucket, disable UBLA so `makePublic()` per-object ACLs work.
- **2.2** Deliver the key — PREFERRED `[USER-ONLY: dashboard]` mount the JSON file at `/secrets/gcs-sa.json`, then `[CLAUDE-CAN-DO]` `GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcs-sa.json` (no code change). FALLBACK (no file mount): base64 var `GCS_SA_KEY_B64` + an `apps/api/docker-entrypoint.sh` decode + Dockerfile `ENTRYPOINT` (diff in this repo's runbook history) — verify with `railway ssh`.
- **2.3** `[CLAUDE-CAN-DO]` point at the bucket: `GCS_CATALOG_BUCKET`, `GCS_CATALOG_PUBLIC_BASE_URL`.

## 3. Phase 2b — Mongo replica set (R0)
See [railway-mongo-replica-set.md](railway-mongo-replica-set.md). Summary: backup first → `[USER-ONLY: dashboard]` keyFile on `/data/db` (chmod 400, chown mongodb) → set start command `mongod --replSet rs0 --keyFile /data/db/mongo-keyfile --ipv6 --bind_ip ::,0.0.0.0 …` (dashboard or GraphQL `serviceInstanceUpdate`) → `[USER-ONLY: data]` `rs.initiate({_id:"rs0",members:[{_id:0,host:"mongodb.railway.internal:27017"}]})` → `railway redeploy --service gogocash-api` (no URI change; do NOT add `directConnection=true` to the API URI) → acceptance B1/B2/B3 → data dump/restore via the public TCP proxy → B4.

## 4. Phase 3 — cron always-on, and Phase 4 — cutover & cleanup

### Cron (in-process `@nestjs/schedule`, `app.module.ts:29`)
| Job | Schedule (UTC) | Money? | Break-glass route |
|---|---|---|---|
| `withdraw/tasksService.ts:15` syncConversion | every 12h | no | `/tasks/update-conversions/:id` |
| `withdraw/tasksService.ts:30` quest reward | 7th @01:00 | **yes** | `/tasks/update-conversions-reward/:id` |
| `point/tasksService.ts:22` award points | daily @00:00 | **yes** | `/tasks/update-points/:id` |
| `offer/tasksService.ts:28` refresh offers | 1st @12:00 | no | `/tasks/update-offers/:id` |
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
| ID | Criterion | Verify | Expected |
|---|---|---|---|
| A1 | DB route returns data | `curl -sS $API/gototrack/merchants` | 200 + JSON array (`[]`+200 still proves DB up) |
| A2 | Admin login mints token | `curl -i -X POST $API/admin/login -d '{"email","password"}'` | 200 + non-empty `token`; needs admin doc in Mongo |
| A3 | Admin bundle calls prod API | grep built chunks for the API URL | only `gogocash-api-production.up.railway.app` |
| B1 | `rs.status()` PRIMARY | `rs.status().set` / `members[].stateStr` / `rs.conf().members[0].host` | `rs0` / `PRIMARY` / `mongodb.railway.internal:27017` |
| B2 | Transaction commits in mongosh | startSession→txn→commit (snippet in mongo doc) | `2`, no RS error |
| B3 | Withdrawal exercises txn | `POST /withdraw/bank-transfer` (Firebase token, funded user) | 200/201, logs show no `Transaction numbers…` |
| B4 | Restore counts match | per-collection `countDocuments()` both sides | identical map |
| C1 | Media upload round-trips | `PATCH /admin/update-category/:id -F image=@test.png` (admin token, `support` role) | 200 (not 503) + bucket object |
| C2 | Object publicly served | `curl -sI https://storage.googleapis.com/$BUCKET/categories/<key>` | 200 image/png |
| D1 | API doesn't sleep | status Active; `sleep 900; curl $API/health` | Active; 200 no cold start |
| D2 | Cron fires / force-trigger | trigger route then `railway logs … | grep` | matched log line |
| D3 | Exactly 1 replica | `railway status --json` numReplicas | `1` |
| E1 | Custom domains HTTPS + CORS | per-host curl + OPTIONS preflight (allowed vs forged origin) | 200; ACAO for allowed; none for forged |
| E2 | Involve postback survives flip | wrong token vs correct token | 401 vs OK 200 (guard checks only `?token=`) |
| E3 | Scratch gone, others intact | status of all three projects | scratch services gone; urban-radio + prod Online |

## 6. Execution queue — `[CLAUDE-CAN-DO]` only (in order)
1. (2c fallback only) `apps/api/docker-entrypoint.sh` + Dockerfile ENTRYPOINT.
2. Non-secret admin vars (`NEXTAUTH_URL`, `NEXT_PUBLIC_API_URL`) + redeploy.
3. `CORS_EXTRA_ORIGINS` (confirm app-web host first).
4. GCS bucket vars (after bucket/key path decided).
5. Add custom domains (`railway domain`).
6. Rebuild front-ends against `api.gogocash.co` (gated on E1 api).
7. Switch CORS to real origins (after E1 api).
8. Disable GCP deploy workflows.
9. Scratch cleanup after safety-check.
10. Run `scripts/railway-acceptance.sh` for the read-only subset; tail logs for B3/D2.

## 7. Risk register
- **R0 untested money path** — B3 before real withdrawals; replica-set steps restart the money DB (backup first).
- **R0 cron double-fire** — no distributed lock; quest-reward not verified idempotent; never run >1 replica.
- **UBLA** — if the bucket has uniform bucket-level access ON, `makePublic()` throws → 503.
- **Build-time inlining** — `*_API_URL` take effect only on rebuild; API flips last.
- **Reversibility** — every cutover step is DNS-reversible only while Cloud Run is scaled-to-zero (not deleted) — keep the ≥7-day window.

## Appendix A — Staging DNS cutover (current)

Staging hostnames are registered on Railway but may still CNAME to `ghs.googlehosted.com` (GCP/Firebase). Until DNS flips, use `*.up.railway.app` URLs for acceptance.

| Host | CNAME target (Railway) |
|------|------------------------|
| `api-staging.gogocash.co` | `i313nfy0.up.railway.app` |
| `admin-staging.gogocash.co` | `hs31ua3b.up.railway.app` |
| `app-staging.gogocash.co` | `cs1bxvuq.up.railway.app` |

**Point API at external Atlas staging data:**

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

**Media (Cloudflare R2):** `MEDIA_STORAGE_DRIVER=r2` and `R2_*` vars are documented in `.env.railway.production.example` but the R2 upload driver is not wired in the API yet — use GCS credentials (Phase 2c) or `GOOGLE_APPLICATION_CREDENTIALS` until R2 support lands.

**Common blockers:** empty `[]` merchants (wrong/empty Mongo), missing JWT secrets (login fails), DNS still on Google Frontend (custom domain 500).
