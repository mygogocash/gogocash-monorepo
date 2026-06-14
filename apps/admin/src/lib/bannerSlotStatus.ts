/**
 * Banner rows share one schedule (`start_date` / `end_date`) on the payload; each row shows status
 * for that slot given whether it has image or link.
 *
 * On banner list tables we only show **Active** and **Scheduled**; empty or past-end slots are
 * treated as inactive and summarized on the Popup history page.
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
): { imageId: string | null | undefined; link: string; hasSlotContent: boolean } {
  const imageId = bannerData?.[`image_${slot}` as keyof BannerData] as string | null | undefined;
  const link = (bannerData?.[`link_${slot}` as keyof BannerData] as string) || "";
  const hasSlotContent = Boolean(
    (imageId && String(imageId).trim().length > 0) || link.trim().length > 0,
  );
  return { imageId, link, hasSlotContent };
}

/** Slots that are empty or past end date — shown on Popup history, not as status badges on the banner table. */
export function listInactiveBannerSlots(
  bannerData: BannerData | undefined,
  now?: Date,
): InactiveBannerSlotInfo[] {
  const out: InactiveBannerSlotInfo[] = [];
  for (let slot = 1; slot <= 5; slot++) {
    const { imageId, link, hasSlotContent } = getBannerSlotRowFields(bannerData, slot);
    const full = getBannerSlotStatus({
      hasSlotContent,
      start_date: bannerData?.start_date,
      end_date: bannerData?.end_date,
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
