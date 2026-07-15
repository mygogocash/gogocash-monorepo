import type { MobileSession } from "@mobile/auth/session";

// Backend login envelope (POST /auth/log-in | /auth/register) — mirrors the web's
// IResponseLogin (src/interfaces/auth.ts): the GoGoCash JWT in `token` plus the user
// record. Verified live: the endpoint replies "Firebase token is required in
// Authorization header or body", and returns this shape on success.
export type BackendLoginResponse = {
  message?: string;
  token?: string;
  is_new_user?: boolean;
  auth_flow?: "login" | "register";
  user?: {
    _id?: string;
    email?: string;
    username?: string;
    country?: string;
    mobile?: string;
    wallet?: string;
    address?: string;
    birthdate?: string;
    gender?: string;
    id_telegram?: string;
    avatar_url?: string;
    membership_tier?: string;
    provider?: string;
  };
};

// Maps the backend envelope into the persisted mobile session.
export function mapLoginResponseToMobileSession(response: BackendLoginResponse): MobileSession {
  const token = response.token?.trim();
  if (!token) {
    throw new Error("Backend login response is missing the session token.");
  }

  const user = response.user ?? {};
  const session: MobileSession = {
    access_token: token,
    provider: typeof user.provider === "string" && user.provider.trim() ? user.provider : "firebase",
  };

  if (user._id) session._id = user._id;
  if (user.email) session.email = user.email;
  if (user.username) session.username = user.username;
  if (user.country) session.region = user.country;
  if (user.mobile) session.mobile = user.mobile;
  const wallet = user.wallet ?? user.address;
  if (wallet) session.wallet = wallet;
  if (user.birthdate) session.birthdate = user.birthdate;
  if (user.gender) session.gender = user.gender;
  if (user.id_telegram) session.id_telegram = user.id_telegram;
  if (user.avatar_url) session.avatar_url = user.avatar_url;
  if (user.membership_tier) session.membership_tier = user.membership_tier;
  if (typeof response.is_new_user === "boolean") session.is_new_user = response.is_new_user;
  if (response.auth_flow) session.auth_flow = response.auth_flow;

  return session;
}

// Exchanges a Firebase ID token for a backend session (web parity: signInFirebase in
// src/lib/services/auth.ts sends the token as a Bearer header AND in the body — the
// backend accepts either; the token never appears in a URL).
export async function exchangeFirebaseIdToken({
  apiUrl,
  country,
  fetchImpl = fetch,
  idToken,
  intent = "login",
}: {
  apiUrl: string;
  country?: string;
  fetchImpl?: typeof fetch;
  idToken: string;
  intent?: "login" | "register";
}): Promise<MobileSession> {
  const baseUrl = apiUrl.replace(/\/+$/, "");
  const endpoint = intent === "register" ? "register" : "log-in";
  const response = await fetchImpl(`${baseUrl}/auth/${endpoint}`, {
    body: JSON.stringify({ token: idToken, ...(country ? { country } : {}) }),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  const payload = (await response.json().catch(() => ({}))) as BackendLoginResponse & {
    message?: string;
  };
  if (!response.ok) {
    throw new Error(payload?.message || `Login failed with status ${response.status}.`);
  }

  return mapLoginResponseToMobileSession(payload);
}
