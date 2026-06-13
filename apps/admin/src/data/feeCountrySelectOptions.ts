import { FEE_REGION_PRESETS } from "@/data/feeRegionPresets";

/** Unicode regional indicator symbols for an ISO 3166-1 alpha-2 code. */
export function countryCodeToFlagEmoji(iso2: string): string {
  const cc = iso2.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  const base = 0x1f1e6;
  const points = [...cc].map((ch) => base + ch.charCodeAt(0) - 65);
  return String.fromCodePoint(...points);
}

function iso3166Alpha2Codes(): string[] {
  try {
    const supported = (
      Intl as unknown as { supportedValuesOf?: (key: string) => string[] }
    ).supportedValuesOf;
    if (typeof supported === "function") {
      return supported
        .call(Intl, "region")
        .filter((c): c is string => typeof c === "string" && /^[A-Z]{2}$/.test(c));
    }
  } catch {
    /* ignore */
  }
  const fromPresets = FEE_REGION_PRESETS.map((p) => p.countryCode);
  const extra = [
    "CN",
    "KR",
    "IN",
    "FR",
    "IT",
    "ES",
    "NL",
    "BE",
    "CH",
    "AT",
    "SE",
    "NO",
    "DK",
    "FI",
    "PL",
    "CZ",
    "PT",
    "GR",
    "IE",
    "NZ",
    "TW",
    "MO",
    "AE",
    "SA",
    "BR",
    "MX",
    "CA",
    "ZA",
    "RU",
    "UA",
    "TR",
    "EG",
    "NG",
    "KE",
    "AR",
    "CL",
    "CO",
    "PE",
    "BD",
    "PK",
    "LK",
    "MM",
    "KH",
    "LA",
    "BN",
    "NP",
    "MN",
    "JO",
    "IL",
    "QA",
    "KW",
    "BH",
    "OM",
    "DZ",
    "MA",
    "TZ",
    "GH",
    "CM",
    "CI",
    "SN",
  ];
  return [...new Set([...fromPresets, ...extra])];
}

export type FeeCountryOption = {
  code: string;
  name: string;
  flag: string;
  /** Text shown in `<option>`: flag, English name, and ISO code. */
  label: string;
};

let cachedOptions: FeeCountryOption[] | null = null;
let cachedCodeSet: ReadonlySet<string> | null = null;

export function getFeeCountrySelectOptions(): FeeCountryOption[] {
  if (cachedOptions) return cachedOptions;
  const codes = iso3166Alpha2Codes();
  const displayNames = new Intl.DisplayNames(["en"], { type: "region" });
  cachedOptions = codes
    .map((code) => {
      let name: string;
      try {
        name = displayNames.of(code) ?? code;
      } catch {
        name = code;
      }
      const flag = countryCodeToFlagEmoji(code);
      return {
        code,
        name,
        flag,
        label: `${flag} ${name} (${code})`,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  cachedCodeSet = new Set(cachedOptions.map((o) => o.code));
  return cachedOptions;
}

export function getFeeCountryCodeSet(): ReadonlySet<string> {
  if (!cachedCodeSet) {
    getFeeCountrySelectOptions();
  }
  return cachedCodeSet ?? new Set();
}
