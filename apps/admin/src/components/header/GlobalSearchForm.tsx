"use client";

import Link from "next/link";
import type { FormEvent, RefObject } from "react";
import type { DataWithdrawsList, Offer, RegularUser } from "@/types/api";

export type GlobalSearchFormProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  variant: "mobile" | "desktop";
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  previewOpen: boolean;
  onPreviewOpenChange: (open: boolean) => void;
  searchLoading: boolean;
  previewResults: {
    users: RegularUser[];
    offers: Offer[];
    withdraws: DataWithdrawsList[];
  };
  onSubmit: (e: FormEvent) => void;
};

export function GlobalSearchForm({
  inputRef,
  variant,
  searchQuery,
  onSearchQueryChange,
  previewOpen,
  onPreviewOpenChange,
  searchLoading,
  previewResults,
  onSubmit,
}: GlobalSearchFormProps) {
  const hasResults =
    previewResults.users.length > 0 ||
    previewResults.offers.length > 0 ||
    previewResults.withdraws.length > 0;

  const inputClassName =
    variant === "desktop"
      ? "dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full min-w-0 max-w-full rounded-lg border border-gray-200 bg-transparent py-2.5 pr-14 pl-12 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden xl:max-w-[600px] 2xl:max-w-[720px] dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
      : "dark:bg-dark-900 shadow-theme-xs focus:border-brand-300 focus:ring-brand-500/10 dark:focus:border-brand-800 h-11 w-full min-w-0 rounded-lg border border-gray-200 bg-transparent py-2.5 pl-12 pr-3 text-base text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 sm:text-sm";

  const dropdownClassName =
    variant === "desktop"
      ? "absolute top-full left-0 z-[100] mt-1 w-full min-w-0 max-w-[min(42rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900"
      : "absolute top-full left-0 right-0 z-[100] mt-1 w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900";

  return (
    <form onSubmit={onSubmit}>
      <div className="relative">
        <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2">
          <svg
            className="fill-gray-500 dark:fill-gray-400"
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M3.04175 9.37363C3.04175 5.87693 5.87711 3.04199 9.37508 3.04199C12.8731 3.04199 15.7084 5.87693 15.7084 9.37363C15.7084 12.8703 12.8731 15.7053 9.37508 15.7053C5.87711 15.7053 3.04175 12.8703 3.04175 9.37363ZM9.37508 1.54199C5.04902 1.54199 1.54175 5.04817 1.54175 9.37363C1.54175 13.6991 5.04902 17.2053 9.37508 17.2053C11.2674 17.2053 13.003 16.5344 14.357 15.4176L17.177 18.238C17.4699 18.5309 17.9448 18.5309 18.2377 18.238C18.5306 17.9451 18.5306 17.4703 18.2377 17.1774L15.418 14.3573C16.5365 13.0033 17.2084 11.2669 17.2084 9.37363C17.2084 5.04817 13.7011 1.54199 9.37508 1.54199Z"
            />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onFocus={() => searchQuery.trim() && onPreviewOpenChange(true)}
          placeholder="Search or type command..."
          className={inputClassName}
        />

        {variant === "desktop" ? (
          <span className="pointer-events-none absolute top-1/2 right-2.5 inline-flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-gray-200 bg-gray-50 px-[7px] py-[4.5px] text-xs -tracking-[0.2px] text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
            <span aria-hidden>⌘</span>
            <span>K</span>
          </span>
        ) : null}

        {previewOpen && searchQuery.trim() ? (
          <div className={dropdownClassName}>
            {searchLoading ? (
              <div className="flex items-center gap-2 px-4 py-6 text-sm text-gray-500 dark:text-gray-400">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
                Searching...
              </div>
            ) : (
              <div className="max-h-[min(320px,70dvh)] overflow-y-auto overscroll-y-contain py-2">
                {previewResults.users.length > 0 && (
                  <div className="px-2 pb-2">
                    <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Users
                    </div>
                    <ul className="space-y-0.5">
                      {previewResults.users.map((u) => (
                        <li key={u._id}>
                          <Link
                            href={`/users?search=${encodeURIComponent(searchQuery)}`}
                            onClick={() => onPreviewOpenChange(false)}
                            className="flex min-w-0 flex-col gap-0.5 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 sm:flex-row sm:items-center sm:gap-2 dark:text-white/90 dark:hover:bg-gray-800"
                          >
                            <span className="truncate font-medium">{u.username ?? u.email}</span>
                            <span className="truncate text-gray-500 dark:text-gray-400">{u.email}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {previewResults.offers.length > 0 && (
                  <div className="px-2 pb-2">
                    <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Brands
                    </div>
                    <ul className="space-y-0.5">
                      {previewResults.offers.map((o) => (
                        <li key={o._id}>
                          <Link
                            href={`/brands/${o._id}`}
                            onClick={() => onPreviewOpenChange(false)}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 dark:text-white/90 dark:hover:bg-gray-800"
                          >
                            <span className="truncate font-medium">
                              {o.offer_name_display || o.offer_name}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {previewResults.withdraws.length > 0 && (
                  <div className="px-2 pb-2">
                    <div className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Withdrawals
                    </div>
                    <ul className="space-y-0.5">
                      {previewResults.withdraws.map((w) => (
                        <li key={w._id}>
                          <Link
                            href={`/withdraw/${w._id}`}
                            onClick={() => onPreviewOpenChange(false)}
                            className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-3 py-2 text-sm text-gray-800 hover:bg-gray-100 dark:text-white/90 dark:hover:bg-gray-800"
                          >
                            <span className="truncate font-medium">
                              {w.user_id?.username ?? w.account_name ?? w._id}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {w.amount_net} {w.currency}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {!searchLoading && !hasResults && (
                  <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No results for &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </form>
  );
}
