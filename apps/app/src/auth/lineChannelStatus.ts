/**
 * Staging/dev LINE Login channels are often left in LINE's "Developing"
 * status, which only allows channel Admin/Tester accounts. Non-testers see
 * LINE's own 400 on access.line.me before our callback runs.
 */
export function shouldWarnLineDevelopingChannel(env: {
  appEnv?: string;
  frontendUrl?: string;
  apiUrl?: string;
}): boolean {
  const appEnv = (env.appEnv ?? "").trim().toLowerCase();
  if (appEnv === "staging" || appEnv === "dev" || appEnv === "development") {
    return true;
  }

  const haystack = `${env.frontendUrl ?? ""} ${env.apiUrl ?? ""}`.toLowerCase();
  return (
    haystack.includes("staging") ||
    haystack.includes("api.dev.") ||
    haystack.includes("app.dev.")
  );
}

export const LINE_DEVELOPING_CHANNEL_WARNING =
  "Staging LINE login only works for channel Testers/Admins until the LINE Login channel (and LIFF app) are Published in the LINE Developers Console.";
