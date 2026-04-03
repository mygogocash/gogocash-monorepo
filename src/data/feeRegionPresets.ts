/** Quick-add presets for withdrawal fee rows (ISO 3166-1 alpha-2 + ISO 4217). */
export const FEE_REGION_PRESETS: Array<{
  countryCode: string;
  currency: string;
  label: string;
}> = [
  { countryCode: "TH", currency: "THB", label: "Thailand (THB)" },
  { countryCode: "US", currency: "USD", label: "United States (USD)" },
  { countryCode: "SG", currency: "SGD", label: "Singapore (SGD)" },
  { countryCode: "MY", currency: "MYR", label: "Malaysia (MYR)" },
  { countryCode: "ID", currency: "IDR", label: "Indonesia (IDR)" },
  { countryCode: "VN", currency: "VND", label: "Vietnam (VND)" },
  { countryCode: "PH", currency: "PHP", label: "Philippines (PHP)" },
  { countryCode: "GB", currency: "GBP", label: "United Kingdom (GBP)" },
  { countryCode: "DE", currency: "EUR", label: "Germany (EUR)" },
  { countryCode: "JP", currency: "JPY", label: "Japan (JPY)" },
  { countryCode: "AU", currency: "AUD", label: "Australia (AUD)" },
  { countryCode: "HK", currency: "HKD", label: "Hong Kong (HKD)" },
];

export const COMMON_CURRENCIES = [
  "THB",
  "USD",
  "SGD",
  "EUR",
  "GBP",
  "MYR",
  "IDR",
  "VND",
  "PHP",
  "JPY",
  "AUD",
  "HKD",
  "CNY",
  "KRW",
] as const;
