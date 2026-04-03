"use client";

import React, { useState, useEffect, useCallback } from "react";
import type { FeeSettingsForm, FeeWithdrawRegion, ResponseFee } from "@/types/api";
import { useDataSession } from "@/hooks/useDataSession";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import apiClient from "@/lib/api";
import { devError } from "@/lib/devConsole";
import {
  deriveLegacyWithdrawFields,
  ensureRegionIds,
  legacyRegionsFromResponse,
  normalizeRegionsForSave,
  validateWithdrawRegions,
} from "@/lib/feeWithdrawRegions";
import { COMMON_CURRENCIES, FEE_REGION_PRESETS } from "@/data/feeRegionPresets";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { DEFAULT_MOCK_ACCESS_TOKEN } from "@/lib/authTokens";

function isCommonCurrency(code: string): boolean {
  return (COMMON_CURRENCIES as readonly string[]).includes(code.toUpperCase());
}

function parseNum(raw: string): number {
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function newRegionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function newRegion(overrides?: Partial<FeeWithdrawRegion>): FeeWithdrawRegion {
  return {
    id: newRegionId(),
    countryCode: "",
    currency: "THB",
    feeWithdraw: 0,
    minimumWithdraw: 0,
    ...overrides,
  };
}

export default function FeeForm() {
  const session = useDataSession();

  const [forms, setForms] = useState<FeeSettingsForm>({
    system: 0,
    fee_withdraw_usd: 0,
    fee_withdraw_thb: 0,
    minimum_withdraw_thb: 0,
    minimum_withdraw_usd: 0,
    id: "",
    withdraw_regions: [],
  });

  const [presetValue, setPresetValue] = useState("");
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);

  const token = session?.accessToken ?? DEFAULT_MOCK_ACCESS_TOKEN;

  const applyFeeResponse = useCallback(
    (res: ResponseFee) => {
      const fromApi = res.withdraw_regions?.length
        ? ensureRegionIds(res.withdraw_regions, legacyRegionsFromResponse(res))
        : legacyRegionsFromResponse(res);
      const legacy = deriveLegacyWithdrawFields(fromApi);
      setForms({
        system: res.system,
        fee_withdraw_usd: legacy.fee_withdraw_usd,
        fee_withdraw_thb: legacy.fee_withdraw_thb,
        minimum_withdraw_thb: legacy.minimum_withdraw_thb,
        minimum_withdraw_usd: legacy.minimum_withdraw_usd,
        id: res._id,
        withdraw_regions: fromApi,
      });
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setFetching(true);
      try {
        const response = await apiClient.getFee(token);
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
  }, [token, applyFeeResponse]);

  const regions = forms.withdraw_regions ?? [];

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
      return { ...f, withdraw_regions: next, ...deriveLegacyWithdrawFields(next) };
    });
    setPresetValue("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forms.id?.trim()) {
      toast.error("Fee record is not loaded yet. Please wait or refresh.");
      return;
    }
    const normalized = normalizeRegionsForSave(regions);
    if (normalized.length === 0) {
      toast.error("Add at least one country/currency row for withdrawal fees.");
      return;
    }
    const err = validateWithdrawRegions(normalized);
    if (err) {
      toast.error(err);
      return;
    }
    const legacy = deriveLegacyWithdrawFields(normalized);
    setSaving(true);
    try {
      await apiClient.updateFee(
        {
          ...forms,
          ...legacy,
          withdraw_regions: normalized,
        },
        token,
      );
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
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-600 dark:border-t-brand-400" />
              Loading fee settings…
            </div>
          </div>
        )}
        <form
          onSubmit={handleSave}
          className={`space-y-8 ${fetching ? "pointer-events-none opacity-60" : ""}`}
        >
          <section className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                System
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Global platform fee. Same percentage applies across countries unless
                your backend overrides per region.
              </p>
            </div>
            <div>
              <Label>
                System <span className="text-error-500">*</span>
              </Label>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                Platform fee percentage applied to transactions (e.g. 2.5 for 2.5%).
              </p>
              <div className="mt-2 flex max-w-md items-center gap-3">
                <Input
                  placeholder="0.00"
                  type="text"
                  value={forms.system}
                  min="0"
                  onChange={(e) =>
                    setForms({
                      ...forms,
                      system: parseNum(e.target.value),
                    })
                  }
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">%</span>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-t border-gray-100 pt-8 dark:border-gray-800">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                Withdrawal fees by country
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Fixed withdrawal fee and minimum withdrawal amount per country and
                currency. Legacy THB/USD fields are kept in sync for older APIs (first
                THB and first USD row).
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

            <div className="space-y-4">
              {regions.length === 0 && (
                <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50/80 px-4 py-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
                  No countries yet. Use quick add or add a custom row.
                </p>
              )}
              {regions.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-900/30"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 sm:gap-3">
                    <div className="sm:col-span-2">
                      <Label>Country</Label>
                      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                        ISO code (2 letters)
                      </p>
                      <input
                        type="text"
                        maxLength={2}
                        autoComplete="country"
                        value={row.countryCode}
                        onChange={(e) =>
                          updateRegion(row.id, {
                            countryCode: e.target.value.toUpperCase(),
                          })
                        }
                        placeholder="TH"
                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm uppercase text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:ring-brand-500/20 focus:outline-hidden dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Label>Currency</Label>
                      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                        ISO 4217
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
                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
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
                          className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm uppercase text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      )}
                    </div>
                    <div className="sm:col-span-3">
                      <Label>
                        Fee / withdrawal <span className="text-error-500">*</span>
                      </Label>
                      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                        Fixed fee per withdrawal
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={row.feeWithdraw}
                          min="0"
                          onChange={(e) =>
                            updateRegion(row.id, {
                              feeWithdraw: parseNum(e.target.value),
                            })
                          }
                        />
                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                          {row.currency || "—"}
                        </span>
                      </div>
                    </div>
                    <div className="sm:col-span-3">
                      <Label>
                        Minimum withdraw <span className="text-error-500">*</span>
                      </Label>
                      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                        Minimum amount
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="0.00"
                          value={row.minimumWithdraw}
                          min="0"
                          onChange={(e) =>
                            updateRegion(row.id, {
                              minimumWithdraw: parseNum(e.target.value),
                            })
                          }
                        />
                        <span className="shrink-0 text-xs text-gray-500 dark:text-gray-400">
                          {row.currency || "—"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-end sm:col-span-2">
                      <button
                        type="button"
                        onClick={() => removeRegion(row.id)}
                        className="h-11 w-full rounded-lg border border-red-200 bg-white px-3 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-950/40"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="border-t border-gray-100 pt-6 dark:border-gray-800">
            <button
              type="submit"
              disabled={saving || fetching || !forms.id}
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
