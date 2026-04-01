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
