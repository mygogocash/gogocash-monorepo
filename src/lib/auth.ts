import { getNextAuthSecret } from "@/lib/nextAuthSecret";
import type { AuthOptions, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { signInCrossmint } from "./services/auth";

// interface CrossmintLoginResult {
//   success: boolean;
//   data?: {
//     user?: {
//       id?: string;
//       email?: string;
//       firstName?: string;
//       lastName?: string;
//     };
//     // buyer?: any;
//     wallet?: any;
//     access_token?: string;
//     refresh_token?: string;
//     expires?: any;
//     username?: string;
//   };
//   error?: string;
// }
export const authOptions: AuthOptions = {
  debug: process.env.NODE_ENV === "development",
  providers: [
    CredentialsProvider({
      id: "crossmint",
      name: "Crossmint",
      credentials: {
        jwt: { label: "Crossmint JWT", type: "text" },
        userId: { label: "User ID", type: "text" },
        // _id: { label: 'Mongo ID', type: 'text' },
        email: { label: "Email", type: "email" },
        address: { label: "Address", type: "text" },
        username: { label: "Username", type: "text" },
        id_twitter: { label: "Twitter ID", type: "text" },
        referral_id: { label: "Referral ID", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.jwt) {
            throw new Error("Crossmint JWT is required");
          }

          // Perform Web3 login with Crossmint JWT
          // const loginResult = await performCrossmintLogin(credentials.jwt);

          if (credentials.jwt) {
            const response = await signInCrossmint(
              {
                address: credentials.address,
                id_crossmint: credentials?.userId || "",
                email: credentials?.email || "",
                referral_id: credentials?.referral_id || "",
              },
              credentials.jwt
            );
            if (response) {
              const userData = response?.user;
              const fullName = userData?.username;
              // console.log('User Data:', userData);

              return {
                id: userData?.id_crossmint || credentials.userId || "unknown",
                email: userData?.email || credentials.email || "",
                username: fullName,
                id_twitter: userData.id_twitter,
                wallet: userData.address,
                access_token: credentials?.jwt,
                _id: userData._id,
                region: userData.country,
                mobile: userData.mobile,
                birthdate: userData.birthdate,
                gender: userData.gender,
              } as unknown as User;
            }
          }
          // If login failed, throw error with details
          throw new Error(
            `Crossmint authentication failed: ${credentials.address || "Unknown error"}`
          );
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
            refresh_token: user?.refresh_token || session?.user?.refresh_token,
            // expires: user.expires,
            // user: user.user,
            // buyer: user.buyer,
            username: user?.username || session?.user?.username,
            address: user?.wallet || session?.user?.wallet,
            wallet: user?.wallet || session?.user?.wallet,
            crossmint_user_id: user?.crossmint_user_id || session?.user?.crossmint_user_id,
            crossmint_jwt: user?.crossmint_jwt || session?.user?.crossmint_jwt,
            _id: user?._id || session?.user?._id,
            region: user?.region || session?.user?.region,
            mobile: user?.mobile || session?.user?.mobile,
            birthdate: user?.birthdate || session?.user?.birthdate,
            gender: user?.gender || session?.user?.gender,
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
            crossmint_user_id: token.crossmint_user_id,
            crossmint_jwt: token.crossmint_jwt,
            _id: token._id,
            region: token.region,
            mobile: token.mobile,
            birthdate: token.birthdate,
            gender: token.gender,
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
