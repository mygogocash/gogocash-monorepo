import createMiddleware from "next-intl/middleware";
import { routing } from "./src/i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - … if they start with `/api`, `/_next` or `/_vercel`
    // - … the ones containing a dot (e.g. `favicon.ico`)
    // Exclude Sentry tunnel route (withSentryConfig tunnelRoute) from next-intl.
    "/((?!api|_next|_vercel|monitoring|.*\\..*).*)",
    // However, match all locales
    "/",
    "/(th|en)/:path*",
  ],
};
