import NextAuth from "next-auth/next";
import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiClient } from "@/lib/api";
import { devError } from "@/lib/devConsole";
import { isMockAdminPasswordAllowed } from "@/lib/mockAuthPolicy";

const authOptions: NextAuthOptions = {
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
        const { email, password } = credentials;

        if (password === "1234" && isMockAdminPasswordAllowed()) {
          const mockEmail = (email ?? "").trim().toLowerCase() || "admin@gogocash.co";
          return {
            id: "a1",
            name: "admin",
            email: mockEmail,
            image: undefined,
            accessToken: "mock-jwt-token-for-development",
          };
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
            image: undefined,
            accessToken: userData.token,
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : typeof error === "object" && error && "message" in error
              ? String((error as { message: unknown }).message)
              : "Unknown error";
          devError("NextAuth authorize failed:", message);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: NextAuthUser | undefined }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      if (token.id) session.user.id = token.id;
      if (token.name) session.user.name = token.name;
      if (token.email) session.user.email = token.email;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/signin",
  },
};

const isFirebaseStaticExport = process.env.BUILD_FOR_FIREBASE === "1";

export function generateStaticParams() {
  if (!isFirebaseStaticExport) {
    return [];
  }
  return [
    { nextauth: ["signin"] },
    { nextauth: ["signout"] },
    { nextauth: ["session"] },
    { nextauth: ["csrf"] },
    { nextauth: ["providers"] },
    { nextauth: ["callback", "credentials"] },
    { nextauth: ["error"] },
  ];
}

export const dynamic = "auto";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
