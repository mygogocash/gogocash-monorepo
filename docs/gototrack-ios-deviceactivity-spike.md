# GoGoTrack iOS — DeviceActivity / Family Controls spike

**Status:** blocked on Apple entitlement (2026-06-30)

## Goal

Show a Live Activity / Dynamic Island “Accept to track” prompt **while the customer is still inside a merchant app** (Shopee, Lazada, etc.) — parity with the Android foreground-service notification path.

## Why UsageStats is unavailable

iOS does not expose Android-style foreground package queries to third-party apps. The realistic Apple APIs are:

| API | Capability | Gate |
| --- | --- | --- |
| **DeviceActivityMonitor** + **FamilyControls** | Observe when configured bundle IDs enter foreground | Restricted entitlement; App Store review |
| **ActivityKit Live Activity** | System prompt UI (Dynamic Island) | Works once detection fires; needs App Intents for Accept |
| **AppState (fallback)** | Detect when GoGoCash backgrounds/foregrounds | Cannot see merchant app; only useful after return |

## Spike checklist (1–2 days)

1. Request **Family Controls** capability in Apple Developer portal.
2. Prototype `DeviceActivityMonitor` extension filtering merchant bundle IDs seeded from `GET /gototrack/merchants`.
3. On match → call `GototrackLiveActivityModule.startActivationPrompt` with detection payload.
4. Wire **App Intent** Accept → `gogocash://gototrack/activate?…` (same as Android notification action).
5. Document App Store category + privacy questionnaire answers.

## Current shipping path (no entitlement)

- `modules/gototrack-live-activity` exposes `startActivationPrompt` / `endActivationPrompt` / `updateActivationPrompt`.
- **JS wiring (2026-06-30):** `GoGoTrackPromptCoordinator` `onChange` → `promptLiveActivityBridge.syncBoundLiveActivityWithPromptState()` when hub/settings mount `useGoGoTrackBackgroundPrompts`. Accept/deep-link path unchanged (`gogocash://gototrack/activate`).
- **Native behavior today:** Swift module logs ActivityKit deferral and posts a **local notification** fallback when notification permission is granted (not Dynamic Island). True Live Activity UI still needs widget extension + entitlements after Apple approval.
- `selectGoGoTrackDetector` keeps the unsupported detector on iOS for UsageStats-shaped APIs.
- `createIosAppStateFallbackDetector` (optional) can nudge when the customer returns to GoGoCash after opening a merchant link — weaker than true in-app prompts.
- Hub banner (`GoGoTrackDetectionBanner`) remains the primary iOS activation UX until DeviceActivity is approved.

## Blockers

- **Entitlement:** Family Controls requires Apple approval; without it, in-merchant detection cannot ship.
- **EAS rebuild:** ActivityKit widget extension + entitlements require a new dev-client / TestFlight build after approval.

## Next steps after approval

1. Implement widget extension + Live Activity layout (merchant name, Accept / Dismiss).
2. Connect DeviceActivity monitor → shared `GoGoTrackPromptCoordinator`.
3. Extend preflight / TestFlight acceptance doc with Dynamic Island tap-through to affiliate deeplink.
