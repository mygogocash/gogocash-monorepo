# GoGoCash Mobile Screen Catalog and APIs

This document maps all web routes of the GoGoCash customer app to native mobile screens, detailing their access control, UI characteristics, and corresponding backend APIs.

---

## 1. Access Control & Routes Overview

All routes are mapped inside [apps/app/src/navigation/routes.ts](../src/navigation/routes.ts).

- **Public Screens**: Discover, Home, Categories, Shops, Brand, Privacy Policy, Login, Register, Auth Callback, Link MyCashback.
- **Auth-Protected Screens**: Profile, Wallet, Withdraw, Payment Methods, Create Method, Favorites, Referral, Membership, Credit Score, Missing Orders, Privacy Center, Quest History, GoGoTrack surfaces.

---

## 2. Core Discovery Screens

### 2.1 Home Screen (`/`)
- **Visuals**: Sticky search pill (mint border), category browse shortcuts (pills that wrap to fill the row on tablet/mobile — no sideways scroll), a 16:9 (1920x1080) hero made of 1 main banner + 2 side banners with equal gaps, and curated grid carousels (Top Brands, Trending Brands, Travel Deals, curations with icons). Each brand card (one `BrandCard` component with `size="L"` / `size="S"`) shows **`Cashback upto {rate}%`** and has a favorite heart toggle; the Trending Brands and Travel Deals rails are each capped at 16 cards.
- **Desktop (≥1024px)**: `CustomerDesktopHeader` + category sub-nav are full viewport width. Page content is capped at `1440px`. Brand rails render **two rows** per carousel page (`getDesktopBrandColumnsPerRow`, width = `brandSectionFrameWidth`). `CustomerDesktopFooter` lives **inside** the home `ScrollView` (in `desktopFooterCap`) so it scrolls with content; the footer band breaks out to full viewport width via `getDesktopShellOffset(width)` — same alignment contract as the header.
- **APIs Consumed**:
  - `GET /offer/banner-home` ( Curated banners)
  - `GET /offer/extra` ( curations / Top Brands)
  - `GET /offer/extra-point` ( extra points / trending)
  - `GET /offer?category=...&limit=...` ( category specific blocks)

### 2.2 Brand & Shops listing (`/brand`, `/shops`)
- **Visuals**: Curated carousel promotions hero (800x450, 24px radius), grid listing with brand filters, type filters (Mall, Preferred, Normal), search debounce (320ms), and sort selectors.
- **APIs Consumed**:
  - `GET /offer?category=...&search=...&limit=...&page=...`
  - `GET /offer/get-category/list` ( category filter options)

### 2.3 Product Discovery (`/discover`)
- **Visuals**: Search results grid, category chips, minimum cashback percent slider, and sort pill controls.
- **APIs Consumed**:
  - `GET /offer?category=...&search=...&min_cashback=...`

---

## 3. Payout and Wallet Screens

### 3.1 Wallet Dashboard (`/wallet`)
- **Visuals**: Header back arrow, support card linking to LINE Official, and Cashback summary panel with active cards (Total, Pending, Withdrawn).
- **APIs Consumed**:
  - `POST /withdraw/list-check` ( balance checking)
  - `GET /withdraw?search=&limit=10&page=1` ( history summary)

### 3.2 Withdraw Action page (`/withdraw`)
- **Visuals**: Select payout method menu, Web3 metamask status indicator, confirm payout checklist, and dynamic withdraw confirmation card.
- **APIs Consumed**:
  - `POST /withdraw/check` ( withdraw validations)
  - `POST /withdraw/signature` ( crypto signature request)
  - `POST /withdraw` ( finalize crypto log)
  - `POST /withdraw/bank-transfer` ( bank payout dispatch)

### 3.3 Payment Methods (`/method`, `/method/create`)
- **Visuals**: Registered payout lists, default markers. Edit panel supporting Bank selector, PromptPay radio switches (Phone / Citizen ID), QR code files attach buttons, and Crypto wallet input.
- **APIs Consumed**:
  - `GET /withdraw/methods-list` ( existing payouts list)
  - `POST /withdraw/methods` ( save new payout)
  - `PATCH /withdraw/methods/:id` ( update payout details)
  - `GET /withdraw/banks` ( list bank names)

---

## 4. Engagement & Auth Screens

### 4.1 Quest Screen (`/quest`, `/quest/history`)
- **Visuals**: Active prize pools, tab controls (How to Win, Tasks, Leaderboard), mission lists, and rank lists.
- **APIs Consumed**:
  - `GET /point/my-quest-list/:start/:end` ( quests and status)
  - `GET /point/check-points/:start/:end` ( points list)

### 4.2 Profile & Onboarding (`/profile`, `/login`, `/register`, `/account-setup`)
- **Visuals**: User details card, wallet metrics, sidebar menus, and personal details editing rows. Social auth selections and verification forms.
- **APIs Consumed**:
  - `GET /user/profile` ( fetch personal profile)
  - `PUT /user/profile` ( update details)
  - `POST /auth/log-in` ( credentials auth)
  - `POST /auth/register` ( user registration)
  - `POST /auth/send-otp` ( mobile code verification)

---

**Theming:** Screen visuals use `ThemeColors` (light/dark) — see [dark-mode.md](./dark-mode.md). Light values in this catalog describe the web-parity baseline.
