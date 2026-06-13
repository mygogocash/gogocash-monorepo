import type { FeeWithdrawRegion, GlobalMaxCapMode, ResponseFee } from "@/types/api";

export function withRegionMaxCapDefaults(r: FeeWithdrawRegion): FeeWithdrawRegion {
  const cur = (r.currency ?? "THB").trim().toUpperCase() || "THB";
  const mode: GlobalMaxCapMode = r.max_cap_mode === "fixed" ? "fixed" : "percent";
  return {
    ...r,
    max_cap_mode: mode,
    max_cap_percent: r.max_cap_percent ?? 0,
    max_cap_amount: r.max_cap_amount ?? 0,
    max_cap_currency: (r.max_cap_currency ?? cur).trim().toUpperCase() || cur,
  };
}

export function legacyRegionsFromResponse(res: ResponseFee): FeeWithdrawRegion[] {
  return [
    withRegionMaxCapDefaults({
      id: "legacy-th",
      countryCode: "TH",
      currency: "THB",
      feeWithdraw: res.fee_withdraw_thb,
      minimumWithdraw: res.minimum_withdraw_thb,
    }),
    withRegionMaxCapDefaults({
      id: "legacy-us",
      countryCode: "US",
      currency: "USD",
      feeWithdraw: res.fee_withdraw_usd,
      minimumWithdraw: res.minimum_withdraw_usd,
    }),
  ];
}

export function ensureRegionIds(
  regions: FeeWithdrawRegion[] | undefined,
  fallback: FeeWithdrawRegion[],
): FeeWithdrawRegion[] {
  const base = regions?.length ? regions : fallback;
  return base.map((r, i) =>
    withRegionMaxCapDefaults({
      ...r,
      id: r.id && r.id.length > 0 ? r.id : `region-${i}-${r.countryCode}-${r.currency}`,
    }),
  );
}

/** Maps THB/USD legacy fields from regions for APIs that still expect flat columns. */
export function deriveLegacyWithdrawFields(regions: FeeWithdrawRegion[]): {
  fee_withdraw_thb: number;
  minimum_withdraw_thb: number;
  fee_withdraw_usd: number;
  minimum_withdraw_usd: number;
} {
  const thb =
    regions.find((r) => r.currency.toUpperCase() === "THB") ??
    regions.find((r) => r.countryCode.toUpperCase() === "TH");
  const usd =
    regions.find((r) => r.currency.toUpperCase() === "USD") ??
    regions.find((r) => r.countryCode.toUpperCase() === "US");
  return {
    fee_withdraw_thb: thb?.feeWithdraw ?? 0,
    minimum_withdraw_thb: thb?.minimumWithdraw ?? 0,
    fee_withdraw_usd: usd?.feeWithdraw ?? 0,
    minimum_withdraw_usd: usd?.minimumWithdraw ?? 0,
  };
}

export function normalizeRegionsForSave(
  regions: FeeWithdrawRegion[],
): FeeWithdrawRegion[] {
  return regions.map((r) => {
    const countryCode = r.countryCode.trim().toUpperCase().slice(0, 2);
    const currency = r.currency.trim().toUpperCase().slice(0, 8);
    return withRegionMaxCapDefaults({
      ...r,
      countryCode,
      currency,
      max_cap_currency: (r.max_cap_currency ?? currency).trim().toUpperCase().slice(0, 8),
    });
  });
}

export function validateWithdrawRegions(regions: FeeWithdrawRegion[]): string | null {
  const seen = new Set<string>();
  for (const r of regions) {
    const code = r.countryCode.trim().toUpperCase();
    if (code.length !== 2 || !/^[A-Z]{2}$/.test(code)) {
      return "Each country must use a 2-letter ISO country code (e.g. TH, US, SG).";
    }
    const cur = r.currency.trim().toUpperCase();
    if (cur.length < 3 || !/^[A-Z]{3,8}$/.test(cur)) {
      return "Each row needs a valid currency code (3–8 letters, e.g. THB, USD).";
    }
    const key = `${code}|${cur}`;
    if (seen.has(key)) {
      return `Duplicate entry for ${code} / ${cur}.`;
    }
    seen.add(key);
  }
  return null;
}

export function validateRegionMaxCaps(regions: FeeWithdrawRegion[]): string | null {
  for (const r of regions) {
    const mode = r.max_cap_mode === "fixed" ? "fixed" : "percent";
    const label = `${r.countryCode.trim().toUpperCase() || "?"}/${r.currency.trim().toUpperCase() || "?"}`;
    if (mode === "percent") {
      const p = r.max_cap_percent ?? 0;
      if (p < 0 || p > 100) {
        return `Max cap (%) for ${label} must be between 0 and 100.`;
      }
    } else {
      if ((r.max_cap_amount ?? 0) < 0) {
        return `Max cap amount for ${label} must be zero or greater.`;
      }
      const cur = (r.max_cap_currency ?? "").trim().toUpperCase();
      if (cur.length < 3 || !/^[A-Z]{3,8}$/.test(cur)) {
        return `Select or enter a valid max cap currency for ${label} (ISO 4217).`;
      }
    }
  }
  return null;
}
