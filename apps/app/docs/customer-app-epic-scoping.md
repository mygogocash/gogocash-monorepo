# Customer-App Data / Withdraw / Native-Auth Story — Scoping Plan

**App:** `apps/app` (GoGoCash customer app, Expo Router + react-native-web, real-money cashback, ~700 users)
**Scope:** read-only investigation → owner-ready plan. No code changed.
**Confidence:** claims are `verified` against source (file:line cited) unless tagged.

> Produced for P2-APP (#28). The epic itself is owner-gated — this is the plan, not an implementation.

---

## TL;DR (the honest one-liner)

The app today ships **no real account/customer data in any build profile** and the **Withdraw button moves no money — it fakes success in local state**. The backend plumbing for auth, the API client, and the data seam is genuinely built and unit-tested, but it is **inert**: no EAS profile sets `accountDataSource: "backend"`, so the live paths never execute. This is a **multi-part epic, not a tidy fix** — but the foundations are real, so it's "wire up + harden," not "build from scratch."

---

## 1. DATA WIRING

### The central switch
One data switch: `EXPO_PUBLIC_ACCOUNT_DATA_SOURCE` → `getMobileEnv().accountDataSource` (`src/config/env.ts:14-31`, `:53-59`), union `"fixtures" | "backend" | "disabled"` (`src/auth/routeGuard.ts:3`).

### Per build profile (`eas.json`)

| Profile / channel | `ACCOUNT_DATA_SOURCE` | `API_URL` | Real data? |
|---|---|---|---|
| `development` (`eas.json:8-15`) | `fixtures` | api-staging | ❌ Fixtures |
| `preview`/staging (`eas.json:17-23`) | `fixtures` | api-staging | ❌ Fixtures |
| `production` (`eas.json:25-32`) | **`disabled`** | api.gogocash.co | ❌ `null` / `"disabled"` |
| Web staging deploy / `.env.example` | `fixtures` (`.env.example:3`, `app.config.ts:11,116`) | api-staging | ❌ Fixtures |

**Confirmed: prod EAS = `disabled`** (`eas.json:30`). **No profile anywhere sets `backend`.** "Backend" is reachable only by hand-editing a local `.env`.

### What each mode does — the data layer
`useCustomerAccountResource()` (`src/account/customerAccountResource.ts`, TanStack Query, shared singleton client):
- `fixtures` → `fixtureData` synchronously, status `"ready"` (`:156-165`)
- `disabled` → `data: null`, status `"disabled"` (`:167-176`) — **prod renders empty/null balances**
- `backend` → real `useQuery` → `getSharedMobileApiClient(env.apiUrl)` → Bearer token from session, mapper-per-resource (`:108-137`). Prod hard-throws if it ever sees `fixtures` (`src/config/env.ts:46-48`).

7 screens consume the hook (wallet, profile, profile-offers, referral, subscription, shop-detail, favorite-brands) — could show real data the moment a profile flips to `backend`. Endpoint map (`:46-80`): `profile → /user/profile`, `wallet → /withdraw/check`, `referral → /point/referral-list`, `offers → POST /offer/my-offers`, `catalog → /offer`, `billing → /customer-billing/subscription` (**404 — does not exist on backend**).

**Net:** the seam is well-built and tested, but every shipping build is fixtures-or-empty.

---

## 2. WITHDRAW

**File:** `src/screens/CustomerMoneyActionScreen.tsx`.

### The Withdraw button fakes success locally — verified
`handleWithdraw` (`:383-411`) does **zero network I/O**:
```ts
haptics.success();
setBalance(balance - decision.amount);   // local state only
setSuccessMsg(`Cashback withdrawal of ${decision.amount.toFixed(2)} THB ... submitted successfully!`);
```
- Balance hardcoded: `useState(3180.24)` (`:240`). Methods hardcoded: `INITIAL_METHODS` (`:84-101`).
- "Save method" (`:287-381`) only mutates local state. Imports **no** API client / resource hook / withdraw API.

### There IS a real withdraw client — but it's DEAD CODE on the wrong endpoints
`src/withdraw/api.ts` `createWithdrawApi()` has idempotency handling (`:30-45`) but is **never imported** by a screen, and targets `/withdraw/methods` (GET) + `/withdraw/submit` (POST) — **neither exists on the backend.**

### What it SHOULD call (`apps/api/src/withdraw/withdraw.controller.ts`)
| Action | Endpoint | Guard |
|---|---|---|
| Submit | `POST /withdraw` (`:107`, `CreateWithdrawDto`) | FirebaseAuthGuard |
| Add method | `POST /withdraw/bank-transfer` (`:174`) | FirebaseAuthGuard |
| Manual (MiniPay) | `POST /withdraw/request-manual` (`:126`) | FirebaseAuthGuard |
| Check balance | `POST /withdraw/check` (`:47`) | FirebaseAuthGuard |
| List methods | `GET /withdraw/methods-list` (`:288`) | FirebaseAuthGuard |
| History | `GET /withdraw` (`:210`) | FirebaseAuthGuard |

The dead `withdraw/api.ts` must be **rewritten to these real paths** — only a design sketch as-is.

---

## 3. BACKEND JWT — obtained + stored, but refresh path is DEAD

- **Obtain:** `exchangeFirebaseIdToken()` (`src/auth/firebaseLogin.ts:62-92`) POSTs the Firebase ID token to `/auth/log-in`, gets a backend JWT in `response.token`.
- **Store:** SecureStore (native) / localStorage (web), key `gogocash.mobile.session.v1` (`src/auth/session.ts:62-116`).
- **Send:** client sends `Authorization: Bearer <token>` (`src/api/client.ts:31-41`); on `401` clears session (`:64-67`).

### The refresh gap (the real defect)
The backend guard accepts a backend JWT OR a Firebase ID token (`apps/api/src/auth/firebase-auth.guard.ts:53-105`). The Firebase token auto-refreshes; the backend JWT does **not**. The intended design is for the client to send the auto-refreshing Firebase token — but `getFirebaseIdToken(forceRefresh)` (`src/auth/firebaseClient.ts:88-98`) is **called by nobody**, and the client only ever sends the never-refreshed backend JWT. **Impact (high confidence):** once the backend JWT expires → 401 → forced re-login.

---

## 4. NATIVE PHONE AUTH — web-only; native is explicitly stubbed/throws

- Live OTP is gated behind `liveAuth = accountDataSource === "backend"` (`src/screens/CustomerAuthScreen.tsx:129`); since nothing ships `backend`, every build runs the **demo branch** (OTP `123456` + `buildDemoMobileSession()` fake `access_token: "demo-session"`, `:349-369`).
- Even in `backend` mode, native throws: `sendPhoneOtp()` `if (Platform.OS !== "web") throw ...web only` (`src/auth/firebasePhoneAuth.ts:30-33`) — relies on web `RecaptchaVerifier` + DOM.
- **No native Firebase config:** `app.config.ts:68-114` has no `@react-native-firebase/*`, no `expo-firebase-recaptcha`, no `googleServicesFile`/`GoogleService-Info.plist`.
- Native persistence: native is in-memory only (`firebaseClient.ts:69-83`) — Firebase user lost on restart.
- Social IdP buttons exist (`CustomerAuthScreen.tsx:790-846`) but are decorative (no `onPress`).

---

## Work breakdown
Effort S(≤1d)/M(2-4d)/L(1-2wk)/XL(>2wk). Untested money/auth = R0.

**A. Data wiring** — A1 per-resource DTO+mapper for profile/wallet/referral/offers/merchant (M,R1) · A2 repoint/retire `billing` 404 (S,R2) · A3 add a staging `backend` profile (S,R1) · A4 prod flip `disabled→backend` (S, **R0**).

**B. Real withdraw** — B1 rewrite `withdraw/api.ts` to real endpoints, keep idempotency, TDD (M,**R0**) · B2 wire `handleWithdraw` to B1, remove fake setBalance (M,**R0**) · B3 real balance from `/withdraw/check` (M,**R0**) · B4 persist methods via `/withdraw/bank-transfer` + list (M,R1) · B5 on-chain web3 + KYC (XL,**R0**).

**C. JWT refresh** — C1 client prefers `getFirebaseIdToken()` + 401-retry-once, TDD catch path (M,R1) · C2 native Firebase persistence (S-M,R1).

**D. Native auth** — D1 `@react-native-firebase/auth` (or expo-firebase-recaptcha + dev-client) (L,R1) · D2 native Firebase config files + plugin (M,R1, owner creds) · D3 un-gate live OTP for staging/native, retire `123456` (M,**R0**) · D4 real social sign-in (L,R1).

---

## Owner-gated / external dependencies (the "#35" surface)
1. **`EXPO_TOKEN`** GitHub secret (expo.dev access token) — owner-only.
2. **`eas init` / EAS project id** (`EXPO_PUBLIC_EAS_PROJECT_ID`, unset) — owner-only.
3. **Store credentials:** Apple App Store Connect API key (+ Team ID, bundle `co.gogocash.app`) + Google Play service-account JSON — owner-only.
4. **APNs key (iOS) + Android SHA-1/256** for Firebase native registration — owner-only.
5. **Firebase native app registrations + `GoogleService-Info.plist` / `google-services.json`** (only a web app exists today) — owner-only.
6. **Staging API redeploy** (`api-staging` was 503 at last check) — ops decision, blocks safe e2e.
7. **Prod data-flip sign-off** (A4 exposes real money to ~700 users) — owner R0.
8. Firebase phone-auth quota/billing + social-IdP config if D4 wanted — owner.

---

## Recommended sequencing
```
0. Owner: EXPO_TOKEN + eas init        ← unblocks native builds
1. Ops: redeploy staging API            ← unblocks safe e2e
2. Add staging "backend" profile (A3)   ← test seam without prod
3. JWT refresh wiring (C1)              ← prevents forced re-logins
4. Un-gate web OTP for backend mode, drop demo (D3)
5. Per-resource mappers (A1) + retire billing (A2)
6. Real withdraw client + screen wiring (B1→B2→B3→B4)  TDD each, R0
7. Native auth: Firebase native config+creds (D2←owner #4/#5), native OTP (D1), persistence (C2)
8. Store credentials (#3) + un-gate eas submit
9. Prod flip disabled→backend (A4) — LAST, with sign-off
```
**Store-submission blockers:** owner #1/#2/#3/#4/#5. **Native phone auth (D1/D2) is the gating engineering blocker** — without it native users literally cannot log in (the code throws).

## What NOT to do without explicit sign-off (R0)
- **A4** prod flip `disabled→backend` (real money for 700 live users).
- **B1/B2/B3** real withdraw submit (double-submit pays out twice — verify idempotency e2e first).
- **B5** on-chain web3 withdrawal.
- **D3** retiring the `123456` demo / turning live auth on.

**Dissent:** the seam *looks* finished, tempting a one-line `eas.json` flip to go live. That single edit (A4) is the riskiest action in the epic and depends on ~6 other things being true first. Treat the flip as the **last** step, never the first.

---

**Related:** Customer UI theming — [dark-mode.md](./dark-mode.md). Stack: Expo SDK 56, React Native 0.86 (`apps/app`).
