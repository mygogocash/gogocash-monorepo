/**
 * Whether an offer's upsize event is live *right now*.
 *
 * An upsize is a special-period promotion. We treat it as active when it is
 * configured (any upsize field set) AND the current moment falls inside its
 * window: at/after the start bound (date + optional HH:MM, default 00:00) and
 * at/before the end bound (date + optional HH:MM, default end-of-day 23:59:59).
 * A missing bound means "open-ended" on that side, so a configured upsize with
 * no dates is always-on. `now` is passed in (ms) so the check stays pure/testable.
 */
export interface UpsizeWindowFields {
  upsize_start_date?: string | null;
  upsize_end_date?: string | null;
  upsize_start_time?: string | null;
  upsize_end_time?: string | null;
  upsize_special_commission?: number | null;
  upsize_max_cap?: number | null;
  upsize_product_types?: unknown[] | null;
}

/** Parse a `YYYY-MM-DD` (+ optional `HH:MM`) into a local-time ms, or null. */
function parseBound(
  date: string | null | undefined,
  time: string | null | undefined,
  fallbackTime: string,
): number | null {
  if (!date) return null;
  const t = time && /^\d{1,2}:\d{2}$/.test(time) ? time : fallbackTime;
  const ms = Date.parse(`${date}T${t}`);
  return Number.isNaN(ms) ? null : ms;
}

export function isUpsizeActiveNow(
  offer: UpsizeWindowFields,
  nowMs: number,
): boolean {
  const hasUpsize = Boolean(
    offer.upsize_start_date ||
    offer.upsize_end_date ||
    offer.upsize_start_time ||
    offer.upsize_end_time ||
    offer.upsize_special_commission != null ||
    offer.upsize_max_cap != null ||
    (offer.upsize_product_types?.length ?? 0) > 0,
  );
  if (!hasUpsize) return false;

  const start = parseBound(
    offer.upsize_start_date,
    offer.upsize_start_time,
    "00:00:00",
  );
  const end = parseBound(
    offer.upsize_end_date,
    offer.upsize_end_time,
    "23:59:59",
  );
  if (start != null && nowMs < start) return false;
  if (end != null && nowMs > end) return false;
  return true;
}
