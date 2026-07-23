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
constructed defensively (JWT/PostHog/Firebase/R2/ethers are all lazy) and will NOT crash boot.

⇒ The API passes its DB-free `/health` probe with only `MONGO_URI` + `PORT`. Auth/email/etc. need their
secrets to *function*, but not to boot.

## gogocash-api — ready-to-paste
```bash
# minimum to boot: MONGO_URI already set. Add:
railway variables --set 'NODE_ENV=production' --service gogocash-api

# minimum to be USABLE (auth + Mongo-touching routes)
railway variables --set 'JWT_SECRET=<SET_ME: openssl rand -hex 32 — customer JWT>' --service gogocash-api
railway variables --set 'JWT_ADMIN_SECRET=<SET_ME: openssl rand -hex 32 — admin JWT>' --service gogocash-api

# non-secret config (safe defaults — already applied by the migration)
railway variables --set 'MAIL_FROM=GoGoCash <noreply@gogocash.co>' --service gogocash-api
railway variables --set 'WEB_APP_URL=https://app-staging.gogocash.co' --service gogocash-api
railway variables --set 'API_BASE_URL=https://api-staging.gogocash.co' --service gogocash-api
railway variables --set 'ADMIN_APP_URL=https://admin-staging.gogocash.co' --service gogocash-api
railway variables --set 'LINE_CHANNEL_ID=2008237916' --service gogocash-api # must match the staging LIFF channel
railway variables --set 'POSTHOG_HOST=https://us.i.posthog.com' --service gogocash-api
railway variables --set 'POSTHOG_ENABLED=true' --service gogocash-api
railway variables --set 'R2_BUCKET=gogocash-catalog-staging' --service gogocash-api
railway variables --set 'R2_ENDPOINT=https://187ab61ed9dbc6e616cb23e6b95aa8f1.r2.cloudflarestorage.com' --service gogocash-api
railway variables --set 'R2_PUBLIC_BASE_URL=https://media-staging.gogocash.co' --service gogocash-api
railway variables --set 'MEDIA_MAX_UPLOAD_BYTES=10485760' --service gogocash-api
railway variables --set 'OPTIMISE_CONTACT_ID=2442123' --service gogocash-api
railway variables --set 'OPTIMISE_API_BASE=https://api.optimisemedia.com' --service gogocash-api
railway variables --set 'STRIPE_BILLING_ENABLED=false' --service gogocash-api
railway variables --set 'CUSTOMER_FRONTEND_URL=https://app.gogocash.co' --service gogocash-api

# secrets for full functionality (user-entered)
railway variables --set 'FIREBASE_PROJECT_ID=<SET_ME: e.g. gogocash-staging-637d5>' --service gogocash-api
railway variables --set 'INVOLVE_SECRET=<SET_ME>' --service gogocash-api
railway variables --set 'INVOLVE_POSTBACK_SECRET=<SET_ME: openssl rand -hex 32 — FAILS CLOSED if empty>' --service gogocash-api
railway variables --set 'INVOLVE_AI_API_KEY=<SET_ME: FAILS CLOSED on /involve/create-affiliate-ai>' --service gogocash-api
railway variables --set 'TELEGRAM_BOT_TOKEN=<SET_ME: BotFather token — also GATES TelegramBotModule; omit to disable>' --service gogocash-api
railway variables --set 'RESEND_API_KEY=<SET_ME: email OTP/invites>' --service gogocash-api
railway variables --set 'POSTHOG_KEY=<SET_ME: empty disables analytics>' --service gogocash-api
railway variables --set 'R2_ACCESS_KEY_ID=<SET_ME: Cloudflare R2 S3 API token access key>' --service gogocash-api
railway variables --set 'R2_SECRET_ACCESS_KEY=<SET_ME: Cloudflare R2 S3 API token secret>' --service gogocash-api
```

### Quest task-v2 flag (RUNTIME-LAZY)
```bash
railway variables --set 'QUEST_TASK_V2_ENABLED=true' --service gogocash-api
```
Status (2026-07-18): `true` on **dev** and **staging** since the completed quest
task-v2 rollout (issue #353, exact-once acceptance passed 7/7 on both envs).
**Not yet enabled on production.** Rollback: set `QUEST_TASK_V2_ENABLED=false` —
the outbox consumer no-ops instantly. The added task-v2 indexes are harmless
while disabled, but `conversions.conversion_id_1` must stay NON-unique: identity
uniqueness is now enforced by the composite unique index
`uniq_conversion_provider_identity` on
(source, provider_account, provider_conversion_id).

### Legacy cron gate (RUNTIME-LAZY)
```bash
railway variables --set 'CRON_ENABLED=false' --service gogocash-api
```
Gates every LEGACY in-process scheduled job (conversion sync, point awards, monthly
payout, account-deletion purge, media recovery). Only the literal string `false`
disables — any other value (or unset) leaves the jobs running. Use it to single-own
scheduled jobs when two API stacks share one database: exactly one stack keeps the
default (enabled), the other sets `CRON_ENABLED=false`. Quest task-v2 jobs are
governed solely by `QUEST_TASK_V2_ENABLED` (above) and ignore this gate; the
`legacy-cron-gate.sweep` spec enforces both sides of that split.

Optional / feature-gated (set only if used): `CORS_EXTRA_ORIGINS` (comma-separated exact-match
origins merged into the API CORS allow-list at runtime — use for Railway preview hosts
`*.up.railway.app` or new custom domains without a code deploy; no wildcards), e.g.
`https://admin-staging.gogocash.co,https://app-staging.gogocash.co,https://gogocash-admin-production.up.railway.app`,
`INVOLVE_SECRET_OLD`, `SIWE_EXPECTED_DOMAIN`,
`OPTIMISE_API_KEY`/`OPTIMISE_AGENCY_ID`, `STRIPE_SECRET_KEY` +
`STRIPE_COMMERCE_WEBHOOK_SECRET` + `STRIPE_PRICE_*`, `TG_OPS_WITHDRAWALS_CHAT_ID`/`TG_ALERTS_CHAT_ID`,
withdrawal on-chain (`PRIVATE_KEY_WITHDRAW`, `CHAIN_ID_WITHDRAW_*`, `RPC_URL_*`, `CONTRACT_WITHDRAW_ADDRESS_*`),
legacy Google Drive (`GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI/REFRESH_TOKEN`).

> ⚠️ `.env.example` misspells `INVOLVE_SECRET`/`INVOLVE_SECRET_OLD` as `INVOVLE_*`. The code reads the
> correctly-spelled names — use those on Railway.

## gogocash-admin
```bash
# BUILD-TIME (set BEFORE build; Dockerfile declares ARG NEXT_PUBLIC_API_URL)
railway variables --set 'NEXT_PUBLIC_API_URL=https://api-staging.gogocash.co' --service gogocash-admin
# PRE-LAUNCH FEATURE FLAGS (build-time; Dockerfile declares ARG NEXT_PUBLIC_ENABLE_*).
# Set to "0" to keep the pre-launch surfaces HIDDEN (credit tier + membership +
# subscription columns/filters). Default-ENABLED, so an UNSET var ships them VISIBLE
# — you MUST set both here for Railway (the live deploy) to hide them.
railway variables --set 'NEXT_PUBLIC_ENABLE_CREDIT_SCORE=0' --service gogocash-admin
railway variables --set 'NEXT_PUBLIC_ENABLE_GOGOPASS=0' --service gogocash-admin
# RUNTIME BFF upstream (server-only). Prefer the private Railway service hostname so
# /api/backend/* does not hairpin through the public edge (Cloudflare header spoof /
# wrong host). Same value on staging and production:
railway variables --set 'API_URL=http://gogocash-api.railway.internal:8080' --service gogocash-admin
# AUTH-CRITICAL (boots without them but every route redirects to /signin)
railway variables --set 'NEXTAUTH_SECRET=<SET_ME: openssl rand -base64 32>' --service gogocash-admin
railway variables --set 'NEXTAUTH_URL=https://admin-staging.gogocash.co' --service gogocash-admin   # exact public HTTPS, no trailing slash
```

| Variable | Staging | Production (beta) | Notes |
|----------|---------|-------------------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api-staging.gogocash.co` | `https://api-beta.gogocash.co` | Build-time — browser/BFF mode signal |
| `API_URL` | `http://gogocash-api.railway.internal:8080` | `http://gogocash-api.railway.internal:8080` | Runtime — Nest upstream for `/api/backend/*` |
| `NEXTAUTH_URL` | `https://admin-staging.gogocash.co` | `https://admin-beta.gogocash.co` | Exact public HTTPS, no trailing slash |

**Do not** point `API_URL` at `https://gogocash-api-*.up.railway.app` or the public custom domain.
That path was the residual #407 admin-beta failure mode after Atlas integrity was
ready: the BFF must use the private service DNS. On Railway the admin BFF
**requires** `API_URL` and rejects public-edge values at runtime
(`ADMIN_UPSTREAM_MISSING` / `ADMIN_UPSTREAM_UNSAFE_PUBLIC` → 503).

**Do not** use Railway-injected `RAILWAY_SERVICE_GOGOCASH_API_URL` (public host,
often scheme-less) as the BFF upstream — that is not `API_URL`.

Verify from the admin container:

```bash
railway ssh -s gogocash-admin -e production -- \
  'node -e "fetch(\"http://gogocash-api.railway.internal:8080/health\").then(r=>r.text().then(t=>console.log(r.status,t)))"'
```

Railway **staging / production (beta)** use the private `API_URL` pattern above.
Legacy GCP hosts (`admin.gogocash.co` / `api.gogocash.co`) are a separate path —
still set an explicit server upstream if that admin uses `/api/backend`.

Do **not** set `ALLOW_MOCK_ADMIN_PASSWORD`, `BUILD_FOR_FIREBASE`, or `NEXT_PUBLIC_FIREBASE_STATIC` on Railway
(the last two switch on the Firebase static-export path, which disables the API routes the Node server needs).
If `NEXT_PUBLIC_API_URL` is empty at build, the admin silently falls back to its in-memory `/api/mock` backend.

## app-web (`@gogocash/mobile`) — ALL build-time (`EXPO_PUBLIC_*` inlined at `expo export`)
```bash
railway variables --set 'EXPO_PUBLIC_API_URL=https://api-staging.gogocash.co' --service app-web
railway variables --set 'EXPO_PUBLIC_APP_ENV=staging' --service app-web
railway variables --set 'EXPO_PUBLIC_ACCOUNT_DATA_SOURCE=backend' --service app-web
railway variables --set 'EXPO_PUBLIC_FRONTEND_URL=https://app-staging.gogocash.co' --service app-web
# LINE Login channel 2008237916 / LIFF 2008237916-KY5oR5mW — if still "Developing",
# non-Tester users get 400 on access.line.me. Publish channel + LIFF for public QA:
# docs/line-login-channel.md (#382)
railway variable set 'EXPO_PUBLIC_LIFF_ID=2008237916-KY5oR5mW' --service '@gogocash/mobile' --environment staging
railway variables --set 'EXPO_PUBLIC_FIREBASE_API_KEY=<SET_ME: public web key>' --service app-web
railway variables --set 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<SET_ME>' --service app-web
railway variables --set 'EXPO_PUBLIC_FIREBASE_PROJECT_ID=<SET_ME>' --service app-web
railway variables --set 'EXPO_PUBLIC_FIREBASE_APP_ID=<SET_ME>' --service app-web
# optional: EXPO_PUBLIC_POSTHOG_KEY/HOST, EXPO_PUBLIC_SENTRY_DSN, EXPO_PUBLIC_EAS_PROJECT_ID
railway variables --set 'EXPO_PUBLIC_EAS_PROJECT_ID=0039c25f-f88e-491d-8da9-85b8d6e66558' --service app-web
```
The nginx runtime reads no env except `$PORT`; all `EXPO_PUBLIC_*` must be present when the build runs the export.

## Special notes
- **R2 media uploads** (`apps/api/src/media/r2-object-storage.service.ts`): all admin/customer media uploads require
  `R2_BUCKET`, `R2_ENDPOINT`, `R2_PUBLIC_BASE_URL`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY`. Missing any of
  these returns HTTP 503 (not a crash) — RUNTIME-LAZY, but catalog/withdraw-slip/avatar media is broken until set.
  Create an S3 API token in Cloudflare → R2 → **Manage R2 API Tokens** (**Object Read & Write** on the bucket).
  Set `MEDIA_UPLOAD_DISABLED=true` only to deliberately disable uploads.
- **`TELEGRAM_BOT_TOKEN` changes the dependency graph** (`app.module.ts:51-54`): `TelegramBotModule` loads only
  when it's set and ≠ `'PLACEHOLDER'`. Unset = Telegram cleanly disabled.
- **Fail-closed secrets**: `INVOLVE_POSTBACK_SECRET` and `INVOLVE_AI_API_KEY` reject every request when empty.
- **Admin "boots ≠ works"**: without `NEXTAUTH_SECRET` the Next.js server binds the port (looks deployed) but
  every protected route redirects to `/signin` — the admin is unusable.
