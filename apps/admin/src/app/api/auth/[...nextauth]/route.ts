import NextAuth from "next-auth/next";
import type { NextAuthOptions, User as NextAuthUser } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { apiClient } from "@/lib/api";
import { devError } from "@/lib/devConsole";
import { isMockAdminPasswordAllowed } from "@/lib/mockAuthPolicy";
import { DEFAULT_MOCK_ACCESS_TOKEN } from "@/lib/authTokens";
import { resolveAdminAuthRoleClaims } from "@/lib/adminAuthRoleClaims";
import { mockRoleForEmail, resolveTokenRole } from "@/lib/mockAdminRole";

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        rememberMe: { label: "Remember", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        const { email, password } = credentials;
        // "Keep me logged in" — credentials arrive as strings.
        const rememberMe = credentials.rememberMe === "true";

        if (password === "1234" && isMockAdminPasswordAllowed()) {
          const mockEmail =
            (email ?? "").trim().toLowerCase() || "admin@gogocash.co";
          const roleClaims = resolveAdminAuthRoleClaims(
            mockRoleForEmail(mockEmail),
          );
          return {
            id: "a1",
            name: "admin",
            email: mockEmail,
            image: undefined,
            accessToken: DEFAULT_MOCK_ACCESS_TOKEN,
            rememberMe,
            ...roleClaims,
          };
        }

        try {
          const userData = await apiClient.login({
            email: credentials.email,
            password: credentials.password,
            // Forwarded so the API signs a 30-day (vs 7-day) admin token.
            rememberMe,
          });
          const apiRole = (userData as { role?: string }).role;
          const roleClaims = resolveAdminAuthRoleClaims(apiRole);
          return {
            id: userData._id,
            name: userData.username,
            email: userData.email,
            image: undefined,
            accessToken: userData.token,
            rememberMe,
            // Translate the API role vocabulary (superadmin/approver/support)
            // into the frontend Role the UI gates on. The API token above still
            // carries the original role for API-side guards.
            ...roleClaims,
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
        token.apiRole = user.apiRole;
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.rememberMe = user.rememberMe === true;
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
      if (typeof token.apiRole === "string") {
        session.user.apiRole = token.apiRole;
      }
      session.user.role =
        typeof token.role === "string" ? token.role : "viewer";
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    // "Keep me logged in" support: the cookie window is the 30-day maximum, but
    // the EFFECTIVE session is bounded by the embedded Nest accessToken, which the
    // API signs for 30 days only when rememberMe was checked and 7 days otherwise
    // (user-admin-service.login). So a NON-remember session still loses backend
    // access at 7d (calls 401 -> redirect to /signin, per apiClient), preserving
    // the P1-SESS blast-radius bound; a remember session stays usable for 30d.
    // Nest accessToken stays server-side (BFF); revocation via session_version.
    maxAge: 30 * 24 * 60 * 60,
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
