# Deploy to Firebase (GoGoCash landing)

This site is a **Next.js static export** (`output: "export"`). The build writes to **`out/`**, which Firebase Hosting serves.

Framer → this repo on **`gogocash.co`**: **[`framer-to-next-migration.md`](./framer-to-next-migration.md)**.

| Item | Value |
|------|--------|
| Default Firebase project | `landing-page-4ae23` (`.firebaserc`) |
| Hosting site id | `landing-page-4ae23` (`firebase.json`; default site for project) |
| Static root | `out/` |

---

## Do **not** run `firebase init` for App Hosting here

This repo already has **`firebase.json`** for **classic Hosting** (static `out/`). It does **not** use [Firebase App Hosting](https://firebase.google.com/docs/app-hosting) (the full-stack SSR product).

If you run **`firebase init`** and select **App Hosting** → *Link to an existing backend*, the CLI may call an API that returns **HTML** instead of JSON, which shows as:

`Unable to parse JSON: Unexpected token '<', "<!DOCTYPE "... is not valid JSON`

That path is **unnecessary** for this landing site. Skip `firebase init` and deploy with the commands in section 4.

---

## 1. One-time setup

1. **Firebase CLI** — use the **project** dependency (no global mismatch):

   ```bash
   npm exec -- firebase --version
   ```

2. **Login**

   ```bash
   npm exec -- firebase login
   ```

3. **Select project**

   ```bash
   npm exec -- firebase use landing-page-4ae23
   ```

4. **Billing** — **Hosting** works on the Spark plan for this static export.

---

## 2. Production build environment

`NEXT_PUBLIC_*` variables are inlined at **`npm run build`**. Set them in **CI secrets** or **`.env.production.local`** (gitignored) before building—not only in the Firebase console.

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SITE_URL` | Public canonical URL for metadata. |

See also: [`.env.example`](../.env.example).

---

## 3. Pre-deploy (every release)

```bash
# After lockfile or dependency changes, a clean install avoids tooling bugs:
rm -rf node_modules && npm ci

npm run verify
```

Confirm **`out/`** exists after build and is not empty.

**Use repo-local CLI** — prefer `npm run deploy:firebase` or `npm exec -- firebase` so version matches `package.json` (avoids `minimatch is not a function` and similar issues from an old global `firebase`).

---

## 4. Deploy commands

| Goal | Command |
|------|---------|
| **Hosting** | `npm run deploy:firebase` — runs `next build` then `scripts/deploy-firebase-hosting.mjs` (supports `FIREBASE_HOSTING_SITES` / CLI args for multiple sites). |
| **Same as above** | `npm run deploy:firebase:full` — kept as an alias for older scripts; deploys hosting only. |

**Custom project id** (e.g. CI):

```bash
FIREBASE_PROJECT_ID=your-project-id npm run deploy:firebase
```

(`deploy-firebase-hosting.mjs` reads `FIREBASE_PROJECT_ID`; default is `landing-page-4ae23`.)

---

## 5. Post-deploy checks

1. Open the live URL — homepage and main routes load; assets return 200.
2. **Firebase Analytics** — GA4 / DebugView if configured (see `lib/analytics-client.ts`).

---

## 6. Troubleshooting

| Issue | What to try |
|-------|-------------|
| Project / permission errors | `firebase use`, correct Google account, IAM on the project. |
| `Could not read source directory` + `minimatch is not a function` | Repo root `npm ci`; deploy with **`npm exec -- firebase`** or **`npm run deploy:firebase`**, not an outdated global CLI. |
| Browser shows **Site Not Found** / 404 on `*.web.app` | Run **`npm exec -- firebase deploy --only hosting`** after a good `out/` build. |

---

## 7. CI (optional)

1. `npm ci` → `npm run verify`.
2. Build with production `NEXT_PUBLIC_*` from secrets.
3. Authenticate with a **CI token** or workload identity (never commit tokens).
4. `node scripts/deploy-firebase-hosting.mjs` (hosting only).

---

## 8. Rollback

- **Hosting:** Firebase console → Hosting → **rollback** to a previous release, or redeploy a known-good `out/` artifact.
