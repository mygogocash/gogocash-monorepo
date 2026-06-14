# Admin API surface (withdraw & MyCashback)

These routes are called from the Next.js admin via `src/lib/axios/client` (base URL `/api/mock` in local/static mock mode, or your deployed API as configured).

## MyCashback users

- **POST** `/admin/list-mycashback-users`
- **Body:** `{ page: number; limit: number; search: string }`
- **Wrapper:** `listMyCashbackUsers` in `src/lib/api/myCashbackUsersApi.ts`
- **UI:** `MyCashbackUsersTable` (React Query key `["myCashbackUsers", page, searchQuery]`)

## Withdraw user profile & contacts

- **POST** `/withdraw/send-user-contact-otp`  
  **Body:** `{ userId, channel: "email" | "mobile", target }`  
  **Response (mock):** may include `demoCode` and `message`.

- **POST** `/withdraw/verify-user-contact-otp`  
  **Body:** `{ userId, channel, target, otp }`

- **POST** `/withdraw/update-withdraw-user`  
  **Body:** `{ userId, emails, mobiles, fullName, gender, birthdate, wallet, gogopassActive }`

Wrappers live in `src/lib/api/withdrawUserContactApi.ts`. The withdraw user editor is `WithdrawUserContactEditor`.

### Mock OTP hint in the UI

Set **`NEXT_PUBLIC_SHOW_MOCK_OTP_HINT`** to `1` / `true` / `yes` to show demo codes returned by the API; `0` / `false` / `no` to hide. If unset, hints show only when **`NODE_ENV === "development"`** (`shouldShowMockOtpHint` in `src/lib/mockOtpHint.ts`).

## Cashback wallet & approval

The "Cashback Wallet" section of the withdraw user detail page (route `/withdraw/[id]`)
drives these routes. Wrappers live in `src/lib/api/adminModulesApi.ts`.

- **GET** `/admin/wallets/:userId`
- **Response (mock):** `{ wallet, recentTransactions }`
- **Wrapper:** `getWalletDetail`
- **UI:** `UserWalletPanel` (toggled by the "Adjust Wallet" button)

- **PUT** `/admin/wallets/:userId/freeze`
- **PUT** `/admin/wallets/:userId/unfreeze`
- **Wrappers:** `putWalletFreeze` / `putWalletUnfreeze` (driven by the freeze `Switch` in `UserWalletPanel`)

- **POST** `/admin/wallets/:userId/adjust`
- **Body:** `{ type: "credit" | "debit"; amount: number; currency; reason: string; adminId: string }`
- **Wrapper:** `postWalletAdjust`
- **Behavior (mock):** a `credit` of `cashback` currency does **not** credit the balance immediately — it files a **pending** "Extra cashback" conversion; other adjustments apply to the balance directly.

- **POST** `/admin/wallets/cashback-request/:conversionId`
- **Body:** `{ action: "approve" | "reject"; reason? }`
- **Wrapper:** `resolveCashbackRequest(conversionId, action, reason?)`
- **UI:** `CashbackApprovalNotice` ("Cashback approval needed") with inline Approve / Reject; the cashback balance is credited only on **approve**, and the optional `reason` is recorded on **reject**.
