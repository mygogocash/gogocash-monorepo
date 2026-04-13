# Credit Score State Matrix

This matrix is the QA reference for `/[locale]/credit-score`.

## Core Dimensions

- Tier: `starter` (`score < 80`) and `trusted` (`score >= 80`)
- Streak status: `none`, `earned`, `redeemed`, `expired`
- Breakdown rows: `spend`, `transactions`, `email`, `phone`, `profile` complete/incomplete
- Layout: mobile (`390x844`), desktop
- Locale: `en`, `th`

## Required UI Outcomes

| Scenario | Expected Result |
| --- | --- |
| Starter score | `ProgressBar` and `BoostCTA` visible |
| Trusted score | `ProgressBar` and `BoostCTA` hidden |
| Starter hero | Shows points remaining to Trusted |
| Trusted hero | Shows trusted success copy |
| Breakdown complete rows | Grouped under `Complete` first |
| Breakdown locked rows | Grouped under `Still to do` with CTA |
| Benefits starter | Starter benefits active section visible |
| Benefits trusted unlock | Locked section visible only for Starter |
| Benefits coming soon | Always visible |
| Streak none | Timeline + month status rows visible |
| Streak earned | Redeem CTA visible + expiry days shown |
| Streak redeemed | Active state copy shown, no redeem CTA |
| Streak expired | Expired/reset copy shown |

## Automated Coverage

- Unit tests: `src/features/credit-score/utils/scoreCalculator.test.ts`
  - score formulas (caps/rounding)
  - tier thresholds
  - points-to-trusted
  - breakdown row structure and CTA mapping
  - streak expiry day handling
- E2E: `e2e/credit-score-states.spec.ts`
  - authenticated mobile `en` and `th` route checks
  - key section visibility checks
  - horizontal overflow guard on main scroll container
  - runtime page/console error collection

## Manual Sanity Checks (when changing UI copy/layout)

1. Verify `/en/credit-score` and `/th/credit-score` on mobile width (`390px`).
2. Confirm no clipping in the streak and benefits cards.
3. Confirm all CTA tap targets remain at least `h-11`.
4. Confirm locked/active states remain visually distinct.
