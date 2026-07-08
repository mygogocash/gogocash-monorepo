const LOCAL_MEDIA_PREFIX = "local-media:";
const REMOTE_URI_PREFIXES = ["https://", "http://", "data:", "blob:", "file:"] as const;

function looksLikeGoogleDriveFileId(value: string): boolean {
  return /^[A-Za-z0-9_-]{10,}$/.test(value);
}

/** Resolve offer/catalog logo and banner refs to a fetchable absolute URI. */
export function resolveOfferMediaUrl(
  value: unknown,
  apiBaseUrl?: string,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  // Customer apps cannot call /admin/stored-media/stream (AuthAdminGuard). Treat
  // local-media refs as unresolved so UI falls back to initials instead of a
  // guaranteed 401 blank tile. Public HTTPS / relative paths still resolve below.
  if (trimmed.startsWith(LOCAL_MEDIA_PREFIX)) {
    return undefined;
  }

  return resolveRemoteImageUri(trimmed, apiBaseUrl);
}

export function resolveRemoteImageUri(
  value: unknown,
  apiBaseUrl?: string,
): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("/")) {
    const base = apiBaseUrl?.trim().replace(/\/+$/, "");
    return base ? `${base}${trimmed}` : trimmed;
  }

  if (REMOTE_URI_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return trimmed;
  }

  if (looksLikeGoogleDriveFileId(trimmed)) {
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(trimmed)}`;
  }

  return undefined;
}
