/**
 * Banner rows use per-slot schedule and enabled state, with fallback to the legacy
 * shared `start_date` / `end_date` fields when slot fields are absent.
 */

import type { BannerData } from "@/types/banner";
import { STATUS_BADGE_BASE } from "@/lib/statusBadge";

export type BannerSlotUiStatus =
  | "Empty"
  | "Needs image"
  | "Scheduled"
  | "Active"
  | "Disabled"
  | "Ended";

export type InactiveBannerSlotReason =
  | "Empty"
  | "Needs image"
  | "Disabled"
  | "Ended";

export type InactiveBannerSlotInfo = {
  slot: number;
  reason: InactiveBannerSlotReason;
  link: string;
  hasImageId: boolean;
};

export type BannerSlotScheduleInput = {
  hasSlotContent: boolean;
  hasImage?: boolean;
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
      badgeClass: `${STATUS_BADGE_BASE} bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300`,
    };
  }
  if (input.hasImage === false) {
    return {
      status: "Needs image",
      badgeClass: `${STATUS_BADGE_BASE} bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200`,
    };
  }
  if (input.enabled === false) {
    return {
      status: "Disabled",
      badgeClass: `${STATUS_BADGE_BASE} bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200`,
    };
  }

  const start = normYmd(input.start_date);
  const end = normYmd(input.end_date);

  if (start && today.localeCompare(start) < 0) {
    return {
      status: "Scheduled",
      badgeClass: `${STATUS_BADGE_BASE} bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200`,
    };
  }
  if (end && today.localeCompare(end) > 0) {
    return {
      status: "Ended",
      badgeClass: `${STATUS_BADGE_BASE} bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300`,
    };
  }

  return {
    status: "Active",
    badgeClass: `${STATUS_BADGE_BASE} bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200`,
  };
}

/** Complete, visible status for a banner-table row. */
export function getBannerTableStatusCell(input: BannerSlotScheduleInput): {
  label: BannerSlotUiStatus;
  badgeClass: string;
} {
  const full = getBannerSlotStatus(input);
  return { label: full.status, badgeClass: full.badgeClass };
}

/** Image id, link, and whether the slot counts as “filled” for schedule/status rules. */
export function getBannerSlotRowFields(
  bannerData: BannerData | undefined,
  slot: number,
): {
  imageId: string | null | undefined;
  link: string;
  hasSlotContent: boolean;
  hasImage: boolean;
  enabled: boolean;
  startDate: string;
  endDate: string;
} {
  const imageId = bannerData?.[`image_${slot}` as keyof BannerData] as
    string | null | undefined;
  const link =
    (bannerData?.[`link_${slot}` as keyof BannerData] as string) || "";
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
  const hasImage = Boolean(imageId && String(imageId).trim().length > 0);
  return { imageId, link, hasSlotContent, hasImage, enabled, startDate, endDate };
}

/** Slots that are not live or scheduled — repeated in Popup history for review. */
export function listInactiveBannerSlots(
  bannerData: BannerData | undefined,
  now?: Date,
): InactiveBannerSlotInfo[] {
  const out: InactiveBannerSlotInfo[] = [];
  for (let slot = 1; slot <= 5; slot++) {
    const { imageId, link, hasSlotContent, hasImage, enabled, startDate, endDate } =
      getBannerSlotRowFields(bannerData, slot);
    const full = getBannerSlotStatus({
      hasSlotContent,
      hasImage,
      enabled,
      start_date: startDate,
      end_date: endDate,
      now,
    });
    if (
      full.status === "Empty" ||
      full.status === "Needs image" ||
      full.status === "Disabled" ||
      full.status === "Ended"
    ) {
      out.push({
        slot,
        reason: full.status,
        link,
        hasImageId: Boolean(imageId && String(imageId).trim().length > 0),
      });
    }
  }
  return out;
}
