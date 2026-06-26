import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { can, isRole, permissionForRoute } from "@/lib/rbac";

const PUBLIC_PREFIXES = [
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/accept-invite",
  "/error-404",
  "/api/auth",
  "/_next",
  "/images",
] as const;

export function isPublicPath(pathname: string): boolean {
  if (
    pathname === "/favicon.ico" ||
    pathname === "/site.webmanifest" ||
    pathname === "/robots.txt"
  ) {
    return true;
  }
  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  if (/\.(ico|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot)$/i.test(pathname)) {
    return true;
  }
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET;
  const token = secret ? await getToken({ req, secret }) : null;
  if (!token) {
    // API requests should get a 401, not an HTML redirect to the sign-in page.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // RBAC: redirect to /403 when the role lacks the route's view permission.
  // Built-in tiers are enforced here (edge); custom roles can't be resolved from
  // the edge (no access to the runtime role store) so they're gated client-side
  // by RoutePermissionGuard + the API. This never wrongly blocks a custom role.
  const roleId = (token as { role?: string }).role;
  const permission = permissionForRoute(pathname);
  if (permission && isRole(roleId) && !can(roleId, permission)) {
    const url = req.nextUrl.clone();
    url.pathname = "/403";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
