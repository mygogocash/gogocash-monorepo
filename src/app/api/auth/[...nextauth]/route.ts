import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiClient } from "@/lib/api";
import { ApiError } from "@/types/api";

export interface User {
  name: string;
  email: string;
}

export interface DataSession {
  user: User;
  expires: Date;
  accessToken?: string;
}
declare module "next-auth" {
  interface JWT {
    accessToken?: string;
  }
  interface User {
    user: User;
    expires: string;
    accessToken?: string;
  }
  interface Session {
    expires: string;
    accessToken?: string;
  }
}
const authOptions = {
  // Configure one or more authentication providers
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        try {
          const userData = await apiClient.login({
            email: credentials.email,
            password: credentials.password,
          });
          return {
            id: userData._id,
            name: userData.username,
            email: userData.email,
            image: undefined, // No avatar in your API response
            accessToken: userData.token, // Store the token for later use
          };
        } catch (error) {
          const apiError = error as ApiError;
          console.error("Authentication error:", error);
          console.error("Authentication error:", apiError.message);
          return null;
        }
      },
    }),
    // ...add more providers here
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, account, user }: { token: any; account: any; user: any }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = user.accessToken;
      }
      return token;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      // Send properties to the client, like an access_token from a provider.
      session.accessToken = token.accessToken;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/signin", // Redirect to home page for sign-in
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = NextAuth(authOptions as any);

export { handler as GET, handler as POST };
