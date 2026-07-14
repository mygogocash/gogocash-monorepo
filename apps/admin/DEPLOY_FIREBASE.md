# Deploy to Firebase (frontend + mock data only)

This app is **frontend-only with mock data**: all data is served from Next.js API routes under `/api/mock/*`. To deploy so that both the UI and mock API work, use **Firebase App Hosting**. Optionally you can deploy a **static export** (no mock API) with classic Hosting.

---

## Option 1: Firebase App Hosting (recommended – frontend + mock API)

App Hosting builds and runs your full Next.js app (including API routes), so the dashboard and mock data both work.

### Requirements

- Firebase project with [Blaze (pay-as-you-go)](https://firebase.google.com/docs/app-hosting/configure#billing) enabled
- GitHub repo: `mygogocash/gogocash-monorepo` (or your fork) — the admin app lives at `apps/admin`
- Node.js 24 LTS (the workspace `engines` field requires `>=24`)

### One-time setup

1. **Firebase Console**  
   Go to [Firebase Console](https://console.firebase.google.com) and select (or create) your project.

2. **App Hosting**  
   - Open **Build** → **App Hosting** in the left menu.  
   - Click **Create backend**.  
   - Connect your **GitHub** account and choose the repo (e.g. `gogocash-monorepo`).  
   - **Root directory:** set to **`apps/admin`** (the admin app's folder in the monorepo).  
   - **Branch:** e.g. `staging`.  
   - Enable **Automatic rollouts** if you want deploy on every push.

3. **Secrets / env (for login)**  
   - In App Hosting → your backend → **Environment** (or **Secrets**):  
     - Set **`NEXTAUTH_SECRET`** (any long random string; e.g. `openssl rand -base64 32`).  
   - **`NEXTAUTH_URL`** is set automatically to your App Hosting URL; no need to set it manually.

4. **First deploy**  
   After the backend is created, Firebase builds and deploys. Your app will be available at the URL shown (e.g. `https://<backend-id>.web.app` or your custom domain).

### Deploying updates

- **Automatic:** if automatic rollouts are on, push to the configured branch (e.g. `staging`).  
- **Manual:** in Firebase Console → App Hosting → your backend → **Roll out** and choose the branch/commit.

### `apphosting.yaml`

The admin app ships an [`apphosting.yaml`](./apphosting.yaml) with run config
(`minInstances: 0`, `maxInstances: 10`, `concurrency: 40`, `cpu: 1`, `memoryMiB: 512`)
and build/runtime env (`NODE_ENV`, `NEXT_TELEMETRY_DISABLED`, `CI`, and
`NEXTAUTH_URL=https://admin-staging.gogocash.co`). Its header documents the
first-time backend setup (backend ID `gogocash-admin`, branch `staging`, custom
domain `admin-staging.gogocash.co`, and provisioning `NEXTAUTH_SECRET` in Secret
Manager). See [Configure App Hosting](https://firebase.google.com/docs/app-hosting/configure).

---

## Option 2: Static export (Hosting only – no mock API)

For a **static-only** deploy (no API routes, no mock data), you can use classic Firebase Hosting and the existing static export.

**Note:** With this option, `/api/mock/*` does **not** run. The UI will load but all data requests will fail unless you change the app to use client-only mock data.

### One-time setup

1. Install Firebase CLI (12.1.0+):  
   `npm i -g firebase-tools` or use `npx firebase-tools`.

2. Log in and select project:  
   ```bash
   npx firebase-tools login
   npx firebase-tools use <your-project-id>
   ```

3. Ensure `firebase.json` has `"public": "out"` and `.firebaserc` has the correct `default` project.

### Deploy

From the project root:

```bash
npm run deploy:firebase
```

This runs `npm run build:firebase` (static export) then `firebase deploy`, and serves the contents of `out/` on Hosting. Mock API will not be available.

---

## Summary

| Goal                         | Use                         |
|-----------------------------|-----------------------------|
| Frontend + mock data on Firebase | **Option 1: App Hosting**   |
| Static-only (no mock API)   | **Option 2: Static export** |

For internal use with mock data, **Option 1 (App Hosting)** is the right choice.
