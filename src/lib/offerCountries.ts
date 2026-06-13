/**
 * Country filter options for the offers / brands list. The `value` is the full
 * English country name sent to the offers API as `country`; an empty string
 * means "all countries" (no filter). Shared by the Brands table toolbar and the
 * Search config rule builder so the two stay in sync.
 */
export const OFFERS_COUNTRY_FILTER_OPTIONS: { label: string; value: string }[] =
  [
    { label: "🇹🇭 Thailand", value: "Thailand" },
    { label: "🇮🇩 Indonesia", value: "Indonesia" },
    { label: "🇻🇳 Vietnam", value: "Vietnam" },
    { label: "🇵🇭 Philippines", value: "Philippines" },
    { label: "🇮🇳 India", value: "India" },
    { label: "🇲🇾 Malaysia", value: "Malaysia" },
    { label: "🇧🇷 Brazil", value: "Brazil" },
    { label: "🇺🇸 United States of America", value: "United States of America" },
    { label: "🇬🇧 United Kingdom", value: "United Kingdom" },
    { label: "🇸🇬 Singapore", value: "Singapore" },
    { label: "🇲🇲 Myanmar", value: "Myanmar" },
  ];
