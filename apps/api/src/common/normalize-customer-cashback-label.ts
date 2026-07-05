/** Compact customer-facing cashback labels (home top brands, cards). */
export function normalizeCustomerCashbackLabel(label: string | null | undefined): string {
  const trimmed = String(label ?? '').trim();
  if (!trimmed) {
    return '';
  }

  return trimmed.replace(/^up to\s+/i, '');
}
