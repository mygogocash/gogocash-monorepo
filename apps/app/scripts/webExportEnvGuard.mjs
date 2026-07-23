/**
 * Build-time guard for the web export.
 *
 * envDefaults exists so a local `expo start` works with no env file. On a hosted
 * build it is a trap: Railway injects EXPO_PUBLIC_* as Docker build args, and if
 * one is missing the export silently falls back to the STAGING defaults and
 * ships. That is exactly what happened to beta.gogocash.co — it went live with
 * `apiUrl: https://api-staging.gogocash.co`, so every request was cross-origin
 * and the home page rendered empty.
 *
 * A hosted build must therefore state its own URLs. Missing or staging-pointing
 * values fail the build instead of producing a broken bundle.
 */
/** Set by the Railway/Docker web build; absent for a local export. */
export const HOSTED_BUILD_ENV_NAME = "EXPO_PUBLIC_WEB_BUILD_HOSTED";

const STAGING_DEFAULT_API_URL = "https://api-staging.gogocash.co";
const STAGING_DEFAULT_FRONTEND_URL = "https://app-staging.gogocash.co";

function host(value) {
  try {
    return new URL(value).host;
  } catch {
    return "";
  }
}

/**
 * Returns the reasons this env would produce a broken hosted bundle. Empty means
 * it is safe to export.
 */
export function findWebExportEnvProblems(env) {
  const problems = [];
  const apiUrl = env.EXPO_PUBLIC_API_URL?.trim() ?? "";
  const frontendUrl = env.EXPO_PUBLIC_FRONTEND_URL?.trim() ?? "";

  if (!apiUrl) {
    problems.push(
      "EXPO_PUBLIC_API_URL is not set — the export would fall back to the staging default.",
    );
  }

  if (!frontendUrl) {
    problems.push(
      "EXPO_PUBLIC_FRONTEND_URL is not set — the export would fall back to the staging default.",
    );
  }

  // A frontend that is not staging must not talk to the staging API. This is the
  // exact shape of the beta outage: frontendUrl beta, apiUrl staging.
  const frontendIsStaging =
    !frontendUrl || host(frontendUrl) === host(STAGING_DEFAULT_FRONTEND_URL);

  if (apiUrl && !frontendIsStaging && host(apiUrl) === host(STAGING_DEFAULT_API_URL)) {
    problems.push(
      `EXPO_PUBLIC_FRONTEND_URL is ${frontendUrl} but EXPO_PUBLIC_API_URL is the staging API ` +
        `(${apiUrl}) — every request would be cross-origin and the app would render empty.`,
    );
  }

  return problems;
}

export function assertWebExportEnv(env) {
  if (!env[HOSTED_BUILD_ENV_NAME]) {
    return;
  }

  const problems = findWebExportEnvProblems(env);
  if (problems.length === 0) {
    return;
  }

  throw new Error(
    [
      "Refusing to build the web export with an unsafe environment:",
      ...problems.map((problem) => `  - ${problem}`),
      "",
      `Set these on the Railway service (they must reach the build as Docker ARGs), or unset ${HOSTED_BUILD_ENV_NAME} for a local export.`,
    ].join("\n"),
  );
}
