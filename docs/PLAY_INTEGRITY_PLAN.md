# Play Integrity API — integration plan (post-launch fraud protection)

Status: **planned, not started** — scheduled after production access is granted
(the 14-day closed test must finish first; enforcement against real attackers
only matters once the app is publicly installable).

## Why

GoGoCash moves real money (cashback payouts to PromptPay/bank). The current
API trusts any client presenting a valid Firebase token — a scripted client,
a tampered APK, or an emulator farm can drive the withdraw endpoints exactly
like the real app. Play Integrity closes that: Google attests, per request,
that the call comes from **our unmodified binary**, installed **from Play**,
on a **genuine Android device** — and the verdict is verified **server-side**,
so the client can't fake it. This also activates the 7 "Play Integrity API"
services on the Protected-with-Play console page.

## Architecture decision

**Raw Play Integrity (classic requests) with server-side nonce + server-side
verdict decoding** — not Firebase App Check.

- App Check only yields a boolean attestation; raw Play Integrity returns the
  granular verdict (deviceIntegrity, appIntegrity, licensingVerdict, plus
  opt-in Play Protect / recent-device-activity / app-access-risk fields) that
  a payout-risk policy actually wants, and it is what flips the console's
  0/7 services.
- **Classic requests** (per-action, server nonce) rather than standard
  requests for v1: the high-value action is discrete (withdraw), the ~1–2s
  token latency hides inside the withdraw submit, and classic's default quota
  (10k/day) is far above our volume. Standard requests can be added later for
  session-level signals.
- Verdict decoding via `playintegrity.googleapis.com` `decodeIntegrityToken`
  using a service account — the **`googleapis` package is already an api
  dependency (^173)**, so no new runtime deps.

## Phase 0 — Console/GCP setup (founder, ~30 min)

1. Play Console → Test and release → App integrity → **Play Integrity API →
   Link a Google Cloud project** (use the production GCP project).
2. Enable the Play Integrity API on that GCP project.
3. Opt in to the optional verdict signals we want (Play Protect status,
   recent device activity, app access risk) on the same settings page.
4. Create a service account with the **Play Integrity API** role; store its
   JSON key as a Railway/Cloud Run secret (`PLAY_INTEGRITY_SA_KEY`) — never
   in the repo. (WIF later if we move api CI to production GCP.)

## Phase 1 — API: integrity module (TDD, ~1 day)

New `apps/api/src/integrity/`:

- `integrity.controller.ts`
  - `POST /integrity/challenge` (FirebaseAuthGuard): issues a short-lived
    single-use nonce bound to the user id (store in Mongo with TTL index,
    ~5 min). Returns `{ nonce }`.
- `integrity.service.ts`
  - `decodeToken(token)` → calls `playintegrity.decodeIntegrityToken`
    (googleapis client, SA auth), returns the verdict payload.
  - `evaluate(verdict, { nonce, userId })` → policy object:
    - nonce matches + unconsumed (consume on use)
    - `appIntegrity.appRecognitionVerdict === "PLAY_RECOGNIZED"`
    - `appIntegrity.packageName === "co.gogocash.app"`
    - `deviceIntegrity.deviceRecognitionVerdict` ⊇ `MEETS_DEVICE_INTEGRITY`
    - optional signals recorded but not enforced in v1
  - Returns `{ ok, reasons[] }` — never throws on policy failure (guard
    decides), always logs the full verdict for the shadow phase.
- `play-integrity.guard.ts` — reads `X-Play-Integrity-Token` +
  `X-Play-Integrity-Nonce` headers; behavior driven by
  `PLAY_INTEGRITY_MODE` env: `off` | `shadow` (log only, never block) |
  `enforce` (403 with a clean, non-leaking error code on failure).
  Android-only: requests without the headers are allowed in `shadow`,
  and in `enforce` are allowed **only** when the client platform is not
  Android (web/iOS declare via existing client headers) — Android clients
  of app versions ≥ the integrity-aware release must present a token.
- Guard applied to the money movers only:
  `POST /withdraw` (:107), `POST /withdraw/request-manual` (:126),
  `POST /withdraw/bank-transfer` (:174), `POST /withdraw/methods`.
- Tests: nonce lifecycle (issue/consume/expiry), each policy failure path,
  mode matrix (off/shadow/enforce × pass/fail/missing), decode-client mocked.
- `.env.example`: `PLAY_INTEGRITY_MODE=off`, `PLAY_INTEGRITY_SA_KEY=`.

## Phase 2 — App: native module + wiring (TDD, ~1 day)

- New local expo module `modules/play-integrity` following the proven
  `modules/gototrack-detector` layout (expo-module.config.json + Kotlin):
  Kotlin wraps `IntegrityManager.requestIntegrityToken(nonce)` from
  `com.google.android.play:integrity` (~60 lines). `requireOptionalNativeModule`
  seam returns `null` off-Android (web/iOS/Expo Go) exactly like the
  gototrack module, so no platform branching leaks into screens.
- `src/integrity/withdrawIntegrity.ts`: `getWithdrawIntegrityHeaders()` —
  fetch nonce from `POST /integrity/challenge`, request token natively,
  return the two headers; on any failure returns `{}` and logs (server
  policy decides what missing means — the client never hard-blocks itself).
- Wire into the withdraw submit path (single call site in the withdraw
  screen's mutation) — headers ride the existing `client.post(path, body,
  headers)` signature.
- No manifest/permission changes: Play Integrity needs none (keeps the
  clean store-build permission surface from PR #217).

## Phase 3 — Rollout

1. Ship API in `shadow` + app with headers (an OTA can ship the JS wiring,
   but the **native module requires a new store build** — bundle it into the
   first post-launch version bump).
2. Watch shadow logs ~1–2 weeks: false-negative rate (legit users failing —
   expect emulators/dev builds/sideloads), latency added to withdraw.
3. Flip `PLAY_INTEGRITY_MODE=enforce` on production api (staging stays
   `shadow` — staging builds are sideloaded APKs and will *never* pass
   `PLAY_RECOGNIZED`; that is expected and is why mode is per-environment).
4. Console: confirm the Integrity services flip active; set up Play
   Console integrity alerts.

## Risks / gotchas

- **Staging & dev builds always fail app-recognition** (not Play-installed) —
  never set `enforce` outside production; the mode env is the safety rail.
- Classic request latency (~1–2s) — fire the token request in parallel with
  the user filling the confirm dialog, not sequentially after.
- Quota: classic 10k/day default is ample; request uplift only if withdraw
  volume grows past ~thousands/day.
- iOS is out of scope (App Attest is the analog — separate plan when iOS
  ships).
- Rooted devices with `MEETS_BASIC_INTEGRITY` only: v1 policy requires
  `MEETS_DEVICE_INTEGRITY`; revisit if support tickets show legit users hit.

## Effort

~2.5 dev-days total (1 api, 1 app native+wiring, 0.5 rollout/tests/docs)
plus founder Phase 0. All phases TDD per repo rules.
