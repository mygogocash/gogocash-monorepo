# GoGoCash Admin Dashboard (Internal — Mock only)

> **Internal use only.** This build uses **mock data only**. All data is from `/api/mock` (550+ users, offers, withdrawals, conversions, coupons). No real API is used.  
> **Framework**: Next.js 16.2.9 · React 19 · TypeScript  
> **UI**: Tailwind CSS 4 + Material-UI 9 · ApexCharts · FullCalendar  
> **Auth**: NextAuth v4 (Credentials → JWT); mock sign-in: `admin@gogocash.co` / `1234`  
> **Branch:** Push to **staging** only: `git push origin main:staging` (or your branch → `origin/staging`).

Admin dashboard for managing GoGoCash operations — users, offers, withdrawals, conversions, fee settings, banners, coupons, and KPI monitoring.

---

## Quick Start

1. Install dependencies: `npm install` (or `yarn install`).
2. Create local env: `npm run setup:local` (generates `.env.local` from `.env.example` with a random `NEXTAUTH_SECRET`; skipped if `.env.local` already exists).
3. Run the dashboard: `npm run dev` → [http://localhost:3000](http://localhost:3000) (or `npm run dev:3001` and set `NEXTAUTH_URL=http://localhost:3001` in `.env.local`).
4. Sign in with **`admin@gogocash.co`** / **`1234`**. All data is mock (internal use only).

## Related Workspaces

This app is part of the `gogocash-monorepo`. Sibling workspaces:

- `../api` (`gogocash-api`, NestJS): backend contract source of truth for admin auth, metrics, offers, users, withdrawals, and configuration data.
- `../app` (`@gogocash/mobile`, Expo): customer-facing app that consumes many of the same API payloads but has a separate UX and auth flow.

## AI Handoff

- Read these files first: `src/app/(admin)/layout.tsx`, `src/lib/api.ts`, `src/hooks/useApi.ts`, `src/components/auth/AuthGuard.tsx`, `src/proxy.ts`, `docs/CODE_REVIEW.md`.
- Most pages are thin wrappers around API payloads. If a backend field changes, update both the table view and the matching form/detail component.
- Admin login issues usually start at `POST /admin/login` in the API repo, not in this UI layer.
- When you add, rename, or remove an admin capability, update this README and the matching API documentation in the backend repo in the same task.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Related Workspaces](#related-workspaces)
- [AI Handoff](#ai-handoff)
- [Architecture Overview](#architecture-overview)
- [Directory Structure](#directory-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Authentication](#authentication)
- [Routes & Pages](#routes--pages)
- [Provider Hierarchy](#provider-hierarchy)
- [API Integration](#api-integration)
- [Component Library](#component-library)
- [Dashboard Features](#dashboard-features)
- [State Management](#state-management)
- [Styling](#styling)
- [Type Definitions](#type-definitions)
- [Deployment](#deployment)
- [Key Libraries](#key-libraries)

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────┐
│                    Next.js 16 App Router                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   (full-width-pages)/        (admin)/                   │
│   ┌───────────────┐         ┌──────────────────────┐    │
│   │ /signin       │         │ AuthGuard            │    │
│   │ /signup       │         │   ┌──────────────┐   │    │
│   │ /error-404    │         │   │ AppSidebar   │   │    │
│   └───────────────┘         │   │ AppHeader    │   │    │
│                             │   │ ┌──────────┐ │   │    │
│                             │   │ │  Page    │ │   │    │
│                             │   │ │ Content  │ │   │    │
│                             │   │ └──────────┘ │   │    │
│                             │   └──────────────┘   │    │
│                             └──────────────────────┘    │
│                                                         │
│   api/auth/[...nextauth]    ← NextAuth API route        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│                Provider Stack                            │
│  QueryClientProvider → SessionProvider → ThemeProvider   │
│    → Toaster → SidebarProvider → {children}             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│   lib/api.ts (ApiClient)  →  Mock API routes           │
│   hooks/useApi.ts         →  `/api/mock` (internal)    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```text
src/
├── app/
│   ├── globals.css                       # Tailwind CSS global styles
│   ├── layout.tsx                        # Root layout (Outfit font, providers)
│   ├── not-found.tsx                     # 404 page
│   │
│   ├── (admin)/                          # 🔒 Protected admin area
│   │   ├── layout.tsx                    # Admin shell (AuthGuard + Sidebar + Header)
│   │   ├── page.tsx                      # Dashboard (KPI metrics, charts)
│   │   └── (others-pages)/
│   │       ├── admin-users/page.tsx      # Admin user management
│   │       ├── users/page.tsx            # Regular user management
│   │       ├── offers/page.tsx           # Offer listing
│   │       ├── offers/[id]/page.tsx      # Offer detail/edit
│   │       ├── offers/pending/[id]/page.tsx # Pending offer review (full page)
│   │       ├── withdraw/page.tsx         # Withdrawal requests
│   │       ├── withdraw/[id]/page.tsx    # Withdrawal detail/approval
│   │       ├── conversion/page.tsx       # Conversion tracking
│   │       ├── banner/page.tsx           # Banner management
│   │       ├── category/page.tsx         # Category management
│   │       ├── coupon/page.tsx           # Coupon management
│   │       ├── fee/page.tsx              # Fee rate settings
│   │       ├── profile/page.tsx          # Admin profile
│   │       └── calendar/page.tsx         # Calendar view
│   │
│   ├── (full-width-pages)/               # 🔓 Public pages (no sidebar)
│   │   ├── layout.tsx                    # Minimal layout
│   │   ├── (auth)/
│   │   │   ├── signin/page.tsx           # Login page
│   │   │   └── signup/page.tsx           # Registration page
│   │   └── (error-pages)/
│   │       └── error-404/page.tsx        # Error page
│   │
│   └── api/
│       └── auth/[...nextauth]/route.ts   # NextAuth API handler
│
├── components/
│   ├── admin/
│   │   └── AdminUsersTable.tsx           # Admin user CRUD table
│   ├── auth/
│   │   ├── AuthGuard.tsx                 # Auth protection wrapper
│   │   ├── SignInForm.tsx                # Login form
│   │   └── SignUpForm.tsx                # Registration form
│   ├── banner/                           # Banner management components
│   ├── category/                         # Category management components
│   ├── charts/
│   │   ├── bar/                          # Bar chart components
│   │   └── line/                         # Line chart components
│   ├── common/
│   │   ├── PageBreadCrumb.tsx            # Breadcrumb navigation
│   │   ├── SearchTable.tsx               # Table search input
│   │   ├── Card.tsx                      # Generic card
│   │   ├── ComponentCard.tsx             # Component showcase wrapper
│   │   └── ThemeToggleButton.tsx         # Light/dark mode toggle
│   ├── conversion/
│   │   └── ConversionTable.tsx           # Conversion tracking table
│   ├── coupon/                           # Coupon CRUD components
│   ├── ecommerce/
│   │   ├── EcommerceMetrics.tsx           # KPI metric cards
│   │   ├── MonthlySalesChart.tsx          # Sales trend chart
│   │   ├── StatisticsChart.tsx            # Statistics visualization
│   │   ├── MonthlyTarget.tsx              # Target progress ring
│   │   ├── DemographicCard.tsx            # User demographics
│   │   ├── RecentOrders.tsx               # Latest orders table
│   │   └── CountryMap.tsx                 # World map (jvectormap)
│   ├── fee/
│   │   └── FeeForm.tsx                   # Fee rate settings form
│   ├── form/
│   │   ├── Form.tsx, Label.tsx           # Form primitives
│   │   ├── Input/                        # Input components
│   │   ├── Select.tsx, MultiSelect.tsx   # Select components
│   │   ├── Switch/                       # Toggle switches
│   │   └── date-picker.tsx               # Flatpickr date picker
│   ├── header/
│   │   ├── NotificationDropdown.tsx      # Notification bell
│   │   └── UserDropdown.tsx              # User menu (profile, logout)
│   ├── offer/
│   │   ├── OffersTable.tsx               # Offer listing with search
│   │   ├── Detail.tsx                    # Offer detail view
│   │   └── FormOffer.tsx                 # Offer edit form
│   ├── providers/
│   │   └── ClientProviders.tsx           # Provider composition
│   ├── tables/
│   │   ├── BasicTableOne.tsx             # Generic table
│   │   └── Pagination.tsx                # Pagination controls
│   ├── ui/
│   │   ├── alert/, badge/, button/       # UI primitives
│   │   ├── dropdown/, modal/             # Interactive components
│   │   ├── table/                        # Table components
│   │   └── avatar/, images/, video/      # Media components
│   ├── user/
│   │   ├── UsersTable.tsx                # User listing table
│   │   ├── FormUpdate.tsx                # User edit form
│   │   └── ViewMyCashback.tsx            # User cashback details
│   └── withdraw/
│       ├── WithdrawTable.tsx             # Withdrawal requests table
│       ├── WithdrawDetail.tsx            # Approval/rejection view
│       └── ModalWithdraw.tsx             # Withdrawal modal
│
├── context/
│   ├── SidebarContext.tsx                # Sidebar expand/collapse state
│   └── ThemeContext.tsx                  # Light/dark theme state
│
├── hooks/
│   ├── useApi.ts                        # API client hook (CRUD methods)
│   ├── useGoBack.ts                     # Navigation back helper
│   └── useModal.ts                      # Modal open/close state
│
├── layout/
│   ├── AppSidebar.tsx                   # Sidebar navigation
│   └── AppHeader.tsx                    # Top header bar
│
├── lib/
│   ├── api.ts                           # ApiClient singleton (Axios)
│   └── query/
│       └── queryClient.ts              # TanStack Query config
│
├── types/
│   ├── api.ts                           # API request/response types
│   └── user.ts                          # User-related types
│
└── utils/                               # Utility functions
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Yarn (recommended) or npm

### Install & Run

```bash
npm install
npm run setup:local   # creates .env.local once (see .env.example)

# Development (default port 3000 — must match NEXTAUTH_URL in .env.local)
npm run dev

# Alternative port
npm run dev:3001      # then set NEXTAUTH_URL=http://localhost:3001 in .env.local

# Production build
npm run build
npm start
```

---

## Environment Variables

Run `npm run setup:local` to create `.env.local` with a generated `NEXTAUTH_SECRET`, or copy `.env.example` manually.

This build is **internal-only** and uses **mock data only**. The app always calls `/api/mock`; no real backend or `NEXT_PUBLIC_API_URL` is used.

```bash
# ─── Required ───
NEXTAUTH_SECRET=<random-secret-string>          # NextAuth encryption key (auto-filled by setup:local)
NEXTAUTH_URL=http://localhost:3000              # Must match dev server URL (port)
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
```

---

## Authentication

### NextAuth Configuration

```text
Provider:   Credentials (email + password)
Strategy:   JWT (no database sessions)
Max Age:    7 days (idle window; rolls forward on activity, updateAge 1h)
Login API:  POST /admin/login → { _id, username, email, token }
```

### Auth Flow

```text
┌──────────────┐    email/password    ┌────────────────┐
│  SignInForm   │ ──────────────────→  │  NextAuth API   │
│  /signin     │                      │  /api/auth/...  │
└──────────────┘                      └────────┬───────┘
                                               │
                        POST /admin/login      │
                                               ▼
                                      ┌────────────────┐
                                      │  GoGoCash API  │
                                      │  (Backend)     │
                                      └────────┬───────┘
                                               │
                        { token, user data }   │
                                               ▼
                                      ┌────────────────┐
                                      │  JWT Session   │
                                      │  (7d idle exp) │
                                      └────────┬───────┘
                                               │
          accessToken stored in session        │
                                               ▼
                                      ┌────────────────┐
                                      │  AuthGuard     │
                                      │  (protects     │
                                      │   all /admin)  │
                                      └────────────────┘
```

### AuthGuard Component

Wraps all admin routes in `(admin)/layout.tsx`:

- Checks `useSession()` status
- Redirects unauthenticated users to `/signin`
- Shows loading spinner during session check
- Prevents page render until authenticated

### Session Shape

```typescript
interface Session {
  expires: string;
  accessToken?: string;    // JWT from GoGoCash API
}
```

---

## Routes & Pages

### Protected Admin Routes (`/`)

| Path | Component | Description |
| --- | --- | --- |
| `/` | `EcommerceMetrics` + Charts | Dashboard with KPIs, sales charts, demographics |
| `/admin-users` | `AdminUsersTable` | Manage admin user accounts (CRUD) |
| `/users` | `UsersTable` | View & manage regular users |
| `/brands` | `OffersTable` | Browse & manage merchant brands |
| `/brands/create-brand` | `CreateBrandForm` | Create brand from affiliate tracking + app tracking link |
| `/brands?tab=top-brands` | `TopBrandManagementPanel` | Homepage top-brand order (mock API) |
| `/brands/[id]` | `Detail` + `FormOffer` | Individual brand detail & editing |
| `/brands/pending/[id]` | `PendingOfferReviewRouteClient` | Full-page review for merchant-submitted (pending) brands |
| `/withdraw` | `WithdrawTable` | View withdrawal requests |
| `/withdraw/[id]` | `WithdrawDetail` | Tabbed user/withdrawal detail (User Info, Benefits & Scoring, Conversions, Finance, Login Tracking, Delete user data) — approve/reject withdrawals plus the Cashback Wallet section |
| `/conversion` | `ConversionTable` | Track affiliate conversions |
| `/banner` | `BannerTable` ×2 | Main homepage carousel + small-banner strip (separate mock APIs) |
| `/banner/all-brand-page` | `BannerTable` (all-brand variant) | All-brands listing screen banners |
| `/banner/modal-popups` | `AppOpenPopupSettingsForm` | App-open modal popups |
| `/banner/popup-history` | `PopupHistoryTable` | Local snapshots of popup configs |
| `/category` | Category components | Brand category management |
| `/coupon` | Coupon components | Coupon code management |
| `/fee` | `FeeForm` | System fee rate configuration |
| `/profile` | Profile page | Admin profile settings |
| `/calendar` | FullCalendar | Calendar view |

### Public Routes

| Path | Component | Description |
| --- | --- | --- |
| `/signin` | `SignInForm` | Admin login |
| `/signup` | `SignUpForm` | Admin registration |
| `/error-404` | Error page | Not found |

---

## Provider Hierarchy

```tsx
// src/components/providers/ClientProviders.tsx

<QueryClientProvider client={queryClient}>     // TanStack React Query
  <SessionProvider>                             // NextAuth session
    <ThemeProvider>                              // Light/dark mode
      <Toaster />                               // react-hot-toast notifications
      <SidebarProvider>                          // Sidebar expand/collapse
        {children}                               // App content
      </SidebarProvider>
    </ThemeProvider>
  </SessionProvider>
</QueryClientProvider>
```

---

## API Integration

### ApiClient Singleton (`src/lib/api.ts`)

Base URL: **`/api/mock`** only (internal build; all data is mock).

All requests include `Authorization: Bearer {token}` from the NextAuth session.

### Available API Methods (via `useApi` hook)

```typescript
// src/hooks/useApi.ts

const api = useApi();

// ─── Auth ───
api.login(email, password)         // POST /admin/login
api.register(data)                 // POST /admin/register
api.getProfile()                   // GET /auth/profile
api.updateProfile(data)            // PUT /user/profile

// ─── Admin Users ───
api.getAdminUsers(query?)          // GET /admin?limit=12&page=1&search=
api.createAdminUser(data)          // POST /admin
api.updateAdminUser(id, data)      // PUT /admin/:id
api.deleteAdminUser(id)            // DELETE /admin/:id

// ─── Regular Users ───
api.getUsers(query?)               // GET /user?limit=12&page=1&search=
api.createUser(data)               // POST /user
api.updateUser(id, data)           // PUT /user/:id
api.deleteUser(id)                 // DELETE /user/:id

// ─── Offers ───
api.getOffers(query?)              // GET /offer/admin?search=&limit=&page=
api.createOffer(data)              // POST /offer
api.updateOffer(id, data)          // PUT /offer/:id
api.deleteOffer(id)                // DELETE /offer/:id
api.updateListOffer(token)         // Sync offers from Involve Asia

// ─── Withdrawals & Conversions ───
api.getWithdraws(query, token)     // GET /admin/withdraw-all?limit=&page=
api.getConversion(query, token)    // GET /admin/conversion-all?limit=&page=

// ─── Fee Settings ───
api.getFee(token)                  // GET /admin/get-fee-rate
api.updateFee(form, token)         // PATCH /admin/update-fee-rate/:id

// ─── State ───
api.loading                        // boolean
api.error                          // string | null
api.clearError()
```

### TanStack Query Configuration

```typescript
// src/lib/query/queryClient.ts

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      staleTime: 0,
    },
  },
});
```

---

## Component Library

### Table Components

All management pages follow a consistent pattern:

```text
┌──────────────────────────────────────────┐
│  PageBreadCrumb (navigation trail)       │
├──────────────────────────────────────────┤
│  SearchTable (search input + actions)    │
├──────────────────────────────────────────┤
│  DataTable/BasicTableOne                 │
│  ┌─────┬──────────┬──────────┬────────┐  │
│  │ #   │ Name     │ Status   │ Action │  │
│  ├─────┼──────────┼──────────┼────────┤  │
│  │ 1   │ ...      │ ...      │ ✏️ 🗑️ │  │
│  │ 2   │ ...      │ ...      │ ✏️ 🗑️ │  │
│  └─────┴──────────┴──────────┴────────┘  │
├──────────────────────────────────────────┤
│  Pagination (prev/next, page numbers)    │
└──────────────────────────────────────────┘
```

### Form Components

| Component | File | Description |
| --- | --- | --- |
| `Input` | `form/Input/` | Text, number, email inputs |
| `Select` | `form/Select.tsx` | Single select dropdown |
| `MultiSelect` | `form/MultiSelect.tsx` | Multi-select with tags |
| `Switch` | `form/Switch/` | Toggle switches |
| `DatePicker` | `form/date-picker.tsx` | Flatpickr date input |
| `Label` | `form/Label.tsx` | Form field labels |

### UI Components

| Component | Path | Description |
| --- | --- | --- |
| `Alert` | `ui/alert/` | Info/success/warning/error banners |
| `Badge` | `ui/badge/` | Status badges with variants |
| `Button` | `ui/button/` | Primary/secondary/ghost buttons |
| `Dropdown` | `ui/dropdown/` | Dropdown menus |
| `Modal` | `ui/modal/` | Dialog overlays |
| `Table` | `ui/table/` | Styled table components |

---

## Dashboard Features

The main dashboard (`/`) displays:

```text
┌──────────────────────────────────────────────────┐
│              EcommerceMetrics                      │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐            │
│  │Users │ │Sales │ │Orders│ │Growth│             │
│  │ 1.2K │ │ $24K │ │ 580  │ │ +12% │            │
│  └──────┘ └──────┘ └──────┘ └──────┘            │
├──────────────────────────────────────────────────┤
│                                                   │
│  ┌─────────────────────┐ ┌──────────────────────┐│
│  │ MonthlySalesChart   │ │ StatisticsChart      ││
│  │ (ApexCharts Line)   │ │ (ApexCharts Bar)     ││
│  └─────────────────────┘ └──────────────────────┘│
│                                                   │
│  ┌─────────────────────┐ ┌──────────────────────┐│
│  │ MonthlyTarget       │ │ DemographicCard      ││
│  │ (Progress ring)     │ │ (User breakdown)     ││
│  └─────────────────────┘ └──────────────────────┘│
│                                                   │
│  ┌─────────────────────┐ ┌──────────────────────┐│
│  │ RecentOrders        │ │ CountryMap           ││
│  │ (Latest activity)   │ │ (jvectormap world)   ││
│  └─────────────────────┘ └──────────────────────┘│
└──────────────────────────────────────────────────┘
```

---

## State Management

### React Context

- **`SidebarContext`** (`context/SidebarContext.tsx`):
  `isExpanded`, `isMobileOpen`, `isHovered`, `activeItem`, `openSubmenu`
- **`ThemeContext`** (`context/ThemeContext.tsx`):
  `theme` ("light" / "dark"), persisted to `localStorage`

### TanStack React Query

Used for server state caching. Configured with no auto-refetching to give admin users full control
over data freshness.

### NextAuth Session

JWT-based session with `accessToken` for API authorization. 7-day idle expiry (rolls forward on activity; `updateAge` 1h).

---

## Styling

### Tailwind CSS 4 + Dark Mode

- **PostCSS plugin**: `@tailwindcss/postcss`
- **Dark mode**: Class-based (`dark:` prefix), toggled via `ThemeContext`
- **Auto-sort**: Prettier plugin `prettier-plugin-tailwindcss`

### Material-UI 9

- `@mui/material` for DataGrid and complex components
- `@emotion/react` + `@emotion/styled` for CSS-in-JS

### Path Aliases

```json
// tsconfig.json
{ "@/*": "./src/*" }
```

---

## Type Definitions

### Key Types (`src/types/api.ts`)

```typescript
// Auth
interface LoginRequest { email: string; password: string }
interface LoginResponse { _id, username, email, token, createdAt, updatedAt }

// Admin Users
interface DataAdminUsers { _id, username, password, email, createdAt, updatedAt }
interface AdminUsersResponse { data: DataAdminUsers[], pagination: Pagination }

// Regular Users
interface RegularUser {
  _id, address, email, username, mobile?, id_firebase, id_crossmint,
  id_twitter, country?, gender?, birthdate?, createdAt, updatedAt
}

// Offers
interface Offer {
  _id, offer_id, offer_name, categories, countries, currency,
  logo, logo_desktop, logo_mobile, banner, tracking_link, ...
}

// Withdrawals
interface DataWithdrawsList {
  user_id, amount_total, amount_net, percent_fee, status,
  method, tx_hash, conversion_id[], slip_file, ...
}

// Conversions
interface DataConversion {
  conversion_id, offer_id, aff_sub1, conversion_status,
  currency, sale_amount, payout, user, ...
}

// Fee Settings
interface ResponseFee {
  _id, system, minimum_withdraw_thb, minimum_withdraw_usd,
  fee_withdraw_thb, fee_withdraw_usd
}

// Pagination
interface Pagination { page, limit, total, totalPages }
```

---

## Deployment

This app lives in a monorepo (`apps/admin`). The wired-up paths are a Docker image
for Cloud Run, Firebase (App Hosting or static export), and Vercel. See the dedicated
guides for step-by-step instructions:

- [`DEPLOY_FIREBASE.md`](./DEPLOY_FIREBASE.md) — Firebase App Hosting (frontend + mock API) or static export.
- [`DEPLOY_VERCEL.md`](./DEPLOY_VERCEL.md) — Vercel deploy.
- [`DEPLOY_CLOUDFLARE.md`](./DEPLOY_CLOUDFLARE.md) — Cloudflare Workers/Pages via OpenNext (scaffolding present; npm scripts not yet wired).
- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — general Google Cloud notes.

### Docker → Cloud Run

The repo ships a multi-stage [`Dockerfile`](./Dockerfile) that builds the Next.js
**standalone** output. Key facts:

- **Build context is the monorepo root**, not `apps/admin` (the single root
  `package-lock.json` drives the npm workspace install):
  ```bash
  docker build -f apps/admin/Dockerfile -t gogocash-admin .
  docker run -p 8080:8080 --env-file .env gogocash-admin
  ```
- Base image **`node:22-slim`**; install via **`npm ci --legacy-peer-deps`**; build
  via `npm run build:standalone -w gogocash-admin`.
- Runs as non-root (`nextjs:nodejs`); entrypoint `node apps/admin/server.js`; listens on **port 8080**.
- Target image/region: `asia-southeast1-docker.pkg.dev/gogocash-staging/gogocash/gogocash-admin` (Cloud Run, asia-southeast1).
- `NEXT_PUBLIC_API_URL` is inlined at build time and defaults to the **staging API**
  (so the container talks to the real staging backend, not the in-process mock);
  override with `--build-arg NEXT_PUBLIC_API_URL=...`.

> **Note:** there is no admin-specific `cloudbuild.yaml` or `k8s/` directory in this
> app today (the only `cloudbuild.yaml` in the repo belongs to `apps/api`). Earlier
> versions of this README described Cloud Build, GKE, and `gcr.io`/`us-central1`
> flows that no longer match the repo.

### App Engine (`app.yaml`)

An [`app.yaml`](./app.yaml) is present:

- Runtime: **Node.js 22**
- Auto-scaling: 0–10 instances, CPU target 60%
- Resources: 1 CPU, 0.5 GB RAM

```bash
gcloud app deploy app.yaml
```

---

## Sidebar Navigation Structure

```text
Dashboard
├── Ecommerce (/)

Users Management
├── Users Admin (/admin-users)
└── Users (/users)

Brands Management
├── Create brand (/brands/create-brand)
├── Brands (/brands)
├── Commission Management (/brands?tab=commission)
├── Policy Management (/brands?tab=policy)
├── User tracking link (/brands?tab=deeplink)
└── Top brands (/brands?tab=top-brands)

Category Management
└── Category (/category)

Withdraw Management
└── Withdraw (/withdraw)

Conversion Management
└── Conversion (/conversion)

Banner Homepage
└── Banner (/banner)

Coupon
└── Coupon (/coupon)

Others
└── Fee rate (/fee)
```

---

## Key Libraries

| Library | Version | Purpose |
| --- | --- | --- |
| `next` | 16.2.9 | React framework (App Router, SSR) |
| `react` | 19.2.0 | UI library |
| `next-auth` | 4.24.13 | Authentication (JWT + Credentials) |
| `@tanstack/react-query` | 5.101.0 | Server state management |
| `axios` | 1.18.0 | HTTP client |
| `tailwindcss` | 4.0.0 | Utility-first CSS |
| `@mui/material` | 9.1.1 | Component library |
| `apexcharts` | 5.15.0 | Interactive charts |
| `@fullcalendar/react` | 6.1.15 | Calendar component |
| `@react-jvectormap/world` | - | World map visualization |
| `react-hot-toast` | 2.6.0 | Toast notifications |
| `flatpickr` | - | Date/time picker |
| `react-dropzone` | 14.3.5 | File upload drag & drop |
| `react-dnd` | 16.0.1 | Drag and drop |
| `libphonenumber-js` | 1.12.33 | Phone number formatting |
| `swiper` | 11.2.0 | Touch slider/carousel |
| `tailwind-merge` | 2.6.0 | Merge Tailwind classes |

---

## Developer Onboarding

1. **Start here**: Read [Authentication](#authentication) and [Routes & Pages](#routes--pages) to understand the app structure.
2. **Run locally**: `npm run dev` → open [http://localhost:3000](http://localhost:3000) → sign in with admin credentials.
3. **Key files to read first**:
   - `src/app/(admin)/layout.tsx` — Admin shell layout
   - `src/lib/api.ts` — API client (all endpoints)
   - `src/hooks/useApi.ts` — React hook wrapping the API client
   - `src/components/auth/AuthGuard.tsx` — Route protection
4. **Adding a new management page**:
   - Create route: `src/app/(admin)/(others-pages)/your-page/page.tsx`
   - Create component: `src/components/your-feature/YourTable.tsx`
   - Add API methods to `lib/api.ts` and `hooks/useApi.ts`
   - Add sidebar entry in `layout/AppSidebarContent.tsx` (`navItems` / `othersItems`)
5. **Follow the pattern**: Every management page uses `SearchTable` + data table + `Pagination`.
