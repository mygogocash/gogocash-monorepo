import NextAuth from "next-auth/next";
import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiClient } from "@/lib/api";
import { devError } from "@/lib/devConsole";
import { isMockAdminPasswordAllowed } from "@/lib/mockAuthPolicy";
import { DEFAULT_MOCK_ACCESS_TOKEN } from "@/lib/authTokens";
import { mockRoleForEmail, resolveTokenRole } from "@/lib/mockAdminRole";
import { fromApiRole } from "@/lib/rbac";

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
            // Translate the API role vocabulary (superadmin/approver/support)
            // into the frontend Role the UI gates on. The API token above still
            // carries the original role for API-side guards.
            role: fromApiRole((userData as { role?: string }).role),
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
      // Keep Nest JWT on the encrypted NextAuth JWT only — never expose
      // accessToken via getSession() / client JS. Browser API calls go through
      // `/api/backend`, which attaches Bearer via getToken().
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
    // P1-SESS: tightened from 30d -> 7d idle window for an admin panel that gates
    // money/user data. The session still rolls forward on activity (updateAge),
    // so active admins stay signed in; an idle/leaked session now expires in 7d
    // instead of 30d (shrinks stolen-token blast radius). Nest accessToken stays
    // server-side (BFF). Revocation (token-version vs denylist) remains #43b.
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 60 * 60,
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
