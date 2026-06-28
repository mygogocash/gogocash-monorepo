# Railway staging cutover — execution runbook

Target: **GoGoCash** project, **production** environment (staging URLs on `*-staging.gogocash.co`).

CLI (from repo root):

```bash
railway link --project GoGoCash --environment production
railway status   # → GoGoCash / production
```

---

## Step 0 — Link CLI

```bash
railway link --project GoGoCash --environment production
```

**Done when:** `railway status` shows project **GoGoCash** / env **production**.

---

## Step 1 — Real data: external staging Mongo

```bash
railway variables --set 'MONGO_URI=<atlas-staging-uri>' --service gogocash-api
```

Atlas → **Network Access** → allow `0.0.0.0/0` (Railway egress is dynamic).

**Done when:**

```bash
curl -s https://gogocash-api-production.up.railway.app/gogosense/merchants
```

returns real merchant records, not `[]`.

| ID | Check | Command |
|----|-------|---------|
| A2 | Non-empty merchants | `curl -s $API/gogosense/merchants \| jq length` → > 0 |

---

## Step 2 — Auth + feature secrets

```bash
cp .env.railway.production.example .env.railway.production
# fill values (see file comments)
./scripts/railway-apply-secrets.sh --dry-run
./scripts/railway-apply-secrets.sh
```

GCP Secret Manager names (staging): `gogocash-staging-mongo-uri`, `gogocash-staging-jwt-secret`, `gogocash-staging-jwt-admin-secret`, etc. (see `.github/workflows/deploy-api-staging.yml`).

**Done when:**

```bash
curl -i -X POST https://gogocash-api-production.up.railway.app/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<admin>","password":"<pw>"}'
```

→ **200** + JSON `token`.

| ID | Check |
|----|-------|
| B2 | Admin login returns token |

---

## Step 3 — Keep API awake (cron)

Railway → **gogocash-api** → **Settings** → **Deploy**:

- **App Sleeping / Serverless** → **OFF**
- **Replicas** → **1** (in-process `@Cron` has no distributed lock)

CLI/MCP equivalent: `sleep_application: false`, `num_replicas: 1`.

**Done when:** after 15 min idle, `curl …/health` is instant (no cold start).

| ID | Check |
|----|-------|
| A1 | `/health` → 200 |

---

## Step 4 — Media storage

### Option A — GCS (current code path)

Set `GCS_CATALOG_BUCKET` + `GOOGLE_APPLICATION_CREDENTIALS_JSON` (service account with `storage.objectAdmin` on the bucket). No code change.

### Option B — Cloudflare R2 (runbook target)

**4a.** R2 bucket `gogocash-catalog-staging` → enable public r2.dev domain (or custom `media-staging.gogocash.co`). Create R2 API token (Object Read & Write).

**4b.**

```bash
railway variables --service gogocash-api \
  --set 'R2_BUCKET=gogocash-catalog-staging' \
  --set 'R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com' \
  --set 'R2_PUBLIC_BASE_URL=<public base URL>' \
  --set 'R2_ACCESS_KEY_ID=<key>' \
  --set 'R2_SECRET_ACCESS_KEY=<secret>' \
  --set 'MEDIA_STORAGE_DRIVER=r2'
```

> **Note:** `MEDIA_STORAGE_DRIVER=r2` requires an R2 upload driver in `apps/api` (not shipped yet). Until then use Option A or implement R2 in `gcs-object-storage.service.ts`.

**Done when:** admin image upload returns a public URL that loads (HTTP 200).

| ID | Check |
|----|-------|
| E1 | Upload URL is HTTPS and fetchable |

---

## Step 5 — Custom staging domains (DNS)

Domains are registered on Railway. Update DNS at your provider:

| Host | Type | Target (Railway CNAME) |
|------|------|------------------------|
| `api-staging.gogocash.co` | CNAME | `i313nfy0.up.railway.app` |
| `admin-staging.gogocash.co` | CNAME | `hs31ua3b.up.railway.app` |
| `app-staging.gogocash.co` | CNAME | `cs1bxvuq.up.railway.app` |

Also add Railway TXT verification records (Railway → service → Networking shows exact values).

Verify targets anytime:

```bash
# MCP: domain_status for each hostname
dig +short api-staging.gogocash.co CNAME   # should NOT be ghs.googlehosted.com
```

After `api-staging` resolves to Railway, rebuild front-ends (API URL is baked at build):

```bash
railway variables --service gogocash-admin \
  --set 'NEXT_PUBLIC_API_URL=https://api-staging.gogocash.co' \
  --set 'NEXTAUTH_URL=https://admin-staging.gogocash.co'
railway redeploy --service gogocash-admin

railway variables --service '@gogocash/mobile' \
  --set 'EXPO_PUBLIC_API_URL=https://api-staging.gogocash.co'
railway redeploy --service '@gogocash/mobile'
```

**Done when:**

```bash
curl -I https://api-staging.gogocash.co/health   # 200, TLS valid, Server: railway
```

| ID | Check |
|----|-------|
| D1 | Custom domain served by Railway |

---

## Step 6 — Acceptance script

```bash
chmod +x scripts/railway-acceptance.sh scripts/railway-apply-secrets.sh
./scripts/railway-acceptance.sh
ADMIN_EMAIL=admin@gogocash.co ADMIN_PASSWORD=… ./scripts/railway-acceptance.sh
ADMIN_JWT=… ./scripts/railway-acceptance.sh
```

### Criteria summary

| ID | Criterion | Blocking? |
|----|-----------|-----------|
| A1 | API `/health` 200 on custom domain | Yes |
| A2 | Merchants non-empty | Yes |
| B1 | Admin `/signin` 200 | Yes |
| B2 | Admin login token | Yes |
| C1 | Cron break-glass auth (optional) | No |
| D1 | DNS cutover to Railway | Yes for public staging |
| E1 | Media upload URL works | Yes for admin CMS |

---

## Cleanup (optional)

| Item | Action |
|------|--------|
| **attractive-enjoyment** project | Scratch services (`api`, `admin`, `app-web`, `urban-radio`) — delete project when confirmed |
| **Railway MongoDB** service | Remove if using Atlas only (`MONGO_URI` external) |
| **GCP Cloud Run / Firebase** | Decommission after acceptance passes on Railway |

---

## Current status (auto-updated during migration)

See `./scripts/railway-acceptance.sh` output. Common blockers:

1. **DNS** still on `ghs.googlehosted.com` → update CNAMEs above.
2. **MONGO_URI** on Railway internal Mongo → empty `[]` merchants.
3. **JWT_*** missing → admin login 401/500.
4. **Media** — production uploads need GCS credentials or R2 driver.
