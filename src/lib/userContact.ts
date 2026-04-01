/** Normalize contact lists from API user shape (arrays and/or legacy single fields). */
export function normalizeUserEmails(
  u: { email?: string; emails?: string[] } | undefined,
): string[] {
  if (!u) return [];
  if (Array.isArray(u.emails)) {
    return u.emails.map((e) => String(e).trim()).filter(Boolean);
  }
  if (u.email?.trim()) return [u.email.trim()];
  return [];
}

export function normalizeUserMobiles(
  u: { mobile?: string; mobiles?: string[] } | undefined,
): string[] {
  if (!u) return [];
  if (Array.isArray(u.mobiles)) {
    return u.mobiles.map((m) => String(m).trim()).filter(Boolean);
  }
  if (u.mobile?.trim()) return [u.mobile.trim()];
  return [];
}
