# Railway Migration Runbook (staging)

Operator steps to move GoGoCash from Google Cloud Run to **Railway**. The repo-side
changes (health endpoint, `railway.json` config-as-code, the app-web Docker build) are
already committed; everything below happens in the Railway dashboard/CLI, your DNS
provider, and GCP. Do these in order. **Keep Cloud Run warm until each host is validated**
— rollback is a DNS change.

Workspace: **GoGoCash** · start with the **staging** environment only.

---

## 0. Repo changes already landed

- `apps/api/src/app.controller.ts` — `GET /health` liveness probe (no DB).
- `apps/api/railway.json`, `apps/admin/railway.json`, `apps/app/railway.json` — config-as-code.
- `apps/app/Dockerfile.web.railway` — self-contained root-context Expo web build (the
  original `apps/app/Dockerfile.web` is left intact for Cloud Run rollback).

> **Config-as-code path gotcha:** Railway's config file does **not** follow the service
> Root Directory. For each service set the **Config-as-code path** to the absolute path,
> e.g. `/apps/api/railway.json`, even though Root Directory is `/`.

---

## 1. ⚠️ MongoDB — must be a single-node REPLICA SET (R0)

The withdrawal/money path uses a Mongo transaction
(`apps/api/src/withdraw/withdraw.service.ts` → `connection.startSession()` +
`session.withTransaction()`). **Transactions require a replica set.** Railway's stock
MongoDB template is a *single node with no replica set* and will throw on every withdrawal.

**Resolution — run the Railway Mongo as a single-node replica set:**

1. Add a MongoDB service to the `staging` environment (`+ New → Database → MongoDB`).
2. Override its **Start Command** to enable a replica set (keep the template's IPv6/bind flags):
   ```
   mongod --replSet rs0 --ipv6 --bind_ip ::,0.0.0.0 --setParameter diagnosticDataCollectionEnabled=false
   ```
3. One-time init (via `railway run` against the Mongo service, or a Railway shell):
   ```
   mongosh "$MONGO_URL" --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
   ```
4. Confirm `rs.status()` shows a `PRIMARY`. Transactions now work.

> Do not cut the API over to this Mongo until the replica set is initiated and a withdrawal
> smoke test passes.

---

## 2. Provision services (staging)

Create three services from the GitHub repo. For each set **Root Directory = `/`** and the
**Config-as-code path** to that service's `railway.json`:

| Service | Root Dir | Config path | Replicas |
|---|---|---|---|
| `api` | `/` | `/apps/api/railway.json` | **1 (pin in Settings → Deploy)** |
| `admin` | `/` | `/apps/admin/railway.json` | 1–2 |
| `app-web` | `/` | `/apps/app/railway.json` | 1–2 |

> **`api` replicas MUST stay at 1.** In-process `@nestjs/schedule` cron jobs have no
> distributed lock; >1 replica double-fires money jobs (reward distribution, point award).

The Dockerfile path is read from each `railway.json` (`build.dockerfilePath`). If you prefer
the variable form, set `RAILWAY_DOCKERFILE_PATH` per service instead
(`apps/api/Dockerfile`, `apps/admin/Dockerfile`, `apps/app/Dockerfile.web.railway`).

---

## 3. Variables & secrets

Migrate values **from Google Secret Manager** — never paste secret values into commits/chat.
Authoritative list: `.github/workflows/deploy-api-staging.yml` + `apps/*/.env.example`.

**Shared (project, staging):** `NODE_ENV=production`, `WEB_APP_URL`, `ADMIN_APP_URL`,
`API_BASE_URL`, `POSTHOG_HOST`, `POSTHOG_ENABLED`, `MAIL_FROM`, `GCS_CATALOG_BUCKET`.

**`api` (seal the secrets):** `MONGO_URI=${{ MongoDB.MONGO_URL }}`, `JWT_SECRET`,
`JWT_ADMIN_SECRET`, `FIREBASE_PROJECT_ID`, `INVOLVE_SECRET`, `INVOLVE_POSTBACK_SECRET`,
`POSTHOG_KEY`, `TELEGRAM_BOT_TOKEN`, `CROSSMINT_*`, `RESEND_API_KEY`, `STRIPE_*`,
`OPTIMISE_*`, `PRIVATE_KEY_WITHDRAW`, `RPC_URL_*`, plus the GCS file mount (below).

**`admin` — build-time** (declared as `ARG` in the Dockerfile, injected by Railway as build
args): `NEXT_PUBLIC_API_URL=https://api-staging.gogocash.co`. **Runtime sealed:**
`NEXTAUTH_SECRET`, `NEXTAUTH_URL=https://admin-staging.gogocash.co`.
> If other `NEXT_PUBLIC_FIREBASE_*` must differ per env, add matching `ARG` lines to
> `apps/admin/Dockerfile` first — Railway only injects a build arg the Dockerfile declares.

**`app-web` — build-time** `EXPO_PUBLIC_*` (already declared as `ARG` in
`Dockerfile.web.railway`): `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_APP_ENV`,
`EXPO_PUBLIC_ACCOUNT_DATA_SOURCE`, `EXPO_PUBLIC_FRONTEND_URL`, `EXPO_PUBLIC_FIREBASE_*`,
`EXPO_PUBLIC_POSTHOG_*`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_EAS_PROJECT_ID`.

> **Sealed-variable caveat:** sealed vars are NOT copied to duplicated/PR environments.
> When you later add beta/prod, re-enter secrets — they don't clone.

---

## 4. GCS credentials (the API loses Cloud Run's implicit auth)

`apps/api/src/media/gcs-object-storage.service.ts` uses `new Storage()` (pure ADC). Railway
has no GCP metadata server, so uploads break without an explicit key.

1. Create a bucket-scoped GCP service account (`roles/storage.objectAdmin` on the catalog
   bucket only); download a JSON key.
2. On the `api` service, mount it as a **secret file** at `/secrets/gcs-sa.json` and set
   `GOOGLE_APPLICATION_CREDENTIALS=/secrets/gcs-sa.json`. No code change — ADC finds it.
3. Set `GCS_CATALOG_BUCKET` (and `GCS_CATALOG_PUBLIC_BASE_URL` if used).

> Security (R1): this is a long-lived key replacing keyless WIF. Scope it to one bucket,
> rotate, never log. Follow-up: signed-URL uploads to go keyless again.

---

## 5. Move staging data into Railway Mongo

Private networking is runtime-only, so dump/restore runs over the Mongo **public TCP proxy**.

```bash
mongodump  --uri="<current staging MONGO_URI>"         --archive=staging.archive --gzip
mongorestore --uri="<Railway Mongo public TCP proxy URL>" --archive=staging.archive --gzip
```

- Verify collection counts match the source after restore.
- Enable Railway **volume backups** on the Mongo service.
- Run any needed seed/backfill (`apps/api/scripts/*`) via `railway run npm run <script>`
  (runtime has private-net access; the build phase does not) or a `preDeployCommand`.

---

## 6. Deploy & validate on `*.up.railway.app` (before DNS)

Push-to-deploy is configured via each service's GitHub connection + watch paths (already in
each `railway.json`). Validate in this order:

1. **`api` build** completes from the monorepo-root context (the #1 unknown — verify first).
2. `GET /health` → `200 {"status":"ok"}`.
3. A DB-backed route (`/gototrack/merchants`) returns data from the **Railway** Mongo.
4. **A withdrawal flow that uses the transaction** succeeds (proves the replica set).
5. **A media upload round-trips to GCS** (proves the SA file mount). *Mandatory gate.*
6. `admin`: the shipped bundle calls the correct `NEXT_PUBLIC_API_URL`; NextAuth login works.
7. `app-web`: static export serves; `EXPO_PUBLIC_API_URL` is correct.
8. `api` logs show exactly one scheduled cron run (no duplicates) — confirms 1 replica.

> CORS: the API allowlist (`apps/api/src/main.ts`) only contains `*.gogocash.co` origins, so
> admin→api calls fail while testing on `*.up.railway.app`. Validate cross-origin only after
> the real custom domain is attached (or temporarily add the preview origin to the allowlist).

---

## 7. DNS cutover (reversible)

Hosts stay the same (`api-staging`, `admin-staging`, `app-staging` `.gogocash.co`), so Involve
postbacks and the CORS allowlist keep working — only the CNAME target changes.

1. Lower the record TTL (60–300s) a day ahead.
2. Add the custom domain in Railway → copy the CNAME target.
3. Repoint CNAME Cloud Run → Railway; wait for Railway to auto-provision TLS.
4. Validate over the real hostname (HTTPS + DB route + admin→api CORS + Involve postback).
5. **Order by blast radius:** `admin` → `app-web` → `api` last.
6. Keep Cloud Run warm until validated, then scale to zero.

---

## 8. After cutover

- Retire (don't delete) GCP deploy workflows (`deploy-*-staging.yml`, `_build-push.yml`,
  `_deploy-cloudrun.yml`) once the rollback window closes. Keep `ci.yml`/`codeql.yml`.
- Replicate to beta/prod/ai-test later — **the production Mongo move is its own R0 task with a
  maintenance window** (single-node replica set + windowed dump/restore + sealed secrets
  re-entered, not cloned).
