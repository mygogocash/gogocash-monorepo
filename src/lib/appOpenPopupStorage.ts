/**
 * Client-only persistence for app-open modal popup config + save history (admin UI).
 */

export type PopupDuration = "3" | "5" | "until_close";

export interface AppOpenPopupStoredBanner {
  id: string;
  duration: PopupDuration;
  link: string;
  /** Inclusive start day (YYYY-MM-DD). Empty = no fixed start. */
  startDate?: string;
  /** When true, scheduling has no end; `endDate` is ignored. */
  endForever?: boolean;
  /** Inclusive end day (YYYY-MM-DD) when `endForever` is false. */
  endDate?: string;
}

const CONFIG_KEY = "gogocash_app_open_popup";
const HISTORY_KEY = "gogocash_app_open_popup_history";

export const MAX_MODAL_POPUPS = 3;
export const MAX_HISTORY_ENTRIES = 40;

export interface PopupHistoryEntry {
  id: string;
  savedAt: string;
  banners: AppOpenPopupStoredBanner[];
}

/** Shown in Popup history when localStorage has no snapshots yet (UI preview only). */
export const MOCK_POPUP_HISTORY_ENTRIES: PopupHistoryEntry[] = [
  {
    id: "mock-preview-recent",
    savedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    banners: [
      {
        id: "mock-b1",
        duration: "5",
        link: "https://app.gogocash.co/brands",
        startDate: "",
        endForever: true,
        endDate: "",
      },
      {
        id: "mock-b2",
        duration: "until_close",
        link: "https://app.gogocash.co/quest",
        startDate: "2026-04-01",
        endForever: false,
        endDate: "2026-06-30",
      },
      {
        id: "mock-b3",
        duration: "3",
        link: "",
        startDate: "",
        endForever: true,
        endDate: "",
      },
    ],
  },
  {
    id: "mock-preview-older",
    savedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    banners: [
      {
        id: "mock-b4",
        duration: "5",
        link: "https://gogocash.co/promo",
        startDate: "2026-01-15",
        endForever: true,
        endDate: "",
      },
      {
        id: "mock-b5",
        duration: "3",
        link: "https://app.gogocash.co/reward",
        startDate: "",
        endForever: false,
        endDate: "2026-12-31",
      },
    ],
  },
];

function makeId() {
  return `pop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function loadPopupConfig(): AppOpenPopupStoredBanner[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { banners?: AppOpenPopupStoredBanner[] };
    const list = Array.isArray(parsed.banners) ? parsed.banners : [];
    return list
      .slice(0, MAX_MODAL_POPUPS)
      .map((b) => ({
        id: typeof b.id === "string" ? b.id : makeId(),
        duration: ["3", "5", "until_close"].includes(b.duration)
          ? (b.duration as PopupDuration)
          : "5",
        link: typeof b.link === "string" ? b.link : "",
        startDate: typeof b.startDate === "string" ? b.startDate : "",
        endForever: typeof b.endForever === "boolean" ? b.endForever : true,
        endDate: typeof b.endDate === "string" ? b.endDate : "",
      }));
  } catch {
    return [];
  }
}

export function savePopupConfig(banners: AppOpenPopupStoredBanner[]): void {
  try {
    const trimmed = banners.slice(0, MAX_MODAL_POPUPS).map((b) => ({
      id: b.id,
      duration: b.duration,
      link: b.link.trim(),
      startDate: (b.startDate ?? "").trim(),
      endForever: b.endForever !== false,
      endDate: b.endForever === false ? (b.endDate ?? "").trim() : "",
    }));
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ banners: trimmed }));
    appendPopupHistory(trimmed);
  } catch {
    // ignore quota / private mode
  }
}

export function loadPopupHistory(): PopupHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { entries?: PopupHistoryEntry[] };
    const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
    return entries
      .filter((e) => e && typeof e.savedAt === "string" && Array.isArray(e.banners))
      .slice(0, MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

function appendPopupHistory(banners: AppOpenPopupStoredBanner[]): void {
  try {
    const prev = loadPopupHistory();
    const entry: PopupHistoryEntry = {
      id: makeId(),
      savedAt: new Date().toISOString(),
      banners: banners.map((b) => ({ ...b })),
    };
    const next = [entry, ...prev].slice(0, MAX_HISTORY_ENTRIES);
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ entries: next }));
  } catch {
    // ignore
  }
}
