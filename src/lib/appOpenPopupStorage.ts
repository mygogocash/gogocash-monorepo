/**
 * Client-only persistence for app-open modal popup config + save history (admin UI).
 */

export type PopupDuration = "3" | "5" | "until_close";

export interface AppOpenPopupStoredBanner {
  id: string;
  duration: PopupDuration;
  link: string;
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
      link: b.link,
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
