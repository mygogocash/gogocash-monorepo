/** Canonical admin email form for invite/reset tokens and accounts. */
export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Case-insensitive mailbox match for legacy mixed-case records. */
export function adminEmailEquals(a: string, b: string): boolean {
  return normalizeAdminEmail(a) === normalizeAdminEmail(b);
}
