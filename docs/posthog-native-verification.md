# PostHog native verification

Native builds use `posthog-react-native` with keys from `EXPO_PUBLIC_POSTHOG_KEY` and `EXPO_PUBLIC_POSTHOG_HOST` (inlined at EAS build).

## Verify on device

1. Build preview with PostHog keys set in EAS env/secrets.
2. Open app, navigate a few screens.
3. In PostHog → Live events, filter by project and confirm `$screen` or custom events within 1–2 minutes.

## Web parity

Expo web uses the same env vars — see `apps/app/src/__tests__/analytics-events.test.ts` for wired events.

## Consent (PDPA-05)

Optional analytics gating on cookie/Privacy Center consent is **not yet wired** — PostHog may identify before explicit analytics opt-in. Track under `apps/app/docs/security-pentest-checklist.md` PDPA-05 until Phase 2 consent API + init gating land.

## Related

- [firebase-native-eas.md](./firebase-native-eas.md)
- [store-release-checklist.md](./store-release-checklist.md)
