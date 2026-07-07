/**
 * GoGoTrack env resolution — single source for preflight + device scripts.
 * Supports legacy typo (`GOTOTRACK_*`) and `GOGOSENSE_*` fallbacks without duplicate OR legs.
 */

function readEnvString(env, key) {
  const value = env[key];
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

export function resolveGoGoTrackAuthToken(env) {
  return (
    readEnvString(env, "GOGOTRACK_AUTH_TOKEN") ||
    readEnvString(env, "GOTOTRACK_AUTH_TOKEN") ||
    readEnvString(env, "GOGOSENSE_AUTH_TOKEN")
  );
}

export function resolveGoGoTrackApiUrl(env, defaultApiUrl) {
  return (
    readEnvString(env, "GOGOTRACK_API_URL") ||
    readEnvString(env, "GOTOTRACK_API_URL") ||
    readEnvString(env, "GOGOSENSE_API_URL") ||
    readEnvString(env, "EXPO_PUBLIC_API_URL") ||
    defaultApiUrl
  );
}
