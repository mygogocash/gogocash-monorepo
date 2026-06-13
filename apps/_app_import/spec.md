# Expo Typography Parity Spec

## Requirement

Expo customer routes must use the same customer-facing typography contract as the Next.js reference: DM Sans for English, Anuphan for Thai, regular body and nav labels, medium labels, semibold titles, and bold CTAs only where the web surface uses `font-bold`. The selected `/profile` invite row, `/link-mycashback` intro, and protected-route loading/sign-in-required state must match the Next.js font family, size, line-height, tracking, and weight.

## Data and State

- `apps/mobile/src/theme/tokens.ts` owns the shared Expo typography scale and weight names.
- `CustomerLinkCashbackScreen` maps the Next `LinkMyCashbackScreen` classes to Expo styles.
- `CustomerProfileScreen` maps the Next `ReferYourFriendsRow` profile invite typography to Expo styles.
- `AuthRouteGuard` maps the protected-route loading, blocked, and redirect states to the shared title/body typography tokens.
- `CustomerAuthCallbackScreen` maps Firebase handoff loading, success, missing-token, and error states to the shared title/body typography tokens.

## Edge Cases

- Native runtime keeps real `DM Sans` / `Anuphan` family names; web runtime keeps the full CSS fallback stack.
- The `/link-mycashback` title uses semibold, not bold or black.
- Body copy and subtitles use regular weight and explicit line heights.
- Profile invite title/subtitle stay regular, while the `Copy Link` pill uses the same medium label weight as Next.
- Protected-route state titles use semibold title tokens, and state body copy uses regular body tokens.

## Testing Strategy

- `typography-parity.test.ts`
  - `typography parity > given the Next text scale > then Expo exposes matching shared tokens`
- `link-mycashback-parity.test.ts`
  - `link mycashback typography > given the Next reference text styles > then Expo uses the same family scale and weights`
- `account-hub-parity.test.ts`
  - `profile referral nav > given selected Next referral row > then Expo renders the same highlighted card and copy affordance`
- `remaining-customer-route-parity.test.ts`
  - `protected route loading > given session verification states > then Expo uses the shared Next typography tokens`
  - `auth callback loading > given Firebase session handoff states > then Expo uses the shared Next typography tokens`
- R-tier: R2
- Affected files: `apps/mobile/src/theme/tokens.ts`, `apps/mobile/src/auth/AuthRouteGuard.tsx`, `apps/mobile/src/screens/CustomerAuthCallbackScreen.tsx`, `apps/mobile/src/screens/CustomerLinkCashbackScreen.tsx`, `apps/mobile/src/screens/CustomerProfileScreen.tsx`, `apps/mobile/src/__tests__/*parity.test.ts`, `spec.md`
- Rollback: restore the previous token values and the previous screen-level font weights.

# Link MyCashback Intro Parity Spec

## Requirement

Expo `/link-mycashback` must render the same intro state as the Next.js desktop reference: shared desktop header/nav, light-blue main band, centered GoGoCash sign-in title/subtitle, GoGoCash-to-MyCashBack connector row, explanatory copy, `Skip` outline CTA, `Link Account` filled CTA, and the shared desktop footer. Mobile keeps the same content scaled into a single-column route without the desktop header/footer.

## Data and State

- `webLinkMyCashbackIntro` stores the reference copy, background color, connector dot colors, and button labels.
- The link intro uses the copied `link-mycashback-gogocash.png` and `link-mycashback-shop.png` assets from the Next public image set.
- `Skip` routes to `/method/create`; `Link Account` routes to `/link-mycashback/my-cashback-sign-in`.

## Edge Cases

- Desktop shell chrome must render only at desktop widths.
- CTA labels and body copy must match the English Next reference exactly.
- Button text must not wrap or overflow at mobile widths.
- The footer must remain full-width instead of being constrained by the mobile content frame.

## Testing Strategy

- `link-mycashback-parity.test.ts`
  - `link mycashback intro > given the selected Next reference > then Expo renders the same intro contract`
  - R-tier: R2
  - Affected files: `src/design/webDesignParity.ts`, `src/screens/CustomerLinkCashbackScreen.tsx`, `assets/link-mycashback-gogocash.png`, `assets/link-mycashback-shop.png`, `spec.md`
  - Rollback: restore the previous `CustomerLinkCashbackScreen` placeholder form and remove the intro constants/assets/test.

# Account Setup PromptPay Parity Spec

## Requirement

Expo `/account-setup` must replace the temporary username/mobile profile form with the Next.js PromptPay-first onboarding flow. The intro step offers the registered phone, another phone number, or Citizen ID. The other-phone branch collects a Thai mobile number, checks a 6-digit OTP, then asks for first and last name. The Citizen ID branch collects a 13-digit ID, then asks for first and last name. Bank Account and Crypto Wallet alternatives route to `/method/create`, and Not Now returns home.

## Data and State

- `webAccountSetupFlow` stores the English Next.js copy, PromptPay badge labels, branch labels, validation messages, default mock registered phone, and desktop card metrics.
- `AccountSetupStep` stores the active branch: `intro`, `op_input`, `op_otp`, `op_name`, `ci_input`, or `ci_name`.
- `accountSetup` helpers normalize Thai mobile numbers, mask registered phone tails, and validate Thai mobile, Citizen ID, OTP, and name fields.

## Edge Cases

- A registered phone shorter than four digits should not display a tail mask.
- Thai mobile input accepts `0812345678` and `812345678`, then normalizes to `0812345678`.
- OTP accepts the mock/dev code `123456` only.
- Citizen ID must be exactly 13 digits.
- Empty first or last name blocks confirmation and shows the required-field message.
- The old username/mobile profile form must not render on `/account-setup`.

## Testing Strategy

- `account-setup-parity.test.ts`
  - `account setup flow > given the Next PromptPay onboarding contract > then Expo owns the same branches and copy`
  - `account setup validators > given PromptPay input variants > then Expo matches the Next validation rules`
  - R-tier: R2
  - Affected files: `apps/mobile/src/design/webDesignParity.ts`, `apps/mobile/src/features/accountSetup.ts`, `apps/mobile/src/screens/CustomerAccountSetupScreen.tsx`, `apps/mobile/src/__tests__/account-setup-parity.test.ts`, `spec.md`
  - Rollback: restore the previous `CustomerAccountSetupScreen` username/mobile form and remove the account setup constants/helpers/test.

# Remaining Customer Route Parity Spec

## Requirement

Expo must stop marking customer routes as migrated while still rendering generic utility/profile shells. The deep-scan gaps must have dedicated route behavior aligned with the Next.js user flow: MyCashback account selection, Firebase auth callback token handoff, PDPA age verification, GoGoPass membership/pricing/billing disabled-Stripe states, profile offer rows, phone/OTP routes, and `/profile/my-rating` legacy redirect to `/credit-score`.

## Data and State

- Auth callback reads the `token` query param, stores a Firebase/Telegram handoff session, and redirects home.
- Age verification keeps the Next PDPA copy, date input, over-20 validation, success, incomplete, and under-20 states.
- Subscription screens expose the disabled Stripe contract, GoGoPass monthly and annual plans, no-subscription state, and billing portal placeholder state.
- Profile offers use fixture rows shaped like Next `MyOffer`: `offer_id`, `deeplink`, `createdAt`, and `offer_name`.
- Phone routes split the Next flow: `/profile/verify-phone` collects a phone number, `/profile/cf-phone` collects the OTP.

## Edge Cases

- Missing auth callback token must show an expired-link state instead of silently succeeding.
- Web session storage falls back to `localStorage` if `expo-secure-store` is not available in web preview.
- `/profile/my-rating` must not render the old generic profile detail card; it redirects to `/credit-score`.
- RN Web `Image` components must pass `resizeMode` as a prop, not inside style objects.
- Disabled Stripe checkout must not present enabled purchase or billing-portal actions.

## Testing Strategy

- `remaining-customer-route-parity.test.ts`
  - `route handoff > given deep-scan generic shells > then dedicated Expo screens own each Next.js flow`
  - `auth callback > given a Firebase token query > then Expo persists the handoff and redirects home`
  - `mycashback sign-in > given the Next desktop reference > then Expo renders a dedicated selection screen`
  - `age verification > given the PDPA Next flow > then Expo validates over-20 birth dates`
  - `subscription routes > given Stripe is disabled locally > then Expo shows the real disabled billing contract`
  - `profile detail routes > given offer and phone flows > then Expo keeps the Next data and OTP contracts visible`
  - `rn web warnings > given account image screens > then resizeMode is passed as an Image prop`
  - R-tier: R2
  - Affected files: `apps/mobile/app/**`, `apps/mobile/src/screens/CustomerAuthCallbackScreen.tsx`, `CustomerAgeVerificationScreen.tsx`, `CustomerMembershipScreen.tsx`, `CustomerMyCashbackSignInScreen.tsx`, `CustomerProfileOffersScreen.tsx`, `CustomerProfilePhoneScreen.tsx`, `CustomerSubscriptionScreen.tsx`, `CustomerQuestScreen.tsx`, `CustomerWalletScreen.tsx`, `apps/mobile/src/__tests__/remaining-customer-route-parity.test.ts`, `apps/mobile/src/__tests__/expo-conversion-matrix.test.ts`, `apps/mobile/e2e/design-parity.spec.ts`, `spec.md`
  - Rollback: route these pages back to the prior generic screens, restore the old callback/loading screen, and remove the remaining-route parity test.

# Close and Hover-Out Motion Spec

## Requirement

Opening motion is already present on the Expo GoGoCash interaction surfaces. Closing a menu, sheet, or dialog must play a visible reverse animation before the surface unmounts or navigates away. Pointer hover-out on shared buttons/cards must also return to rest through the same CSS transition used for hover-in.

## Data and State

- `MotionPressable` keeps the existing `pressed` and `hovered` interaction state.
- GoGoLink sheet/dialog dismissal keeps a short-lived `isClosing` state so repeated taps are ignored while the exit animation runs.
- Animated values:
  - overlay/backdrop opacity: `1 -> 0`
  - sheet/dialog translateY: `0 -> exit offset`

## Edge Cases

- Pressing the backdrop and pressing the close button must use the same exit animation.
- The home GoGoLink sheet must call its parent `onClose` only after the exit animation finishes.
- The route GoGoLink view must navigate back to `/` only after the exit animation finishes.
- Nested GoGoLink guideline/result dialogs must animate out before clearing their parent state.
- Reduced or interrupted close taps should not start multiple competing dismissals.

## Testing Strategy

- `motion-interaction-parity.test.ts`
  - `hover feedback > given pointer leaves a shared pressable > then Expo keeps an animated rest state`
  - R-tier: R2
  - Affected files: `src/components/MotionPressable.tsx`, `src/theme/motion.ts`
  - Rollback: restore the previous `MotionPressable` hover style branch.

- `golink-feature-parity.test.ts`
  - `golink close motion > given sheet and nested dialogs are dismissed > then Expo runs exit animations before unmounting`
  - R-tier: R2
  - Affected files: `src/screens/CustomerGoLinkScreen.tsx`
  - Rollback: remove the dismiss hook and restore direct `onClose` / route replace calls.

# Desktop Shell And Cookie Banner Parity Spec

## Requirement

Expo web home must match the desktop Next.js reference shell. At desktop widths it should show the GoGoCash desktop header, Quest/sign-in/locale controls, the category nav bar, and the bottom PDPA cookie banner. The mobile search shell and floating bottom nav remain mobile-only.

The desktop shell must paint white across the full viewport while constraining its inner content to the same centered `1440px` shell as Next.js. At the live reference widths, shell padding is `56px` at `1024px`, `80px` at `1280px+`, and remains `80px` inside the centered shell on very wide screens. Capped desktop content must still let full-bleed shell elements, especially the footer, escape to viewport `x=0` without creating horizontal overflow. The secondary menu row uses Next's 38px tab lane, 16px inter-tab gap, 14px/21px medium body tabs, and 16px/24px regular lead tabs.

## Data and State

- `webDesktopHeaderNavItems` stores the staging desktop nav order: Top Brands, All Brands, All Shops, Product Discovery, Travel, Electronics, Health & Beauty.
- `webCookieConsentBanner` stores the staging PDPA cookie banner copy, CTA labels, and localStorage dismissal key.
- Cookie banner state starts hidden, checks localStorage after mount, and persists dismissal when either CTA is pressed.

## Edge Cases

- Desktop nav must not appear below the desktop breakpoint on mobile screens.
- Mobile bottom nav remains hidden on desktop and visible on mobile.
- Cookie banner overlays the bottom of the viewport without shifting the carousel layout.
- Cookie settings dismisses the banner and routes to `/privacy-center`; accepting all cookies only dismisses.
- Very wide desktop screens keep white header chrome at viewport edges rather than exposing the page-gray background.
- The active Top Brands tab keeps Next's black label with a green underline; it does not turn the label text green on the home route.

## Testing Strategy

- `web-design-parity.test.ts`
  - `desktop shell parity > given the Next desktop nav reference > then Expo keeps the same category nav order and cookie copy`
- `home-design-parity.test.ts`
  - `home desktop shell parity > given desktop Expo web > then renders the Next header, category nav, and cookie banner contract`
  - R-tier: R2
  - Affected files: `src/design/webDesignParity.ts`, `src/screens/CustomerHomeScreen.tsx`, `spec.md`
  - Rollback: remove the desktop shell/banner constants and restore `CustomerHomeScreen` to its prior mobile-only header and bottom-nav behavior.

# Desktop Home GoGoLink Banner Parity Spec

## Requirement

Expo web home must render the desktop-only GoGoLink banner in the same position and behavior as the Next.js reference: after the hero banner block and before Top Brands. Mobile keeps the bottom-nav GoGoLink sheet instead of this desktop banner.

## Data and State

- `webGoLinkFeature` stores the staging title, input label, placeholder, CTA label, empty error, invalid URL error, and success/result copy.
- Desktop banner state keeps the pasted URL, current validation error, guideline-dialog visibility, result-dialog visibility, and result href.
- `getDesktopShellHorizontalPadding` stores the responsive desktop header/subnav padding contract so desktop shell geometry can match both 1440px and wider centered viewports.
- `getDesktopShellOffset` stores the centered-shell viewport offset for desktop pages that render full-bleed chrome inside a capped parent.

## Edge Cases

- Blank input shows the staging empty error and does not open the result dialog.
- Invalid URL shows the staging invalid-url error and does not open the result dialog.
- URLs without a scheme still normalize through the shared GoGoLink parser and show the source host in the result dialog.
- Info opens the GoGoLink guideline dialog; closing it returns to the home page without navigation.
- Mobile widths must not render the desktop banner.

## Testing Strategy

# Desktop Route Chrome Parity Spec

## Requirement

Every Expo web customer page must have the Next.js desktop shell on desktop widths: the shared GoGoCash navbar/category navigation at the top and the shared GoGoCash footer. Pages that already own a dedicated desktop public shell may keep that local shell, but they must include both header and footer. All other routes are covered by the root desktop route chrome. Mobile widths must keep the existing mobile-only shell and bottom navigation.

## Data and State

- `CustomerDesktopRouteChrome` wraps the Expo Router stack at desktop widths.
- `CustomerDesktopRouteChrome` renders `CustomerDesktopHeader` around route content for routes that do not own their own public shell.
- `CustomerDesktopFooterSlot` renders the shared desktop footer inside route-owned scroll content so long pages keep the footer reachable at the bottom instead of pinning it over the viewport.
- Capped desktop pages must pass a real footer breakout offset, not `horizontalPadding={0}`, when the footer is nested inside a centered cap.
- The self-owned desktop shell route list is exact and limited to `/`, `/login`, `/register`, `/account-setup`, `/privacy-policy`, `/link-mycashback`, and `/link-mycashback/my-cashback-sign-in`.

## Edge Cases

- Dynamic routes such as `/shop/[id]`, `/category/[name]`, and GoGoSense merchant detail are covered by the root shell.
- Auth, account setup, privacy policy, and MyCashback public pages keep their dedicated desktop layout but must render the shared footer.
- Mobile routes must not gain the desktop header or footer.
- Redirect-only routes remain covered during any visible intermediate render.

## Testing Strategy

- `desktop-shell-parity.test.ts`
  - `desktop route chrome > given every migrated customer route > then Expo guarantees a navbar and footer on desktop`
  - `desktop capped footer width > given content-capped pages > then the footer offsets back to the viewport edge`
  - `desktop brand logo > given navbar and footer brand links > then both use the shared navbar logo treatment`
  - R-tier: R2
  - Affected files: `apps/mobile/app/_layout.tsx`, `apps/mobile/src/components/CustomerDesktopRouteChrome.tsx`, `apps/mobile/src/screens/CustomerAuthScreen.tsx`, `CustomerAccountSetupScreen.tsx`, `CustomerPrivacyPolicyScreen.tsx`, `apps/mobile/src/__tests__/desktop-shell-parity.test.ts`, `spec.md`
  - Rollback: remove the root chrome wrapper and the three self-owned page footers, returning desktop shell ownership to route-specific screens.

- `home-design-parity.test.ts`
  - `home desktop GoGoLink parity > given desktop home > then renders the Next banner between hero and Top Brands`
- `design-parity.spec.ts`
  - `/ > given desktop Next shell parity > then header, category nav, GoGoLink, and cookie banner render and dismiss`
  - R-tier: R2
  - Affected files: `src/design/webDesignParity.ts`, `src/screens/CustomerHomeScreen.tsx`, `src/screens/CustomerGoLinkScreen.tsx`, `spec.md`
  - Rollback: remove `DesktopGoLinkBanner`, remove its e2e assertions, and restore desktop home to hero-to-Top-Brands order.

# Desktop Footer Parity Spec

## Requirement

Expo web home and desktop public routes must render the desktop Next.js footer at desktop widths. The footer should match the staging layout: white full-width footer band, centered desktop content, GoGoCash logo using the same visual treatment as the navbar logo, three link columns, Products-column Cloudflare trust mark, copyright row, social icon row, and risk disclaimer. The existing mobile bottom nav remains the only footer-style surface below the desktop breakpoint.

## Data and State

- `webDesktopFooter` stores the staging footer copy, sections, link URLs, social URLs, Cloudflare link, and disclaimer.
- The footer uses the current calendar year in the same copyright template as Next.js.
- `CustomerDesktopBrandLink` is the shared navbar/footer brand-link implementation.
- `CustomerDesktopFooter` separates the outer full-viewport footer band from the inner desktop content lane.
- Cloudflare uses the staging `/branding/cloudflare-logo.png` asset copied into Expo assets.

## Edge Cases

- Desktop footer must not render on mobile widths.
- Internal footer links stay as app links; external footer and social links open with external URL attributes on web.
- Footer white background must extend across the viewport instead of inheriting the gray page background, including when the footer is rendered inside a centered desktop content cap.
- Footer outer width must match the navbar outer width at the same viewport; footer inner content may remain centered and narrower.
- The Cloudflare mark must remain under the Products column, not in the bottom copyright/social row.
- Social links must expose accessible labels matching the Next footer: X, Discord, Telegram, Line, Threads, LinkedIn, GitHub, YouTube.

## Testing Strategy

- `web-design-parity.test.ts`
  - `desktop footer parity > given the Next footer contract > then Expo keeps the same sections links social and legal copy`
  - `desktop footer grid > given web Footer breakpoints > then columns and gap collapse responsively`
- `design-parity.spec.ts`
  - `/ > given desktop Next shell parity > then header, category nav, GoGoLink, footer, and cookie banner render and dismiss`
  - R-tier: R2
  - Affected files: `src/design/webDesignParity.ts`, `src/components/CustomerDesktopFooter.tsx`, `src/components/CustomerDesktopBrandLink.tsx`, `src/screens/CustomerHomeScreen.tsx`, `src/screens/CustomerAuthScreen.tsx`, `src/screens/CustomerCategoryDetailScreen.tsx`, `src/screens/CustomerDiscoveryScreen.tsx`, `assets/branding/cloudflare-logo.png`, `spec.md`
  - Rollback: remove `CustomerDesktopFooter`, remove footer constants and e2e assertions, and restore the home scroll content to end after promo sections.

# Desktop Auth Parity Spec

## Requirement

Expo `/login` and `/register` must match the Next.js desktop auth reference instead of rendering the temporary email/password form. Desktop should include the shared header/category nav, the `588x690` auth hero image, the `600x690` white form card, country selector, phone-number form, privacy checkbox, disabled/enabled CTA states, OTP state, and the desktop `4 + 3` social sign-in grid.

## Data and State

- `webAuthPage` stores Next.js auth copy, layout metrics, default Thailand country, social providers, OTP labels, and desktop dimensions.
- `CustomerAuthScreen` owns local UI state: selected country, phone digits, privacy accepted, auth phase, OTP input, OTP error, and resend timer text.
- `/login` and `/register` use the same screen with mode-specific title, phone label, social divider, and CTA copy.

## Edge Cases

- CTA remains disabled until privacy is accepted and at least 9 phone digits are entered.
- Changing number from the OTP phase returns to the phone-entry phase and clears OTP state.
- Desktop header/category nav must render at desktop widths; mobile keeps a compact single-column auth layout.
- Social provider buttons must expose accessible labels and retain the Next.js order: Facebook, Gmail, Telegram, Apple, X, Microsoft, Connect Wallet.
- The old `Email` and `Password` placeholder form must not render on the migrated auth screen.

## Testing Strategy

- `auth-design-parity.test.ts`
  - `auth desktop parity > given Next auth reference > then Expo keeps hero form social and OTP contract`
  - `auth behavior contract > given phone privacy and OTP flow > then state labels and CTA rules are present`
- `design-parity.spec.ts`
  - `/login > given desktop Next auth reference > then header hero phone form social grid and OTP flow render cleanly`
  - R-tier: R2
  - Affected files: `src/design/webDesignParity.ts`, `src/screens/CustomerAuthScreen.tsx`, `src/components/CustomerDesktopHeader.tsx`, `assets/auth-login-hero.png`, `spec.md`
  - Rollback: restore the previous email/password `CustomerAuthScreen`, remove auth constants/assets/tests, and route `/login` and `/register` back to the prior generic auth card.

# Web Metadata Icon And Sitemap Parity Spec

## Requirement

Expo web export must expose the same GoGoCash browser identity files as the Next.js customer app. The web root should serve `/favicon.ico`, PNG favicon sizes, Apple and Android PWA icons, `/site.webmanifest`, `/robots.txt`, and `/sitemap.xml`. The HTML template should link the favicon, manifest, theme color, and social metadata so browser tabs, bookmarks, crawlers, and install prompts see GoGoCash rather than Expo defaults.

The sitemap should use the app frontend URL as the canonical host and include localized `/en` and `/th` URLs for every migrated, non-dynamic customer route. Dynamic route placeholders such as `/shop/[id]` and `/category/[name]` must not leak into the public sitemap; concrete shop/category pages can be added once backed by production data.

## Data and State

- Next.js icon assets are copied from the staging `public/` metadata set.
- The Expo public HTML template uses Next's title, description, manifest path, icon paths, OpenGraph image, and Twitter card metadata.
- `sitemap.xml` uses the current Expo staging frontend host, `https://app-staging.gogocash.co`, by default. Production exports can regenerate it from `EXPO_PUBLIC_FRONTEND_URL`.

## Edge Cases

- `/favicon.ico` must be a real ICO file, not a PNG renamed to `.ico`.
- `site.webmanifest` must keep GoGoCash names, standalone display, white background, and green theme color.
- Localized home URLs must render as `/en` and `/th`, not `/en/` or `/th/`.
- Sitemap URLs must not contain route placeholders or unescaped ampersands.

## Testing Strategy

- `web-metadata-parity.test.ts`
  - `web metadata parity > given the Next.js browser identity contract > then Expo public files expose matching GoGoCash icons and manifest`
  - `web metadata parity > given the migrated route catalog > then sitemap exposes localized concrete customer URLs`
  - R-tier: R2
  - Affected files: `app.config.ts`, `package.json`, `scripts/generate-web-metadata.mjs`, `public/index.html`, `public/site.webmanifest`, `public/sitemap.xml`, `public/robots.txt`, `public/favicon.ico`, `src/__tests__/web-metadata-parity.test.ts`, `spec.md`
  - Rollback: remove the Expo `public/` metadata files, remove the web metadata script/package scripts, remove the `web` app-config metadata block, and delete the metadata parity test.

# Shops Directory Parity Spec

## Requirement

Expo `/shops` must match the staging `/shops` production contract instead of using the generic discovery placeholder. The first screen should expose the Promotion by Brands carousel asset, then the All Shops directory with T+7 tracking notice, category filtering, search, shop-type pills, sort pills, responsive merchant-logo grid, result count, and pagination.

## Data and State

- Shared parity data keeps staging copy for `Promotion by Brands`, `All Shops`, tracking notice, search placeholder, category labels, shop-type labels, and sort labels.
- Shop results are derived from the existing brand-card fixture and enriched with category, shop type, popularity, and added date metadata.
- Screen state:
  - `searchQuery`
  - `selectedCategory`
  - `selectedShopType`
  - `sortBy`
  - `currentPage`
- Filtering resets pagination to page 1.

## Edge Cases

- Empty search returns the full shop directory.
- Search matches brand, category, cashback, and shop type.
- Selecting a category or shop type with zero matches shows a useful empty state.
- Sorting must keep stable output for equal cashback values.
- Mobile uses horizontal category tabs and two-column merchant cards; desktop uses a fixed category aside and denser grid.

## Testing Strategy

- `shop-directory-parity.test.ts`
  - `shops directory parity > given staging All Shops copy > then Expo exposes the production directory contract`
  - `shops directory behavior > given search filters and sort options > then result ordering matches the web contract`
  - `shops directory layout > given mobile and desktop widths > then grid metrics match staging density`
  - `shops screen > given /shops route > then it renders the dedicated directory instead of the generic placeholder`
  - R-tier: R2
  - Affected files: `src/design/webDesignParity.ts`, `src/screens/CustomerDiscoveryScreen.tsx`, `assets/shop-promo-gogoquest.png`
  - Rollback: route `shops` back through `GenericDiscoveryScreen` and remove the shop directory fixture/helpers.

# Product Discovery Parity Spec

## Requirement

Expo `/discover` must match the staging Product Discovery page instead of rendering the generic discovery hero. The page should expose the staging title/subtitle, mobile category and cashback chips, desktop All Categories sidebar, search input, sort pills, results count, product card grid, Shop Now affordance, Learn more about T&C action, empty state, and pagination-ready result model.

## Data and State

- Shared parity data keeps staging copy for `Product Discovery`, `Find the best cashback deals by products.`, search labels, sort labels, category labels, cashback threshold labels, product count label, and empty state.
- Product results are derived from the existing shop/brand fixtures and enriched with category, price, discount, added date, popularity, and cashback metadata.
- Screen state:
  - `searchQuery`
  - `selectedCategory`
  - `selectedCashbackMin`
  - `sortBy`
  - `currentPage`
- Search/category/cashback changes reset pagination to page 1.

## Edge Cases

- Empty search returns the full product feed.
- Search matches product title, brand, category, price, and cashback.
- Mobile category and cashback filters scroll horizontally without creating page overflow.
- Desktop keeps the category sidebar at 280px and uses a denser 5-column grid at wide widths.
- Terms action opens and closes a modal with exit animation.

## Testing Strategy

- `product-discovery-parity.test.ts`
  - `product discovery parity > given staging discover copy > then Expo exposes the production product contract`
  - `product discovery behavior > given search category cashback and sort filters > then product results match staging logic`
  - `product discovery layout > given mobile and desktop widths > then grid metrics match staging density`
  - `product discovery screen > given /discover route > then it renders the dedicated page instead of the generic placeholder`
  - R-tier: R2
  - Affected files: `src/design/webDesignParity.ts`, `src/screens/CustomerDiscoveryScreen.tsx`
  - Rollback: route `discover` back through `GenericDiscoveryScreen` and remove the product discovery fixture/helpers.

# Category Index Parity Spec

## Requirement

Expo `/category` must match the staging category index rather than stopping at a partial directory scaffold. The page should expose the `Categories` title, folder marker, available-count copy, soft search panel, two-column mobile category cards, desktop grid density, production card colors/shadows, search filtering, empty state, and the staging pagination footer even when only one page is available.

## Data and State

- Shared parity data keeps staging copy for `Categories`, `5 categories available`, `Find a category`, `Category`, `Browse this collection`, empty-state copy, and pagination page size.
- Category cards stay in the staging order: Travel, Electronics, Beauty, Health & Beauty, Others.
- Screen state:
  - `searchQuery`
  - `currentPage`
- Search changes reset pagination to page 1.

## Edge Cases

- Empty search returns all categories.
- Search matches category titles case-insensitively.
- Empty search results show a useful empty state and preserve the pagination container.
- Mobile keeps two cards per row without horizontal overflow and enough bottom clearance for the floating bottom nav.
- Desktop uses a wider grid and hides the mobile bottom nav.

## Testing Strategy

- `category-index-parity.test.ts`
  - `category index parity > given web category directory contract > then Expo exposes title, count, search, pagination, and category cards`
  - `category index behavior > given search query and pagination > then matching category cards filter like web`
  - `category index layout > given mobile and desktop widths > then grid metrics match staging density`
  - `category index screen > given /category route > then it renders the web directory instead of the generic discovery placeholder`
  - R-tier: R2
  - Affected files: `src/design/webDesignParity.ts`, `src/screens/CustomerDiscoveryScreen.tsx`
  - Rollback: remove the category pagination/helpers and restore the prior category directory rendering.

# Brand Directory Parity Spec

## Requirement

Expo `/brand` must match the staging `/brand` production contract instead of rendering the generic discovery hero. The page should expose Promotion by Brands, All Brands copy, category filtering, search, sort pills, responsive 1:1 brand-logo cards, result count, pagination, and a useful empty state.

## Data and State

- Shared parity data keeps staging copy for `Promotion by Brands`, `All Brands`, `Discover every partner brand on GoGoCash...`, search placeholder, category labels, sort labels, result unit, and empty-state copy.
- Brand results are derived from the existing 30-card brand fixture and enriched with category, popularity, added date, and cashback metadata.
- Screen state:
  - `searchQuery`
  - `selectedCategory`
  - `sortBy`
  - `currentPage`
- Search/category changes reset pagination to page 1.

## Edge Cases

- Empty search returns the full brand directory.
- Search matches brand, category, cashback, and card badge label.
- Selecting a category with zero matches shows a useful empty state.
- Sorting must keep stable output for equal cashback values.
- Mobile uses horizontal category tabs and two-column brand-logo cards; desktop uses a fixed category aside and 6-column grid.

## Testing Strategy

- `brand-directory-parity.test.ts`
  - `brand directory parity > given staging All Brands copy > then Expo exposes the production brand directory contract`
  - `brand directory behavior > given search category and sort filters > then result ordering matches the web contract`
  - `brand directory layout > given mobile and desktop widths > then grid metrics match staging density`
  - `brand screen > given /brand route > then it renders the dedicated brand directory instead of the generic placeholder`
  - R-tier: R2
  - Affected files: `src/design/webDesignParity.ts`, `src/screens/CustomerDiscoveryScreen.tsx`, `spec.md`
  - Rollback: route `brand` back through `GenericDiscoveryScreen` and remove the brand directory fixture/helpers.

# Home Trending Brands Responsive Parity Spec

## Requirement

Expo home `Trending Brands` must match the staging compact brand-logo rail at the selected 455px mobile viewport. The first page should fit six compact cards as a stable 3-column by 2-row page, keep the horizontal pager clipped inside the padded content width, show the correct dot rail, and avoid visual right-side blank space caused by precision overflow.

## Data and State

- Shared layout metrics keep the Next compact brand-logo breakpoint contract: 3 columns below 480px, two rows per mobile page, 10px gaps, and 6 visible cards per page.
- The promo pager viewport is constrained to `homeLayout.contentWidth`, matching the snap interval and padded page content.
- The compact card width must be rounded down enough that `columns * cardWidth + gaps <= contentWidth` at real mobile browser widths such as 455px.

## Edge Cases

- 455px viewport must not wrap the first six Trending cards into 2 columns by 3 rows.
- Card captions may truncate text, but truncation must not resize cards or force another column wrap.
- Horizontal paging still advances by one content-width page and keeps dot state in sync.

## Testing Strategy

- `web-design-parity.test.ts`
  - `home responsive layout > given 455px mobile Trending Brands viewport > then compact promo cards fit three columns without precision overflow`
- `home-design-parity.test.ts`
  - `home design parity > given lower promo rail viewport > then the scroller is constrained to measured content width`
  - R-tier: R2
  - Affected files: `src/design/webDesignParity.ts`, `src/screens/CustomerHomeScreen.tsx`, `spec.md`
  - Rollback: restore rounded compact card metrics and the prior bare `promoScroll` style.

# Home Travel Rail And Hover-Out Motion Parity Spec

## Requirement

Expo home `Travel Deals are Here!` must use the same lower-rail geometry as the staging reference at the selected 455px mobile viewport: three compact logo cards per row, two rows per page, clipped horizontal paging, and the explicit four-dot rail. Shared buttons and cards must also animate back to their resting state when the pointer leaves instead of snapping after hover/press feedback.

## Data and State

- `webHomePromoSections.travel` remains the source for the selected section title, airplane icon, link, four-dot count, and travel logo/color dataset.
- Travel uses the shared compact promo metrics, so the first six cards fit inside `homeLayout.contentWidth` at 455px.
- Travel provides 24 category cards, which creates four reachable mobile pages and two reachable desktop pages with the staging 8-column desktop grid.
- `MotionPressable` keeps the same transform list on hover-in and hover-out by retaining a zero `translateY` rest value before scale.
- The home search popover remains mounted during dismissal and runs its opacity/translate exit animation before unmounting.

## Edge Cases

- Long names such as `Trailhead Outfitters` can truncate without resizing the card or changing the page grid.
- Hovering out of any shared button/card returns through the same transition properties as hover-in.
- Clicking outside the search popover dismisses it through the exit animation, not an immediate unmount.
- Disabled pressables do not apply hover lift.

## Testing Strategy

- `web-design-parity.test.ts`
  - `home responsive layout > given 455px mobile Travel Deals viewport > then compact promo cards fit the selected three-column page`
- `motion-interaction-parity.test.ts`
  - `hover feedback > given pointer leaves a shared pressable > then Expo keeps a stable hover-out transform`
  - `home interactions > given search popover is dismissed > then Expo runs exit animation before unmounting`
- `home-design-parity.test.ts`
  - `home design parity > given selected staging Travel Deals rail > then Travel data provides enough cards for every declared pagination dot`
  - R-tier: R2
  - Affected files: `src/design/webDesignParity.ts`, `src/theme/motion.ts`, `src/screens/CustomerHomeScreen.tsx`, `spec.md`
  - Rollback: restore the prior rest transform shape, seven-card Travel fixture, and immediate search-popover unmount.

# Home Makeup Rail Parity Spec

## Requirement

Expo home `Makeup Must Have!` must match the staging `Health & Beauty` lower rail. The selected 455px mobile viewport keeps the same first six compact logo cards and three-dot pager, while the backing data must provide three reachable mobile pages instead of decorative-only dots. Desktop should use the shared 8-column by 2-row compact grid and avoid showing a dead single-page pagination control.

## Data and State

- `webHomePromoSections.makeup` remains the source for the selected section title, lipstick icon, route, three-dot mobile count, and first six card visuals.
- The fixture mirrors the staging `GET /offer?category=Health & Beauty&limit=24` mock order: 13 Health & Beauty brands.
- Mobile pages use 6 cards per page, so 13 cards produce three reachable pages.
- Desktop pages use 16 cards per page, so 13 cards produce one page and no decorative dot rail.

## Edge Cases

- `Amber Apothecary` may use the text fallback visual without changing card dimensions.
- Long names such as `Luxe Lane Beauty` and `Amber Apothecary` may truncate without changing the grid.
- The View all link continues to target `/category/Health & Beauty`.

## Testing Strategy

- `web-design-parity.test.ts`
  - `home carousel dots > given Makeup Must Have responsive rail > then mobile and desktop dots map to reachable pages`
- `home-design-parity.test.ts`
  - `home design parity > given selected staging Makeup Must Have rail > then Health Beauty data mirrors category query order`
  - R-tier: R2
  - Affected files: `src/design/webDesignParity.ts`, `src/screens/CustomerHomeScreen.tsx`, `spec.md`
  - Rollback: restore the previous seven-card Makeup fixture and always-rendered promo dots.

# Shop Detail Cashback Tips Parity Spec

## Requirement

Expo shop detail `/shop/brand-grocery-galaxy-1001` must match the selected staging `Cashback Tips` surface. The right rail renders the deals empty state first, then a `Cashback Tips` header with the lightbulb icon, followed by the merchant tips illustration inside a rounded light-mint figure with a subtle border. The section must keep the same proportions on the selected 428px mobile viewport and scale up cleanly on desktop.

## Data and State

- `webShopDetailGroceryGalaxy.cashbackTips` stores the title, illustration asset key, source dimensions, and accessible alt text from staging.
- The illustration mirrors staging `/shop/merchant-cashback-tips-terms.svg`; Expo uses a bundled production-safe raster asset generated from that SVG so native and web render consistently.
- Mobile keeps the section in the right-rail order after `ShopDealsEmptyState`.
- Desktop keeps the right rail in the second column and suppresses any extra text/bullet fallback inside the selected tips figure.

## Edge Cases

- The tall illustration may extend below the viewport; only the top of the figure needs to be visible at first scroll position, with the rest reachable by normal vertical scroll.
- The bottom nav can overlay the very bottom of the tall section on mobile, but it must not cover the header or first illustration panel.
- Missing coupons still render the existing empty deals state before the tips section.

## Testing Strategy

- `shop-detail-parity.test.ts`
  - `shop detail parity > given selected staging Cashback Tips > then shared tips illustration contract matches`
  - `shop detail parity > given selected staging Cashback Tips > then Expo renders illustration card after deals`
  - R-tier: R2
  - Affected files: `src/design/webDesignParity.ts`, `src/screens/CustomerShopDetailScreen.tsx`, `assets/shop/merchant-cashback-tips-terms.png`, `spec.md`
  - Rollback: remove `ShopCashbackTips`, the bundled tips image, and the `cashbackTips` contract.

# Shop Detail GoGoQuest Banner Parity Spec

## Requirement

Expo shop detail `/shop/brand-grocery-galaxy-1001` must match the selected staging GoGoQuest banner above `Target Top Coupons and Deals`. The banner is a `/quest` link, clipped to a 24px rounded frame, using the English quest banner artwork at a fixed 16:9 ratio. It must not stretch to the image asset's intrinsic pixel height on web or desktop.

## Data and State

- `webShopDetailGroceryGalaxy.questBanner` stores the route, asset key, source dimensions, border radius, and gap before the deals heading.
- Staging renders `/quest/banner_en.png` with source dimensions `720x405`, `object-cover`, and `sizes="(min-width: 1024px) 720px, 100vw"`.
- Expo uses the bundled `quest-banner-en` asset and locks the clickable frame to `720 / 405`; the image fills that frame with cover behavior.

## Edge Cases

- Mobile 428px viewport should render a roughly `379x213` staging frame with a 56px gap to the deals heading; Expo may be wider because its shell is 428px, but the ratio must stay `1.778`.
- Desktop 1440px viewport should keep the right rail in the second column and render a 16:9 banner, not a 675px-tall intrinsic image.
- The link target remains `/quest` in Expo, locale-prefixed by staging only.

## Testing Strategy

- `shop-detail-parity.test.ts`
  - `shop detail parity > given selected staging GoGoQuest banner > then shared banner contract matches`
  - `shop detail parity > given selected staging GoGoQuest banner > then Expo locks the clickable image frame to 16:9 before deals`
  - R-tier: R2
  - Affected files: `src/design/webDesignParity.ts`, `src/screens/CustomerShopDetailScreen.tsx`, `src/__tests__/shop-detail-parity.test.ts`, `spec.md`
  - Rollback: remove the `questBanner` contract and restore the previous image-only banner style.

# Locale Panel URL Switch Review Spec

## Requirement

The desktop header language panel must switch between locale-prefixed routes without duplicating a stale or missing locale segment. A user on `/th/privacy-policy` who chooses English should land on `/en/privacy-policy`, even when the `NEXT_LOCALE` cookie is absent or stale.

## Data and State

- `useLocale()` remains the source of truth for the active route locale.
- `window.location.pathname` supplies the current path.
- The helper preserves paths that are not already prefixed with the active locale.

## Edge Cases

- `/th` switches to `/en`.
- `/th/privacy-policy` switches to `/en/privacy-policy`.
- `/privacy-policy` switches to `/en/privacy-policy` without dropping the path.
- Similar-looking path segments such as `/thailand` must not be trimmed as a locale prefix.

## Testing Strategy

- `LocalePanel.test.tsx`
- `locale switch href > given stale cookie and Thai route > then English URL replaces route locale once`
- `locale switch href > given unprefixed route > then target locale prefixes the path`
- `locale switch href > given similar path segment > then helper does not trim non-locale text`
- R-tier: R2
- Affected files: `src/components/layouts/LocalePanel.tsx`, `src/components/layouts/LocalePanel.test.tsx`, `spec.md`
- Rollback: restore the previous cookie-derived URL builder.

# GoGoLink Overlay Motion Lint Spec

## Requirement

The GoGoLink overlay motion hook must satisfy the React Compiler manual memoization rule without changing the open/close animation contract.

## Data and State

- `enterTranslateY` initializes the content translate animated value.
- `exitTranslateY` remains the target value for close motion.
- Overlay opacity and content translate values are still stable across renders unless their configuration changes.

## Edge Cases

- Home-sheet and route presentations keep their existing configured enter/exit offsets.
- Close animation still ignores repeated dismiss taps while closing.

## Testing Strategy

- `motion-interaction-parity.test.ts`
  - Existing close/hover motion assertions remain the behavior guard.
  - R-tier: R2
  - Affected files: `apps/mobile/src/screens/CustomerGoLinkScreen.tsx`, `spec.md`
  - Rollback: remove the `enterTranslateY` dependency and restore the prior memo call.

# Expo Typography Parity Spec

## Requirement

Expo must use the same production typography contract as Next.js: English UI text uses DM Sans, Thai-capable text can fall back to Anuphan, and text styles must not introduce negative letter spacing.

## Data and State

- Next loads `DM_Sans` and `Anuphan` in `src/lib/fonts.ts`.
- Next applies DM Sans to `body.locale-en` and Anuphan before DM Sans for `body.locale-th` in `src/app/globals.css`.
- Expo uses `typography.family` across customer screens and must load those font faces for web plus bundle the same families for native builds.

## Edge Cases

- Expo web must expose real `DM Sans` and `Anuphan` font faces, not only a CSS fallback list.
- iOS and Android production builds must include the DM Sans and Anuphan font files through the Expo font plugin.
- Existing screen-specific font sizes and weights should remain local parity decisions; this pass only fixes missing font faces and invalid negative tracking.

## Testing Strategy

- `typography-parity.test.ts`
  - `typography parity > given Next font contract > then Expo loads matching web and native font families`
  - `typography parity > given Expo text styles > then no text style uses negative letter spacing`
  - R-tier: R2
  - Affected files: `apps/mobile/public/index.html`, `apps/mobile/app.config.ts`, `apps/mobile/src/providers/AppProviders.tsx`, `apps/mobile/src/theme/tokens.ts`, `apps/mobile/src/__tests__/typography-parity.test.ts`, `apps/mobile/package.json`, `apps/mobile/package-lock.json`, `spec.md`
  - Rollback: remove the Expo Google font packages/configuration and restore the prior font stack and letter spacing values.

# Expo Security Pentest Checklist Spec

## Requirement

Create a repo-grounded security and pentest checklist for the Expo app based on the current Next.js customer app controls. The checklist must make the remaining production risks explicit, especially protected route enforcement, auth callback token handoff, SecureStore/logout behavior, account-data IDOR, Stripe/billing enablement, wallet/withdraw abuse cases, PDPA/privacy flows, GoGoSense native permissions, telemetry PII leakage, secrets, and EAS/store release controls.

## Data and State

- Next.js auth reference: `src/lib/authFirebase.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/components/auth/AuthGuard.tsx`, and `src/lib/axios/**`.
- Next.js billing/privacy reference: `src/app/api/stripe/**`, `src/app/api/webhooks/stripe/**`, `src/lib/stripe/**`, `src/app/api/pdpa/**`, and `src/lib/pdpa/**`.
- Expo audit target: `apps/mobile/src/auth/session.ts`, `apps/mobile/src/api/client.ts`, `apps/mobile/src/navigation/routes.ts`, `apps/mobile/src/screens/**`, `apps/mobile/src/billing/api.ts`, `apps/mobile/src/gogosense/api.ts`, `apps/mobile/app.config.ts`, `apps/mobile/eas.json`, and `apps/mobile/.env.example`.
- Current Expo status: visual route migration is mostly complete, but route guards, real authenticated backend data, device/EAS proof, and production telemetry/privacy proof remain blockers.

## Edge Cases

- Auth callback links must not persist long-lived raw bearer tokens from URLs in production.
- A protected route catalog entry is not sufficient unless rendering and data fetching are blocked without a valid session.
- Demo fixtures must not be treated as production-safe for profile, wallet, referral, billing, withdraw, or account-specific data.
- Billing buttons must remain disabled until backend ownership, server-side price selection, and Stripe webhook idempotency are proven.
- GoGoSense permission flows must account for sensitive notification, URL, package, and OCR data.

## Testing Strategy

- Documentation artifact: `apps/mobile/docs/security-pentest-checklist.md`
- Executable security suite: `apps/mobile/src/__tests__/security-pentest.test.ts`
- Executable frontend flow suite: `apps/mobile/src/__tests__/frontend-user-flow-parity.test.ts`
- Run commands: `npm run mobile:test:flows` for frontend/user-flow parity, `npm run mobile:test:security` for the pentest suite, or `npm run mobile:test:full` for mobile unit tests, typecheck, and web export.
- Frontend flow coverage requires every route to have a named customer journey, expected screen/mode handoff, visible landmarks, primary next-step navigation, matching auth posture, and no generic placeholder shell for Next-derived routes.
- Implemented frontend flow tests:
  - `GoGoSense frontend parity > given native detector scope > then dedicated onboarding permissions timeline settings recovery and merchant flows replace placeholders`
  - `frontend browser flow QA > given customer flow coverage > then rendered smoke tests include every GoGoSense native route and critical Next-derived flows`
- Proposed future tests:
  - `frontend browser flow QA > given every non-P0 customer route > then run desktop and mobile interaction smoke against clean Next.js reference screenshots`
  - `auth callback security > given replayed token handoff > then second use is rejected`
  - `protected route guard > given no secure session > then account routes redirect before rendering`
  - `logout security > given a stored session > then logout clears SecureStore and cached user data`
  - `billing api > given tampered plan/customer fields > then backend ignores client-controlled values`
  - `pdpa data export > given another user's id > then response does not disclose data`
  - `bundle scan > given production web/native export > then no server-only secrets or mock user data appear`
  - R-tier: R0 for production launch gating; this docs-only change is R2.
  - Affected files: `apps/mobile/docs/security-pentest-checklist.md`, `apps/mobile/src/__tests__/security-pentest.test.ts`, `apps/mobile/src/__tests__/frontend-user-flow-parity.test.ts`, `apps/mobile/package.json`, `package.json`, `spec.md`
  - Rollback: delete the checklist document and security/flow test files, remove the package scripts, and remove this spec section.
