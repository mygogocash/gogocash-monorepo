# Membership (Go Unlimited) — engineering notes

## Product source of truth

- **Sellable paid tier on the landing page:** **Starter** (1.5× multiplier). Primary CTAs use `startCheckout("starter")` with Stripe when billing is enabled.
- **Hero and pricing** should describe the same tier and multiplier (Starter / 1.5×). Songkran and other narrative blocks may still mention other tiers for storytelling—keep them intentional, not accidental drift from checkout.
- **Display prices** (฿69 monthly, ฿57/mo effective annual) live in `MembershipPageClient.tsx` as `STARTER_PRICE_MONTHLY` and `STARTER_PRICE_ANNUAL_EFFECTIVE`. Stripe amounts come from the configured Price IDs in env (`STRIPE_PRICE_*`).

## Layout: profile `SubPage`

- Long membership content sits inside **`SubPage`**’s `overflow-y-auto` column (`data-testid="profile-subpage-main-scroll"`).
- In-page links like `href="#pricing"` must scroll **that** container, not only the window. Logic lives in `src/lib/dom/scrollIntoScrollParent.ts` and `src/features/membership/landing/setupHashNavigation.ts`.
- `.membership-root` uses `min-height: 0` when nested under `.gc-profile-subpage-content` so it does not break the flex scrollport (`membership.css`).

## Layout: horizontal padding and bleed

- **`--mship-inline`** on `.membership-root` is the shared horizontal inset (`clamp(1rem, 4vw, 3rem)`). The main `.container` and inner cards use `padding-inline: var(--mship-inline)` so content aligns with the hero.
- **`.mship-bleed`** is for sections that should span edge-to-edge (pricing band, FAQ) while their inner content still respects the same inset. E2E can target `data-testid="membership-bleed-pricing"` and `membership-bleed-faq`.

## Tests

- **Unit:** `npm run test` — includes `checkoutRequestBody` parsing and `resolveStripePriceId` (mocked env).
- **E2E (optional auth):** see `e2e/profile-subpage-scroll.spec.ts` and set `PLAYWRIGHT_AUTH_FILE` to a saved session file.

## Stripe API

- POST `/api/stripe/checkout` body is validated with `stripeCheckoutBodySchema` in `src/lib/stripe/checkoutRequestBody.ts` (shared with tests).
