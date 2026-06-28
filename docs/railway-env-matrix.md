# Railway env-var / secret matrix (GoGoCash)

Authoritative list of every environment variable the three deployable services need on Railway,
classified by when it matters. Non-secret values are the staging defaults from
`.github/workflows/deploy-*-staging.yml` and the per-app `.env.example`. Swap staging hostnames
(`*-staging.gogocash.co`, `gogocash-catalog-staging`) for production equivalents in a prod environment.

Railway project **GoGoCash** · services `gogocash-api`, `gogocash-admin`, `app-web` (`@gogocash/mobile`), `MongoDB`.

## Classification
- **BOOT-CRITICAL** — the app crashes / won't bind the port without it.
- **RUNTIME-LAZY** — only a feature degrades; the app still boots and passes `/health`.
- **BUILD-TIME** — inlined into the image at build (must be set *before* the build; Railway forwards a
  service variable as a Docker build arg only when the Dockerfile declares a matching `ARG`).

> `PORT` is injected by Railway for all three services — never set it manually.

## The one boot-critical var (API)
**`MONGO_URI`** — `apps/api/src/app.module.ts:38` `MongooseModule.forRoot(process.env.MONGO_URI!, { lazyConnection: true })`.
`lazyConnection` defers the *handshake*, not the URI *parse*; an undefined URI throws at module init before the
port binds. **Already set** on `gogocash-api` to `${{MongoDB.MONGO_URL}}`. Everything else in the API is
constructed defensively (JWT/PostHog/Firebase/GCS/ethers are all lazy) and will NOT crash boot.

⇒ The API passes its DB-free `/health` probe with only `MONGO_URI` + `PORT`. Auth/email/etc. need their
secrets to *function*, but not to boot.

## gogocash-api — ready-to-paste
```bash
# minimum to boot: MONGO_URI already set. Add:
railway variables --set 'NODE_ENV=production' --service gogocash-api

# minimum to be USABLE (auth + Mongo-touching routes)
railway variables --set 'JWT_SECRET=<SET_ME: openssl rand -hex 32 — customer JWT>' --service gogocash-api
railway variables --set 'JWT_ADMIN_SECRET=<SET_ME: openssl rand -hex 32 — admin JWT>' --service gogocash-api
railway variables --set 'CROSSMINT_SECRET=<SET_ME: Crossmint backend JWT secret>' --service gogocash-api

# non-secret config (safe defaults — already applied by the migration)
railway variables --set 'MAIL_FROM=GoGoCash <noreply@gogocash.co>' --service gogocash-api
railway variables --set 'WEB_APP_URL=https://app-staging.gogocash.co' --service gogocash-api
railway variables --set 'API_BASE_URL=https://api-staging.gogocash.co' --service gogocash-api
railway variables --set 'ADMIN_APP_URL=https://admin-staging.gogocash.co' --service gogocash-api
railway variables --set 'POSTHOG_HOST=https://us.i.posthog.com' --service gogocash-api
railway variables --set 'POSTHOG_ENABLED=true' --service gogocash-api
railway variables --set 'GCS_CATALOG_BUCKET=gogocash-catalog-staging' --service gogocash-api
railway variables --set 'GCS_MAX_UPLOAD_BYTES=10485760' --service gogocash-api
railway variables --set 'OPTIMISE_CONTACT_ID=2442123' --service gogocash-api
railway variables --set 'OPTIMISE_API_BASE=https://api.optimisemedia.com' --service gogocash-api
railway variables --set 'STRIPE_BILLING_ENABLED=false' --service gogocash-api
railway variables --set 'CUSTOMER_FRONTEND_URL=https://app.gogocash.co' --service gogocash-api

# secrets for full functionality (user-entered)
railway variables --set 'FIREBASE_PROJECT_ID=<SET_ME: e.g. gogocash-staging-637d5>' --service gogocash-api
railway variables --set 'CROSSMINT_AUTH_BASE=<SET_ME>' --service gogocash-api
railway variables --set 'CROSSMINT_PROJECT_ID=<SET_ME>' --service gogocash-api
railway variables --set 'INVOLVE_SECRET=<SET_ME>' --service gogocash-api
railway variables --set 'INVOLVE_POSTBACK_SECRET=<SET_ME: openssl rand -hex 32 — FAILS CLOSED if empty>' --service gogocash-api
railway variables --set 'INVOLVE_AI_API_KEY=<SET_ME: FAILS CLOSED on /involve/create-affiliate-ai>' --service gogocash-api
railway variables --set 'TELEGRAM_BOT_TOKEN=<SET_ME: BotFather token — also GATES TelegramBotModule; omit to disable>' --service gogocash-api
railway variables --set 'RESEND_API_KEY=<SET_ME: email OTP/invites>' --service gogocash-api
railway variables --set 'POSTHOG_KEY=<SET_ME: empty disables analytics>' --service gogocash-api
```
Optional / feature-gated (set only if used): `INVOLVE_SECRET_OLD`, `SIWE_EXPECTED_DOMAIN`,
`GCS_CATALOG_PUBLIC_BASE_URL`, `OPTIMISE_API_KEY`/`OPTIMISE_AGENCY_ID`, `STRIPE_SECRET_KEY` +
`STRIPE_COMMERCE_WEBHOOK_SECRET` + `STRIPE_PRICE_*`, `TG_OPS_WITHDRAWALS_CHAT_ID`/`TG_ALERTS_CHAT_ID`,
withdrawal on-chain (`PRIVATE_KEY_WITHDRAW`, `CHAIN_ID_WITHDRAW_*`, `RPC_URL_*`, `CONTRACT_WITHDRAW_ADDRESS_*`),
legacy Google Drive (`GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI/REFRESH_TOKEN`).

> ⚠️ `.env.example` misspells `INVOLVE_SECRET`/`INVOLVE_SECRET_OLD` as `INVOVLE_*`. The code reads the
> correctly-spelled names — use those on Railway.

## gogocash-admin
```bash
# BUILD-TIME (set BEFORE build; Dockerfile declares ARG NEXT_PUBLIC_API_URL)
railway variables --set 'NEXT_PUBLIC_API_URL=https://api-staging.gogocash.co' --service gogocash-admin
# AUTH-CRITICAL (boots without them but every route redirects to /signin)
railway variables --set 'NEXTAUTH_SECRET=<SET_ME: openssl rand -base64 32>' --service gogocash-admin
railway variables --set 'NEXTAUTH_URL=https://admin-staging.gogocash.co' --service gogocash-admin   # exact public HTTPS, no trailing slash
```
Do **not** set `ALLOW_MOCK_ADMIN_PASSWORD`, `BUILD_FOR_FIREBASE`, or `NEXT_PUBLIC_FIREBASE_STATIC` on Railway
(the last two switch on the Firebase static-export path, which disables the API routes the Node server needs).
If `NEXT_PUBLIC_API_URL` is empty at build, the admin silently falls back to its in-memory `/api/mock` backend.

## app-web (`@gogocash/mobile`) — ALL build-time (`EXPO_PUBLIC_*` inlined at `expo export`)
```bash
railway variables --set 'EXPO_PUBLIC_API_URL=https://api-staging.gogocash.co' --service app-web
railway variables --set 'EXPO_PUBLIC_APP_ENV=staging' --service app-web
railway variables --set 'EXPO_PUBLIC_ACCOUNT_DATA_SOURCE=backend' --service app-web
railway variables --set 'EXPO_PUBLIC_FRONTEND_URL=https://app-staging.gogocash.co' --service app-web
railway variables --set 'EXPO_PUBLIC_FIREBASE_API_KEY=<SET_ME: public web key>' --service app-web
railway variables --set 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<SET_ME>' --service app-web
railway variables --set 'EXPO_PUBLIC_FIREBASE_PROJECT_ID=<SET_ME>' --service app-web
railway variables --set 'EXPO_PUBLIC_FIREBASE_APP_ID=<SET_ME>' --service app-web
# optional: EXPO_PUBLIC_POSTHOG_KEY/HOST, EXPO_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_EAS_PROJECT_ID
railway variables --set 'EXPO_PUBLIC_EAS_PROJECT_ID=0039c25f-f88e-491d-8da9-85b8d6e66558' --service app-web
```
The nginx runtime reads no env except `$PORT`; all `EXPO_PUBLIC_*` must be present when the build runs the export.

## Special notes
- **GCS credential gap** (`apps/api/src/media/gcs-object-storage.service.ts` `new Storage()` = ADC): Railway has no
  ambient GCP identity. Provide a service-account JSON file and `GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json`
  (file mount), or leave uploads disabled (`GCS_MEDIA_UPLOAD_DISABLED=true`). Uploads fail with HTTP 503 (not a
  crash) until ADC is provided — RUNTIME-LAZY, but catalog/withdraw-slip media is broken without it.
- **`TELEGRAM_BOT_TOKEN` changes the dependency graph** (`app.module.ts:51-54`): `TelegramBotModule` loads only
  when it's set and ≠ `'PLACEHOLDER'`. Unset = Telegram cleanly disabled.
- **Fail-closed secrets**: `INVOLVE_POSTBACK_SECRET` and `INVOLVE_AI_API_KEY` reject every request when empty.
- **Admin "boots ≠ works"**: without `NEXTAUTH_SECRET` the Next.js server binds the port (looks deployed) but
  every protected route redirects to `/signin` — the admin is unusable.
