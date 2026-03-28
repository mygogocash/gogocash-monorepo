"use client";

import React, { useState, useEffect, useCallback, startTransition } from "react";
import { Modal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";

const STORAGE_KEY = "gogocash_app_open_popup";

export type PopupDuration = "3" | "5" | "until_close";

export interface AppOpenPopupBannerItem {
  id: string;
  imageDesktop: File | null;
  imageMobile: File | null;
  duration: PopupDuration;
  link: string;
}

const DURATION_OPTIONS: { value: PopupDuration; label: string }[] = [
  { value: "3", label: "3 seconds" },
  { value: "5", label: "5 seconds" },
  { value: "until_close", label: "Until user closes" },
];

function makeId() {
  return `banner-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type StoredBanner = { id: string; duration: PopupDuration; link: string };

function loadStored(): StoredBanner[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { banners?: StoredBanner[] };
    const list = Array.isArray(parsed.banners) ? parsed.banners : [];
    return list.map((b) => ({
      id: typeof b.id === "string" ? b.id : makeId(),
      duration: ["3", "5", "until_close"].includes(b.duration) ? (b.duration as PopupDuration) : "5",
      link: typeof b.link === "string" ? b.link : "",
    }));
  } catch {
    return [];
  }
}

function saveStored(banners: AppOpenPopupBannerItem[]) {
  try {
    const toSave = banners.map((b) => ({ id: b.id, duration: b.duration, link: b.link }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ banners: toSave }));
  } catch {
    // ignore
  }
}

interface AppOpenPopupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const defaultBanner = (): AppOpenPopupBannerItem => ({
  id: makeId(),
  imageDesktop: null,
  imageMobile: null,
  duration: "5",
  link: "",
});

export default function AppOpenPopupModal({ isOpen, onClose }: AppOpenPopupModalProps) {
  const [banners, setBanners] = useState<AppOpenPopupBannerItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const stored = loadStored();
    startTransition(() => {
      if (stored.length > 0) {
        setBanners(
          stored.map((b) => ({
            id: b.id,
            imageDesktop: null,
            imageMobile: null,
            duration: b.duration,
            link: b.link,
          })),
        );
      } else {
        setBanners([defaultBanner()]);
      }
    });
  }, [isOpen]);

  const updateBanner = useCallback((id: string, patch: Partial<AppOpenPopupBannerItem>) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    );
  }, []);

  const addBanner = () => {
    setBanners((prev) => [...prev, defaultBanner()]);
  };

  const removeBanner = (id: string) => {
    setBanners((prev) => (prev.length <= 1 ? prev : prev.filter((b) => b.id !== id)));
  };

  const handleSave = () => {
    setSaving(true);
    saveStored(banners);
    setSaving(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isFullscreen showCloseButton={false} className="p-0">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-5 sm:p-6 md:p-8">
        <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
          <div className="min-w-0">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white">
              App-open popup settings
            </h4>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Configure one or more popups shown when users open the app. Order is top to bottom; each can have its own images, duration, and link.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button size="sm" variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        <div className="mt-5 min-h-0 flex-1 space-y-4 overflow-y-auto pb-4 pr-1">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-600 dark:bg-gray-800/40"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  Banner {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeBanner(banner.id)}
                  disabled={banners.length <= 1}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-200 hover:text-red-600 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-red-400"
                  title="Remove banner"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-0.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Image (desktop)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        updateBanner(banner.id, { imageDesktop: e.target.files?.[0] ?? null })
                      }
                      className="block w-full rounded-lg border border-gray-200 bg-white text-xs text-gray-800 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:file:bg-gray-800"
                    />
                    {banner.imageDesktop && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                        {banner.imageDesktop.name}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-0.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                      Image (mobile)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        updateBanner(banner.id, { imageMobile: e.target.files?.[0] ?? null })
                      }
                      className="block w-full rounded-lg border border-gray-200 bg-white text-xs text-gray-800 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-xs dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:file:bg-gray-800"
                    />
                    {banner.imageMobile && (
                      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                        {banner.imageMobile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-0.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Duration
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {DURATION_OPTIONS.map((opt) => (
                      <label
                        key={opt.value}
                        className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs has-[:checked]:border-brand-500 has-[:checked]:ring-2 has-[:checked]:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-900 dark:has-[:checked]:border-brand-400 dark:has-[:checked]:ring-brand-400/20"
                      >
                        <input
                          type="radio"
                          name={`duration-${banner.id}`}
                          value={opt.value}
                          checked={banner.duration === opt.value}
                          onChange={() => updateBanner(banner.id, { duration: opt.value })}
                          className="h-3.5 w-3.5 border-gray-300 text-brand-500 focus:ring-brand-500 dark:border-gray-600 dark:bg-gray-800"
                        />
                        <span className="text-gray-700 dark:text-gray-200">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-0.5 block text-xs font-medium text-gray-600 dark:text-gray-400">
                    Link on click
                  </label>
                  <input
                    type="url"
                    value={banner.link}
                    onChange={(e) => updateBanner(banner.id, { link: e.target.value })}
                    placeholder="https://example.com/promo"
                    className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400 dark:focus:ring-brand-400/20"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={addBanner}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 hover:border-brand-500 hover:bg-gray-50 hover:text-brand-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-brand-400 dark:hover:bg-gray-700 dark:hover:text-brand-400"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add banner
          </button>
        </div>
      </div>
    </Modal>
  );
}
