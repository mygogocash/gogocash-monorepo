# GoGoCash Customer Design Handbook

This handbook documents the current Next.js customer experience so the Expo
customer app can be updated against a concrete parity target. It is intentionally
implementation-facing: every section lists visual rules, customer flows,
interaction states, and source files that should be checked before changing Expo.

Primary reference targets:

- Next.js reference app: `http://localhost:3001/en`
- Expo app under migration: `http://localhost:19006`
- Next.js source root: `src/`
- Expo source root: `apps/mobile/`

## 1. Purpose

The goal is to make the Expo customer app match the existing customer-facing
Next.js app across:

- Web at `app.gogocash.co`
- iOS through EAS
- Android through EAS

Landing and admin remain Next.js. Customer web, iOS, and Android should share
the Expo codebase. This document is the parity handbook for that migration.

Use this document when:

- porting a screen from Next.js to Expo,
- reviewing a visual mismatch,
- adding interaction and animation parity,
- building route parity tests,
- comparing desktop and mobile behavior,
- preparing GoGoSense surfaces to sit inside the customer shell.

## 2. Source Inventory

| Area               | Next.js source                                                           | Expo target/source                                                    | Notes                                                                  |
| ------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| App shell          | `src/components/layouts/ClientLayoutWrapper.tsx`                         | `apps/mobile/app/_layout.tsx`, app shell components                   | Header, subheader, footer, mobile nav, consent, GoLink sheet provider. |
| Global tokens      | `src/app/globals.css`                                                    | `apps/mobile/src/theme/`, `apps/mobile/src/design/webDesignParity.ts` | Colors, radii, shadows, motion, typography.                            |
| Home               | `src/app/[locale]/PageClient.tsx`, `src/features/home/*`                 | `apps/mobile/src/features/customer/screens/CustomerHomeScreen.tsx`    | The most important parity page.                                        |
| Search             | `src/features/home/components/SearchShop.tsx`                            | Expo home search components                                           | Popper/sheet behavior must match.                                      |
| GoLink             | `src/features/golink/*`, `src/features/home/components/GoLinkBanner.tsx` | `CustomerGoLinkScreen.tsx`, modal/sheet on home                       | Paste, validation, result, terms.                                      |
| Cards/carousels    | `src/features/home/common/*`                                             | Expo brand card components                                            | Card sizing, pagination, hover, horizontal scroll.                     |
| Brand/shop listing | `src/features/brand/*`, `src/features/shop/*`                            | Expo route screens for `/brand`, `/shops`, categories                 | Filters, sort, search, grid.                                           |
| Shop detail        | `src/features/shopDetail/*`                                              | Expo `/shop/[id]`                                                     | Cashback activation and favorite states.                               |
| Quest              | `src/features/quest/*`                                                   | `CustomerQuestScreen.tsx`                                             | Tabs, leaderboard, tasks, mobile bottom-nav state.                     |
| Wallet             | `src/features/wallet/*`                                                  | `CustomerWalletScreen.tsx`                                            | Support card, summary cards, withdraw paths.                           |
| Profile            | `src/features/profile/*`, `src/components/layouts/SubProfile.tsx`        | `CustomerProfileScreen.tsx` and profile routes                        | Wallet summary, menu, subpages.                                        |
| Profile subpages   | `src/features/profile/layout/SubPage.tsx`                                | Expo profile subpage shell                                            | Back rows, desktop sidebar, content card.                              |
| Auth               | `src/features/auth/*`, auth routes under `src/app/[locale]`              | Expo login/register/callback/account setup                            | Firebase, social, account setup, phone.                                |
| Membership         | `src/features/membership/*`, `src/features/subscription/*`               | Expo pricing/membership/subscription/billing                          | Pricing cards, checkout, billing portal.                               |
| Privacy/PDPA       | `src/features/pdpa/*`, consent banner                                    | Expo privacy center, age verification, consent                        | PDPA export/delete, consent states.                                    |

## 3. Global Design System

### 3.1 Brand Colors

Source: `src/app/globals.css`.

Use these as the visual baseline in Expo:

- App background: `#f6f6f6`
- Text default: `#3b3b3b`
- Surface: `#ffffff`
- Primary mint: `#00cc99`
- Primary strong: `#00aa80`
- Primary soft: `#d8f8ef`
- Accent dark green: `#005d46`
- Accent soft green: `#007d5e`
- Muted text: `#7f7f7f`
- Soft text: `#989898`
- Border: `#e4e4e4`
- Strong border: `#d8e2d9`
- Mint border: `#b7e7db`
- Danger: `#cd0d0d`

Expo should not drift into a different green palette. When matching a Next.js
screen, sample the exact element colors from the reference when possible.

### 3.2 Typography

Source: `src/app/[locale]/layout.tsx` and `src/app/globals.css`.

- English uses DM Sans.
- Thai uses Anuphan first, then DM Sans.
- Body text is generally medium weight, rounded, and soft.
- Section titles use dark green, bold weight, tight vertical rhythm.
- Do not use negative letter spacing in Expo.
- Do not scale font size with viewport width. Use screen-size-specific values
  and responsive layout constraints.

Common text hierarchy:

- Home section title: very bold, dark green, mobile around 32-36px visual size,
  desktop larger but still inside the app content width.
- Card title: semi-bold, dark slate/green, one or two lines depending on card.
- Cashback label: muted grey and smaller than merchant name.
- Cashback percent: primary strong green, bold, aligned to bottom/right.
- CTA button text: white on mint, bold enough for mobile.

### 3.3 Surfaces, Shadows, Radii

Source: `src/app/globals.css`.

Core styles:

- `gc-surface-card`: white surface, 1px border, 16px radius, soft shadow.
- `gc-soft-panel`: soft blue/mint panel, rounded 24px, light mint border.
- `gc-pill`: white pill, 1px border, rounded 999px, soft shadow.
- Small card radius: 16px.
- Larger marketing/card panel radius: 24px.
- GoLink modal/sheet radius: 24-32px depending surface.
- Mobile bottom nav radius: 28px.

Shadows:

- Soft hover/card shadow: `0 4px 10px rgba(0, 0, 0, 0.1)`.
- Standard app shadow: `0 4px 16px rgba(0, 0, 0, 0.05)`.
- Bottom nav and floating actions use a wider shadow plus mint glow.

### 3.4 Spacing and Width

Global:

- Content max width: 1200px on the Next.js desktop app.
- Expo Web customer shell should stay mobile-app styled and capped on wide
  desktop, but desktop parity views should still look intentional and centered.
- Mobile screen horizontal padding: usually 16-24px.
- Home mobile section gaps are generous, with cards almost full-width or 2/3
  columns depending section.
- Mobile bottom nav clearance: 108px plus safe-area bottom.

Expo design constants already codified:

- `apps/mobile/src/design/webDesignParity.ts`
- `mobileShellLayout.contentMaxWidth = 760`
- `mobileShellLayout.desktopBreakpoint = 1024`
- `mobileShellLayout.desktopContentMaxWidth = 1024`
- `mobileShellLayout.bottomNavMaxWidth = 448`
- `mobileShellLayout.bottomNavClearance = 108`

### 3.5 Motion

Source: `src/app/globals.css`, plus observed Next.js hover/press behavior.

Motion variables:

- Fast: 140ms
- Base: 220ms
- Emphasis: 320ms
- Stagger step: 50ms
- Standard easing: cubic ease similar to `cubic-bezier(0.4, 0, 0.2, 1)`
- Out easing: similar to `cubic-bezier(0, 0, 0.2, 1)`
- Spring easing for emphasis: overshoot but not playful

Expected interactions:

- Card hover: translate up about 1-2px, shadow strengthens.
- Card active/press: slight scale down or returns closer to base.
- CTA hover: darker mint and stronger shadow.
- CTA active: scale around 0.99.
- Icon buttons: subtle color/background change, no heavy bounce.
- Bottom nav tab: active pill/background fades in; center wallet has steady glow.
- Search popper/sheet: fades and slides in, no abrupt jump.
- Profile accordion: chevron rotates and subnav expands over about 280-300ms.
- Quest score pulse is allowed for reward/score only.

Reduced motion:

- Disable nonessential transform/animation.
- Keep state changes visible through color, border, or opacity.

Expo implementation:

- Reuse `apps/mobile/src/theme/motion.ts`.
- Reuse `apps/mobile/src/components/MotionPressable.tsx`.
- Do not add ad hoc hover/press constants per screen unless the value is first
  added to shared motion/design tokens.

### 3.6 Focus, Accessibility, Keyboard

Next.js has keyboard behavior in tabs/search and accessible link/button roles.
Expo Web should match:

- Focus rings must be visible on interactive elements.
- Search opens on focus, not only click.
- Search popper closes on outside click.
- Quest tablist supports ArrowRight/ArrowDown, ArrowLeft/ArrowUp, Home, End.
- Links that navigate must be real links on web where practical.
- Buttons that open sheets/modals must expose pressed/expanded state when possible.
- Touch targets should be at least 44px.

## 4. Application Shell

Source: `src/components/layouts/ClientLayoutWrapper.tsx`.

The customer app shell includes:

- `GolinkMobileSheetProvider`
- `NavigationLoadingProvider`
- Desktop `Header`
- Desktop `SubHeader`
- Main content area
- Desktop `Footer`
- Mobile `FooterMobile`
- `LineOfficialFab`
- Consent banner trigger and consent banner

The Expo shell should preserve those responsibilities even if the component
names differ.

### 4.1 Desktop Header

Source: `src/components/layouts/Header.tsx`.

Desktop-only header:

- Hidden on mobile.
- Sticky at top.
- Logo on the left.
- Header search appears for authenticated sessions.
- Quest pill near the right.
- Profile bar when authenticated, Sign in when unauthenticated.
- Locale switch/panel on the far right.
- Height visually around 72-80px.
- Header should not overlap page content.

States:

- Unauthenticated: show Sign in.
- Authenticated: show profile/avatar controls and search.
- Locale selection: current language visible, panel/dropdown opens on click.
- Loading navigation: shell can show navigation loading state through provider.

### 4.2 Desktop SubHeader

Source: `src/components/layouts/SubHeader.tsx`.

Desktop category navigation:

- Sticky below header.
- About 56px high.
- Horizontal centered nav.
- Tabs include icons and labels such as Top Brands, All Brands, All Shops,
  Product Discovery, Travel, Electronics, Health & Beauty.
- Active item has mint underline.
- Hover reveals underline with opacity/transition.
- Fire icon appears for Top Brands.

Mobile does not use this desktop subheader; it uses home shortcut pills.

### 4.3 Desktop Footer

Source: `src/components/layouts/Footer.tsx`.

Desktop-only footer:

- Hidden on mobile.
- White background spans the full viewport, matching the desktop navbar outer width.
- Inner content remains centered in the desktop shell lane.
- The GoGoCash brand link uses the same logo mark/text treatment as the navbar.
- Footer columns include Live on Platform, Products, and Resources.
- Cloudflare trust mark stays under Products.
- Copyright, social links, and legal disclaimer remain in the lower footer row.

Implementation rule for Expo Web: if a page renders the footer inside a centered
desktop content cap, pass the cap's centered viewport offset into the footer so
the white band breaks out to viewport `x=0` without increasing page
`scrollWidth`.

### 4.4 Mobile Bottom Navigation

Source: `src/components/layouts/FooterMobile.tsx`.

Mobile bottom nav:

- Fixed bottom.
- Centered max width, with safe-area bottom.
- White/90 translucent surface.
- Backdrop blur.
- Rounded 28px.
- Strong shadow.
- Items:
  - Home
  - GoGoLink
  - Wallet
  - Quest
  - Profile
- Wallet is the center elevated action:
  - 64px circle
  - Mint fill
  - 8px mint/soft border
  - Glow/shadow
  - Larger icon
- Active side item uses mint-tinted rounded tile.
- Inactive item uses grey icon/text.
- Profile shows avatar when signed in.

Behavior:

- Home goes to `/`.
- GoGoLink opens mobile sheet from most pages instead of navigating, unless
  already on `/golink`.
- Wallet goes to `/wallet`.
- Quest goes to `/quest`.
- Profile unauthenticated redirects to `/login`.
- Active state must match current route.
- Content must reserve bottom clearance so cards are not hidden.

### 4.5 Floating Buttons

Source shell includes `LineOfficialFab` and environment/tooling can add a Next
marker. Expo should match product-visible buttons:

- LINE official floating button near bottom-right above nav.
- It should not overlap critical nav labels.
- It should preserve safe area on mobile.
- It should be hidden or repositioned when modal/sheet is open if needed.

### 4.6 Consent Banner

Consent components render globally in Next.js. Expo should include:

- Initial consent banner.
- Internal trigger.
- Accept/manage states.
- PDPA copy and links.
- No blocking of core navigation after user choice.

## 5. Route Ownership Matrix

The current route catalog should be treated as the customer route parity set.

| Route                                  | Next.js source                      | Expo target         | Design notes                                     |
| -------------------------------------- | ----------------------------------- | ------------------- | ------------------------------------------------ |
| `/`                                    | `src/app/[locale]/PageClient.tsx`   | home screen         | Highest priority. Match mobile and desktop home. |
| `/discover`                            | `src/app/[locale]/discover`         | discover screen     | Product discovery filters/grid/cards.            |
| `/brand`                               | `src/app/[locale]/brand`            | brand listing       | Promo hero + brand grid/list filters.            |
| `/shops`                               | `src/app/[locale]/shops`            | shops listing       | Shop filters and sort.                           |
| `/shop/[id]`                           | `src/app/[locale]/shop/[id]`        | shop detail         | Cashback activation flow.                        |
| `/category`                            | `src/app/[locale]/category`         | category listing    | Category grid/list.                              |
| `/category/[name]`                     | `src/app/[locale]/category/[name]`  | category detail     | Category filtered offers.                        |
| `/quest`                               | `src/app/[locale]/quest`            | quest screen        | Tabs, tasks, leaderboard, bottom nav active.     |
| `/golink`                              | `src/app/[locale]/golink`           | GoLink screen/sheet | Paste validation, result dialog.                 |
| `/privacy-policy`                      | `src/app/[locale]/privacy-policy`   | privacy route       | Public legal content.                            |
| `/login`                               | `src/app/[locale]/login`            | login               | Firebase/social/session states.                  |
| `/register`                            | `src/app/[locale]/register`         | register            | Shares auth component behavior.                  |
| `/auth/callback`                       | `src/app/[locale]/auth/callback`    | auth callback       | Session exchange/loading/error.                  |
| `/account-setup`                       | `src/app/[locale]/account-setup`    | account setup       | Onboarding fields and validation.                |
| `/link-mycashback`                     | `src/app/[locale]/link-mycashback`  | account/link route  | MyCashback linking.                              |
| `/link-mycashback/my-cashback-sign-in` | nested route                        | sign-in/link route  | MyCashback sign-in flow.                         |
| `/profile`                             | `src/app/[locale]/profile`          | profile hub         | Summary card and menu.                           |
| `/wallet`                              | `src/app/[locale]/wallet`           | wallet              | Support card and summary metrics.                |
| `/withdraw`                            | `src/app/[locale]/withdraw`         | withdraw            | Method/KYC/withdraw state.                       |
| `/method`                              | `src/app/[locale]/method`           | methods             | Withdraw methods.                                |
| `/method/create`                       | route target                        | create method       | Form validation.                                 |
| `/favorite`                            | `src/app/[locale]/favorite`         | favorites           | Favorite brands/shops.                           |
| `/referral`                            | `src/app/[locale]/referral`         | referral            | Invite/copy link.                                |
| `/membership`                          | `src/app/[locale]/membership`       | membership          | GoGoPass state.                                  |
| `/pricing`                             | `src/app/[locale]/pricing`          | pricing             | Pricing cards and FAQ.                           |
| `/billing`                             | `src/app/[locale]/billing`          | billing             | Stripe billing portal handoff.                   |
| `/subscription`                        | `src/app/[locale]/subscription`     | subscription        | Plan/status/cancel states.                       |
| `/missing-orders`                      | `src/app/[locale]/missing-orders`   | missing orders      | Support/recovery path.                           |
| `/age-verification`                    | `src/app/[locale]/age-verification` | age verification    | PDPA age flow.                                   |
| `/privacy-center`                      | `src/app/[locale]/privacy-center`   | privacy center      | Consent/data rights.                             |
| `/credit-score`                        | `src/app/[locale]/credit-score`     | credit score        | Profile subpage.                                 |
| `/language`                            | `src/app/[locale]/language`         | language            | Locale settings.                                 |

Expo should keep web URLs compatible where practical. Routes that cannot be
fully implemented yet should still render the correct shell, loading/error
states, and navigation ownership rather than placeholder parity screens.

## 6. Customer Journeys

### 6.1 Browse to Cashback Activation

Expected flow:

1. User opens home.
2. User browses banners, brand sections, category sections, or search.
3. User opens a shop detail.
4. User sees cashback rate, campaign/terms, and merchant identity.
5. User taps Shop Now / activation CTA.
6. App generates or reuses tracking/deeplink.
7. App shows transition/loading state.
8. App opens merchant tracking URL.
9. If deeplink fails, show error toast/state and keep user on page.

Required states:

- Loading merchant detail skeleton.
- Favorite loading/success/error.
- Deeplink loading.
- Deeplink success redirect state.
- Deeplink failure toast.
- Terms/condition disclosure.
- Related offers.
- Auth-required redirect if activation requires session.

### 6.2 Home Search Journey

Expected flow:

1. User focuses or taps search.
2. Search input gets mint active border.
3. Popper/sheet opens.
4. Empty input shows "Popular right now" intro and five popular rows.
5. Typing query debounces search.
6. Results show up to five matching rows.
7. Empty results show no-match state and trending fallback.
8. User taps row or Shop Now.
9. App navigates to the shop detail or activation path.
10. Outside click/back closes search.

Required states:

- Idle closed.
- Focus open.
- Query loading.
- Results.
- Empty results.
- Trending fallback.
- Error fallback.
- Keyboard focus and escape/back behavior on web/native.

### 6.3 GoLink Journey

Expected flow:

1. User opens GoLink from bottom nav, home banner, or `/golink`.
2. User sees illustration, title, info icon, input, and "Paste and Go".
3. User can paste a product/shop link or tap CTA with empty input.
4. If input is empty, app attempts clipboard read where allowed.
5. Empty after clipboard shows empty-link toast/state.
6. Invalid URL shows invalid-link toast/state.
7. Valid URL opens result state/dialog.
8. Result shows detected destination, terms, and Shop Now.
9. Shop Now opens generated/handled link.

Required states:

- Mobile bottom sheet.
- Desktop full feature card.
- Guidelines/info state.
- Input focus.
- Clipboard denied.
- Empty value.
- Invalid URL.
- Valid result.
- Terms open/closed.
- Loading activation/deeplink.
- Error and retry.

### 6.4 Quest Journey

Expected flow:

1. User opens Quest from bottom nav.
2. User sees hero banner: "Shop & Get Bonus" and prize pool.
3. Mobile user sees tabs: How to win, Tasks, Leaderboard.
4. How to win shows tips card and leaderboard content depending selected tab.
5. Tasks shows task list with points.
6. Leaderboard shows ranking and GoGoQuest history link.
7. User can tap eligible shop tasks to navigate to shop.

Required states:

- Quest loading.
- Quest API error.
- No open quest.
- Tabs active/keyboard.
- Task list.
- Leaderboard list.
- My rank.
- History link.
- Bottom nav active Quest.

### 6.5 Wallet Journey

Expected flow:

1. User opens Wallet from bottom nav/profile.
2. User sees "My Wallet" header and back behavior on mobile.
3. User sees support card for missing cashback with LINE contact.
4. User sees Cashback Summary.
5. User sees Total Cashback, Pending Cashback, Withdrawn or related metrics.
6. User can proceed to withdraw where eligible.
7. If KYC/method/session blocks withdrawal, app shows clear next step.

Required states:

- Loading wallet.
- Error loading wallet.
- Empty wallet.
- Support contact.
- Withdraw available.
- Withdraw disabled/ineligible.
- KYC/method missing.
- Bottom nav active Wallet.

### 6.6 Profile Journey

Expected flow:

1. User opens Profile.
2. User sees account wallet summary card.
3. User sees profile hub menu.
4. User can expand Profile section and open subpages.
5. User can copy invite/referral link.
6. User can open wallet, GoGoPass, missing orders, favorites, quest history,
   age verification, consent preferences, privacy/legal/help/connect.

Required states:

- Authenticated profile.
- Unauthenticated redirect/login state.
- Copy link success.
- External link open.
- Active profile subpage state.
- Desktop two-column profile subpage.
- Mobile back row.

### 6.7 Auth and Onboarding Journey

Expected flow:

1. User chooses login/register.
2. User uses email/social/Firebase-related sign-in path.
3. App shows loading and validation states.
4. Callback exchanges session.
5. New users complete account setup.
6. User may link MyCashback or phone depending flow.
7. Authenticated session is available to customer app.

Required states:

- Login/register mode.
- Input validation.
- Provider loading.
- Callback loading.
- Callback failure.
- New user account setup.
- Existing user redirect.
- Token/session persistence.
- Unauthorized route redirects.

### 6.8 Membership and Billing Journey

Expected flow:

1. User opens pricing/membership/subscription.
2. User sees plan cards and benefits.
3. User chooses plan.
4. App creates checkout session through backend.
5. User returns from Stripe.
6. Subscription/billing pages show current status.
7. User can open billing portal where available.

Required states:

- Plans loading.
- Pricing card hover.
- FAQ accordion.
- Checkout loading.
- Checkout error.
- Current plan.
- Cancelled/past due/active.
- Billing portal loading/error.

### 6.9 Privacy, PDPA, Age Verification

Expected flow:

1. User sees consent banner or opens privacy center.
2. User can manage consent preferences.
3. User can request export/delete where supported.
4. User can complete age verification if required.
5. User can open privacy policy/legal pages.

Required states:

- Consent unset.
- Consent accepted.
- Manage consent.
- Data request loading/submitted/error.
- Age verification incomplete/complete/error.
- Legal pages readable on mobile.

### 6.10 Future GoGoSense Entry

GoGoSense should sit inside this same customer shell:

- Entry from Profile/settings and possibly Home.
- Android-only permissions must not show as actionable on iOS/web.
- Bottom nav should remain stable.
- GoGoSense detection/activation should not imply guaranteed tracking unless the
  tracking link was opened.
- Timeline/recovery pages should reuse wallet/profile card language and states.

## 7. Home Page Specification

Sources:

- `src/app/[locale]/PageClient.tsx`
- `src/features/home/components/Banner.tsx`
- `src/features/home/components/MobileBrowseShortcuts.tsx`
- `src/features/home/components/Extra.tsx`
- `src/features/home/components/Trending.tsx`
- `src/features/home/components/CategoryHome.tsx`
- `src/features/home/common/HomeSectionHeader.tsx`
- `src/features/home/common/CardSlideCategory.tsx`
- `apps/mobile/src/design/webDesignParity.ts`

### 7.1 Section Order

Current mobile/Expo parity order:

1. Sticky/mobile search
2. Browse shortcut pills
3. Hero banner grid
4. GoLink banner/sheet entry
5. Top Brands
6. Trending Brands
7. Travel Deals are Here
8. Makeup Must Have

Next.js currently hides the old Popular section on the home page. Do not add it
back unless product asks for it.

### 7.2 Sticky Search

Mobile home search:

- Top area, full width with side padding.
- Rounded pill with mint border.
- Search icon inside mint-tinted circle.
- Placeholder: `Search brands, stores, products, or cashback offers`.
- Active state: stronger mint border.
- Opening search should not shift the entire page unexpectedly.

Desktop home may use header search depending auth/session; Expo Web should
remain app-style but must not look broken on desktop.

### 7.3 Browse Shortcuts

Source: `MobileBrowseShortcuts.tsx`.

Mobile-only horizontal scroll pills:

- All Brands
- All Shops
- Product Discovery
- Categories

Style:

- White pill.
- Soft shadow.
- Border.
- Mint icon.
- Text semi-bold.
- Horizontal scroll with no ugly scrollbar.
- Press/hover lift matches `gc-hover-lift`.

### 7.4 Hero Banner

Source: `Banner.tsx`.

Layout:

- Mobile:
  - Main large banner first.
  - Two secondary banners in a 2-column row below.
  - Rounded corners.
  - Right arrow circular button on each visible banner.
- Desktop:
  - Main banner on left.
  - Two stacked side banners on right.
  - Container centered.

Behavior:

- Uses Swiper.
- Autoplay delay around 3000ms.
- Pagination dots for main banner.
- Mousewheel force-to-axis and release-on-edges.
- Banners are clickable links.
- Images have gradient overlay.
- Arrows are white circular buttons with green chevron.
- Hover lifts and shadow strengthens slightly.

Visual requirements:

- Main banner aspect ratio around 800x450.
- Side banners crop consistently; do not stretch.
- Text inside images is image content, not app text.
- On mobile, main banner should not be squeezed by desktop layout.

### 7.5 Home Section Header

Source: `HomeSectionHeader.tsx`.

Layout:

- Horizontal row.
- Left: title.
- Next to title: icon slot if present.
- Right: `View all ->`.
- Header height stable around 56px.
- Titles are large, dark green, bold.
- View all is mint, medium weight.

Important section titles:

- `Top Brands` plus fire icon.
- `Trending Brands`.
- `Travel Deals are Here!` plus airplane icon.
- `Makeup Must Have!` plus lipstick icon.

Mobile wrapping:

- Long titles such as Travel and Makeup can wrap to two lines.
- Icon remains aligned near title area.
- View all stays right aligned.
- Header must not overlap the card grid.

### 7.6 Top Brands

Source: `Extra.tsx`.

Content:

- Uses `CardSlideCategory`.
- Variant: `brandLogo`.
- Paginated carousel.
- First mobile view shows 2 columns x 2 rows.
- Desktop/tablet can show more columns.
- Items include:
  - Grocery Galaxy 12.5%
  - Pocket Pantry 10.0%
  - Orbit Airways 8.5%
  - PixelPort 6.5%
  - Glow Theory 14.0%
  - Bloom & Beam 15.0%

Interaction:

- Section should horizontally paginate/scroll like Next.js Swiper, not become a
  single static vertical grid.
- Pagination dots appear below cards.
- Card hover/press lift.
- Heart button is independently clickable.
- Grab Coupon badge appears on eligible cards.

### 7.7 Trending Brands

Source: `Trending.tsx`.

Content:

- Variant: `brandLogoBadge`.
- Mobile shows compact 3-column x 2-row page.
- Desktop shows more compact columns.
- Uses pagination dots.
- Same cards as curated/trending list.

Interaction:

- Horizontal page scroll/pagination must work.
- Cards are smaller than Top Brands.
- Text truncates inside card without breaking layout.
- Cashback label can ellipsize.

### 7.8 Travel Deals are Here

Source: `CategoryHome.tsx`.

Header:

- Title: `Travel Deals are Here!`
- Airplane icon.
- View all link.

Cards:

- Orbit Airways 8.5%
- Nova Travel Club 9.2%
- Horizon Escapes 8.8%
- CloudNine Travel 10.3%
- StayMint Hotels 11.4%
- Trailhead Outfitters 9.6%

Layout:

- Compact brand-logo-badge carousel.
- Mobile 3 columns x 2 rows.
- Horizontal pagination.
- Cards keep square image/logo top.

### 7.9 Makeup Must Have

Source: `CategoryHome.tsx`.

Header:

- Title: `Makeup Must Have!`
- Lipstick icon.
- View all link.

Cards:

- Bloom & Beam 15.0%
- Mint Mirror 16.5%
- Pure Ritual 18.0%
- Luxe Lane Beauty 17.2%
- Amber Apothecary 14.4%
- Pearl Polish 17.8%

Layout:

- Same compact carousel behavior as Travel.
- Cards may include image/logo fallback states; missing image must not collapse.

### 7.10 Home Loading and Error States

Next.js dynamically imports several home sections and shows skeletons:

- Banner skeleton.
- Search skeleton.
- GoLink banner skeleton.
- Extra/Top Brands skeleton.
- Category skeleton.

Expo should have:

- Stable skeleton boxes matching final card dimensions.
- No layout jump when data resolves.
- Error fallback for sections that fail.
- Offline/retry state where API failure affects entire page.

## 8. Search Specification

Source: `src/features/home/components/SearchShop.tsx`.

### 8.1 Search Variants

Variants:

- `header`: desktop/header search.
- `homeMobile`: mobile home prominent search.

Expo should implement equivalent behavior even if the native presentation is a
sheet instead of a DOM popper. On web, the visual should match the popper.

### 8.2 Popper Layout

When focused, Next.js shows a panel:

- Width tracks trigger input.
- Padding around 20px.
- Radius around 20px.
- Soft blue/mint background.
- Border with mint tint.
- Subtle shadow.
- Max height around `min(72vh, 640px)`.
- Scrollable content.

Intro panel:

- Small square icon tile with trend icon.
- Title: `Popular right now`.
- Subtitle: `Hand-picked stores with standout cashback--tap a shop to explore.`
- Panel background slightly lighter, with border.

Popular rows:

- 5 rows.
- Logo/avatar left.
- Merchant name.
- `Cashback up to` label.
- Percent in mint.
- `Shop Now` pill button right.
- Rows are white or very light cards with border and soft shadow.

### 8.3 Search Data Behavior

Expected:

- Empty query uses trending/popular list.
- Query is debounced.
- Search result limit: 5.
- Trending limit: 5.
- Query stale time around 60 seconds.
- Trending stale time around 5 minutes.
- Analytics/search event should not fire repeatedly for the same signature.

### 8.4 Search States

Required:

- Closed.
- Focused empty.
- Typing.
- Loading.
- Results.
- No results.
- Popular fallback.
- Error fallback.
- Result row hover/press.
- Shop Now button hover/press.
- Outside click/back close.

## 9. Card and Carousel Specification

Sources:

- `src/features/home/common/CardSlideCategory.tsx`
- `src/features/home/common/CardBrandLogo.tsx`
- `src/features/home/common/CardImage.tsx`
- `src/features/home/common/CardSpecial.tsx`
- `src/components/ui/CardShopMobileDefault.tsx`
- `src/components/ui/CardShopMini.tsx`

### 9.1 Carousel Behavior

Next.js uses Swiper with modules:

- Mousewheel
- Grid
- Pagination
- Navigation where needed

Expected behavior:

- Horizontal scroll/pagination on mobile and desktop.
- Grid rows within a page where needed.
- Pagination dots visible and centered.
- Mousewheel/trackpad can move horizontal carousel without hijacking vertical
  page scroll too aggressively.
- Release-on-edges so page scroll resumes.
- Cards maintain fixed dimensions inside a carousel page.

Breakpoint intent:

- `brandLogo`: about 2 columns mobile, then 3/4/5/6 by width.
- `brandLogoBadge`: about 3 columns mobile, then 4/5/6/8 by width.
- `featured`: 1 mobile, then 2/3/4.
- `mini`: 1 mobile, then up to 6.

Expo must replicate the observed result, not necessarily Swiper internals.

### 9.2 Brand Logo Card

Full variant:

- White card.
- 16px radius.
- 1px border.
- Soft shadow.
- Padding around 8px.
- Square image/logo block.
- Optional Grab Coupon badge top-left.
- Favorite heart button top-right.
- Merchant name below image.
- Cashback label left bottom.
- Percent right bottom.

Compact/badge variant:

- Smaller card.
- Square image/logo.
- Merchant name one line or two lines.
- Cashback label ellipsized if needed.
- Percent in mint.

Interaction:

- Whole card link has hover lift.
- Image may scale slightly on hover.
- Favorite button stops propagation.
- Press state is subtle, never jarring.

### 9.3 Card Image and Promo Cards

Image cards:

- Rounded surface.
- Image fills.
- Hover lifts and image scales about 1.03.
- Text/content overlays must remain readable.

Shop/mobile mini cards:

- Keep fixed aspect ratio.
- Use fallback logo color/icon when image missing.
- Do not let long brand names resize cards.

### 9.4 Card State Checklist

Every card family should handle:

- Image loaded.
- Image missing.
- Favorite true/false.
- Favorite loading.
- Long merchant name.
- Missing cashback rate.
- Zero/unknown cashback.
- Click/tap.
- Hover.
- Press.
- Focus.
- Disabled/unavailable if applicable.

## 10. GoLink Specification

Sources:

- `src/features/golink/components/GoLinkFeature.tsx`
- `src/features/golink/components/GoLinkMobileSheet.tsx`
- `src/features/golink/components/GoLinkResultDialog.tsx`
- `src/features/home/components/GoLinkBanner.tsx`

### 10.1 Visual

GoLink feature card/sheet:

- Soft blue/mint gradient background.
- Large illustration of link, phone, GoGoCash mark.
- Info icon top-right.
- Title: `GoGoLink - Easy to earn cashback by just copy, paste and shop!`
- Input with link icon.
- Placeholder: `Paste your product or shop link here`.
- Main CTA: `Paste and Go`.
- CTA mint, full width on mobile.

Mobile sheet:

- Backdrop dims and blurs page behind.
- Bottom sheet with rounded top corners.
- Drag handle at top.
- Close button top-right.
- Content starts with illustration, title, input, CTA.
- Sheet does not hide bottom nav incorrectly.

Desktop:

- Full card/banner inside page content.
- Not a tiny modal unless opened from specific flow.

### 10.2 Behavior

CTA rules:

- If input has value, validate it.
- If input is empty, attempt clipboard read.
- URL must be `http` or `https`.
- Invalid URL shows invalid state/toast.
- Empty URL shows empty state/toast.
- Clipboard denied shows clipboard denied state/toast.
- Valid URL opens result dialog/state.

Result:

- Shows generated/recognized link target.
- Shows Shop Now.
- Shows terms/conditions area.
- Shop Now opens the destination/tracking path.
- Error state preserves input so user can retry.

### 10.3 Interaction

- Info icon opens guidelines.
- Close icon closes modal/sheet.
- Backdrop tap closes mobile sheet if safe.
- CTA hover darkens to about `#00b889`.
- CTA active scale about 0.99.
- Input focus border becomes mint.
- Result modal enter/exit is smooth.

## 11. Brand, Shops, Category, Discover

Sources:

- `src/features/brand/*`
- `src/features/shop/*`
- `src/features/discover/*`
- `src/features/home/components/ShopPromotionHero.tsx`

### 11.1 Listing Pages

Brand and shop pages share list behavior:

- Promotion hero at top.
- Search input/filter controls.
- Category aside or chips.
- Sort pills:
  - Popular
  - Newest
  - Highest cashback
  - Lowest cashback
- Shop type filters in shops mode:
  - All
  - Mall
  - Preferred
  - Normal
- Results count.
- Grid responds from 2 mobile columns to 6 desktop columns.

States:

- Initial loading skeleton.
- Empty results.
- API error.
- Filter active.
- Search debounce around 320ms.
- Pending count uses placeholder/em dash.

### 11.2 Shop Promotion Hero

Visual:

- Large promo image carousel.
- Around 800x450 aspect for slides.
- Rounded 24px.
- Gap around 24px.
- Preview/fade of adjacent slide.
- Pagination.
- Active slide announcement for accessibility.

### 11.3 Discover

Product discovery page:

- Header title/subtitle.
- Desktop sidebar filters.
- Mobile filter chips.
- Search with debounce around 320ms.
- Category filter.
- Minimum cashback filter.
- Sort:
  - Popular
  - Newest
  - High cashback
- Page size around 60.
- Grid 2/3/4/5 columns depending width.
- Pagination with first/last.
- Smooth scroll back to grid on page change.

Product card:

- Square/banner image.
- Discount badge.
- Favorite visual placeholder.
- Title fixed to stable two-line height.
- Price and original price.
- Shop Now button.
- Terms link/dialog.

States:

- Loading skeleton grid of 12 cards.
- Empty state.
- Error state.
- Disabled button if no link.

### 11.4 Shop Detail

Sources:

- `src/features/shopDetail/*`

Hero:

- Wide hero banner about 1200x410.
- Rounded large corners.
- Logo overlaps/positions near hero summary.
- Summary card width about 90% on mobile.
- Favorite button.
- Dark Shop Now CTA.

Behavior:

- Fetch offer detail.
- Fetch favorite list.
- Fetch related offers by category.
- Product query param scrolls to matching row after short delay.
- Generate deeplink on CTA.
- Deeplink success sets redirect/open-link state and redirects after about 3s.
- Deeplink error tracks error and shows toast.
- Favorite mutation has success/error toast.
- Referral/share can use native share or clipboard fallback.
- Copied state clears after about 2s.

States:

- Loading skeleton.
- Not found.
- Deeplink loading.
- Deeplink success.
- Deeplink error.
- Favorite loading/error.
- Related offers loading/empty.
- Terms visible.

## 12. Quest Specification

Sources:

- `src/features/quest/page/QuestPage.tsx`
- `src/features/quest/components/TabTitle.tsx`
- `src/features/quest/components/ListRank.tsx`
- `src/features/quest/components/MissionList.tsx`

### 12.1 Quest Layout

Mobile:

- Full-page profile-style block.
- Top hero image/banner.
- Rounded corners.
- Tabs below hero:
  - `How to win!`
  - `Tasks`
  - Trophy + `Leaderboard`
- Active tab has mint underline and active color.
- Content changes by tab.
- Bottom nav active on Quest.

Desktop:

- Wider page container.
- Hero banner.
- Content can split into two columns showing tasks and leaderboard together.

### 12.2 How To Win

Visual:

- Tips card.
- Title similar to `Tips - Every spend and invitation is counted for your points!`
- CTA like `Show Now!`.
- Quest illustration image.

### 12.3 Tasks

Task list:

- Heading: `Let's Got the Tasks Done!`
- Rows with icon/logo left.
- Task/shop name center.
- Points pill right.
- Coin/point icon inside pill.
- Dividers between rows.
- Shop tasks navigate to shop details.

States:

- Loading.
- Empty tasks.
- Disabled task.
- Completed/available if API exposes it later.

### 12.4 Leaderboard

Leaderboard:

- Heading: trophy + `GoGoQuest`.
- History link with trophy icon.
- Rows:
  - Avatar.
  - Masked username.
  - Rank trophy/medal.
  - Points with coin icon.
- MyRank may appear.
- Scrollable list.
- Rank assets differ for top ranks.

Keyboard:

- Tab list supports arrow keys, Home, End.

## 13. Wallet Specification

Sources:

- `src/features/wallet/*`
- `apps/mobile/src/design/webDesignParity.ts`

### 13.1 Wallet Header

Mobile:

- Top row with back chevron and `My Wallet`.
- Horizontal divider.
- Content below in soft blue app background.
- Bottom nav active Wallet.

### 13.2 Support Card

Visual:

- Rounded soft blue card.
- Support/headset icon.
- Copy:
  - `Report if your cashback wasn't tracked or added after a purchase.`
  - `Our team will review it for you.`
- Inner row:
  - LINE icon tile.
  - `Contact Support`.
  - `LINE Official Account`.
  - External/open icon right.

Behavior:

- Tapping opens LINE/support link.
- Hover/press on web/native feedback.

### 13.3 Cashback Summary

Visual:

- Large rounded card.
- Title: `Cashback Summary`.
- Subtitle: `A simple snapshot of your rewards -- what we're tracking, what's still confirming, and what you've already received.`
- Help/question icon top-right.

Metric cards:

- Total Cashback
  - Icon: wallet.
  - Text: `Every purchase we're tracking for cashback, all in one place.`
  - Amount: `3,504.60 THB` in mint.
- Pending Cashback
  - Icon: hourglass.
  - Text: `Usually updates after the store confirms your order.`
  - Amount: `633.60 THB`.
- Withdrawn/other metrics as provided by API/design.

States:

- Loading skeleton.
- Error/retry.
- Empty wallet.
- Withdraw allowed.
- Withdraw blocked.
- KYC required.
- Withdraw method missing.

## 14. Profile Specification

Sources:

- `src/app/[locale]/profile/PageClient.tsx`
- `src/features/profile/page/ProfileInfo.tsx`
- `src/features/profile/components/ProfileMenu.tsx`
- `src/components/layouts/SubProfile.tsx`
- `src/features/profile/layout/SubPage.tsx`
- `apps/mobile/src/design/webDesignParity.ts`

### 14.1 Profile Hub Card

Mobile reference:

- Large rounded surface/card.
- Top account area with teal header.
- Avatar on left.
- User name right.
- Masked phone/id such as `***0001`.
- Frosted/gradient wallet summary panel.
- Text:
  - `Total Cashback Available`
  - Amount: `3,180.24 THB`
  - `Last Updated: 28 Mar 2026 07:00`
- Full-width mint Withdraw button with money icon.

### 14.2 Profile Menu

Profile accordion:

- Mint header row with user/profile icon and `Profile`.
- Chevron on right.
- Active/open state rotates chevron.
- Subitems:
  - Personal Information
  - My Rating Score
  - Withdraw Methods
  - Account Setting

Main menu rows:

- Invite your Friends
  - shows invited count
  - Copy Link button on right
- My Wallet
- GoGoPass
- Missing Orders
- Favorite Brands
- GoGoQuest History
- Age Verification
- Consent Preferences
- Privacy Policy
- Terms of Use
- Terms of Service
- Help Center
- Connect with GoGoCash

Interaction:

- Rows are large touch targets.
- Icons are thin-line mint/grey, not overly bold.
- Active bottom-nav profile tile shows avatar.
- Copy link shows success state.
- External rows open new URL/app where appropriate.

### 14.3 Profile Subpage Shell

Source: `SubPage.tsx`.

Modes:

- `showSubMenu`: desktop two-column card with `SubProfile` left rail and
  right scroll content.
- `contentOnly`: card without embedded rail.
- default: centered surface with back row.

Mobile:

- Top back row to `/profile`.
- Page title.
- Content in soft app surface.
- Smooth scroll top on route change unless reduced motion.

Desktop:

- Max width around 1080.
- Sidebar remains visible.
- Right content scrolls if needed.

## 15. Auth and Account Setup

Sources:

- `src/features/auth/component/LoginComponent.tsx`
- `src/features/auth/*`
- `src/app/[locale]/login`
- `src/app/[locale]/register`
- `src/app/[locale]/auth/callback`
- `src/app/[locale]/account-setup`
- `src/app/[locale]/link-mycashback/*`

Required design and behavior:

- Login/register surface centered and mobile-friendly.
- Provider buttons have clear loading/disabled states.
- Errors display near relevant field or as toast/banner.
- Firebase/social auth flows show pending state.
- Callback route shows loading while exchanging session.
- Callback failures provide retry/login path.
- Account setup validates required fields.
- Phone/OTP/link MyCashback flows must preserve step state and back behavior.
- Unauthorized users visiting protected routes redirect to login.
- Authenticated users should not see login/register unless explicitly signing out.

Before porting auth details, inspect the current source components and API
contracts. Auth/session behavior is critical path and should have tests before
production changes.

## 16. Membership, Pricing, Billing

Sources:

- `src/features/membership/*`
- `src/features/membership/membership.css`
- `src/features/subscription/*`
- `src/app/[locale]/pricing`
- `src/app/[locale]/membership`
- `src/app/[locale]/subscription`
- `src/app/[locale]/billing`

Visual:

- Pricing pages live inside profile/subpage shell where applicable.
- Cards use mint/white surfaces, rounded corners, clear plan hierarchy.
- CTAs use mint primary styling.
- FAQ accordions animate open/closed.
- Membership game/task visuals preserve current CSS details where visible.

Behavior:

- Checkout creation happens server-side.
- Billing portal creation happens server-side.
- Current subscription state is shown.
- Loading/error/success states are explicit.
- No Stripe secret or server-only logic moves into Expo public env.

States:

- No plan.
- Active plan.
- Past due/cancelled if API exposes.
- Checkout loading.
- Checkout failed.
- Billing portal loading.
- Billing portal failed.

## 17. Privacy, Consent, Age, Missing Orders

Sources:

- `src/features/pdpa/*`
- `src/features/profile/page/PrivacyCenterContent.tsx`
- `src/features/profile/page/AgeVerificationFlow.tsx`
- missing orders routes/components

Privacy center:

- User can view/manage consent preferences.
- Data subject request cards should remain single-column at all breakpoints.
- Export/delete request states must be clear.
- Submitted state should be visible.

Age verification:

- Clear step-by-step flow.
- Validation errors are inline or bannered.
- Success state returns user to intended route/profile.

Missing orders:

- Support/recovery flow.
- Clear instructions and contact path.
- Upload/forms should have loading/error/success states.

## 18. Interaction and Animation Checklist

Use this checklist when matching Expo to Next.js:

### 18.1 Buttons

- Hover background/color change on web.
- Press scale or opacity on touch.
- Disabled style visible.
- Loading spinner or text.
- Focus ring.
- Icon weight matches Next.js thin-line style.
- Text does not overflow.

### 18.2 Cards

- Hover translate up 1-2px.
- Hover shadow stronger.
- Press state subtle.
- Image scale only where Next.js uses it.
- Card dimensions stable.
- Long text truncates.
- Favorite/secondary action does not trigger parent link.

### 18.3 Tabs

- Active underline.
- Active text color mint.
- Inactive grey.
- Keyboard arrow navigation on web.
- No layout jump when switching tab.

### 18.4 Carousels

- Horizontal scroll/pagination works.
- Pagination dots match size/color.
- Vertical page scroll still works.
- Cards do not resize while scrolling.
- Desktop and mobile breakpoints verified.

### 18.5 Sheets and Modals

- Backdrop dim.
- Sheet/modal enters smoothly.
- Close button visible.
- Escape/back closes where expected.
- Focus returns to trigger on web where practical.
- Content not hidden by bottom nav.

### 18.6 Forms

- Input focus border.
- Placeholder color.
- Validation errors.
- Loading/disabled during submit.
- Success state.
- Server error state.

### 18.7 Page States

Every migrated page should define:

- Loading.
- Empty.
- Error.
- Retry.
- Unauthorized.
- Offline/degraded if relevant.
- Authenticated.
- Unauthenticated.

## 19. Expo Implementation Rules

### 19.1 Shared Parity Constants

Use the existing Expo parity files:

- `apps/mobile/src/design/webDesignParity.ts`
- `apps/mobile/src/theme/motion.ts`
- `apps/mobile/src/components/MotionPressable.tsx`

Do not duplicate constants inside screens when a shared value exists.

### 19.2 Responsive Requirements

Verify at minimum:

- Mobile narrow: 390px width.
- Mobile Chrome reference: 427px width.
- Tablet: around 768px.
- Desktop: 1280-1440px.

Home-specific:

- Top Brands: mobile 2 columns x 2 rows with horizontal pagination.
- Trending/Travel/Makeup: mobile 3 columns x 2 rows with horizontal
  pagination.
- Desktop should remain centered and not stretch into a marketing page.
- Bottom nav should not hide content.

### 19.3 Visual Matching Process

For each page:

1. Open the Next.js route at the same viewport.
2. Capture or inspect the relevant section.
3. Open the Expo route at the same viewport.
4. Compare:
   - layout,
   - spacing,
   - font weight/size,
   - colors,
   - icons,
   - shadows,
   - radii,
   - motion,
   - states.
5. Add/update a focused parity test where practical.
6. Patch Expo.
7. Re-run tests/typecheck.
8. Re-check in browser.

### 19.4 Testing Expectations

For production behavior changes, follow TDD:

- Write failing test first.
- Implement minimum code.
- Refactor after green.

Useful test names:

- `home layout > given mobile width > then top brands renders two-column paginated cards`
- `home layout > given mobile width > then compact sections render three-column paginated cards`
- `home search > given empty focus > then popular right now panel is shown`
- `golink > given invalid url > then validation error is shown`
- `wallet > given wallet data > then cashback summary cards are visible`
- `quest tabs > given keyboard arrow > then active tab changes`
- `profile > given copy invite link > then success state is shown`
- `motion parity > given card hover > then card lifts and shadow strengthens`

## 20. Visual QA Checklist

Use the checklist below before declaring a page visually aligned.

### 20.1 Home Mobile

- Search pill matches reference.
- Search popper/sheet opens with popular rows.
- Shortcut pills horizontally scroll.
- Hero main/side banners match size and rounding.
- Top Brands title, fire icon, View all match.
- Top Brands cards are 2 x 2 per page and horizontally paginated.
- Trending cards are 3 x 2 per page and horizontally paginated.
- Travel section title wraps like reference and cards are 3 x 2.
- Makeup section title wraps like reference and cards are 3 x 2.
- Pagination dots visible and aligned.
- Bottom nav overlays only reserved empty space, not content.
- LINE/FAB does not cover nav labels.

### 20.2 Home Desktop

- App is centered and responsive.
- Header/subheader are not duplicated.
- Banners use desktop composition.
- Cards scale to desktop columns.
- Hover states work on cards, buttons, shortcut pills.

### 20.3 GoLink

- Bottom sheet matches reference when opened from nav/home.
- Desktop `/golink` does not look like a broken mobile sheet.
- Paste and Go handles empty, clipboard denied, invalid, valid.
- Result state and Shop Now work.

### 20.4 Wallet

- Header/back row matches reference.
- Support card copy and LINE row match.
- Cashback Summary card matches spacing, colors, icons.
- Metric cards match.
- Bottom nav active Wallet.

### 20.5 Quest

- Banner image and rounded shape match.
- Tabs match active/inactive states.
- How to win card matches.
- Tasks list rows and point pills match.
- Leaderboard rows match avatar/rank/points.
- Bottom nav active Quest.

### 20.6 Profile

- Wallet summary card matches.
- Withdraw button matches.
- Profile accordion matches.
- Menu rows and icon stroke weight match.
- Copy Link state works.
- Bottom nav active Profile.

### 20.7 Listing and Detail Pages

- Brand/shop/category grids responsive.
- Filters/sort/search work.
- Promo hero carousel matches.
- Shop detail hero and CTA states match.
- Deeplink loading/success/error are visible.

### 20.8 Auth, Membership, Privacy

- Auth pages match shell and form styling.
- Pricing/membership pages preserve card/accordion interactions.
- Billing and subscription states are explicit.
- Privacy center and age verification are mobile readable.
- Consent banner does not block unrelated flows after user choice.

## 21. Open Parity Risks

Track these explicitly during migration:

- Expo Web may not reproduce Swiper exactly. The required product behavior is
  horizontal pagination/scroll with stable grid pages, not Swiper internals.
- Hover states only apply on web/desktop pointer devices. Native touch must use
  press feedback instead.
- Some Next.js mock/staging data appears in UI. Expo should use the same fixture
  only for parity/demo mode, not production secrets or fake server behavior.
- Auth, billing, withdraw, and deeplink flows are critical paths. Do not change
  these without tests and backend contract verification.
- GoGoSense will add Android-only behavior later. Keep Android-only permissions
  guarded so web/iOS never crash.

## 22. Definition of Done for Expo Parity

A migrated page is done only when:

- Route exists in Expo.
- It has the correct customer shell.
- Mobile viewport matches Next.js reference.
- Desktop viewport is responsive and intentional.
- Main loading, empty, error, unauth, and success states exist.
- Hover/press/focus states match the Next.js interaction style.
- Relevant tests pass.
- Typecheck passes.
- Browser verification was performed against Next.js and Expo at the same route
  and viewport.

## 23. Production Launch Contract

This section turns the design handbook into a production launch checklist for
Expo. Treat these requirements as blockers for `app.gogocash.co`, iOS, and
Android release readiness.

### 23.1 Launch Principle

Expo is production-ready only when it is no longer a visual prototype:

- Every production customer route either has a real Expo implementation or an
  approved redirect/fallback.
- No route shows placeholder route-contract UI.
- No route relies on `Mock User`, mock wallet amounts, or demo-only data unless
  the app is explicitly running in local/demo mode.
- No `MOCK MODE` banner or development-only customer warning is visible.
- No server secret is exposed through `EXPO_PUBLIC_*`.
- Customer-facing wording never promises cashback tracking unless the tracking
  link was opened.
- Android-only GoGoSense behavior is guarded so iOS and web do not crash.

### 23.2 Current Expo App Identity

Source: `apps/mobile/app.config.ts`.

Current app identity:

- Display name: `GoGoCash`
- Expo slug: `gogocash-mobile`
- URL scheme: `gogocash`
- iOS bundle identifier: `co.gogocash.app`
- Android package: `co.gogocash.app`
- Orientation: portrait
- UI style: light
- Icon: `apps/mobile/assets/icon.png`
- Adaptive icon foreground: `apps/mobile/assets/adaptive-icon.png`
- Splash image: `apps/mobile/assets/splash.png`
- Splash background: `#ffffff`
- iOS tablet support: false

Production launch requirements:

- Confirm bundle/package IDs are final before first store submission.
- Confirm app icon, adaptive icon, and splash are production-approved assets.
- Confirm iOS associated domains include production `app.gogocash.co`.
- Confirm staging-only associated domain is not the only configured domain for
  production builds.
- Confirm scheme `gogocash` handles every required deep link.

### 23.3 Environment Contract

Source:

- `apps/mobile/app.config.ts`
- `apps/mobile/eas.json`
- `apps/mobile/src/config/env.ts`
- `apps/mobile/.env.example`
- `apps/mobile/README.md`

Public Expo env keys:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_APP_ENV`
- `EXPO_PUBLIC_FRONTEND_URL`
- `EXPO_PUBLIC_POSTHOG_HOST`
- `EXPO_PUBLIC_POSTHOG_KEY`
- `EXPO_PUBLIC_SENTRY_DSN`
- `EXPO_PUBLIC_EAS_PROJECT_ID`

Rules:

- `EXPO_PUBLIC_*` values are public. Never place server secrets there.
- Production EAS builds must explicitly set production values.
- Production must not silently fall back to staging defaults.
- Preview and development may use staging.
- Web cutover must use production frontend URL.
- Sentry/PostHog keys may be public project keys, but must be the correct
  production projects/environments.

Current observed risk:

- `development` and `preview` EAS profiles set staging env.
- `production` EAS profile currently has no env block.
- `app.config.ts` defaults to staging values when env is missing.

Production blocker:

- Before production release, ensure `production` EAS profile or EAS secrets set:
  - production API URL,
  - production frontend URL,
  - production app environment,
  - production Sentry DSN if enabled,
  - production PostHog key/host if enabled,
  - EAS project ID.

### 23.4 Verification Commands

Source: root `package.json`, `apps/mobile/package.json`,
`apps/mobile/playwright.config.ts`.

Required local checks before every production candidate:

```bash
npm run mobile:test
npm run mobile:typecheck
npm run mobile:design-qa
```

Required Expo build checks:

```bash
npm --prefix apps/mobile run build:preview
npm --prefix apps/mobile run build:production
```

Required web export/smoke check:

```bash
npx expo export --platform web --output-dir /tmp/gogocash-expo-web-export
```

Recommended Next.js reference checks while parity is still being compared:

```bash
npm run test
npm run lint
npm run format:check
npm run i18n:check
```

Browser QA defaults:

- Next.js reference: `http://localhost:3001/en`
- Expo local web: `http://localhost:19006`
- Mobile Playwright default base URL: `http://localhost:8081`
- Playwright projects:
  - `mobile-web-iphone`
  - `mobile-web-wide`

Do not claim production readiness if any required test/build is skipped.

### 23.5 Production Evidence Folder

For each release candidate, create a dated evidence set outside source code or
inside an approved release/evidence folder. Suggested naming:

- `home-mobile-390.png`
- `home-mobile-427.png`
- `home-desktop-1440.png`
- `search-popular-mobile.png`
- `golink-sheet-mobile.png`
- `wallet-mobile.png`
- `quest-tasks-mobile.png`
- `quest-leaderboard-mobile.png`
- `profile-mobile.png`
- `brand-list-mobile.png`
- `shop-detail-mobile.png`
- `pricing-mobile.png`
- `privacy-center-mobile.png`
- `ios-simulator-home.png`
- `android-device-home.png`

Each screenshot set should include:

- route URL,
- viewport/device,
- app build/version,
- API environment,
- date/time,
- pass/fail notes,
- tester name or agent session reference.

## 24. Production Page Acceptance Matrix

Use this matrix before launch. Every row needs a pass, explicit fallback, or
signed exception.

| Page/flow        | Must pass visually                                                 | Must pass behaviorally                          | Launch blocker if                                              |
| ---------------- | ------------------------------------------------------------------ | ----------------------------------------------- | -------------------------------------------------------------- |
| Home             | Search, shortcuts, banners, Top/Trending/Travel/Makeup, bottom nav | Search opens, carousels scroll, cards navigate  | Any home section is placeholder, vertically wrong, or clipped. |
| Search           | Popular panel, result rows, Shop Now buttons                       | Focus opens, query returns, empty/error handled | Search cannot open or results cannot navigate.                 |
| GoLink           | Sheet/card, illustration, input, CTA, result                       | Empty/invalid/valid URL states work             | Valid URL cannot continue or errors are silent.                |
| Brand list       | Hero, filters, grid, cards                                         | Search/filter/sort/page navigation works        | Cards cannot open shop detail.                                 |
| Shops list       | Hero, shop type filters, sort, grid                                | Filters/sort/search work                        | Shop list is static placeholder.                               |
| Category list    | Category cards/list                                                | Category navigation works                       | Categories cannot open category detail.                        |
| Category detail  | Header, filters, offer grid                                        | Filtered offers load and navigate               | Wrong category data shown.                                     |
| Discover         | Filter sidebar/chips, product cards                                | Search/filter/sort/pagination, terms            | Product cards cannot open/shop.                                |
| Shop detail      | Hero, logo, cashback CTA, terms, related offers                    | Favorite, deeplink, error states                | Cashback activation cannot create/open link.                   |
| Login            | Form/provider layout                                               | Auth starts, errors shown                       | Auth fails silently.                                           |
| Register         | Register form/state                                                | Registration starts, validation works           | User cannot complete registration.                             |
| Auth callback    | Loading/error/success                                              | Session exchange works                          | User is stranded after auth.                                   |
| Account setup    | Form/steps                                                         | Required fields validate and save               | New users cannot complete onboarding.                          |
| Profile          | Wallet summary, menu, active nav                                   | Menu links, copy link, external links           | Mock identity leaks to production.                             |
| Wallet           | Header, support card, summary metrics                              | Data loads, withdraw path checks                | Wallet values wrong or withdraw path broken.                   |
| Withdraw         | Form, methods, blocked states                                      | KYC/method/amount validation                    | User can submit invalid withdraw.                              |
| Method/create    | Method list/form                                                   | Add/edit validation                             | Payment method data can be invalid.                            |
| Quest            | Hero, tabs, tasks, leaderboard                                     | Tabs, task links, history                       | Tabs do not switch or points are wrong.                        |
| Favorite         | Card grid/list                                                     | Remove/open favorites                           | Favorites are not user-specific.                               |
| Referral         | Invite card/copy state                                             | Copy/share works                                | Referral link is wrong user.                                   |
| Missing orders   | Recovery/support UI                                                | Form/support submission                         | User cannot submit support flow.                               |
| Pricing          | Plan cards, FAQ, CTA                                               | Checkout starts, errors shown                   | Checkout uses client secret or wrong env.                      |
| Membership       | GoGoPass status                                                    | Benefits/status load                            | Wrong plan status shown.                                       |
| Subscription     | Status card/actions                                                | Manage/cancel/billing flow                      | Billing state is stale or wrong.                               |
| Billing          | Portal handoff                                                     | Backend creates portal                          | Portal URL exposed/failed silently.                            |
| Privacy center   | Consent/data rights UI                                             | Export/delete/consent actions                   | PDPA actions missing or unsafe.                                |
| Age verification | Step UI                                                            | Validation and completion                       | Required user blocked without path.                            |
| Language         | Locale picker                                                      | Locale persists/routes                          | User gets stuck in wrong locale.                               |
| Privacy policy   | Legal content                                                      | Links/back work                                 | Content is unreadable or stale.                                |

## 25. Exact UI Details To Preserve

This section is the compact launch audit list. If Expo differs from this list,
document the reason before shipping.

### 25.1 Home

- Background stays light grey/white, not dark and not saturated.
- Mobile app content is centered and capped, even on desktop browser preview.
- Sticky search is a rounded pill with mint border and soft fill.
- Search icon is a thin-line icon inside a mint-tinted circular tile.
- Browse shortcut pills are horizontal, fixed-height, shadowed, and scrollable.
- Banners preserve rounded corners and image cropping.
- Main hero banner is larger than the two secondary banners.
- Banner arrows are white circular controls with mint chevrons.
- Main banner pagination dots sit inside/near the lower banner edge.
- Top Brands uses larger cards than compact category sections.
- Top Brands mobile first page shows exactly 4 cards in a 2 by 2 grid.
- Trending, Travel, and Makeup mobile first pages show 6 compact cards in a
  3 by 2 grid.
- All card sections are horizontally paginated/scrollable, not only vertical.
- `View all ->` stays right aligned and mint.
- Section icons align with title line; wrapped two-line titles remain readable.
- Bottom nav does not cover card text or cashback percentages.

### 25.2 Card Details

- Card image/logo area is square.
- Card radius is about 16px.
- Card border is light and visible.
- Shadow is soft at rest.
- Hover raises cards 1-2px on web.
- Press state is subtle on mobile.
- Merchant names are readable and do not overflow.
- Cashback label is smaller and muted.
- Cashback percent is mint, bold, and right aligned where reference does that.
- Heart/favorite button is circular, top-right, and does not trigger card link.
- Grab Coupon badge is a small pill, top-left, with red envelope visual where
  present.

### 25.3 Search

- Search panel opens immediately on focus/tap.
- Active search border becomes stronger mint.
- Popular panel has trend icon tile, title, and explanatory subtitle.
- Popular list has 5 rows.
- Each row has logo, name, cashback label, percent, and Shop Now pill.
- Results and popular rows use soft blue cards with subtle border/shadow.
- Search close/outside behavior does not navigate away.
- Mobile keyboard should not hide the selected result row.

### 25.4 Bottom Navigation

- Surface is translucent white with blur effect where supported.
- Radius is large and pill-like.
- Wallet center action is raised above the rail.
- Wallet center action is mint with glow.
- Active side item has mint-tinted rounded tile.
- Inactive icons are grey and thin.
- Labels are centered and do not wrap.
- Profile item shows avatar when available.
- Safe-area bottom is respected on iPhone and Android gesture nav.

### 25.5 GoLink

- Mobile GoLink opens as a bottom sheet, not a full blank route when triggered
  from bottom nav/home.
- Sheet backdrop dims the home content.
- Sheet drag handle is visible.
- Close button is top-right.
- Illustration is above title on mobile.
- Input is rounded, pale blue, with link icon.
- CTA is full-width mint on mobile.
- Info icon opens instructions/guidelines.
- Invalid URL and empty URL states are explicit.
- Result state has Shop Now and terms, not only a toast.

### 25.6 Wallet

- Header says `My Wallet` with back chevron on mobile.
- Support card appears before Cashback Summary.
- Support copy matches the friendly explanatory tone.
- LINE support row is an inner rounded card.
- Cashback Summary uses large rounded soft card.
- Help/question icon is top-right.
- Metric cards show icon tile, title, description, and amount.
- Amounts are mint and include `THB`.
- Production data must come from authenticated wallet API/session, not fixtures.

### 25.7 Quest

- Banner is full-width inside page padding with large rounded corners.
- Tabs appear directly under banner.
- Active tab uses mint underline.
- Leaderboard tab includes trophy visual.
- Tasks have left icon/logo and right points pill.
- Points pill is mint and includes coin visual.
- Leaderboard rows show avatar, masked name, trophy/rank, and points.
- Bottom nav active state is Quest.

### 25.8 Profile

- Top wallet summary card uses teal header and frosted gradient body.
- Avatar appears in top-left area.
- User name and masked identifier align right.
- Withdraw button is wide, mint, and centered.
- Profile accordion header is mint.
- Subitems appear indented under Profile.
- Main menu rows preserve Next.js order.
- Copy Link is a pill button on Invite row.
- External legal/support rows are visibly tappable.
- Production must bind user name, identifier, wallet, and invite URL to session.

## 26. Production Data Rules

Mock/staging data is useful for parity, but it must not leak into production.

Allowed in local/demo mode:

- `Mock User`
- `***0001`
- demo wallet amounts,
- fake brands such as Grocery Galaxy and Pocket Pantry,
- fake referral URL,
- fixture cards used for visual parity tests.

Required in production:

- Authenticated profile identity.
- Authenticated wallet summary.
- User-specific invite/referral URL.
- Real merchant/offer data from backend.
- Real cashback rates from backend or approved cache.
- Real deeplink generation through backend.
- Real billing/subscription status.
- Real consent state.
- Real language/session persistence.

Production checks:

- Search app bundle/source for `Mock User`.
- Search app bundle/source for `mock-user`.
- Search app bundle/source for `placeholder`.
- Search app bundle/source for `Screen contract`.
- Search app bundle/source for `MOCK MODE`.
- Confirm no demo route is reachable from customer navigation.

## 27. Deep Link and Web Link Matrix

Expo must handle both app scheme and web URLs.

Required scheme links:

- `gogocash://login`
- `gogocash://auth/callback`
- `gogocash://shop/:id`
- `gogocash://quest`
- `gogocash://profile`
- `gogocash://wallet`
- `gogocash://withdraw`
- `gogocash://golink`

Required web routes:

- `https://app.gogocash.co/`
- `https://app.gogocash.co/shop/:id`
- `https://app.gogocash.co/quest`
- `https://app.gogocash.co/profile`
- `https://app.gogocash.co/wallet`
- `https://app.gogocash.co/withdraw`
- `https://app.gogocash.co/golink`
- `https://app.gogocash.co/auth/callback`

Production requirements:

- iOS associated domains include production app domain.
- Android intent/app links are configured before Play release if used.
- Universal links route into the same screen state as in-app navigation.
- Auth callback preserves return destination.
- Deeplink activation from notification/GoGoSense routes to a safe activation
  screen, not a blank page.

## 28. Observability and Analytics

Production launch needs observability before public traffic.

Sentry:

- Sentry DSN configured for production.
- Smoke event captured from Expo Web.
- Smoke event captured from iOS build.
- Smoke event captured from Android build.
- Release/version tag included.
- User identity is attached only after consent/session rules allow it.

PostHog:

- Production key/host configured.
- Events are not sent to staging project from production builds.
- Events include platform: web, ios, android.
- Events include app version.
- Do not send sensitive personal data or raw payment data.

Minimum events before launch:

- `screen_view`
- `search_opened`
- `search_result_clicked`
- `merchant_card_clicked`
- `cashback_activation_started`
- `cashback_activation_completed`
- `cashback_activation_failed`
- `golink_opened`
- `golink_validation_failed`
- `golink_completed`
- `wallet_opened`
- `quest_opened`
- `profile_opened`
- `auth_started`
- `auth_completed`
- `auth_failed`

GoGoSense future events must use the names already planned in the GoGoSense
PRD and must remain opt-in.

## 29. Store and Web Cutover Checklist

### 29.1 Expo Web Cutover

Before switching `app.gogocash.co`:

- Expo Web production build/export succeeds.
- Preview domain is live.
- Route parity smoke passes.
- Auth smoke passes.
- Wallet smoke passes.
- Shop detail/deeplink smoke passes.
- Billing/pricing smoke passes.
- Privacy center smoke passes.
- No `MOCK MODE` banner.
- No console P0 errors.
- Sentry/PostHog production smoke events received.
- Current Next.js customer app rollback remains deployable.
- DNS/custom domain rollback path is documented.

### 29.2 iOS Release

Before App Store submission:

- EAS iOS production build succeeds.
- App launches on current iOS simulator.
- App launches on at least one physical iPhone if available.
- Login/auth callback works.
- Universal links/deep links work.
- Wallet/profile/quest/home smoke pass.
- App privacy answers match actual data collection.
- Screenshots use production-approved design.
- No Android-only GoGoSense permission is presented as usable on iOS.

### 29.3 Android Release

Before Play Store submission:

- EAS Android production build succeeds.
- App launches on physical Android.
- Login/auth callback works.
- App links/deep links work.
- Wallet/profile/quest/home smoke pass.
- Notification permission behavior is clear if notifications are enabled.
- GoGoSense remains feature-flagged until its Android permission flow is ready.
- Play Data Safety answers match actual data collection.
- No Accessibility API usage for GoGoSense MVP.

## 30. Production Accessibility Checklist

Before launch:

- Text contrast passes on primary screens.
- Buttons have accessible labels.
- Icon-only buttons have labels/tooltips where relevant.
- Search input is focusable and announced.
- Bottom nav labels are readable and accessible.
- Tabs expose active state.
- Modals/sheets announce open/close state where possible.
- Focus is not trapped incorrectly on web.
- Touch targets are at least 44px.
- Dynamic text does not overlap at larger OS font settings.
- Error messages are visible and not color-only.

## 31. Production Performance Checklist

Before launch:

- Home first render does not wait on every noncritical section.
- Images are sized and compressed for mobile.
- Carousels do not render excessive offscreen cards.
- Search debounce prevents request spam.
- React Query cache/stale times are intentional.
- Offline/retry does not loop endlessly.
- GoLink modal/sheet opens without jank.
- Bottom nav animation is cheap and stable.
- Expo Web bundle is reviewed for unnecessary Next.js-only code.
- Android battery impact is measured before GoGoSense detection beta.

## 32. Production Sign-off Template

Use this template for every production candidate.

```text
Release candidate:
Git branch/commit:
Expo app version:
EAS build IDs:
API environment:
Frontend domain:

Tests:
- npm run mobile:test:
- npm run mobile:typecheck:
- npm run mobile:design-qa:
- Expo web export:
- EAS preview build:
- EAS production build:

Visual QA:
- Home mobile:
- Home desktop:
- Search:
- GoLink:
- Wallet:
- Quest:
- Profile:
- Shop detail:
- Pricing/billing:
- Privacy:

Device QA:
- iOS simulator:
- iOS physical:
- Android physical:
- Expo Web preview:

Launch blockers:
- P0:
- P1:
- Accepted exceptions:

Rollback:
- Current Next.js customer app rollback checked:
- DNS/domain rollback owner:
- Store rollout rollback plan:

Sign-off:
- Product:
- Engineering:
- QA:
- Compliance/privacy:
```
