import type { DefaultSession } from "next-auth";

/**
 * Single source of truth for NextAuth JWT / User / Session extensions.
 * Keeps `auth.ts` and `authFirebase.ts` free of `any` and duplicate `declare module` blocks.
 */
declare module "next-auth" {
  interface User {
    access_token?: string;
    refresh_token?: string;
    expires?: string;
    wallet?: string;
    crossmint_user_id?: string;
    crossmint_jwt?: string;
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
  }

  interface Session {
    user: {
      access_token?: string;
      refresh_token?: string;
      wallet?: string;
      crossmint_user_id?: string;
      crossmint_jwt?: string;
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
    crossmint_user_id?: string;
    crossmint_jwt?: string;
    _id?: string;
    region?: string;
    mobile?: string;
    birthdate?: string;
    gender?: string;
    provider?: string;
    is_new_user?: boolean;
    auth_flow?: "register" | "login";
    id_telegram?: string;
  }
}
