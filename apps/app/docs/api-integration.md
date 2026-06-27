# GoGoCash Mobile — API & Auth Integration (Developer Handoff)

**Audience:** a developer continuing the Expo app's backend integration.
**Scope:** `apps/app/` only (package `@gogocash/mobile`). The web/admin app's API architecture (the contract this app mirrors) is documented in [`apps/admin/API_INTEGRATION.md`](../../admin/API_INTEGRATION.md).
**Last verified:** 2026-06-10, against the live production API and the `gogocash-staging` Firebase project. Facts below marked *verified* were confirmed by live probes or passing tests, not assumed.

---

## 0. Status at a glance

| Piece | Status |
| --- | --- |
| Data-source seam (`fixtures \| backend \| disabled`) | ✅ Built and shipped; `backend` default in `.env.example` + EAS dev/preview |
| Live catalog (public `GET /offer`) → Favorite Brands screen | ✅ **Shipped + verified against production** (commit `e645186`) |
| Brands Management → customer surfaces (directories, top brands, search, policy, missing orders, favorites) | ✅ Wired under `backend` (PR #110) |
| API DTOs + mapper pattern | ✅ `src/api/catalogTypes.ts` + `src/api/catalogMapper.ts` (the template for all other resources) |
| Firebase project setup | ✅ Web app "GoGoCash Mobile" registered in `gogocash-staging`; client config in `apps/app/.env` (untracked) |
| Firebase auth plumbing (SDK, phone OTP, `/auth/log-in` exchange, session mapping) | ✅ Built + wired in `CustomerAuthScreen` when `accountDataSource=backend` |
| Auth-gated resources live (profile/wallet/referral/offers/merchant) | ✅ Wired where mappers exist; demo session kept for `fixtures` tests |
| **Out of scope (backend)** | ⛔ Crossmint (`/auth/sign-in`), Customer.io (server-side only), Web3/ethers (MiniPay SIWE, Connect Wallet, on-chain withdraw, crypto payout) — see `src/api/backendIntegrationScope.ts` |

## 0b. Backend integration exclusions

Mobile **`backend`** mode uses **Firebase phone OTP → `POST /auth/log-in` only**. Do not wire:

| Area | Why excluded |
| --- | --- |
| **Crossmint** | Legacy `/auth/sign-in` + `CrossmintAuthGuard`; deprecated on API — use Firebase |
| **Customer.io** | Server-side lifecycle email in `apps/api`; no mobile client integration |
| **Web3 / ethers** | On-chain withdraw (`ethers` in API withdraw service), MiniPay SIWE (`/auth/minipay-siwe`, `/auth/siwe-nonce`), auth **Connect Wallet** button, payout-method **Crypto** tab |

Helpers: `resolveAuthSocialProviders()` hides Connect Wallet on login; `resolvePayoutMethodTabs()` hides Crypto under backend. Fixtures mode keeps parity UI for offline dev.

## 1. Architecture (how data flows)

```
Screen
  └─ useCustomerAccountResource({ fixtureData, resourceId })     src/account/customerAccountResource.ts
       ├─ EXPO_PUBLIC_ACCOUNT_DATA_SOURCE = "fixtures"  → returns fixtureData synchronously (default)
       ├─ … = "disabled"                                → status "disabled"
       └─ … = "backend"                                 → react-query → createMobileApiClient(env.apiUrl)
                                                            src/api/client.ts
                                                            Bearer token from the session store; 401 → clearSession
  └─ screen maps the raw backend payload → the SAME view-model shape as the fixture
       (type guard + mapper; see §3 — screens never branch on payload shape inline)
```

- **Session store:** `src/auth/session.ts` — key `gogocash.mobile.session.v1`, SecureStore on native / localStorage on Expo-web, **exactly 15 pinned fields** (`src/config/mobileAppConfig.ts`).
- **Resource → endpoint map** (in `customerAccountResource.ts`): `profile → /user/profile`, `wallet → /withdraw/check`, `referral → /point/referral-list`, `offers → /offer/my-offers?limit=10&page=1`, `merchant → /offer/:id`, `catalog → /offer?limit=4&page=1` (public), `billing → /customer-billing/subscription` (**does not exist on the backend — see §4**).
- **Env:** `src/config/env.ts` (`getMobileEnv()`), resolution order `process.env.EXPO_PUBLIC_* → expo-constants extra → defaults`. Production **forbids** `fixtures` (runtime throw) and the EAS prod profile currently pins `disabled`.

## 2. Running against the live API (verify recipe)

```bash
# apps/app/.env
EXPO_PUBLIC_ACCOUNT_DATA_SOURCE=backend
EXPO_PUBLIC_API_URL=https://api.gogocash.co   # prod — read-only testing only! staging is down
```

1. **Restart the Expo dev server** — `EXPO_PUBLIC_*` values are inlined at bundle time; a running Metro will not pick up `.env` edits.
2. Cold Metro takes ~45s; the **first navigation can race the cold bundle** and bounce to `/` — just navigate again.
3. Public endpoints tolerate the demo session's junk Bearer (*verified*). Auth-gated endpoints will 401, which **clears the session** and bounces you to login — expected until real auth lands.
4. Revert to `fixtures` when done; the default must stay `fixtures` (pinned by `mobile-launch-contract.test.ts`).

## 3. The mapper pattern (template for every remaining resource)

The fixture rows in `webDesignParity.ts` are *view-models*; the backend returns different shapes. Screens stay shape-agnostic by mapping at the seam — see the shipped example:

- **DTOs:** [`src/api/catalogTypes.ts`](../src/api/catalogTypes.ts) — typed from the real response, plus an `isOfferListResponse` guard to distinguish backend payloads from fixture arrays.
- **Mapper:** [`src/api/catalogMapper.ts`](../src/api/catalogMapper.ts) — backend record → the exact fixture row shape (plus live-only extras: logo URL, derived tint). Unit-tested in `src/__tests__/catalog-mapper.test.ts`, including a guard that nothing outside the expected shape leaks through.
- **Screen:** `CustomerFavoriteBrandsScreen.tsx` — `isOfferListResponse(resource.data) ? map(...) : fixtureRows`, gated by `CustomerAccountResourceState` for loading/error/offline.

To bring another resource live: write the DTO from a real response → TDD a mapper to the fixture shape → wire the guard+map in the screen → flip `backend` locally and verify. **Don't rename hook/endpoint strings** (pinned — see §6).

## 4. Backend reality check (live probe results, 2026-06-10)

- **Production (`api.gogocash.co`) is live.** NestJS; errors are `{message, error, statusCode}`. CORS is wide open (`*`, `Authorization` allowed) — Expo-web calls it directly.
- **Verified to exist** (401 "Missing token" without auth): `/user/profile`, `/point/referral-list`, `/withdraw/check`, `/withdraw/methods-list`, `/offer/my-offers`, `/auth/firebase`. **Public** (200 with data): `GET /offer`, `GET /offer/get-category/list`.
- **Verified to NOT exist** (404): `/customer-billing/subscription` (the mobile `billing` resource must be repointed or stay fixtures), `/auth/mobile/callback` (the `CustomerAuthCallbackScreen` exchange endpoint is fictional), and `/auth/send-otp` + `/auth/verify-otp` + `/auth/siwe-nonce` — **the web's phone-OTP and SIWE flows are mock-only**; they exist solely in the web's mock adapter.
- **Auth requirement is explicit:** `POST /auth/log-in` replies *"Firebase token is required in Authorization header or body"*. There is no Firebase-free login path.
- **Staging (`api-staging.gogocash.co` + `app-staging.gogocash.co`) is down** at the infrastructure level (Google Frontend 503 / TLS failure). Until it's redeployed, the only live backend is production — fine for public reads, **not** for auth/write testing (real accounts/data).

## 5. Auth: what exists and how to finish it

**Firebase project:** `gogocash-staging` (project number 729804769570). Phone sign-in is the **only enabled provider**; `localhost` is an authorized domain (Expo-web dev works). Social IdPs are not configured in staging. A web app registration **"GoGoCash Mobile"** exists; its client config lives in `apps/app/.env` (`EXPO_PUBLIC_FIREBASE_API_KEY/AUTH_DOMAIN/PROJECT_ID/APP_ID` — untracked file).

**Plumbing modules (built, unit-tested, unused by any screen yet):**

| Module | Exports |
| --- | --- |
| `src/auth/firebaseClient.ts` | `getClientAuth()` (lazy init, local persistence on web), `getFirebaseIdToken(forceRefresh)`, `isFirebaseConfigured()` |
| `src/auth/firebasePhoneAuth.ts` | `sendPhoneOtp(phoneE164)` (invisible reCAPTCHA — **Expo-web only**; native needs expo-firebase-recaptcha later), `confirmPhoneOtp(confirmation, code)` → `{ idToken }` |
| `src/auth/firebaseLogin.ts` | `exchangeFirebaseIdToken({ apiUrl, idToken })` → `POST /auth/log-in` (Bearer + body, never in URL) → `mapLoginResponseToMobileSession` (emits **only** the 15 pinned session fields; `country`→`region`; `provider: "firebase"`) |

**The remaining wiring** (in `CustomerAuthScreen.tsx`, where `buildDemoMobileSession()` is called today):

```ts
const confirmation = await sendPhoneOtp(phoneE164);        // SMS goes out
const { idToken } = await confirmPhoneOtp(confirmation, code);
const session = await exchangeFirebaseIdToken({ apiUrl: env.apiUrl, idToken });
await persistMobileSession(session);                        // auth gate flips reactively
```

Keep the demo-session path for `fixtures` mode (tests and local dev depend on it). The exchange needs the staging API back up to test end-to-end; the Firebase half (OTP → ID token) is testable now on Expo-web with a real phone number.

**Token refresh:** there is none for the backend JWT (web has the same gap and papers over it by preferring the auto-refreshing Firebase ID token on every request — `getFirebaseIdToken()` exists here for the same purpose; consider wiring it into `createMobileApiClient` as a preferred token source once auth lands).

## 6. Pinned contract tests (edit deliberately, never casually)

| Test | Pins |
| --- | --- |
| `account-resource-state-parity.test.ts` | the endpoint strings + hook name in `customerAccountResource.ts`, and that 6 screens use the hook + `CustomerAccountResourceState`. **Additions are safe; renames break.** |
| `mobile-launch-contract.test.ts` | `envDefaults` (`accountDataSource: "fixtures"` etc., deep-equal — adding keys breaks it), the EAS prod profile (`disabled` + prod URL, no "staging" substring), `validateMobileEnv` throwing on prod+fixtures, and the **15 session fields** (deep-equal) |
| `security-pentest.test.ts` | SecureStore usage in `session.ts`; `client.ts` must keep Bearer-in-header, 401→`clearSession`, no `?token=`/`access_token=` in URLs; auth callback + logout invariants |
| `i18n-screen-copy-coverage.test.ts` | Thai resolution for specific fixture fields + a few inline literals per screen |

Switching production to live data later = a deliberate edit of `mobile-launch-contract` (EAS `disabled` → `backend`) plus `.env.example` updates.

## 7. Suggested order of work

1. Get **staging redeployed** (ops) — unblocks safe end-to-end auth.
2. Wire `CustomerAuthScreen` to the Firebase modules (§5) behind the existing fixtures/backend seam.
3. Prefer `getFirebaseIdToken()` in `createMobileApiClient` (fallback: session `access_token`) — web parity, solves refresh.
4. Per-resource mappers for `profile`, `wallet`, `referral`, `offers`, `merchant` (template in §3); repoint or retire `billing`.
5. Expand the catalog (home/shop/discovery lists, favorites `POST /offer/favorite/:offer_id` — the heart toggles are already functional UI-side).
6. Production flip: EAS profile + pinned-test edits + `.env.example`.

## 8. Related docs

- [dark-mode.md](./dark-mode.md) — customer app appearance (System / Light / Dark); admin has its own theme
- [AGENTS.md](../AGENTS.md) — agent conventions and verification gates
