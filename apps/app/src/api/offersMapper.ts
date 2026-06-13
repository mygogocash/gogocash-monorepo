import type { MyOfferRecord } from "@mobile/api/offersTypes";

// View-model row matching the screen's fixture shape (myOfferRows).
export type MyOfferRow = {
  createdAt: string;
  deeplink: string;
  id: string;
  offer_id: string;
  offer_name: string;
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

// Matches the fixture rows' display format ("28 Mar 2026").
function formatRowDate(createdAt: string | undefined): string {
  const parsed = createdAt ? new Date(createdAt) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "";
  }
  return `${parsed.getDate()} ${MONTH_LABELS[parsed.getMonth()]} ${parsed.getFullYear()}`;
}

export function mapMyOffersToRows(records: MyOfferRecord[]): MyOfferRow[] {
  return records.map((record, index) => ({
    createdAt: formatRowDate(record.createdAt),
    deeplink: record.deeplink ?? "",
    id: record._id || `my-offer-${index}`,
    offer_id: record.offer_id === undefined ? "" : String(record.offer_id),
    offer_name: record.offer_name?.trim() ?? "",
  }));
}
