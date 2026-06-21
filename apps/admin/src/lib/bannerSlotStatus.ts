/**
 * Banner rows use per-slot schedule and enabled state, with fallback to the legacy
 * shared `start_date` / `end_date` fields when slot fields are absent.
 */

import type { BannerData } from "@/types/banner";

export type BannerSlotUiStatus = "Empty" | "Scheduled" | "Active" | "Ended";

export type InactiveBannerSlotReason = "Empty" | "Ended";

export type InactiveBannerSlotInfo = {
  slot: number;
  reason: InactiveBannerSlotReason;
  link: string;
  hasImageId: boolean;
};

export type BannerSlotScheduleInput = {
  hasSlotContent: boolean;
  enabled?: boolean;
  start_date?: string | null;
  end_date?: string | null;
  now?: Date;
};

function ymdToday(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function normYmd(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(t);
  return m ? m[1] : null;
}

const resolveSlotValue = (
  bannerData: BannerData | undefined,
  slot: number,
  key:
    | "enabled_1"
    | "enabled_2"
    | "enabled_3"
    | "enabled_4"
    | "enabled_5"
    | "start_date_1"
    | "start_date_2"
    | "start_date_3"
    | "start_date_4"
    | "start_date_5"
    | "end_date_1"
    | "end_date_2"
    | "end_date_3"
    | "end_date_4"
    | "end_date_5",
): string | boolean | null | undefined => {
  const slotKey = `${key.slice(0, -1)}${slot}` as keyof BannerData;
  const specific = bannerData?.[slotKey];
  if (key.startsWith("enabled_")) {
    return typeof specific === "boolean" ? specific : undefined;
  }
  if (typeof specific === "string") {
    return specific;
  }
  const fallbackKey = key.startsWith("start")
    ? ("start_date" as const)
    : ("end_date" as const);
  const fallback = bannerData?.[fallbackKey];
  return typeof fallback === "string" ? fallback : null;
};

export function getBannerSlotStatus(input: BannerSlotScheduleInput): {
  status: BannerSlotUiStatus;
  badgeClass: string;
} {
  const now = input.now ?? new Date();
  const today = ymdToday(now);

  if (!input.hasSlotContent) {
    return {
      status: "Empty",
      badgeClass:
        "inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    };
  }
  if (input.enabled === false) {
    return {
      status: "Ended",
      badgeClass:
        "inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    };
  }

  const start = normYmd(input.start_date);
  const end = normYmd(input.end_date);

  if (start && today.localeCompare(start) < 0) {
    return {
      status: "Scheduled",
      badgeClass:
        "inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/60 dark:text-amber-200",
    };
  }
  if (end && today.localeCompare(end) > 0) {
    return {
      status: "Ended",
      badgeClass:
        "inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    };
  }

  return {
    status: "Active",
    badgeClass:
      "inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200",
  };
}

/** Status column on banner admin tables: only Active | Scheduled; everything else is inactive. */
export function getBannerTableStatusCell(input: BannerSlotScheduleInput):
  | { kind: "live"; label: "Active" | "Scheduled"; badgeClass: string }
  | { kind: "inactive" } {
  const full = getBannerSlotStatus(input);
  if (full.status === "Scheduled") {
    return { kind: "live", label: "Scheduled", badgeClass: full.badgeClass };
  }
  if (full.status === "Active") {
    return { kind: "live", label: "Active", badgeClass: full.badgeClass };
  }
  return { kind: "inactive" };
}

/** Image id, link, and whether the slot counts as “filled” for schedule/status rules. */
export function getBannerSlotRowFields(
  bannerData: BannerData | undefined,
  slot: number,
): {
  imageId: string | null | undefined;
  link: string;
  hasSlotContent: boolean;
  enabled: boolean;
  startDate: string;
  endDate: string;
} {
  const imageId = bannerData?.[`image_${slot}` as keyof BannerData] as string | null | undefined;
  const link = (bannerData?.[`link_${slot}` as keyof BannerData] as string) || "";
  const rawEnabled = resolveSlotValue(
    bannerData,
    slot,
    `enabled_${slot}` as `enabled_${1 | 2 | 3 | 4 | 5}`,
  );
  const enabled = Boolean(rawEnabled === undefined ? true : rawEnabled);
  const startDate = String(
    resolveSlotValue(
      bannerData,
      slot,
      `start_date_${slot}` as `start_date_${1 | 2 | 3 | 4 | 5}`,
    ) || "",
  );
  const endDate = String(
    resolveSlotValue(
      bannerData,
      slot,
      `end_date_${slot}` as `end_date_${1 | 2 | 3 | 4 | 5}`,
    ) || "",
  );
  const hasSlotContent = Boolean(
    (imageId && String(imageId).trim().length > 0) || link.trim().length > 0,
  );
  return { imageId, link, hasSlotContent, enabled, startDate, endDate };
}

/** Slots that are empty or past end date — shown on Popup history, not as status badges on the banner table. */
export function listInactiveBannerSlots(
  bannerData: BannerData | undefined,
  now?: Date,
): InactiveBannerSlotInfo[] {
  const out: InactiveBannerSlotInfo[] = [];
  for (let slot = 1; slot <= 5; slot++) {
    const { imageId, link, hasSlotContent, enabled, startDate, endDate } =
      getBannerSlotRowFields(bannerData, slot);
    const full = getBannerSlotStatus({
      hasSlotContent,
      enabled,
      start_date: startDate,
      end_date: endDate,
      now,
    });
    if (full.status === "Empty" || full.status === "Ended") {
      out.push({
        slot,
        reason: full.status === "Empty" ? "Empty" : "Ended",
        link,
        hasImageId: Boolean(imageId && String(imageId).trim().length > 0),
      });
    }
  }
  return out;
}
