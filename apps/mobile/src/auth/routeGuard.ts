import { mobileParityRoutes, type MobileRoute } from "@mobile/navigation/routes";

export type AccountDataSource = "backend" | "disabled" | "fixtures";

const authRoutePaths = new Set(["/auth/callback", "/login", "/register"]);

export function normalizePathname(pathname: string): string {
  const withoutHash = pathname.split("#")[0] ?? "/";
  const withoutQuery = withoutHash.split("?")[0] ?? "/";
  const withLeadingSlash = withoutQuery.startsWith("/") ? withoutQuery : `/${withoutQuery}`;
  const withoutTrailingSlash =
    withLeadingSlash.length > 1 ? withLeadingSlash.replace(/\/+$/, "") : withLeadingSlash;

  return withoutTrailingSlash || "/";
}

export function findRouteForPathname(pathname: string): MobileRoute | undefined {
  const normalizedPathname = normalizePathname(pathname);

  return mobileParityRoutes.find((route) => routePathMatches(route.nativePath, normalizedPathname));
}

export function isProtectedNativePath(pathname: string): boolean {
  return findRouteForPathname(pathname)?.requiresAuth ?? false;
}

export function buildProtectedLoginRedirect(pathname: string): string | null {
  const callbackPath = sanitizeCallbackPath(pathname);

  if (!isProtectedNativePath(callbackPath)) {
    return null;
  }

  return `/login?callbackUrl=${encodeURIComponent(callbackPath)}`;
}

export function isAllowedInternalCallbackPath(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("://") ||
    value.includes("\\") ||
    /[\u0000-\u001F\u007F]/.test(value)
  ) {
    return false;
  }

  const normalizedPathname = normalizePathname(value);

  if (authRoutePaths.has(normalizedPathname)) {
    return false;
  }

  return Boolean(findRouteForPathname(normalizedPathname));
}

export function sanitizeCallbackPath(value: string | null | undefined, fallback = "/"): string {
  if (!isAllowedInternalCallbackPath(value)) {
    return fallback;
  }

  return normalizePathname(value ?? fallback);
}

export function shouldBlockProductionFixtureData(
  pathname: string,
  appEnv: string,
  accountDataSource: AccountDataSource
): boolean {
  if (appEnv !== "production") {
    return false;
  }

  return isProtectedNativePath(pathname) && accountDataSource !== "backend";
}

function routePathMatches(routePath: string, pathname: string): boolean {
  const routeSegments = routePath.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);

  if (routePath === "/" || pathname === "/") {
    return routePath === pathname;
  }

  if (routeSegments.length !== pathSegments.length) {
    return false;
  }

  return routeSegments.every((segment, index) => {
    if (segment.startsWith("[") && segment.endsWith("]")) {
      return pathSegments[index].length > 0;
    }

    return segment === pathSegments[index];
  });
}
