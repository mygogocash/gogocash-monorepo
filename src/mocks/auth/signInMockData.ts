import type { IResponseLogin, User } from "@/interfaces/auth";

/** Stable mock user aligned with `User` for login/register API shapes. */
export const mockSignInUser: User = {
  _id: "mock_user_507f1f77bcf86cd799439011",
  address: "0xmock000000000000000000000000000000000001",
  __v: 0,
  email: "mock.user@gogocash.test",
  id_twitter: "",
  username: "Mock User",
  country: "TH",
  provider: "google",
  mobile: "+66800000000",
  birthdate: "1990-01-01",
  gender: "unspecified",
  id_telegram: undefined,
};

/** Mock backend `POST /auth/log-in` success body (existing user). */
export function createMockSignInResponse(overrides?: Partial<IResponseLogin>): IResponseLogin {
  return {
    message: "Login successful",
    user: { ...mockSignInUser, ...overrides?.user },
    token: "mock.jwt.access-token.signin",
    is_new_user: false,
    auth_flow: "login",
    ...overrides,
  };
}

/** Mock backend `POST /auth/register` success body (new user). */
export function createMockRegisterResponse(overrides?: Partial<IResponseLogin>): IResponseLogin {
  return {
    message: "Registration successful",
    user: {
      ...mockSignInUser,
      email: "new.user@gogocash.test",
      username: "New Mock User",
      provider: "google",
      ...overrides?.user,
    },
    token: "mock.jwt.access-token.register",
    is_new_user: true,
    auth_flow: "register",
    ...overrides,
  };
}

/**
 * Placeholder Firebase ID token string (not a real JWT — use only in tests / Storybook).
 * Real flows obtain this via `signInWithPopup` → `user.getIdToken()`.
 */
export const mockFirebaseIdToken =
  "eyJhbGciOiJub25lIn0.eyJtb2NrIjp0cnVlLCJzdWIiOiJtb2NrLWZpcmViYXNlLXVpZCJ9.";

/** Mock `POST /auth/log-in/telegram` + NextAuth `type: "telegram"` handoff. */
export const mockTelegramSignInResponse: IResponseLogin = {
  message: "Telegram login successful",
  user: {
    ...mockSignInUser,
    email: "telegram.user@gogocash.test",
    username: "Telegram Mock",
    id_telegram: "123456789",
    provider: "telegram",
  },
  token: "mock.jwt.telegram-session",
  is_new_user: false,
  auth_flow: "login",
};

/**
 * Mock OTP endpoints (no response body assumed in app).
 * For Telegram email verification with the in-repo API mock, use
 * `DEV_EMAIL_OTP_*` and codes from `@/lib/dev/emailOtpMock` instead.
 */
export const mockSendOtpPayload = { email: "mock.user@gogocash.test" };
export const mockVerifyOtpPayload = { email: "mock.user@gogocash.test", otp: "123456" };
