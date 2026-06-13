import { parsePhoneNumberFromString, AsYouType, CountryCode } from "libphonenumber-js";
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
