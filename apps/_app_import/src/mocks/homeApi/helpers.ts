import type { RequestGenerateDeeplink } from "@/interfaces/shop";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const normalize = (value: string | null) => value?.trim().toLowerCase() ?? "";

export const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
};

export const parseNumberArray = (value: unknown): number[] =>
  Array.isArray(value) ? value.map((item) => Number(item)).filter(Number.isFinite) : [];

export const parseStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter((item) => item.length > 0)
    : [];

export const parseRequestGenerateDeeplink = (
  value: unknown
): RequestGenerateDeeplink | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const offer_id = toNumber(value.offer_id, Number.NaN);
  const merchant_id = toNumber(value.merchant_id, Number.NaN);
  const preview_url = typeof value.preview_url === "string" ? value.preview_url.trim() : "";

  if (!Number.isFinite(offer_id) || !Number.isFinite(merchant_id) || preview_url.length === 0) {
    return undefined;
  }

  return {
    offer_id,
    merchant_id,
    preview_url,
  };
};
