export type InvolvePostbackQuery = Record<string, string | undefined>;

const INVOLVE_DATETIME =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;

/** Express query values may be string | string[]; keep only scalar strings. */
export function sanitizePostbackQuery(
  raw: Record<string, unknown>,
): InvolvePostbackQuery {
  const out: InvolvePostbackQuery = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      out[key] = value;
      continue;
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
      out[key] = value[0];
    }
  }
  return out;
}

export function normalizeConversionStatus(status: string | undefined): string {
  const normalized = (status ?? 'pending').trim().toLowerCase();
  if (normalized === 'paid') {
    return 'approved';
  }
  return normalized;
}

export function firstQueryValue(
  query: InvolvePostbackQuery,
  ...keys: string[]
): string | undefined {
  for (const key of keys) {
    const value = query[key];
    if (typeof value === 'string' && value !== '') {
      return value;
    }
  }
  return undefined;
}

function parseInteger(value: string | undefined): number | null {
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseFloatAmount(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseConversionDatetime(value: string | undefined): Date {
  if (typeof value !== 'string' || !value.trim()) {
    return new Date();
  }

  const match = INVOLVE_DATETIME.exec(value.trim());
  if (!match) {
    return new Date();
  }

  const [, year, month, day, hour, minute, second] = match;
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
  );
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function safeDecodeOfferName(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value.replace(/\+/g, ' ');
  }
}

export function mapPostbackQueryToConversion(
  query: InvolvePostbackQuery,
  merchantId: number,
) {
  const conversionId = parseInteger(firstQueryValue(query, 'conversion_id'));
  const offerId = parseInteger(firstQueryValue(query, 'offer_id'));
  if (conversionId === null || offerId === null) {
    return null;
  }

  const offerNameRaw = firstQueryValue(query, 'offer_name') ?? '';
  const offerName = safeDecodeOfferName(offerNameRaw);

  const payload: Record<string, unknown> = {
    conversion_id: conversionId,
    offer_id: offerId,
    offer_name: offerName || `Offer ${offerId}`,
    merchant_id: merchantId,
    aff_sub1: firstQueryValue(query, 'aff_sub', 'aff_sub1'),
    aff_sub2: firstQueryValue(query, 'aff_sub2'),
    aff_sub3: firstQueryValue(query, 'aff_sub3'),
    aff_sub4: firstQueryValue(query, 'aff_sub4'),
    aff_sub5: firstQueryValue(query, 'aff_sub5'),
    adv_sub1: firstQueryValue(query, 'adv_sub', 'adv_sub1'),
    adv_sub2: firstQueryValue(query, 'adv_sub2'),
    adv_sub3: firstQueryValue(query, 'adv_sub3'),
    adv_sub4: firstQueryValue(query, 'adv_sub4'),
    adv_sub5: firstQueryValue(query, 'adv_sub5'),
    conversion_status: normalizeConversionStatus(
      firstQueryValue(query, 'status', 'conversion_status'),
    ),
    datetime_conversion: parseConversionDatetime(
      firstQueryValue(query, 'datetime_conversion'),
    ),
    currency: firstQueryValue(query, 'currency', 'conversion_currency') ?? 'THB',
    sale_amount: parseFloatAmount(
      firstQueryValue(query, 'sale_amount', 'sale_amount_local'),
    ),
    payout: parseFloatAmount(
      firstQueryValue(query, 'payout', 'payout_local'),
    ),
    raw: { ...query, source: 'involve_postback' },
  };

  if (merchantId === 0) {
    payload.flagged = true;
    payload.flag_reason = 'missing_merchant_id';
  }

  return payload;
}
