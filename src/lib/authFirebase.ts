import { getNextAuthSecret } from "@/lib/nextAuthSecret";
import type { AuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { registerFirebase, signInFirebase } from "./services/auth";
import client from "./axios/client";
import { User as IUser } from "@/interfaces/auth";
import { mockSignInUser } from "@/mocks/auth/signInMockData";
import { DEV_PHONE_CREDENTIAL_JWT, devPhoneMockIsNewUser } from "@/lib/dev/phoneAuthMock";

export const authOptions: AuthOptions = {
  debug: process.env.NODE_ENV === "development",
  providers: [
    CredentialsProvider({
      id: "firebase",
      name: "Firebase",
      credentials: {
        jwt: { label: "Firebase JWT", type: "text" },
        type: { label: "Type", type: "text" },
        // userId: { label: "User ID", type: "text" },
        // _id: { label: 'Mongo ID', type: 'text' },
        email: { label: "Email", type: "email" },
        address: { label: "Address", type: "text" },
        id_twitter: { label: "Twitter ID", type: "text" },
        referral_id: { label: "Referral ID", type: "text" },
        country: { label: "Country ID", type: "text" },
        pathname: { label: "Pathname", type: "text" },
        locale: { label: "Locale", type: "text" },
        posthog_distinct_id: { label: "PostHog Distinct ID", type: "text" },
        posthog_anonymous_id: {
          label: "PostHog Anonymous ID",
          type: "text",
        },
        auth_flow: { label: "Auth Flow", type: "text" },
        is_new_user: { label: "Is New User", type: "text" },
        mobile_snapshot: { label: "Mobile snapshot", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (credentials?.type === "dev_phone") {
            if (process.env.NODE_ENV !== "development") {
              return null;
            }
            if (credentials.jwt !== DEV_PHONE_CREDENTIAL_JWT) {
              return null;
            }
            const u = mockSignInUser;
            const mobile = credentials.mobile_snapshot?.trim() || u.mobile;
            const authFlow = credentials?.auth_flow === "register" ? "register" : "login";
            return {
              email: u.email,
              username: u.username,
              id_twitter: u.id_twitter,
              wallet: u.address,
              access_token: credentials.jwt,
              _id: u._id,
              region: credentials.country || u.country,
              mobile,
              birthdate: u.birthdate,
              gender: u.gender,
              id_telegram: u.id_telegram,
              provider: "phone_dev",
              is_new_user: devPhoneMockIsNewUser(credentials.mobile_snapshot, authFlow),
              auth_flow: authFlow,
            } as unknown as User;
          }
          if (credentials?.type === "telegram") {
            const res = await client
              .get<IUser>(`/user/profile`, {
                headers: {
                  Authorization: `Bearer ${credentials.jwt}`,
                },
              })
              .then((response) => response.data);

            if (res) {
              const userData = res;
              const tokenData = credentials.jwt;
              const fullName = userData?.username;
              // console.log('User Data:', userData);
              return {
                // id: userData?.id_crossmint || credentials.userId || "unknown",
                email: userData?.email || credentials.email || "",
                username: fullName,
                id_twitter: userData.id_twitter,
                wallet: userData.address,
                access_token: tokenData,
                _id: userData._id,
                region: userData.country,
                mobile: userData.mobile,
                birthdate: userData.birthdate,
                gender: userData.gender,
                id_telegram: userData.id_telegram,
                provider: userData.provider,
                is_new_user: credentials?.is_new_user === "true",
                auth_flow: credentials?.auth_flow === "register" ? "register" : "login",
              } as unknown as User;
            }
            return null;
          } else {
            if (!credentials?.jwt) {
              throw new Error("Crossmint JWT is required");
            }

            // Perform Web3 login with Crossmint JWT
            // const loginResult = await performCrossmintLogin(credentials.jwt);
            // console.log("credentials", credentials);
            const pathname = credentials?.pathname || "";
            if (credentials.jwt) {
              let response;
              if (pathname === "/register") {
                response = await registerFirebase({
                  token: credentials.jwt,
                  referral_id: credentials?.referral_id || "",
                  country: credentials?.country || "",
                  pathname,
                  locale: credentials?.locale || "",
                  posthog_distinct_id: credentials?.posthog_distinct_id || "",
                  posthog_anonymous_id: credentials?.posthog_anonymous_id || "",
                }).catch(() => {
                  throw new Error("Registration required");
                });
              } else {
                response = await signInFirebase({
                  token: credentials.jwt,
                  referral_id: credentials?.referral_id || "",
                  country: credentials?.country || "",
                  pathname,
                  locale: credentials?.locale || "",
                  posthog_distinct_id: credentials?.posthog_distinct_id || "",
                  posthog_anonymous_id: credentials?.posthog_anonymous_id || "",
                }).catch(() => {
                  throw new Error("Registration required");
                });
                // console.log('res', response);
              }
              // console.log('Response:', response);

              if (response) {
                const userData = response?.user;
                const tokenData = response?.token;
                const fullName = userData?.username;
                // console.log('User Data:', userData);

                return {
                  // id: userData?.id_crossmint || credentials.userId || "unknown",
                  email: userData?.email || credentials.email || "",
                  username: fullName,
                  id_twitter: userData.id_twitter,
                  wallet: userData.address,
                  access_token: tokenData,
                  _id: userData._id,
                  region: userData.country,
                  mobile: userData.mobile,
                  birthdate: userData.birthdate,
                  gender: userData.gender,
                  id_telegram: userData.id_telegram,
                  provider: userData.provider,
                  is_new_user: response?.is_new_user || false,
                  auth_flow: response?.auth_flow || "login",
                } as unknown as User;
              }
            }
            // If login failed, throw error with details
            throw new Error(
              `Crossmint authentication failed: ${credentials.address || "Unknown error"}`
            );
          }
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, session }) {
      try {
        // console.log("user", user);
        // console.log("token", token);

        if (user || session) {
          // console.log('session', session);
          // console.log('user', user);

          // Store user data in token on first sign in
          return {
            ...token,
            access_token: user?.access_token || session?.user?.access_token,
            username: user?.username || session?.user?.username,
            address: user?.wallet || session?.user?.wallet,
            wallet: user?.wallet || session?.user?.wallet,
            _id: user?._id || session?.user?._id,
            region: user?.region || session?.user?.region,
            mobile: user?.mobile || session?.user?.mobile,
            birthdate: user?.birthdate || session?.user?.birthdate,
            gender: user?.gender || session?.user?.gender,
            id_telegram: user?.id_telegram || session?.user?.id_telegram,
            provider: user?.provider || session?.user?.provider,
            is_new_user:
              typeof user?.is_new_user === "boolean"
                ? user.is_new_user
                : session?.user?.is_new_user,
            auth_flow: user?.auth_flow || session?.user?.auth_flow,
          };
        }

        return token;
      } catch {
        return token;
      }
    },
    async session({ session, token }) {
      try {
        // console.log("token session", token);
        // console.log("session session", session);

        return {
          ...session,
          user: {
            ...session.user,
            id: token.sub,
            email: token?.email || session.user?.email,
            username: typeof token?.username === "string" ? token.username : session.user?.username,
            access_token: token.access_token,
            refresh_token: token.refresh_token,
            // expires: expiresData,
            // user: userData,
            // buyer: buyerData,
            wallet: token.wallet,
            _id: token._id,
            region: token.region,
            mobile: token.mobile,
            birthdate: token.birthdate,
            gender: token.gender,
            id_telegram: token.id_telegram,
            provider: token.provider,
            is_new_user:
              typeof token.is_new_user === "boolean"
                ? token.is_new_user
                : session.user?.is_new_user,
            auth_flow:
              typeof token.auth_flow === "string"
                ? (token.auth_flow as "register" | "login")
                : session.user?.auth_flow,
          },
        };
      } catch {
        return session;
      }
    },
  },
  secret: getNextAuthSecret(),
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login", // Custom login (OAuth) before any credential flows
  },
};
