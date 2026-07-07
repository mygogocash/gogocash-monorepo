# Customer web staging cutover — `app-staging.gogocash.co` → Railway

**Symptom:** https://app-staging.gogocash.co shows Firebase App Hosting **“Backend Not Found”** (black page + Firebase logo).

**Cause:** DNS still routes the hostname to **Google/Firebase**, while the Railway **`app-web`** service is stopped or not linked to the custom domain.

**Target:** Expo web export on Railway (`app-web`, Dockerfile `apps/app/Dockerfile.web.railway`), same pattern as `admin-staging` and `api-staging`.

---

## 1. Authenticate Railway

```bash
railway login
railway link          # project: GoGoCash
railway environment staging
```

---

## 2. Run the cutover script

Optional Firebase build vars (web OTP on `/login`):

```bash
cp .env.railway.production.example .env.railway.production
# fill EXPO_PUBLIC_FIREBASE_* from GitHub staging env or Firebase console
```

Deploy + scale + register custom domain:

```bash
./scripts/railway-cutover-app-staging.sh
```

This sets `EXPO_PUBLIC_*`, scales **`app-web`** to 1 replica, redeploys from source, and prints the Railway CNAME target.

---

## 3. Cloudflare DNS + Worker (owner)

In **Cloudflare → gogocash.co → DNS**:

| Field | Value |
|-------|--------|
| Type | `CNAME` |
| Name | `app-staging` |
| Target | `dwxmdvrr.up.railway.app` (from `railway domain list --service @gogocash/mobile`) |
| Proxy | ON (orange cloud) |

**Critical:** Remove the legacy **`app-staging-proxy`** Worker route (`app-staging.gogocash.co/*`) if present — it forwards to Firebase App Hosting (`*.hosted.app`) and causes the black **“Backend Not Found”** page even when DNS points at Railway.

Remove any record pointing `app-staging` at `ghs.googlehosted.com` or Firebase App Hosting.

---

## 4. Verify

```bash
curl -sI https://app-staging.gogocash.co/ | head -8
# expect: HTTP/2 200, NOT Firebase HTML

APP_WEB_URL=https://app-staging.gogocash.co ./scripts/railway-acceptance.sh
```

Browser: open https://app-staging.gogocash.co/en/login — GoGoCash UI, not Firebase placeholder.

---

## Rollback

Re-point Cloudflare `app-staging` CNAME to the previous Firebase/GCP target (record before change). Railway deploy is unchanged.
