import {
  parsePhoneNumberFromString,
  AsYouType,
  CountryCode
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

export const pathImage = (path: string) => {
  return `${process.env.NEXT_PUBLIC_API_URL}/google-drive/file/${path}`;
}

export const formatPrice = (price?: number) => {
  if (!price) return "N/A";
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};