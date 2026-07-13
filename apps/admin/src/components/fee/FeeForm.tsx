"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import type {
  FeeSettingsForm,
  FeeWithdrawRegion,
  GlobalMaxCapMode,
  ResponseFee,
} from "@/types/api";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import NoData from "@/components/common/NoData";
import apiClient from "@/lib/api";
import { devError } from "@/lib/devConsole";
import {
  deriveLegacyWithdrawFields,
  ensureRegionIds,
  legacyRegionsFromResponse,
  normalizeRegionsForSave,
  validateRegionMaxCaps,
  validateWithdrawRegions,
} from "@/lib/feeWithdrawRegions";
import {
  countryCodeToFlagEmoji,
  getFeeCountryCodeSet,
  getFeeCountrySelectOptions,
} from "@/data/feeCountrySelectOptions";
import { COMMON_CURRENCIES, FEE_REGION_PRESETS } from "@/data/feeRegionPresets";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { isDirty } from "@/lib/isDirty";

function isCommonCurrency(code: string): boolean {
  return (COMMON_CURRENCIES as readonly string[]).includes(code.toUpperCase());
}

function parseNum(raw: string): number {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function newRegionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function newRegion(overrides?: Partial<FeeWithdrawRegion>): FeeWithdrawRegion {
  const merged: FeeWithdrawRegion = {
    id: newRegionId(),
    countryCode: "",
    currency: "THB",
    feeWithdraw: 0,
    minimumWithdraw: 0,
    max_cap_mode: "percent",
    max_cap_percent: 0,
    max_cap_amount: 0,
    max_cap_currency: "THB",
    ...overrides,
  };
  const cur = merged.currency.trim().toUpperCase() || "THB";
  return {
    ...merged,
    currency: cur,
    max_cap_currency:
      (merged.max_cap_currency ?? cur).trim().toUpperCase() || cur,
  };
}

export default function FeeForm() {

  const [forms, setForms] = useState<FeeSettingsForm>({
    system: 0,
    fee_withdraw_usd: 0,
    fee_withdraw_thb: 0,
    minimum_withdraw_thb: 0,
    minimum_withdraw_usd: 0,
    id: "",
    withdraw_regions: [],
    global_max_cap_mode: "percent",
    global_max_cap_percent: 0,
    global_max_cap_amount: 0,
    global_max_cap_currency: "THB",
  });

  const [presetValue, setPresetValue] = useState("");
  /** Row ids where the user chose "enter ISO code manually" (environments without full country list). */
  const [countryManualByRow, setCountryManualByRow] = useState<
    Record<string, boolean>
  >({});
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  /** Baseline snapshot of the loaded form; drives "disable Save until changed". */
  const [initialForms, setInitialForms] = useState<FeeSettingsForm | null>(
    null,
  );

  const feeCountryOptions = useMemo(() => getFeeCountrySelectOptions(), []);
  const feeCountryCodeSet = useMemo(() => getFeeCountryCodeSet(), []);
  const countryNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of feeCountryOptions) {
      m.set(o.code, o.name);
    }
    return m;
  }, [feeCountryOptions]);

  const applyFeeResponse = useCallback((res: ResponseFee) => {
    const fromApi = res.withdraw_regions?.length
      ? ensureRegionIds(res.withdraw_regions, legacyRegionsFromResponse(res))
      : legacyRegionsFromResponse(res);
    const legacy = deriveLegacyWithdrawFields(fromApi);
    const capMode: GlobalMaxCapMode =
      res.global_max_cap_mode === "fixed" ? "fixed" : "percent";
    const loaded: FeeSettingsForm = {
      system: res.system,
      fee_withdraw_usd: legacy.fee_withdraw_usd,
      fee_withdraw_thb: legacy.fee_withdraw_thb,
      minimum_withdraw_thb: legacy.minimum_withdraw_thb,
      minimum_withdraw_usd: legacy.minimum_withdraw_usd,
      id: res._id,
      withdraw_regions: fromApi,
      global_max_cap_mode: capMode,
      global_max_cap_percent: res.global_max_cap_percent ?? 0,
      global_max_cap_amount: res.global_max_cap_amount ?? 0,
      global_max_cap_currency: (
        res.global_max_cap_currency ?? "THB"
      ).toUpperCase(),
    };
    setForms(loaded);
    // Baseline reflects the LOADED entity so Save stays disabled until edited.
    setInitialForms(structuredClone(loaded));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFetching(true);
      try {
        const response = await apiClient.getFee();
        if (cancelled) return;
        const res = response?.[0];
        if (!res) {
          toast.error("No fee configuration returned from the server.");
          return;
        }
        applyFeeResponse(res);
      } catch (err) {
        if (!cancelled) {
          devError("Failed to fetch fee settings:", err);
          toast.error(getApiErrorMessage(err, "Failed to load fee settings"));
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyFeeResponse]);

  const regions = forms.withdraw_regions ?? [];

  // True once the user edits a field away from the loaded/saved baseline.
  const dirty = initialForms !== null && isDirty(forms, initialForms);

  const updateRegion = (id: string, patch: Partial<FeeWithdrawRegion>) => {
    setForms((f) => {
      const list = f.withdraw_regions ?? [];
      const next = list.map((r) => (r.id === id ? { ...r, ...patch } : r));
      const legacy = deriveLegacyWithdrawFields(next);
      return {
        ...f,
        withdraw_regions: next,
        ...legacy,
      };
    });
  };

  const removeRegion = (id: string) => {
    setCountryManualByRow((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    setForms((f) => {
      const list = (f.withdraw_regions ?? []).filter((r) => r.id !== id);
      const legacy = deriveLegacyWithdrawFields(list);
      return { ...f, withdraw_regions: list, ...legacy };
    });
  };

  const addBlankRegion = () => {
    setForms((f) => ({
      ...f,
      withdraw_regions: [...(f.withdraw_regions ?? []), newRegion()],
    }));
  };

  const addFromPreset = (value: string) => {
    if (!value) return;
    const preset = FEE_REGION_PRESETS.find(
      (p) => `${p.countryCode}|${p.currency}` === value,
    );
    if (!preset) return;
    setForms((f) => {
      const list = f.withdraw_regions ?? [];
      const dup = list.some(
        (r) =>
          r.countryCode.toUpperCase() === preset.countryCode &&
          r.currency.toUpperCase() === preset.currency,
      );
      if (dup) {
        queueMicrotask(() => {
          toast.error(`${preset.label} is already in the list.`);
        });
        return f;
      }
      const next = [
        ...list,
        newRegion({
          countryCode: preset.countryCode,
          currency: preset.currency,
        }),
      ];
      return {
        ...f,
        withdraw_regions: next,
        ...deriveLegacyWithdrawFields(next),
      };
    });
    setPresetValue("");
  };

  const saveSettings = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!forms.id?.trim()) {
      toast.error("Fee record is not loaded yet. Please wait or refresh.");
      return;
    }
    const currentRegions = forms.withdraw_regions ?? [];
    const normalized = normalizeRegionsForSave(currentRegions);
    if (normalized.length === 0) {
      toast.error("Add at least one country/currency row for withdrawal fees.");
      return;
    }
    const err = validateWithdrawRegions(normalized);
    if (err) {
      toast.error(err);
      return;
    }
    const capErr = validateRegionMaxCaps(normalized);
    if (capErr) {
      toast.error(capErr);
      return;
    }
    if (forms.global_max_cap_mode === "percent") {
      const p = forms.global_max_cap_percent;
      if (p < 0 || p > 100) {
        toast.error("Global max cap (%) must be between 0 and 100.");
        return;
      }
    } else {
      if (forms.global_max_cap_amount < 0) {
        toast.error("Global max cap amount must be zero or greater.");
        return;
      }
      const cur = forms.global_max_cap_currency.trim().toUpperCase();
      if (cur.length < 3) {
        toast.error(
          "Select or enter a valid currency (ISO 4217) for the fixed max cap.",
        );
        return;
      }
    }
    const legacy = deriveLegacyWithdrawFields(normalized);
    const savedSnapshot = structuredClone(forms);
    setSaving(true);
    try {
      await apiClient.updateFee({
        ...forms,
        ...legacy,
        withdraw_regions: normalized,
      });
      // Refresh baseline so Save disables again until the next edit.
      setInitialForms(savedSnapshot);
      toast.success("Fee settings updated successfully");
    } catch (saveErr) {
      devError("Failed to save fee settings:", saveErr);
      toast.error(getApiErrorMessage(saveErr, "Failed to save fee settings"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="relative px-6 py-5">
        {fetching && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 dark:bg-gray-950/80"
            aria-busy="true"
            aria-live="polite"
          >
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
              <div className="border-t-brand-500 dark:border-t-brand-400 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 dark:border-gray-600" />
              Loading fee settings…
            </div>
          </div>
        )}
        <form
          onSubmit={saveSettings}
          className={`space-y-8 ${fetching ? "pointer-events-none opacity-60" : ""}`}
        >
          <section className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                System
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Global platform fee and optional platform-wide max cap for
                offers and brands. Regional rules may still override where your
                backend supports it.
              </p>
            </div>
            <div>
              <Label>
                System <span className="text-error-500">*</span>
              </Label>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Platform fee percentage applied to transactions (e.g. 2.5 for
                2.5%).
              </p>
              <div className="mt-2 flex max-w-md items-center gap-3">
                <Input
                  placeholder="0.00"
                  type="number"
                  value={forms.system}
                  min="0"
                  onChange={(e) =>
                    setForms({
                      ...forms,
                      system: parseNum(e.target.value),
                    })
                  }
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  %
                </span>
              </div>
            </div>
            <div>
              <Label>Max cap</Label>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Upper limit applied across offers and brands: a percentage of
                the tracked amount or a fixed amount in the currency you choose.
                Your API decides how this combines with per-offer caps.
              </p>
              <div className="mt-3 flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="radio"
                    name="global_max_cap_mode"
                    className="text-brand-600 focus:ring-brand-500 h-4 w-4 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                    checked={forms.global_max_cap_mode === "percent"}
                    onChange={() =>
                      setForms((f) => ({
                        ...f,
                        global_max_cap_mode: "percent",
                      }))
                    }
                  />
                  Percentage
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                  <input
                    type="radio"
                    name="global_max_cap_mode"
                    className="text-brand-600 focus:ring-brand-500 h-4 w-4 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                    checked={forms.global_max_cap_mode === "fixed"}
                    onChange={() =>
                      setForms((f) => ({ ...f, global_max_cap_mode: "fixed" }))
                    }
                  />
                  Fixed amount
                </label>
              </div>
              {forms.global_max_cap_mode === "percent" ? (
                <div className="mt-2 flex max-w-md items-center gap-3">
                  <Input
                    placeholder="0.00"
                    type="number"
                    value={forms.global_max_cap_percent}
                    min="0"
                    onChange={(e) =>
                      setForms({
                        ...forms,
                        global_max_cap_percent: parseNum(e.target.value),
                      })
                    }
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    %
                  </span>
                </div>
              ) : (
                <div className="mt-2 flex max-w-md flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                      Amount
                    </p>
                    <Input
                      placeholder="0.00"
                      type="number"
                      value={forms.global_max_cap_amount}
                      min="0"
                      onChange={(e) =>
                        setForms({
                          ...forms,
                          global_max_cap_amount: parseNum(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="min-w-0 sm:w-40">
                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                      Currency
                    </p>
                    <select
                      value={
                        isCommonCurrency(forms.global_max_cap_currency)
                          ? forms.global_max_cap_currency.toUpperCase()
                          : "__custom__"
                      }
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__custom__") {
                          setForms((f) => ({
                            ...f,
                            global_max_cap_currency: "",
                          }));
                          return;
                        }
                        setForms((f) => ({ ...f, global_max_cap_currency: v }));
                      }}
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    >
                      {COMMON_CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                      <option value="__custom__">Other…</option>
                    </select>
                    {!isCommonCurrency(forms.global_max_cap_currency) && (
                      <input
                        type="text"
                        maxLength={8}
                        value={forms.global_max_cap_currency}
                        onChange={(e) =>
                          setForms({
                            ...forms,
                            global_max_cap_currency:
                              e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="XXX"
                        className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 uppercase dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="pt-2">
              {/* Founder: the platform-fee block needs its own Save, not just
                  the button far below the country list. Reuses saveSettings
                  (persists the whole form) with the same dirty/loaded guard. */}
              <button
                type="button"
                onClick={() => void saveSettings()}
                disabled={saving || fetching || !forms.id || !dirty}
                className="h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[12rem]"
              >
                {saving ? "Saving…" : "Save platform fee"}
              </button>
            </div>
          </section>

          <section className="space-y-4 border-t border-gray-100 pt-8 dark:border-gray-800">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Withdrawal fees by country
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Fixed withdrawal fee, minimum withdrawal, and optional regional
                max cap per country and currency. Legacy THB/USD fields are kept
                in sync for older APIs (first THB and first USD row).
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1 sm:max-w-xs">
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Quick add
                </label>
                <select
                  value={presetValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPresetValue(v);
                    addFromPreset(v);
                  }}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">Choose a country…</option>
                  {FEE_REGION_PRESETS.map((p) => (
                    <option
                      key={`${p.countryCode}|${p.currency}`}
                      value={`${p.countryCode}|${p.currency}`}
                    >
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={addBlankRegion}
                className="h-11 shrink-0 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Add custom row
              </button>
            </div>

            <div className="space-y-6">
              {regions.length === 0 && (
                <NoData>
                  No countries yet. Use quick add or add a custom row.
                </NoData>
              )}
              {regions.map((row) => {
                const cc = row.countryCode.trim().toUpperCase();
                const inList = cc.length === 2 && feeCountryCodeSet.has(cc);
                const isManual = countryManualByRow[row.id] ?? false;
                const unknownValid =
                  cc.length === 2 &&
                  /^[A-Z]{2}$/.test(cc) &&
                  !feeCountryCodeSet.has(cc);
                let countrySelectValue: string;
                if (isManual && cc === "") {
                  countrySelectValue = "__manual__";
                } else if (cc === "") {
                  countrySelectValue = "";
                } else if (inList || unknownValid) {
                  countrySelectValue = cc;
                } else {
                  countrySelectValue = "";
                }

                const countryDisplayName =
                  cc.length === 2 ? (countryNameByCode.get(cc) ?? cc) : "";
                const regionTitle =
                  cc.length === 2
                    ? `${countryCodeToFlagEmoji(cc)} ${countryDisplayName}`
                    : "New region";
                const regionMetaLine = [
                  cc.length === 2 ? cc : null,
                  row.currency?.trim()
                    ? row.currency.trim().toUpperCase()
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ");

                const fieldSelectClass =
                  "h-11 min-h-11 w-full min-w-0 max-w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 shadow-theme-xs dark:border-gray-600 dark:bg-gray-800 dark:text-white";

                return (
                  <div
                    key={row.id}
                    className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-900/30"
                  >
                    <div className="flex flex-col gap-3 border-b border-gray-200 bg-white/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-gray-700 dark:bg-gray-950/25">
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                          Region
                        </p>
                        <p
                          className="mt-1 text-base leading-snug font-semibold break-words text-gray-900 dark:text-white"
                          title={regionTitle}
                        >
                          {regionTitle}
                        </p>
                        {regionMetaLine ? (
                          <p className="mt-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                            {regionMetaLine}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Choose country and currency below, then set fees.
                          </p>
                        )}
                      </div>
                      <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
                        <button
                          type="button"
                          onClick={() => void saveSettings()}
                          disabled={saving || fetching || !forms.id || !dirty}
                          className="h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[7.5rem]"
                        >
                          {saving ? "Saving…" : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeRegion(row.id)}
                          disabled={saving}
                          className="h-11 w-full rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:border-red-900/50 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-950/40"
                        >
                          Remove row
                        </button>
                      </div>
                    </div>

                    <div className="space-y-8 p-4 sm:p-5">
                      <section className="space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300">
                            Market
                          </h4>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Where this rule applies (ISO country + currency).
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-8">
                          <div className="min-w-0">
                            <Label className="mb-1">Country</Label>
                            <select
                              value={countrySelectValue}
                              autoComplete="country"
                              title={
                                cc.length === 2
                                  ? feeCountryOptions.find((o) => o.code === cc)
                                      ?.label
                                  : undefined
                              }
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === "") {
                                  setCountryManualByRow((m) => ({
                                    ...m,
                                    [row.id]: false,
                                  }));
                                  updateRegion(row.id, { countryCode: "" });
                                  return;
                                }
                                if (v === "__manual__") {
                                  setCountryManualByRow((m) => ({
                                    ...m,
                                    [row.id]: true,
                                  }));
                                  updateRegion(row.id, { countryCode: "" });
                                  return;
                                }
                                setCountryManualByRow((m) => ({
                                  ...m,
                                  [row.id]: false,
                                }));
                                updateRegion(row.id, { countryCode: v });
                              }}
                              className={fieldSelectClass}
                            >
                              <option value="">
                                Search or choose country…
                              </option>
                              {feeCountryOptions.map((o) => (
                                <option key={o.code} value={o.code}>
                                  {o.label}
                                </option>
                              ))}
                              {unknownValid && (
                                <option value={cc}>
                                  {countryCodeToFlagEmoji(cc)} {cc} (from API)
                                </option>
                              )}
                              <option value="__manual__">
                                Other — type 2-letter code…
                              </option>
                            </select>
                            {isManual && (
                              <input
                                type="text"
                                maxLength={2}
                                autoComplete="off"
                                value={cc}
                                onChange={(e) =>
                                  updateRegion(row.id, {
                                    countryCode: e.target.value
                                      .toUpperCase()
                                      .replace(/[^A-Z]/g, "")
                                      .slice(0, 2),
                                  })
                                }
                                placeholder="e.g. TH"
                                className="focus:ring-brand-500/20 mt-2 h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 uppercase placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                              />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Label className="mb-1">Currency</Label>
                            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                              ISO 4217 code for withdrawals in this market.
                            </p>
                            <select
                              value={
                                isCommonCurrency(row.currency)
                                  ? row.currency.toUpperCase()
                                  : "__custom__"
                              }
                              onChange={(e) => {
                                const v = e.target.value;
                                if (v === "__custom__") {
                                  updateRegion(row.id, { currency: "" });
                                  return;
                                }
                                updateRegion(row.id, { currency: v });
                              }}
                              className={fieldSelectClass}
                            >
                              {COMMON_CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                              <option value="__custom__">Other…</option>
                            </select>
                            {!isCommonCurrency(row.currency) && (
                              <input
                                type="text"
                                maxLength={8}
                                value={row.currency}
                                onChange={(e) =>
                                  updateRegion(row.id, {
                                    currency: e.target.value.toUpperCase(),
                                  })
                                }
                                placeholder="XXX"
                                className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 uppercase dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                              />
                            )}
                          </div>
                        </div>
                      </section>

                      <section className="space-y-3">
                        <div>
                          <h4 className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300">
                            Withdrawal fees
                          </h4>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            Amounts are in the currency you selected above.
                          </p>
                        </div>
                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8">
                          <div className="min-w-0">
                            <Label className="mb-1">
                              Withdrawal fee{" "}
                              <span className="text-error-500">*</span>
                            </Label>
                            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                              Fixed fee charged each time a user withdraws.
                            </p>
                            <div className="flex min-w-0 items-stretch gap-2">
                              <div className="min-w-0 flex-1">
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  value={row.feeWithdraw}
                                  min="0"
                                  onChange={(e) =>
                                    updateRegion(row.id, {
                                      feeWithdraw: parseNum(e.target.value),
                                    })
                                  }
                                />
                              </div>
                              <span className="flex h-11 min-w-[3.25rem] shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 px-2 text-xs font-medium text-gray-600 tabular-nums dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                {row.currency || "—"}
                              </span>
                            </div>
                          </div>
                          <div className="min-w-0">
                            <Label className="mb-1">
                              Minimum withdrawal{" "}
                              <span className="text-error-500">*</span>
                            </Label>
                            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                              Smallest amount a user can cash out in one
                              request.
                            </p>
                            <div className="flex min-w-0 items-stretch gap-2">
                              <div className="min-w-0 flex-1">
                                <Input
                                  type="number"
                                  placeholder="0.00"
                                  value={row.minimumWithdraw}
                                  min="0"
                                  onChange={(e) =>
                                    updateRegion(row.id, {
                                      minimumWithdraw: parseNum(e.target.value),
                                    })
                                  }
                                />
                              </div>
                              <span className="flex h-11 min-w-[3.25rem] shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 px-2 text-xs font-medium text-gray-600 tabular-nums dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                {row.currency || "—"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </section>

                      <section className="rounded-xl border border-dashed border-gray-300 bg-white/80 p-4 sm:p-5 dark:border-gray-600 dark:bg-gray-900/45">
                        <h4 className="text-brand-600 dark:text-brand-400 text-xs font-semibold tracking-wide uppercase">
                          Max cap (offers / brands)
                        </h4>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Optional ceiling for this market. Use a percentage of
                          tracked volume or a fixed amount; your API decides how
                          this stacks with global and per-offer caps.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-4">
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <input
                              type="radio"
                              name={`region_max_cap_mode_${row.id}`}
                              className="text-brand-600 focus:ring-brand-500 h-4 w-4 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                              checked={row.max_cap_mode !== "fixed"}
                              onChange={() =>
                                updateRegion(row.id, {
                                  max_cap_mode: "percent",
                                })
                              }
                            />
                            Percentage
                          </label>
                          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <input
                              type="radio"
                              name={`region_max_cap_mode_${row.id}`}
                              className="text-brand-600 focus:ring-brand-500 h-4 w-4 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                              checked={row.max_cap_mode === "fixed"}
                              onChange={() =>
                                updateRegion(row.id, { max_cap_mode: "fixed" })
                              }
                            />
                            Fixed amount
                          </label>
                        </div>
                        {row.max_cap_mode === "fixed" ? (
                          <div className="mt-4 flex max-w-xl flex-col gap-4 sm:flex-row sm:items-end">
                            <div className="min-w-0 flex-1">
                              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                                Amount
                              </p>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={row.max_cap_amount ?? 0}
                                min="0"
                                onChange={(e) =>
                                  updateRegion(row.id, {
                                    max_cap_amount: parseNum(e.target.value),
                                  })
                                }
                              />
                            </div>
                            <div className="min-w-0 sm:w-44">
                              <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                                Currency
                              </p>
                              <select
                                value={
                                  isCommonCurrency(row.max_cap_currency ?? "")
                                    ? (
                                        row.max_cap_currency ?? "THB"
                                      ).toUpperCase()
                                    : "__custom__"
                                }
                                onChange={(e) => {
                                  const v = e.target.value;
                                  if (v === "__custom__") {
                                    updateRegion(row.id, {
                                      max_cap_currency: "",
                                    });
                                    return;
                                  }
                                  updateRegion(row.id, { max_cap_currency: v });
                                }}
                                className={fieldSelectClass}
                              >
                                {COMMON_CURRENCIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                                <option value="__custom__">Other…</option>
                              </select>
                              {!isCommonCurrency(
                                row.max_cap_currency ?? "",
                              ) && (
                                <input
                                  type="text"
                                  maxLength={8}
                                  value={row.max_cap_currency ?? ""}
                                  onChange={(e) =>
                                    updateRegion(row.id, {
                                      max_cap_currency:
                                        e.target.value.toUpperCase(),
                                    })
                                  }
                                  placeholder="XXX"
                                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 uppercase dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                                />
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4 flex max-w-sm items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={row.max_cap_percent ?? 0}
                                min="0"
                                onChange={(e) =>
                                  updateRegion(row.id, {
                                    max_cap_percent: parseNum(e.target.value),
                                  })
                                }
                              />
                            </div>
                            <span className="flex h-11 min-w-[2.5rem] shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-gray-100 px-2 text-xs font-medium text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                              %
                            </span>
                          </div>
                        )}
                      </section>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="border-t border-gray-100 pt-6 dark:border-gray-800">
            <button
              type="submit"
              disabled={saving || fetching || !forms.id || !dirty}
              className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-[200px]"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
