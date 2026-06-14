"use client";

import type { ExecutiveFilters } from "@/data/executive/types";
import React from "react";

type Props = {
  value: ExecutiveFilters;
  onChange: (next: ExecutiveFilters) => void;
};

const RANGES = [
  { value: "7d" as const, label: "7d" },
  { value: "30d" as const, label: "30d" },
  { value: "90d" as const, label: "90d" },
  { value: "ytd" as const, label: "YTD" },
];

export function ExecutiveFiltersBar({ value, onChange }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200/90 bg-gray-50/80 p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900/40 sm:flex-row sm:flex-wrap sm:items-end sm:gap-4">
      <div>
        <label className="mb-1 block text-[10px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
          Date range
        </label>
        <div className="flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onChange({ ...value, range: r.value })}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                value.range === r.value
                  ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                  : "bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:ring-gray-700 dark:hover:bg-gray-700"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-w-[140px] flex-1">
        <label
          htmlFor="exec-filter-country"
          className="mb-1 block text-[10px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
        >
          Country
        </label>
        <select
          id="exec-filter-country"
          value={value.country}
          onChange={(e) => onChange({ ...value, country: e.target.value })}
          className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All</option>
          <option value="TH">Thailand</option>
          <option value="SG">Singapore</option>
          <option value="MY">Malaysia</option>
        </select>
      </div>
      <div className="min-w-[160px] flex-1">
        <label
          htmlFor="exec-filter-category"
          className="mb-1 block text-[10px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
        >
          Merchant category
        </label>
        <select
          id="exec-filter-category"
          value={value.merchantCategory}
          onChange={(e) => onChange({ ...value, merchantCategory: e.target.value })}
          className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All categories</option>
          <option value="travel">Travel</option>
          <option value="electronics">Electronics</option>
          <option value="beauty">Health & beauty</option>
          <option value="home">Home</option>
          <option value="education">Education</option>
        </select>
      </div>
      <div className="min-w-[140px] flex-1">
        <label
          htmlFor="exec-filter-channel"
          className="mb-1 block text-[10px] font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
        >
          Channel
        </label>
        <select
          id="exec-filter-channel"
          value={value.channel}
          onChange={(e) => onChange({ ...value, channel: e.target.value })}
          className="h-9 w-full rounded-lg border border-gray-200 bg-white px-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        >
          <option value="all">All channels</option>
          <option value="organic">Organic</option>
          <option value="referral">Referral</option>
          <option value="paid">Paid</option>
          <option value="partner">Partner</option>
        </select>
      </div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 sm:ml-auto sm:self-center">
        {/* TODO: wire filters to API query params — currently mock only */}
        Filters apply to live API once connected.
      </p>
    </div>
  );
}
