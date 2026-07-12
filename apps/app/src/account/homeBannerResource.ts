import type { AccountDataSource } from "@mobile/auth/routeGuard";
import { resolveRemoteImageUri } from "@mobile/api/mediaUrl";
import {
  HERO_BANNER_IMAGE_WIDTH,
  SIDE_BANNER_IMAGE_WIDTH,
} from "@mobile/api/optimizedImageUrl";

/**
 * Maps the backend's wide single-document banner shape
 * (GET /offer/banner-home → one doc with image_1..5 + link_1..5) into the
 * array shape the home screen renders (webHomeHeroBanners).
 *
 * This is the "legacy flat backend → new array UI" bridge — the pattern stamp
 * for wiring the other admin-configured domains (coupons, top-brands, quests).
 */

/** Raw payload from GET /offer/banner-home (bannerModel.findOne() → doc | null). */
export type BannerHomeDocument = {
  image_1?: string | null;
  image_2?: string | null;
  image_3?: string | null;
  image_4?: string | null;
  image_5?: string | null;
  link_1?: string | null;
  link_2?: string | null;
  link_3?: string | null;
  link_4?: string | null;
  link_5?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  enabled_1?: boolean | null;
  enabled_2?: boolean | null;
  enabled_3?: boolean | null;
  enabled_4?: boolean | null;
  enabled_5?: boolean | null;
  start_date_1?: string | null;
  start_date_2?: string | null;
  start_date_3?: string | null;
  start_date_4?: string | null;
  start_date_5?: string | null;
  end_date_1?: string | null;
  end_date_2?: string | null;
  end_date_3?: string | null;
  end_date_4?: string | null;
  end_date_5?: string | null;
} | null;

/**
 * Unified home-hero banner. Fixtures carry a local `asset` key; backend banners
 * carry a remote `imageUri`. The screen renders `{ uri: imageUri }` when present,
 * otherwise the bundled `asset`.
 */
export type HomeHeroBanner = {
  id: string;
  href: string;
  placement: "main" | "side";
  asset?: string;
  imageUri?: string;
};

/**
 * Spec (pinned by home-banner-resource.test.ts):
 * - `null` doc → `[]`
 * - iterate slots 1..5; skip a slot whose `image_N` is empty/missing
 * - skip disabled slots:
 *   - enabled_N can explicitly disable a slot.
 *   - slots without enabled_N are still eligible.
 * - skip slot outside active date window:
 *   - start_date_N/end_date_N apply per slot when present.
 *   - otherwise fallback to doc-level start_date/end_date.
 * - placement: slots 1-3 → "main", slots 4-5 → "side"
 * - id: `home-banner-${N}`
 * - href: `link_N` if non-empty, else "/"
 * - imageUri: `image_N`
 */
export function mapBackendHomeBanners(doc: BannerHomeDocument): HomeHeroBanner[] {
  if (!doc) {
    return [];
  }

  const now = new Date();
  const slots = [1, 2, 3, 4, 5] as const;

  const parseScheduleDate = (
    value: unknown,
  ): { instant: Date; dateOnly: boolean } | null => {
    if (typeof value !== "string" && typeof value !== "number") {
      return null;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      const dateOnly = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (dateOnly) {
        const local = new Date(
          Number(dateOnly[1]),
          Number(dateOnly[2]) - 1,
          Number(dateOnly[3]),
        );
        return Number.isNaN(local.getTime())
          ? null
          : { instant: local, dateOnly: true };
      }
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime())
      ? null
      : { instant: parsed, dateOnly: false };
  };

  const startOfLocalDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const endOfLocalDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  const isBeforeStart = (
    start: { instant: Date; dateOnly: boolean },
    at: Date,
  ) => {
    const threshold = start.dateOnly ? startOfLocalDay(start.instant) : start.instant;
    return threshold.getTime() > at.getTime();
  };

  const isAfterEnd = (end: { instant: Date; dateOnly: boolean }, at: Date) => {
    const threshold = end.dateOnly ? endOfLocalDay(end.instant) : end.instant;
    return threshold.getTime() < at.getTime();
  };

  const isEnabled = (docSlotValue: unknown): boolean => {
    if (typeof docSlotValue === "boolean") {
      return docSlotValue;
    }

    if (typeof docSlotValue === "number") {
      return docSlotValue !== 0;
    }

    if (typeof docSlotValue === "string") {
      const normalized = docSlotValue.trim().toLowerCase();
      return normalized === "true" || normalized === "1";
    }

    return Boolean(docSlotValue);
  };

  const hasField = (key: string): boolean =>
    Object.prototype.hasOwnProperty.call(doc, key);

  return slots
    .map((n) => {
      const startKey = `start_date_${n}`;
      const endKey = `end_date_${n}`;
      const enabledKey = `enabled_${n}`;

      return {
        n,
        image: doc[`image_${n}` as keyof BannerHomeDocument],
        link: doc[`link_${n}` as keyof BannerHomeDocument],
        enabledRaw: doc[enabledKey as keyof BannerHomeDocument],
        start: hasField(startKey)
          ? parseScheduleDate(doc[startKey as keyof BannerHomeDocument])
          : parseScheduleDate(doc.start_date),
        end: hasField(endKey)
          ? parseScheduleDate(doc[endKey as keyof BannerHomeDocument])
          : parseScheduleDate(doc.end_date),
      };
    })
    .filter((slot) => {
      if (!slot.image) {
        return false;
      }

      if (hasField(`enabled_${slot.n}`) && slot.enabledRaw != null) {
        if (!isEnabled(slot.enabledRaw)) {
          return false;
        }
      }

      if (slot.start && isBeforeStart(slot.start, now)) {
        return false;
      }

      if (slot.end && isAfterEnd(slot.end, now)) {
        return false;
      }

      return true;
    })
    .map((slot): HomeHeroBanner => {
      const placement = slot.n <= 3 ? "main" : "side";
      return {
        id: `home-banner-${slot.n}`,
        href: slot.link ? slot.link : "/",
        placement,
        imageUri:
          resolveRemoteImageUri(slot.image, undefined, {
            width:
              placement === "main" ? HERO_BANNER_IMAGE_WIDTH : SIDE_BANNER_IMAGE_WIDTH,
          }) ?? String(slot.image),
      };
    });
}

/**
 * Picks the banners the home screen should render, given the resource's source.
 * - non-backend (fixtures/disabled) → the bundled `fallback` (unchanged contract)
 * - backend → the mapped backend banners, even when empty. Admin-hidden,
 *   disabled, expired, or unconfigured banners must not leak bundled fixtures.
 *
 * Spec pinned by home-banner-resource.test.ts.
 */
export function resolveHomeHeroBanners(
  source: AccountDataSource,
  data: unknown,
  fallback: readonly HomeHeroBanner[],
): HomeHeroBanner[] {
  if (source === "backend") {
    return mapBackendHomeBanners(data as BannerHomeDocument);
  }
  return [...fallback];
}
