const LOCAL_MEDIA_PREFIX = "local-media:";

/** Resolve a stored avatar ref to a fetchable URI for expo-image. */
export function resolveProfileMediaUrl(
  stored: string | null | undefined,
  apiBaseUrl: string,
): string | null {
  const trimmed = typeof stored === "string" ? stored.trim() : "";
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith(LOCAL_MEDIA_PREFIX)) {
    const base = apiBaseUrl.replace(/\/+$/, "");
    return `${base}/user/profile/avatar/stream?ref=${encodeURIComponent(trimmed)}`;
  }

  return trimmed;
}
