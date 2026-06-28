## Learned User Preferences

- Verify admin ↔ customer changes on the **real API** (matching URL on both apps) — admin mock mode does not persist to the customer app.
- Stay on **MongoDB Atlas** for database infrastructure — do not plan GCP Cloud SQL/Firestore migration unless explicitly requested.
- UI and layout feedback is often anchored to a **browser preview DOM selection**; expect iterative, viewport-aware tweaks.
- Customer **sign-in** issues on `/login` → investigate Firebase phone OTP (reCAPTCHA, authorized domains, `EXPO_PUBLIC_FIREBASE_*`), not admin staging credentials.
- Use **24-hour English time** in admin date/time pickers (flatpickr `HH:mm` + native `type=time`); do not show AM/PM.
- Surface **real API error messages** in admin forms/toasts via `getApiErrorMessage()` — avoid generic failures when the API returns a specific reason.
- Commit and push **only when explicitly asked**; keep diffs scoped to the task at hand.
- **Dark mode** (System / Light / Dark) is **customer app only** (`apps/app`); do not add tri-state theme work to admin as part of mobile tasks.
- Do not wire **Crossmint**, **Customer.io**, or **Web3/ethers** flows under mobile `backend` mode — Firebase phone OTP + bank/PromptPay only.
- Involve Asia postback URL in the affiliate portal must be a **plain HTTPS URL** with `{macros}` — never paste a `curl` command or shell syntax into the postback field.
- Primary admin operational entry should stay **one click** from the sidebar (**Platform Dashboard**), not buried in a submenu.
- For cross-app E2E, prefer a **full local stack** (API + admin + customer app + Mongo) or both frontends pointed at the same staging API host.

## Learned Workspace Facts

- Monorepo apps: `apps/api` NestJS **:8080**, `apps/admin` Next.js **:3000**, `apps/app` Expo web **:8081**; local MongoDB Docker container **`gogocash-mongo`** on `:27017`.
- Full **local E2E**: set admin `NEXT_PUBLIC_API_URL` and customer `EXPO_PUBLIC_API_URL` to `http://localhost:8080`; seed admin with `npm run seed:local-admin` (`admin@gogocash.co` / `1234`).
- Without **`NEXT_PUBLIC_API_URL`**, admin uses in-memory **`/api/mock`** (offer ids like `o1`, `o2`) — changes do not reach the customer app or Mongo.
- **Local UI + staging data:** point both apps at `https://api-staging.gogocash.co` — no local Mongo/API required. **Hosted staging:** `https://api-staging.gogocash.co`, `https://admin-staging.gogocash.co`, `https://app-staging.gogocash.co`.
- **`Offer.commissions`** from the real API are Involve-style objects (`{ Commission: "5%" }`), not plain strings — parse in `apps/admin/src/lib/offerDeeplink.ts`.
- **Non-production API media:** when GCS auth fails, uploads fall back to `apps/api/.local-media/` with `local-media:` refs; admin `pathImage()` streams them via `/admin/stored-media/stream`.
- Local GCS uploads need **`GOOGLE_APPLICATION_CREDENTIALS`** as a **service-account JSON** — user ADC (`gcloud auth application-default login`) causes `invalid_grant` / `invalid_rapt`.
- **Railway staging cutover:** Railway project **GoGoCash**, environment **production**; services `gogocash-api`, `gogocash-admin`, `@gogocash/mobile`; runbook at `docs/railway-execution-runbook.md`, scripts `scripts/railway-apply-secrets.sh` and `scripts/railway-acceptance.sh`.
- During Railway DNS cutover, `*-staging.gogocash.co` may still CNAME to GCP/Firebase — use `*.up.railway.app` until DNS flips; keep API **sleep off** and **1 replica** for in-process cron.
- **MongoDB Atlas:** prod cluster **`gogocash`** (M10); staging **`gogocash-staging`** (M0, **512 MB max**) — a full prod backup will not fit staging M0; use partial `mongorestore` or local Docker.
- **npm workspaces** hoist inconsistently — run `npm ci` at the monorepo root; if `-w` workspace commands fail module resolution, start from `apps/app` or `apps/admin`, or run the API with `NODE_PATH=./node_modules node dist/main`.
- Admin multipart uploads (FormData): strip default JSON `Content-Type` via **`AxiosHeaders.setContentType(false)`** so axios/browser sets the multipart boundary.
