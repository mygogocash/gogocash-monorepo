import type { DefaultSession } from "next-auth";

/**
 * Single source of truth for NextAuth JWT / User / Session extensions.
 * Keeps `auth.ts` and `authFirebase.ts` free of `any` and duplicate `declare module` blocks.
 */
declare module "next-auth" {
  interface User {
    /** NextAuth / JWT subject; use with `_id` from API when present. */
    id?: string;
    access_token?: string;
    refresh_token?: string;
    expires?: string;
    wallet?: string;
    username?: string;
    _id?: string;
    region?: string;
    mobile?: string;
    birthdate?: string;
    gender?: string;
    id_telegram?: string;
    provider?: string;
    is_new_user?: boolean;
    auth_flow?: "register" | "login";
    id_twitter?: string;
    avatar_url?: string | null;
  }

  interface Session {
    user: {
      id?: string;
      access_token?: string;
      refresh_token?: string;
      wallet?: string;
      username?: string;
      _id?: string;
      region?: string;
      mobile?: string;
      birthdate?: string;
      gender?: string;
      provider?: string;
      is_new_user?: boolean;
      auth_flow?: "register" | "login";
      id_telegram?: string;
      id_twitter?: string;
      avatar_url?: string | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token?: string;
    refresh_token?: string;
    expires?: string;
    username?: string;
    address?: string;
    wallet?: string;
    _id?: string;
    region?: string;
    mobile?: string;
    birthdate?: string;
    gender?: string;
    provider?: string;
    is_new_user?: boolean;
    auth_flow?: "register" | "login";
    id_telegram?: string;
    avatar_url?: string | null;
  }
}
