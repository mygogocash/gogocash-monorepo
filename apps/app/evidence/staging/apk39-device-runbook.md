# APK 39 device verification — turnkey runbook

One-pass runbook for the Android bug-hunt resume. Every command below is cross-checked
against the actual script arg parsers (`scripts/gototrack-preflight.mjs`,
`scripts/inject-staging-auth-wallet.mjs`) — not just the handoff prose — so it runs
without edits on the Seeker device.

- **Device:** Seeker `SM02G4061912033`
- **API:** `https://api-staging.gogocash.co`
- **Build:** EAS preview `d263dfc2-9e93-4b72-9cef-34d96dfb43f1` (versionCode **39**)
- **Handoff:** [`docs/android-bug-hunt-2026-07-09.md`](../../../docs/android-bug-hunt-2026-07-09.md)

> Two corrections vs. handoff §4 baked in here:
> 1. GoGoTrack preflight selects a device with **`--device <udid>`** (handoff §4 omits it — only safe with a single device attached). Always pass it.
> 2. `inject-staging-auth-wallet.mjs` reads the **`ADB`** env var for a custom adb path; `gototrack-preflight.mjs` reads **`ADB_PATH`**. Both fall back to `~/Library/Android/sdk/platform-tools/adb`, so you normally set neither.

## Already green before you touch the device (no device needed)

Re-run to confirm nothing regressed since `30630397`:

```bash
cd apps/app
npm run test          # unit (vitest.config.ts)
npm run test:render   # render (vitest.render.config.ts)
npm run typecheck     # tsc --noEmit
```

Baseline captured 2026-07-09 on `staging @ 6b4ad287`: **typecheck exit 0**; the two
shipped fixes + P1 watchlist suites all green (nav/​shop-detail/​payout/​launch-contract
66, render 30, profile-wallet/​favorites 11, GoGoTrack 137). Anything red here is a
regression — stop and fix before the device pass.

## 0. Env

```bash
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"
export UDID=SM02G4061912033
adb -s "$UDID" get-state          # expect: device
```

## 1. Install preview APK 39 + confirm OTA is enabled (the APK 38 trap)

```bash
# Download the finished APK from the EAS dashboard first:
# https://expo.dev/accounts/gogocash/projects/gogocash-mobile/builds/d263dfc2-9e93-4b72-9cef-34d96dfb43f1
adb -s "$UDID" install -r /path/to/preview-v39.apk

# versionCode must be >= 39
adb -s "$UDID" shell dumpsys package co.gogocash.app | grep versionCode

# Cold-launch and confirm expo-updates is NOT disabled
adb -s "$UDID" logcat -c
adb -s "$UDID" shell am force-stop co.gogocash.app
adb -s "$UDID" shell monkey -p co.gogocash.app -c android.intent.category.LAUNCHER 1
adb -s "$UDID" logcat -d | grep -i 'expo.updates\|explicitly disabled\|UpdatesModule'
```

**GATE:** logcat must **not** contain `The expo-updates system is explicitly disabled`.
If it does, the APK was built without `EXPO_PUBLIC_EAS_PROJECT_ID` again — see
[`docs/ota-smoke.md`](../../../docs/ota-smoke.md); do not proceed.

## 2. Auth token — export a fresh one (script now fails fast)

`inject-staging-auth-wallet.mjs` resolves the token as `--auth-token` → `GOGOTRACK_AUTH_TOKEN`/`GOGOSENSE_AUTH_TOKEN` and **exits 1 with a clear message when neither is set**. (The old third fallback — a committed, expired evidence token that silently produced a logged-out wallet on a "successful" inject — was removed; test: `inject-staging-auth-wallet.test.ts`.) Export a fresh token and confirm it before §4:

```bash
set -a; source /tmp/gototrack-auth.env; set +a   # or export GOGOTRACK_AUTH_TOKEN=<fresh mint>
curl -sS -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $GOGOTRACK_AUTH_TOKEN" \
  https://api-staging.gogocash.co/user/profile
```

**GATE:** expect `200`. `401`/`403` → remint with staging `JWT_SECRET` + userId `6a466393ce2e0da81d6dc20e`. A missing token now fails the inject step loudly instead of silently using a stale one.

## 3. Maestro — logged-out guards (was FAIL on APK 38)

```bash
cd apps/app
adb -s "$UDID" shell pm clear co.gogocash.app   # resets app state — dedicated test device only
npm run bug-hunt:maestro -- --udid "$UDID"
```

**GATE:** `home`, `auth-guard`, `wallet-profile-auth-guard` all **PASS**.
Manual cross-check: logged-out Wallet/Profile tab → "Sign in required" state, never a
blank dark tab and never stuck on Home.

## 4. Wallet — authenticated zero-balance dashboard (was full-page-empty on APK 38)

```bash
npm run staging:maestro-wallet   # injects JWT via deep link, then runs wallet-authenticated.yaml
```

**GATE:** `wallet-authenticated` PASS. The flow now keys on the `wallet-dashboard` testID
(only the authenticated dashboard renders it) and asserts the login screen is absent, so it no
longer false-passes on the empty-state screen or the `/wallet`→`/login` "Connect Wallet"
redirect. Still worth an eyeball: the **Wallet dashboard with zero-value metrics** is showing —
not "No wallet activity yet" / "backend activity".

## 5. GoGoTrack Phase 5 (activation) — `--device` required

```bash
curl -sS -X POST https://api-staging.gogocash.co/gototrack/settings \
  -H "Authorization: Bearer $GOGOTRACK_AUTH_TOKEN" -H 'Content-Type: application/json' \
  -d '{"enabled":true,"backgroundPromptsEnabled":true}'

npm run gototrack:preflight -- \
  --device "$UDID" \
  --api-url https://api-staging.gogocash.co \
  --merchant-packages com.shopee.th --detect-package com.shopee.th \
  --require-auth --require-nudge --tap-nudge --activate --open-deeplink \
  --return-to-gototrack --grant-usage-access \
  --auth-token "$GOGOTRACK_AUTH_TOKEN" \
  --capture-device-evidence --evidence-dir evidence/staging/T-apk39/phase5
```

**GATE:** activation nudge observed + deep link opens. `--open-deeplink` implies `--activate`.

## 6. GoGoTrack Phase 7 (background prompt) — coupling matters

The background-prompt notification dump is gated on `--return-to-gototrack`; passing
`--require-background-prompt` alone is a no-op (handoff trap #4). Keep both.

```bash
adb -s "$UDID" shell monkey -p com.shopee.th -c android.intent.category.LAUNCHER 1
npm run gototrack:preflight -- \
  --device "$UDID" \
  --api-url https://api-staging.gogocash.co \
  --merchant-packages com.shopee.th --detect-package com.shopee.th \
  --require-background-prompt --return-to-gototrack --require-foreground \
  --grant-usage-access \
  --auth-token "$GOGOTRACK_AUTH_TOKEN" \
  --capture-device-evidence --evidence-dir evidence/staging/T-apk39/phase7
```

**GATE:** background prompt observed after returning to the GoGoTrack hub; save the
`preflight-report.json` under `evidence/staging/T-apk39/`.

## 7. Remaining manual hunt (after §3–§6 green)

- Dark mode: Account Settings → System / Light / Dark — no light leaks on profile/favorites/quest.
- Shop detail: cashback shows real rate or `—` (never a leaked fixture rate); logo falls back to initials, not a 401 blank tile; favorite tap while logged out → login redirect.
- Nav edge cases: GoGoLink sheet, dual bottom-nav parity, warm `gogocash://wallet` deep link.
- Local API lane: `adb reverse tcp:8080 tcp:8080` + money/auth recheck.
- P1 staging smoke: [`bug-hunt-p1-checklist.md`](./bug-hunt-p1-checklist.md) + [`BUG_HUNT_BACKLOG_PHASE2.md`](../../../docs/BUG_HUNT_BACKLOG_PHASE2.md) §1.

## Pass/fail log — executed 2026-07-10 (Seeker, APK 39)

| Step | Gate | Result | Evidence |
| --- | --- | --- | --- |
| 1 | versionCode ≥ 39, updates not disabled | ✅ versionCode=39; expo-updates state machine active, no "explicitly disabled" | logcat |
| 2 | `/user/profile` → 200 | ✅ 200 with real user doc | curl |
| 3 | home + auth-guard + wallet-profile-auth-guard PASS | ✅ 3/3 in 1m9s (all FAILED on APK 38) | Maestro |
| 4 | wallet-authenticated PASS (dashboard) | ✅ `wallet-dashboard` visible + `login-screen` absent — proves the staging **OTA applied** (testID exists only in OTA JS) and A3 empty-state fixed | Maestro |
| 5 | Phase 5 activation nudge + deep link | ⚠️ 15 pass / 4 fail — **all four blocked by `POST /gototrack/activate` → 500 on staging** (see below). Nudge itself renders when Shopee is truly foregrounded (proven in §6). | `evidence/staging/T-apk39/phase5` |
| 6 | Phase 7 background prompt | ✅ **16/16** incl. detection, foreground, hub return, activation nudge visible | `evidence/staging/T-apk39/phase7` |

### 🔴 New P0 ops finding: staging `/gototrack/activate` returns 500

Deterministic repro (86ms — not a timeout):
`POST /gototrack/detect` (android_package, com.shopee.th) → 201 matched, then
`POST /gototrack/activate` with the returned ids → **500 Internal server error**.

Code-path analysis: `InvolveService.signIn()` posts `process.env.INVOLVE_SECRET` to
`api.involve.asia/api/authenticate`; a rejected secret throws a raw axios error **outside**
the mapped `[400,404,422]` upstream band in `gototrack.service.createAffiliateDeeplink`
→ Nest 500. `docs/railway-env-matrix.md` lists `INVOLVE_SECRET=<SET_ME>` — **suspected
missing/invalid on the staging api deployment**. Ops action: set/verify `INVOLVE_SECRET`
on the staging api service, re-run §5. (User doc exists; detection, settings, catalog all 200.)

Remaining manual (§7): dark-mode sweep, shop-detail visual checks, warm deep link, local-API lane.
