# Plan: Deploy admin to Firebase Hosting (internal review)

**Target GCP / Firebase**

| Field | Value |
|--------|--------|
| **Firebase project ID** | `gogocash-staging` |
| **Project number** | `729804769570` |

This repo is already wired for **static export** + **Firebase Hosting**: `BUILD_FOR_FIREBASE=1` → `output: 'export'` → `out/`; `firebase.json` publishes `out/`.

---

## 1. Preconditions

1. **Firebase project** `gogocash-staging` exists and **Hosting** is enabled (Firebase console → Build → Hosting).
2. **CLI**: `npm i -g firebase-tools` (or use `npx firebase-tools`).
3. **Login**: `firebase login` with a Google account that has **Owner** or **Editor** on `gogocash-staging` (or **Firebase Hosting Admin** at minimum).
4. **Local Node**: Node version compatible with `package.json` / Next 16 (see repo README).

---

## 2. Align Firebase config with this project

**`.firebaserc`** (already in repo):

```json
{ "projects": { "default": "gogocash-staging" } }
```

**`firebase.json`** currently sets:

- `hosting.site`: `gogocash-staging-637d5`
- `hosting.public`: `out`

**Action:** In Firebase console (or `firebase hosting:sites:list --project gogocash-staging`), confirm the **Hosting site ID** matches `firebase.json` → `site`. If your default site is different (e.g. `gogocash-staging` without suffix), update `firebase.json` `site` to the ID shown in the console, or add a new site and point `site` at it.

**Use the right project for every command:**

```bash
firebase use gogocash-staging
```

---

## 3. Environment variables for the staging URL

Static export bakes **public** env at build time. For internal review:

| Variable | Purpose |
|----------|---------|
| `NEXTAUTH_SECRET` | Strong random secret (required). Generate once per environment; do **not** commit. |
| `NEXTAUTH_URL` | **Exact** public URL reviewers will open, e.g. `https://gogocash-staging-637d5.web.app` or your custom domain, **no trailing slash**. Wrong value breaks sign-in/callbacks. |
| `NEXT_PUBLIC_*` | Only set what the client truly needs; avoid secrets. |

**Suggested workflow**

1. Decide the **final review URL** (default Hosting domain or custom domain).
2. Create `.env.production.local` (gitignored) or use CI secrets with:

   ```bash
   export NEXTAUTH_SECRET="…"
   export NEXTAUTH_URL="https://<your-hosting-host>"
   ```

3. If the app is served under a **subpath**, set `NEXT_PUBLIC_BASE_PATH` / `NEXT_PUBLIC_ASSET_PREFIX` per `next.config.ts` comments and rebuild.

---

## 4. Build (Firebase static export)

From the repo root:

```bash
firebase use gogocash-staging
export NEXTAUTH_SECRET="…"           # required
export NEXTAUTH_URL="https://…"      # must match deployed URL
npm ci
npm run build:firebase              # BUILD_FOR_FIREBASE=1 next build → ./out
```

**Verify:** `out/` exists and contains `index.html`, `_next/`, etc.

**Optional:** `npm run check:conflicts` runs automatically before `next build` via `prebuild`; `build:firebase` also triggers it.

---

## 5. Deploy to Hosting

```bash
firebase deploy --only hosting --project gogocash-staging
```

Or rely on default project after `firebase use`:

```bash
npm run deploy:firebase             # build:firebase && firebase deploy
```

**Note:** `deploy:firebase` does not set `NEXTAUTH_URL` / `NEXTAUTH_SECRET` for you—export those in the shell (or CI) before running.

---

## 6. Post-deploy checks (internal review)

1. Open the Hosting URL from the deploy output.
2. **Sign in** with the documented mock credentials (if still enabled) or real staging auth—confirm session works with `NEXTAUTH_URL`.
3. Smoke: dashboard, offers list, one detail page, theme toggle.
4. **Browser console**: no repeated chunk 404s (if you see them, check `basePath` / `assetPrefix` vs actual URL).

---

## 7. Access control (recommended for “internal only”)

Firebase Hosting is **public** unless you add restrictions. For internal review, pick one or combine:

- **IP allowlist** via [Firebase Hosting + Cloud Armor](https://cloud.google.com/firestore/docs/security/rules) (or front Hosting with Cloud Load Balancing + IAP / Cloud Armor)—plan with whoever owns GCP `729804769570`.
- **App Check** + tightened rules if you later move sensitive APIs to Firebase/GCP.
- **Obscurity + short-lived review**: custom subdomain, share only with reviewers, rotate `NEXTAUTH_SECRET` after review.

Document in your internal wiki who may access `gogocash-staging` and that this build may still use **mock data** / dev-style auth unless you’ve switched to production APIs.

---

## 8. CI/CD (implemented)

| Piece | Location |
|--------|-----------|
| **GitHub Actions** | `.github/workflows/firebase-hosting-staging.yml` — runs on **push to `staging`** and **workflow_dispatch**. |
| **Local scripted deploy** | `npm run deploy:firebase:staging` → `scripts/deploy-firebase-staging.mjs` (requires `NEXTAUTH_SECRET`, `NEXTAUTH_URL` in the shell). |

**Repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Description |
|--------|--------------|
| `FIREBASE_SERVICE_ACCOUNT_STAGING` | Full JSON of a GCP service account key with permission to deploy Hosting on `gogocash-staging` (e.g. **Firebase Hosting Admin** or **Editor**). |
| `NEXTAUTH_SECRET_STAGING` | Long random string for JWT encryption (same purpose as `NEXTAUTH_SECRET`). |
| `NEXTAUTH_URL_STAGING` | Exact public URL, no trailing slash (e.g. `https://gogocash-staging-637d5.web.app`). |

**Create the service account (GCP / Firebase):** IAM & Admin → Service Accounts → create key JSON; grant roles **Firebase Hosting Admin** (minimum for deploy) on project **729804769570** / `gogocash-staging`.

---

## 9. Rollback

Hosting keeps previous releases in the console; you can **roll back** to a prior version without redeploying from laptop. Alternatively redeploy a known-good Git tag with the same env vars.

---

## 10. Checklist summary

- [ ] `firebase use gogocash-staging` and Hosting site ID matches `firebase.json`.
- [ ] `NEXTAUTH_SECRET` and `NEXTAUTH_URL` set for the **exact** review URL.
- [ ] `npm run build:firebase` succeeds; `out/` populated.
- [ ] `firebase deploy --only hosting` succeeds.
- [ ] Sign-in and critical pages verified on the live URL.
- [ ] Internal access / security expectations documented (public URL vs IP / IAP).

---

## Reference (repo)

| Item | Location |
|------|-----------|
| Firebase hosting config | `firebase.json` (includes basic security headers), `.firebaserc` |
| Static export toggle | `next.config.ts` when `BUILD_FOR_FIREBASE=1` |
| NPM scripts | `build:firebase`, `deploy:firebase`, `deploy:firebase:staging` |
| CI workflow | `.github/workflows/firebase-hosting-staging.yml` |
| Local staging deploy script | `scripts/deploy-firebase-staging.mjs` |
| NextAuth static export params | `src/app/api/auth/[...nextauth]/route.ts` (`generateStaticParams` when `BUILD_FOR_FIREBASE`) |

Project number **729804769570** is for **GCP console** (billing, IAM, Cloud Armor, etc.) when you coordinate with infra; day-to-day deploy uses **project ID** `gogocash-staging`.
