# Android bug hunt handoff — 2026-07-09

Resume here for Priority **C** (core + GoGoTrack + dark mode + nav) against **staging** (+ local API later).

## Snapshot

| Item | Value |
| --- | --- |
| Date | 2026-07-09 |
| Device | Seeker `SM02G4061912033` (unlocked) |
| Branch / commit | `staging` @ `30630397` — `fix(app): stop logged-out Wallet/Profile bottom-nav dead ends on Android` |
| API | `https://api-staging.gogocash.co` |
| Installed APK (at hunt) | `co.gogocash.app` v0.1.0 **versionCode 38**, lastUpdate 2026-07-06 |
| Baked API in APK 38 | `api-staging.gogocash.co` |
| Native | `GototrackMonitorService` + `GototrackPromptReceiver` present |
| Auth JWT | Minted to `/tmp/gototrack-auth.env` as `GOGOTRACK_AUTH_TOKEN` (may expire ~24h; remint with staging `JWT_SECRET` + evidence `userId` `6a466393ce2e0da81d6dc20e`) |
| Local API lane | **Not started** |

## What shipped

### Code (on `origin/staging`)

- [`apps/app/src/auth/protectedBottomNavPress.ts`](../apps/app/src/auth/protectedBottomNavPress.ts) — queue Wallet/Profile nav while session `ready: false` (no silent no-op)
- Both bottom navs use it: [`CustomerMobileBottomNav.tsx`](../apps/app/src/components/CustomerMobileBottomNav.tsx), [`home/CustomerMobileBottomNav.tsx`](../apps/app/src/screens/home/CustomerMobileBottomNav.tsx)
- [`apps/app/app/(tabs)/profile.tsx`](../apps/app/app/(tabs)/profile.tsx) — unauthenticated `CustomerRouteState` (“Sign in required”) instead of blank tab
- Maestro cookie subflow `appId` for Maestro 2.6: [`.maestro/subflows/dismiss-cookie-banner.yaml`](../apps/app/.maestro/subflows/dismiss-cookie-banner.yaml)
- Tests: `protected-bottom-nav-press.test.ts` + parity updates in `remaining-customer-route-parity.test.ts`

### CI / Expo

| Action | Result |
| --- | --- |
| Push `30630397` → `staging` | OK |
| [App OTA Staging](https://github.com/mygogocash/gogocash-monorepo/actions/runs/29025113104) | **Published** — channel `staging`, runtime `0.1.0`, Android update `019f4745-ec96-7017-a2f6-481727712c3b`, group `8e4c27de-20af-4ee6-82c5-ba45d7265d89` |
| Device OTA apply | **Blocked** — APK 38 logcat: `The expo-updates system is explicitly disabled` (`expo.modules.updates.ENABLED` = false). Embedded `assets/app.config` has **no** `updates.url` (build lacked `EXPO_PUBLIC_EAS_PROJECT_ID` at prebuild). |
| EAS preview rebuild | **Started** — build `d263dfc2-9e93-4b72-9cef-34d96dfb43f1`, profile `preview`, versionCode **38 → 39**. Dashboard: https://expo.dev/accounts/gogocash/projects/gogocash-mobile/builds/d263dfc2-9e93-4b72-9cef-34d96dfb43f1 |

`eas build:view` from a fresh shell may say “EAS project not configured” unless run from a linked `apps/app` context; use the dashboard URL above.

## Device findings (APK 38 — pre-fix JS)

| ID | Sev | Finding | Evidence |
| --- | --- | --- | --- |
| A1 | P0 | Logged-out Wallet bottom-nav stays on Home | Manual tap + Maestro `wallet-profile-auth-guard` |
| A2 | P0 | Logged-out Profile → blank dark screen | `profile.tsx` returned `null`; Maestro Profile tap |
| A3 | P0 | Authenticated wallet: API zero-balance OK, UI full-page empty | `POST /withdraw/check` **201**, `data: []`; UI “No wallet activity yet” / “backend activity” (strings still in APK 38; source already treats empty conversions as ready) |
| A4 | P1 | Warm `gogocash://wallet` ignored; cold `am start` after `pm clear` → login | Maestro `auth-guard` FAIL; adb cold PASS |
| A5 | P2 | Phase 7 `--require-background-prompt` alone does not emit prompt check | Needs `--return-to-gototrack` (see preflight script) |
| A6 | P2 | Maestro cookie subflow Config Section Required | Fixed in repo |

### GoGoTrack (staging) — partial pass

- Merchants: Shopee enabled (`android_packages: ["com.shopee.th"]`)
- `POST /gototrack/settings` `{ enabled: true, backgroundPromptsEnabled: true }` → **201**
- Usage Access: **allow**; Shopee installed; detect probe **PASS**
- Preflight with `--require-foreground` while Shopee open: foreground **PASS**
- Full Phase 5 (`--require-nudge --tap-nudge --activate --open-deeplink`) and Phase 7 with `--return-to-gototrack`: **not completed**

### Maestro (APK 38)

```text
[Passed] home
[Failed] auth-guard          # warm deep link
[Failed] wallet-profile-auth-guard
wallet-authenticated         # FAIL — empty state, no "Wallet" title
```

Artifacts: `/tmp/maestro-bug-hunt-logged-out`, `/tmp/maestro-bug-hunt-wallet`, `/tmp/maestro-post-ota`

## Resume checklist (next session)

### 1. Install preview APK 39 (required — OTA cannot fix APK 38)

1. Open https://expo.dev/accounts/gogocash/projects/gogocash-mobile/builds/d263dfc2-9e93-4b72-9cef-34d96dfb43f1
2. When status is **finished**, download APK
3. Install:

```bash
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"
adb -s SM02G4061912033 install -r /path/to/preview.apk
# Confirm updates enabled (should NOT say "explicitly disabled"):
adb -s SM02G4061912033 logcat -c
adb -s SM02G4061912033 shell am force-stop co.gogocash.app
adb -s SM02G4061912033 shell monkey -p co.gogocash.app -c android.intent.category.LAUNCHER 1
adb -s SM02G4061912033 logcat -d | grep -i 'expo.updates\|explicitly disabled\|UpdatesModule'
```

4. Confirm versionCode ≥ 39: `adb shell dumpsys package co.gogocash.app | grep versionCode`

### 2. Remint JWT if needed

```bash
# Prefer: export GOGOTRACK_AUTH_TOKEN from a fresh mint (staging JWT_SECRET + userId 6a466393ce2e0da81d6dc20e)
# Or reuse /tmp/gototrack-auth.env if still valid:
set -a; source /tmp/gototrack-auth.env; set +a
curl -sS -o /dev/null -w '%{http_code}\n' \
  -H "Authorization: Bearer $GOGOTRACK_AUTH_TOKEN" \
  https://api-staging.gogocash.co/user/profile
# Expect 200
```

### 3. Re-verify auth + wallet (must pass on APK 39)

```bash
cd apps/app
export PATH="$HOME/Library/Android/sdk/platform-tools:$PATH"
adb -s SM02G4061912033 shell pm clear co.gogocash.app
npm run bug-hunt:maestro -- --udid SM02G4061912033
# Expect: home + auth-guard + wallet-profile-auth-guard PASS

set -a; source /tmp/gototrack-auth.env; set +a
npm run staging:maestro-wallet
# Expect: "Wallet" visible (dashboard, not full-page empty)
```

Manual: logged-out Wallet/Profile → Sign in; authenticated wallet shows metrics with zeros, not “No wallet activity yet”.

### 4. GoGoTrack Phase 5 + 7

```bash
cd apps/app
set -a; source /tmp/gototrack-auth.env; set +a
# Ensure tracking on:
curl -sS -X POST https://api-staging.gogocash.co/gototrack/settings \
  -H "Authorization: Bearer $GOGOTRACK_AUTH_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"enabled":true,"backgroundPromptsEnabled":true}'

# Phase 5
npm run gototrack:preflight -- \
  --api-url https://api-staging.gogocash.co \
  --merchant-packages com.shopee.th --detect-package com.shopee.th \
  --require-auth --require-nudge --tap-nudge --activate --open-deeplink \
  --return-to-gototrack --grant-usage-access

# Phase 7 (background prompt check is gated on --return-to-gototrack)
adb shell monkey -p com.shopee.th -c android.intent.category.LAUNCHER 1
npm run gototrack:preflight -- \
  --api-url https://api-staging.gogocash.co \
  --merchant-packages com.shopee.th --detect-package com.shopee.th \
  --require-background-prompt --return-to-gototrack --require-foreground \
  --grant-usage-access
```

### 5. Remaining hunt (after auth green)

- Dark mode: Account Settings → System / Light / Dark
- Nav edge cases: GoGoLink sheet, dual bottom-nav parity, warm deep links
- Local API: `adb reverse tcp:8080 tcp:8080` + money/auth recheck
- Staging smoke from [BUG_HUNT_BACKLOG_PHASE2.md](./BUG_HUNT_BACKLOG_PHASE2.md) §1 (payout, favorites, referral)

## Known traps

1. **APK 38 cannot receive staging OTA** — rebuild with `EXPO_PUBLIC_EAS_PROJECT_ID` (preview profile already sets it in `eas.json`).
2. **`adb` not on default PATH** — use `$HOME/Library/Android/sdk/platform-tools/adb`.
3. **Evidence JWT in `T-018-phase7-android16-fix` is expired** — do not rely on inject script evidence fallback.
4. **Phase 7 flag coupling** — `--require-background-prompt` only dumps notifications when `--return-to-gototrack` is also set (`gototrack-preflight.mjs`).
5. **Wallet empty copy in overlay catalogs** (`mobileWalletNotReady*`) is legacy; live screen should use ready dashboard for `data: []`.

## Related docs

- [android-bug-hunt-audit-2026-07-09.md](./android-bug-hunt-audit-2026-07-09.md) — **post-ship code audit** (verified findings, test evidence; read before the device pass)
- [apps/app/evidence/staging/apk39-device-runbook.md](../apps/app/evidence/staging/apk39-device-runbook.md) — **turnkey APK 39 device runbook** (one pass, flags cross-checked against the scripts)
- [BUG_HUNT_BACKLOG_PHASE2.md](./BUG_HUNT_BACKLOG_PHASE2.md) — post-deploy smoke
- [gototrack-android-acceptance-plan.md](./gototrack-android-acceptance-plan.md) — Phase 5/7
- [ota-smoke.md](./ota-smoke.md) — OTA enablement
- [apps/app/evidence/staging/bug-hunt-p1-checklist.md](../apps/app/evidence/staging/bug-hunt-p1-checklist.md) — short checklist
