/**
 * Server-side country canonicalisation. Mirrors `gogocash_app`'s
 * `lib/countries/canonical.ts` but lives outside any React/Next runtime
 * so it's safe to import from controllers, services, and the migration
 * script.
 *
 * Storage contract: ISO-3166-1 alpha-2, uppercase. Keep `LABEL_TO_ISO2`
 * in sync with the customer-app map when adding a new market.
 */

const LABEL_TO_ISO2: Readonly<Record<string, string>> = {
  thailand: 'TH',
  singapore: 'SG',
  malaysia: 'MY',
  indonesia: 'ID',
  philippines: 'PH',
  vietnam: 'VN',
  japan: 'JP',
  taiwan: 'TW',
  'hong kong': 'HK',
  china: 'CN',
  india: 'IN',
  australia: 'AU',
  'new zealand': 'NZ',
  'united states': 'US',
  'united states of america': 'US',
  'united kingdom': 'GB',
  cambodia: 'KH',
  laos: 'LA',
  myanmar: 'MM',
  'south korea': 'KR',
  'korea, republic of': 'KR',
};

/**
 * Convert any country string (ISO-2, full English name, mixed case, padded
 * whitespace) to canonical ISO-2 uppercase.
 *
 *   - `null` / empty / whitespace-only → `''`.
 *   - Already 2 chars → upper-cased and returned as-is.
 *   - Mapped full English name → ISO-2 from the table.
 *   - Anything else → trimmed-uppercase fallback (so equal strings still equal).
 *
 * Used as defence-in-depth on every server-side write path: even if a client
 * sends a stale full English name, we persist the canonical form.
 */
export function toIso2Server(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.length === 2) return trimmed.toUpperCase();
  const mapped = LABEL_TO_ISO2[trimmed.toLowerCase()];
  if (mapped) return mapped;
  return trimmed.toUpperCase();
}

export { LABEL_TO_ISO2 };
