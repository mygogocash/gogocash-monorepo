import NextAuth from "next-auth/next";
import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiClient } from "@/lib/api";
import { devError } from "@/lib/devConsole";
import { isMockAdminPasswordAllowed } from "@/lib/mockAuthPolicy";
import { DEFAULT_MOCK_ACCESS_TOKEN } from "@/lib/authTokens";
import { mockRoleForEmail, resolveTokenRole } from "@/lib/mockAdminRole";

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
          const mockEmail =
            (email ?? "").trim().toLowerCase() || "admin@gogocash.co";
          return {
            id: "a1",
            name: "admin",
            email: mockEmail,
            image: undefined,
            accessToken: DEFAULT_MOCK_ACCESS_TOKEN,
            role: mockRoleForEmail(mockEmail),
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
            role: (userData as { role?: string }).role ?? "viewer",
          };
        } catch (error) {
          const message =
            error instanceof Error
              ? error.message
              : typeof error === "object" && error && "message" in error
                ? String((error as { message: unknown }).message)
                : "Unknown error";
          devError("NextAuth authorize failed:", message);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({
      token,
      user,
    }: {
      token: JWT;
      user?: NextAuthUser | undefined;
    }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        if (user.role) token.role = user.role;
      }
      // Backfill a role only when missing (preserves custom role ids). Against
      // a real backend, fail to least-privilege rather than the email-derived
      // super_admin default; the email mapping is mock-auth-mode only.
      token.role = resolveTokenRole(
        token.role,
        token.email,
        isMockAdminPasswordAllowed(),
      );
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      if (token.id) session.user.id = token.id;
      if (token.name) session.user.name = token.name;
      if (token.email) session.user.email = token.email;
      session.user.role =
        typeof token.role === "string" ? token.role : "viewer";
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    // 30 days lifetime; cookie expiry rolls forward every 24h of activity so
    // active admins effectively never get signed out. Tighten to e.g.
    // `maxAge: 7 * 24 * 60 * 60, updateAge: 60 * 60` if security policy
    // requires a shorter admin window.
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
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

// Next 16 requires `dynamic` to be a static string literal (Turbopack analyzes
// statically at build). NextAuth's API routes need dynamic rendering — without
// this, every call (csrf, providers, callback, error) trips DYNAMIC_SERVER_USAGE.
// Firebase static-export builds are retired (we run a Next.js Node server on Cloud Run); if you need
// to re-enable them, flip this to "auto" and confirm generateStaticParams covers
// every NextAuth path.
export const dynamic = "force-dynamic";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
