# Staging admin (`gogocash-admin`) — Railway env fix (T-013)

**Symptom:** https://admin-staging.gogocash.co loads sign-in but API calls hit production or `/api/mock`; login loops or edits do not reach `api-staging`.

**Root cause (2026-07-02):** Railway **staging** service `gogocash-admin` had production `*.up.railway.app` URLs and no `NEXTAUTH_SECRET`. `NEXT_PUBLIC_*` is **inlined at Docker build time** — changing vars alone requires a **redeploy**.

Evidence: [`evidence/staging/T-013-admin-check.txt`](../../evidence/staging/T-013-admin-check.txt)

---

## 1. Link Railway context

```bash
railway login
railway link                    # project: GoGoCash
railway environment staging     # or: railway link --environment staging
```

---

## 2. Set variables (staging)

Generate a secret once (do not commit):

```bash
openssl rand -base64 32
```

Apply on **`gogocash-admin`** in **staging**:

```bash
railway variables --service gogocash-admin \
  --set 'NEXT_PUBLIC_API_URL=https://api-staging.gogocash.co' \
  --set 'API_URL=http://gogocash-api.railway.internal:8080' \
  --set 'NEXTAUTH_URL=https://admin-staging.gogocash.co' \
  --set 'NEXTAUTH_SECRET=<paste-openssl-output>'
```

| Variable | Required value | Notes |
|----------|----------------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api-staging.gogocash.co` | Build-time — baked into Next bundle |
| `API_URL` | `http://gogocash-api.railway.internal:8080` | Runtime BFF upstream — **private** Railway DNS (not `*.up.railway.app`) |
| `NEXTAUTH_URL` | `https://admin-staging.gogocash.co` | Exact public HTTPS, **no trailing slash** |
| `NEXTAUTH_SECRET` | `openssl rand -base64 32` | Runtime; without it every route redirects to `/signin` |

**Do not set** on Railway: `ALLOW_MOCK_ADMIN_PASSWORD`, `BUILD_FOR_FIREBASE`, `NEXT_PUBLIC_FIREBASE_STATIC` (forces static export; breaks API routes).

Production (beta) uses the same private `API_URL`, with
`NEXT_PUBLIC_API_URL=https://api-beta.gogocash.co` and
`NEXTAUTH_URL=https://admin-beta.gogocash.co`. See #407 follow-up (2026-07-20).

Full matrix: [`docs/railway-env-matrix.md`](../railway-env-matrix.md#gogocash-admin)

---

## 3. Redeploy (required after `NEXT_PUBLIC_*` change)

```bash
railway redeploy --service gogocash-admin
```

Wait for deploy green, then:

```bash
curl -sI https://admin-staging.gogocash.co/ | head -5
```

---

## 4. Verify (owner, ~2 min)

1. Open https://admin-staging.gogocash.co/signin — sign in with staging admin credentials.
2. DevTools → **Network** — any API call should go to **`https://api-staging.gogocash.co`**, not `/api/mock` or `gogocash-api-production.up.railway.app`.
3. Platform Dashboard loads; edit a brand/offer and confirm it appears on mobile pointed at the same API.

Save HAR or screenshot → `evidence/staging/T-013-admin-verified/`

---

## 5. Mark T-013 pass

Update [`docs/gototrack-staging-launch-tracker.md`](../gototrack-staging-launch-tracker.md) T-013 to **pass** with evidence link.

Unblocks **T-020** (admin ↔ beta app cross-check).
