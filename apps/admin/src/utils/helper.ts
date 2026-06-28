import {
  parsePhoneNumberFromString,
  AsYouType,
  CountryCode,
} from "libphonenumber-js";
export function formatPhone(value: string, country?: string) {
  return new AsYouType(country as CountryCode).input(value);
}

export function validatePhone(phone: string, country?: CountryCode) {
  const parsed = parsePhoneNumberFromString(phone, country as CountryCode);
  return parsed?.isValid() ?? false;
}
export function normalizeE164(phone: string, country?: CountryCode) {
  const parsed = parsePhoneNumberFromString(phone, country as CountryCode);
  return parsed?.format("E.164") ?? null;
}

/**
 * Resolves image URLs for admin previews.
 * - `http(s)://`, `/public` paths, `blob:`, `data:` — returned as-is.
 * - Private GCS objects — proxied through the authenticated admin API stream.
 * - Bare legacy Drive ids — mapped to the public Drive view URL.
 */
export const pathImage = (
  path?: string | null,
  variant: "square" | "banner" = "square",
) => {
  if (path == null) return "";
  const trimmed = String(path).trim();
  if (!trimmed) return "";

  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    if (isPrivateGcsMediaUrl(trimmed)) {
      const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
      if (apiBase) {
        return `${apiBase}/admin/stored-media/stream?ref=${encodeURIComponent(trimmed)}`;
      }
    }
    return trimmed;
  }

  if (trimmed.startsWith("local-media:")) {
    const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");
    if (apiBase) {
      return `${apiBase}/admin/stored-media/stream?ref=${encodeURIComponent(trimmed)}`;
    }
  }

  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed)) {
    return `https://drive.google.com/uc?export=view&id=${encodeURIComponent(trimmed)}`;
  }

  if (trimmed.startsWith("uploads/")) {
    return trimmed;
  }

  if (variant === "banner") {
    return "https://placehold.co/640x200.png/e2e8f0/64748b?text=Category+banner";
  }
  return "https://placehold.co/96x96.png/e2e8f0/64748b?text=Image";
};

function isPrivateGcsMediaUrl(url: string): boolean {
  return /storage\.googleapis\.com\/[^/]+\/(withdraw-slips|missing-orders)\//.test(
    url,
  );
}

export const formatPrice = (price?: number) => {
  if (price == null || Number.isNaN(price)) return "N/A";
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};
