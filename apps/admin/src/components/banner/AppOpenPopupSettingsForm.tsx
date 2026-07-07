"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  startTransition,
  useMemo,
} from "react";
import Button from "@/components/ui/button/Button";
import toast from "react-hot-toast";
import { isDirty } from "@/lib/isDirty";
import {
  loadPopupConfig,
  savePopupConfig,
  MAX_MODAL_POPUPS,
  type PopupDuration,
  type AppOpenPopupStoredBanner,
} from "@/lib/appOpenPopupStorage";

export interface AppOpenPopupBannerItem {
  id: string;
  imageDesktop: File | null;
  imageMobile: File | null;
  duration: PopupDuration;
  /** Redirect URL when the user taps the popup */
  link: string;
  /** YYYY-MM-DD; empty = no fixed start day */
  startDate: string;
  /** When true, ignore `endDate` (runs indefinitely). */
  endForever: boolean;
  /** YYYY-MM-DD inclusive end when `endForever` is false */
  endDate: string;
}

const DURATION_OPTIONS: { value: PopupDuration; label: string }[] = [
  { value: "3", label: "3 seconds" },
  { value: "5", label: "5 seconds" },
  { value: "until_close", label: "Until user closes" },
];

function makeId() {
  return `banner-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function storedToItem(s: AppOpenPopupStoredBanner): AppOpenPopupBannerItem {
  const endForever = s.endForever ?? true;
  return {
    id: s.id,
    imageDesktop: null,
    imageMobile: null,
    duration: s.duration,
    link: s.link,
    startDate: typeof s.startDate === "string" ? s.startDate : "",
    endForever,
    endDate: endForever ? "" : typeof s.endDate === "string" ? s.endDate : "",
  };
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Project banners into a comparable snapshot of the editable fields that are
 * actually persisted (images are admin-preview only and never saved, so they
 * are intentionally excluded). Drives "disable Save until something changed".
 */
function bannersSnapshot(banners: AppOpenPopupBannerItem[]) {
  return banners.map((b) => ({
    id: b.id,
    duration: b.duration,
    link: b.link,
    startDate: b.startDate,
    endForever: b.endForever,
    endDate: b.endDate,
  }));
}

function defaultBanner(): AppOpenPopupBannerItem {
  return {
    id: makeId(),
    imageDesktop: null,
    imageMobile: null,
    duration: "5",
    link: "",
    startDate: "",
    endForever: true,
    endDate: "",
  };
}

type Props = {
  /** Load / reset state when this flips true (e.g. modal opened). */
  isActive?: boolean;
  /** Called after successful save (e.g. close modal). */
  onSaved?: () => void;
  /** Optional top-right actions area (modal wraps its own). */
  className?: string;
};

export default function AppOpenPopupSettingsForm({
  isActive = true,
  onSaved,
  className = "",
}: Props) {
  const [banners, setBanners] = useState<AppOpenPopupBannerItem[]>([]);
  const [saving, setSaving] = useState(false);
  /** Snapshot of the editable fields as loaded; baseline for unsaved-changes. */
  const [initialSnapshot, setInitialSnapshot] = useState<
    ReturnType<typeof bannersSnapshot>
  >([]);

  const hydrate = useCallback(() => {
    const stored = loadPopupConfig();
    const initial =
      stored.length > 0
        ? stored.map(storedToItem).slice(0, MAX_MODAL_POPUPS)
        : [defaultBanner()];
    startTransition(() => {
      setBanners(initial);
      setInitialSnapshot(bannersSnapshot(initial));
    });
  }, []);

  useEffect(() => {
    if (!isActive) return;
    hydrate();
  }, [isActive, hydrate]);

  const updateBanner = useCallback(
    (id: string, patch: Partial<AppOpenPopupBannerItem>) => {
      setBanners((prev) =>
        prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
      );
    },
    [],
  );

  const addBanner = () => {
    setBanners((prev) => {
      if (prev.length >= MAX_MODAL_POPUPS) return prev;
      return [...prev, defaultBanner()];
    });
  };

  const removeBanner = (id: string) => {
    setBanners((prev) =>
      prev.length <= 1 ? prev : prev.filter((b) => b.id !== id),
    );
  };

  const handleSave = () => {
    const invalid = banners.find((b) => !b.endForever && !b.endDate.trim());
    if (invalid) {
      toast.error(
        "Set an end date or choose “No end date (forever)” for each popup.",
      );
      return;
    }
    setSaving(true);
    try {
      const toStore: AppOpenPopupStoredBanner[] = banners.map((b) => ({
        id: b.id,
        duration: b.duration,
        link: b.link.trim(),
        startDate: b.startDate.trim(),
        endForever: b.endForever,
        endDate: b.endForever ? "" : b.endDate.trim(),
      }));
      savePopupConfig(toStore);
      setInitialSnapshot(bannersSnapshot(banners));
      toast.success(`Saved ${toStore.length} modal popup(s). History updated.`);
      onSaved?.();
    } finally {
      setSaving(false);
    }
  };

  const canAdd = banners.length < MAX_MODAL_POPUPS;
  const dirty = useMemo(
    () => isDirty(bannersSnapshot(banners), initialSnapshot),
    [banners, initialSnapshot],
  );

  return (
    <div className={className}>
      <div className="mb-6 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4 sm:p-5 dark:border-gray-700 dark:from-gray-900/80 dark:to-gray-900">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
          Modal popups on app open
        </h4>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Configure up to <strong>{MAX_MODAL_POPUPS}</strong> full-screen style
          popups shown when users open the app. Set a{" "}
          <strong>redirect link</strong> for where taps should go (offer, shop,
          or external URL). Order is 1 → 3; images are for preview in admin only
          until wired to your API.
        </p>
      </div>

      <div className="space-y-4">
        {banners.map((banner, index) => (
          <div
            key={banner.id}
            className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5 dark:border-gray-600 dark:bg-gray-800/40"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Popup {index + 1} of {MAX_MODAL_POPUPS}
              </span>
              <button
                type="button"
                onClick={() => removeBanner(banner.id)}
                disabled={banners.length <= 1}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-200 hover:text-red-600 disabled:opacity-40 dark:hover:bg-gray-700 dark:hover:text-red-400"
                title="Remove this popup"
                aria-label="Remove popup"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Image (desktop)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      updateBanner(banner.id, {
                        imageDesktop: e.target.files?.[0] ?? null,
                      })
                    }
                    className="block w-full rounded-lg border border-gray-200 bg-white text-xs text-gray-800 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 dark:border-gray-600 dark:bg-gray-900 dark:file:bg-gray-800"
                  />
                  {banner.imageDesktop && (
                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                      {banner.imageDesktop.name}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Image (mobile)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      updateBanner(banner.id, {
                        imageMobile: e.target.files?.[0] ?? null,
                      })
                    }
                    className="block w-full rounded-lg border border-gray-200 bg-white text-xs text-gray-800 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 dark:border-gray-600 dark:bg-gray-900 dark:file:bg-gray-800"
                  />
                  {banner.imageMobile && (
                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                      {banner.imageMobile.name}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                  Display duration
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className="has-[:checked]:border-brand-500 has-[:checked]:ring-brand-500/20 dark:has-[:checked]:border-brand-400 flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs has-[:checked]:ring-2 dark:border-gray-600 dark:bg-gray-900"
                    >
                      <input
                        type="radio"
                        name={`duration-${banner.id}`}
                        value={opt.value}
                        checked={banner.duration === opt.value}
                        onChange={() =>
                          updateBanner(banner.id, { duration: opt.value })
                        }
                        className="text-brand-500 h-3.5 w-3.5 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                      />
                      <span className="text-gray-700 dark:text-gray-200">
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor={`popup-start-${banner.id}`}
                    className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
                  >
                    Start date
                  </label>
                  <input
                    id={`popup-start-${banner.id}`}
                    type="date"
                    value={banner.startDate}
                    onChange={(e) =>
                      updateBanner(banner.id, { startDate: e.target.value })
                    }
                    className="focus:border-brand-500 focus:ring-brand-500/20 dark:focus:border-brand-400 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Optional. First day this popup may show (inclusive). Leave
                    empty for no fixed start.
                  </p>
                </div>
                <div>
                  <span className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    End date
                  </span>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={banner.endForever}
                      onChange={(e) => {
                        const forever = e.target.checked;
                        updateBanner(banner.id, {
                          endForever: forever,
                          endDate: forever
                            ? ""
                            : banner.endDate ||
                              banner.startDate ||
                              todayIsoDate(),
                        });
                      }}
                      className="text-brand-500 h-4 w-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                    />
                    No end date (forever)
                  </label>
                  {!banner.endForever && (
                    <>
                      <input
                        id={`popup-end-${banner.id}`}
                        type="date"
                        value={banner.endDate}
                        min={banner.startDate || undefined}
                        onChange={(e) =>
                          updateBanner(banner.id, { endDate: e.target.value })
                        }
                        className="focus:border-brand-500 focus:ring-brand-500/20 dark:focus:border-brand-400 mt-2 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Last day this popup may show (inclusive).
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor={`popup-link-${banner.id}`}
                  className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400"
                >
                  Redirect link (tap target)
                </label>
                <input
                  id={`popup-link-${banner.id}`}
                  type="url"
                  value={banner.link}
                  onChange={(e) =>
                    updateBanner(banner.id, { link: e.target.value })
                  }
                  placeholder="https://app.gogocash.co/offer/… or https://…"
                  className="focus:border-brand-500 focus:ring-brand-500/20 dark:focus:border-brand-400 h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Tracking link or web URL opened when the user taps this popup.
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={addBanner}
          disabled={!canAdd}
          className="hover:border-brand-500 hover:text-brand-600 dark:hover:border-brand-400 dark:hover:text-brand-400 inline-flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add popup {!canAdd ? `(max ${MAX_MODAL_POPUPS})` : ""}
        </button>
        <div className="flex gap-2 sm:ml-auto">
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty}>
            {saving ? "Saving…" : "Save configuration"}
          </Button>
        </div>
      </div>
    </div>
  );
}
