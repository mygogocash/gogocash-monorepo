# Android bug-hunt — post-ship code audit (2026-07-09)

Static re-audit of the two shipped fixes plus the verification tooling, run on `staging`
after `6b4ad287`. Method: a 5-stream agent fan-out (each stream read source and traced
behavior), every finding then put through an independent adversarial verifier that tried to
**refute** it. Separately, the affected test suites and `tsc` were actually run for hard
red/green evidence. Findings below are the ones that **survived** verification.

Companion: [`apps/app/evidence/staging/apk39-device-runbook.md`](../apps/app/evidence/staging/apk39-device-runbook.md) (turnkey device pass) · handoff [`android-bug-hunt-2026-07-09.md`](./android-bug-hunt-2026-07-09.md).

## Bottom line

- **Both shipped fixes are sound on their stated scope.** `30630397` (logged-out nav) and
  `07da84c4` (shop-detail leaks) hold up: no redirect loops, no fixture-rate leak in sibling
  surfaces, `useEffect` imported, media-undefined handled. **Zero P0/P1 defects survived.**
- The Phase-2 headline fear — *fixture cashback leaking into "Explore other shops" / category /
  search grids* — was **REFUTED**: the leak was contained to the one mapper that got patched.
- The highest-value survivors are in the **verification tooling**, not the app: two Maestro
  flows can *false-pass* the exact regressions they exist to catch, and the wallet-inject script
  silently falls back to an expired token. These matter because the whole point of APK 39 is to
  re-verify on device — a false green would close the hunt on unfixed bugs.

## Test evidence (run 2026-07-09, `staging`)

| Check | Result |
| --- | --- |
| `tsc --noEmit` | **exit 0** (settles the shop-detail `useEffect`-import P0 risk) |
| nav + shop-detail + payout + launch-contract (unit) | 7 files / **66** ✓ |
| payout + money-action (render) | 2 files / **30** ✓ |
| profile-wallet-amount + favorites (unit) | 3 files / **11** ✓ |
| GoGoTrack (unit) | 29 files / **137** ✓ |

## Surviving findings (CONFIRMED, corrected severity)

### Verification tooling — fix before the APK 39 pass

| Sev | Finding | Where | Note |
| --- | --- | --- | --- |
| P2 ✅ | `wallet-authenticated.yaml` asserted only on the text **"Wallet"**, which also shows on the empty-state screen — so it false-passed the A3 wallet empty-state regression it exists to catch | `.maestro/flows/wallet-authenticated.yaml` | **Fixed:** added a `wallet-dashboard` testID ([CustomerWalletScreen.tsx:460](../apps/app/src/screens/CustomerWalletScreen.tsx)); both flows now assert it + `assertNotVisible id:login-screen`. Test: `customer-wallet.render.test.tsx` |
| P2 ✅ | Same flow (and `wallet.yaml`) could green on the `/wallet`→`/login` "Connect Wallet" redirect | `app/wallet.tsx:15` | **Fixed:** flows now `assertNotVisible id:login-screen`, so a redirect fails the flow |
| P2 ✅ | `inject-staging-auth-wallet.mjs` silently fell back to a **committed expired** evidence token when env was unset → deep link "succeeded", wallet stayed logged-out | `apps/app/scripts/inject-staging-auth-wallet.mjs` | **Fixed:** evidence fallback removed; token resolution is `--auth-token` → env → fail-fast exit 1. Behavioral tests: `inject-staging-auth-wallet.test.ts` (5) |
| P2 | Phase 5 handoff command omits `--evidence-dir`, so `--require-nudge`/`--tap-nudge` hard-fail | handoff `:130` | **Already fixed** in runbook §5 (adds `--evidence-dir`) |
| P3 | Phase 7 pre-step uses bare `adb` but PATH is never exported | handoff `:137` | **Already fixed** in runbook §0 |
| P3 | `test:maestro` runs auth-only / doc-only flows without their preconditions | `package.json:35` | Prefer the scoped `bug-hunt:maestro` set |
| P3 | `gototrack-nudge.yaml` asserts nothing and can never fail | `.maestro/flows/gototrack-nudge.yaml:6` | Add an assertion or delete |
| P3 | Text-keyed flows assume English; mis-assert under Thai locale | `.maestro/flows/wallet-profile-auth-guard.yaml:6` | Force locale or key on testIDs |
| P3 | Wallet-inject / preflight don't pin a device serial | `inject-staging-auth-wallet.mjs:65` | Runbook passes `--device` to preflight; inject has no serial flag — attach one device only |

### App code — follow-up polish (nothing blocks ship)

| Sev | Finding | Where | Fix |
| --- | --- | --- | --- |
| P2 | Toggling a favorite **during the initial favorites fetch** drops the user's existing server favorites from the UI (same class as backlog §1.4 "favorites optimistic") | `apps/app/src/account/FavoriteBrandsProvider.tsx:82` | Guard the toggle until the initial fetch resolves, or merge rather than replace |
| P2 | Authed user sees a **"Sign in required" flash** on cold-start Profile open — `!ready` renders the unauthenticated card instead of a loading state (regression: pre-image returned `null`) | `apps/app/app/(tabs)/profile.tsx:30` | Split states: `!ready` → `CustomerRouteState variant="loading"`; only `ready && !isAuthed` → "Sign in required" |
| P3 | Empty-cashback convention split — detail page shows **"—"** but sibling grids show **"0%"** (misleading) and search shows `""` | `src/api/catalogMapper.ts:44`, `src/account/searchSuggestionResource.ts:113` | One shared empty-cashback formatter/glyph across the three mappers |
| P3 | Favorite / "Shop Now" swallow the **first tap during native hydrate** (`if (!authReady) return`) — the same dead-tap anti-pattern `30630397` removed from bottom nav | `src/screens/CustomerShopDetailScreen.tsx:379`, `:151` | Visually pend/disable while `!authReady`, or defer-and-replay on `ready` |
| P3 | "Explore other shops" card renders a **blank tile** (no initials, no `onError`) when a logo is missing — every peer card falls back to initials | `src/screens/CustomerShopDetailScreen.tsx:702` | Add initials fallback + `onError`, matching `ShopDirectoryStoreCard` |
| P3 | No render-level test that Wallet/Profile self-guard across the `!ready`→`ready` transition (only source-string greps) | `src/__tests__/remaining-customer-route-parity.test.ts:92` | Mount both routes with mocked `useAuthGuardSession` across the transition × {authed, logged-out} |

## Refuted / dropped (do not re-chase)

- **Fixture cashback/logo leak in sibling grids** — REFUTED. `mapMerchantOfferToShopDetail` is the
  only fixture-shop consumer; all grids flow through `catalogMapper` (live rate or "0%", no fixture merge).
- **`useAuthGuardSession` never flips `ready` if the store init rejects** — REFUTED by the verifier
  (store creation path does not reject the way the finding assumed).
- **`--require-nudge` dev-client/Metro mismatch on the preview APK** — REFUTED.
- **Wallet flashes blank during `!ready`** — downgraded to a minor transient (P3); Profile now shows a
  card, Wallet still returns `null` for the hydrate window — worth mirroring but not a dead end.

## Suggested order

1. **Maestro wallet flow assertions** (2× P2) — before the APK 39 pass, so the device run can't false-pass.
2. **Wallet-inject expired-token fallback** (P2) — runbook §2 mitigates operationally; code fix removes the trap.
3. **`FavoriteBrandsProvider` load-race** (P2) and **Profile `!ready` loading state** (P2) — app fixes, JS-only → OTA-eligible.
4. P3 batch (cashback convention, favorite/shopNow hydrate, blank tile, render-test gap) as a cleanup PR.
