import { describe, expect, it } from "vitest";
import type { BannerData } from "@/types/banner";
import {
  getBannerSlotStatus,
  getBannerTableStatusCell,
  listInactiveBannerSlots,
  getBannerSlotRowFields,
} from "./bannerSlotStatus";

/** Fixed local noon so YMD comparisons are stable in tests. */
const REF = new Date("2026-06-15T12:00:00");

describe("bannerSlotStatus", () => {
  it("treats empty slot as Empty and hides badge on banner table", () => {
    expect(getBannerSlotStatus({ hasSlotContent: false, now: REF }).status).toBe("Empty");
    expect(getBannerTableStatusCell({ hasSlotContent: false, now: REF }).kind).toBe("inactive");
  });

  it("marks future start as Scheduled on the table", () => {
    const cell = getBannerTableStatusCell({
      hasSlotContent: true,
      start_date: "2026-12-01",
      enabled: true,
      now: REF,
    });
    expect(cell.kind).toBe("live");
    if (cell.kind === "live") expect(cell.label).toBe("Scheduled");
  });

  it("marks past end as Ended and inactive on the table", () => {
    expect(
      getBannerSlotStatus({
        hasSlotContent: true,
        enabled: true,
        end_date: "2026-01-01",
        now: REF,
      }).status,
    ).toBe("Ended");
    expect(
      getBannerTableStatusCell({
        hasSlotContent: true,
        enabled: true,
        end_date: "2026-01-01",
        now: REF,
      }).kind,
    ).toBe("inactive");
  });

  it("treats disabled slots as inactive while keeping other fields", () => {
    const status = getBannerSlotStatus({
      hasSlotContent: true,
      enabled: false,
      now: REF,
    });
    expect(status.status).toBe("Ended");
  });

  it("lists inactive slots for popup history section", () => {
    const data = {
      image_1: "a",
      image_2: null,
      image_3: null,
      image_4: null,
      image_5: null,
      link_1: "",
      link_2: "",
      link_3: "",
      link_4: "",
      link_5: "",
      start_date: "",
      end_date: "2026-01-01",
    } as unknown as BannerData;

    const rows = listInactiveBannerSlots(data, REF);
    expect(rows.some((r) => r.slot === 1 && r.reason === "Ended")).toBe(true);
    expect(rows.filter((r) => r.reason === "Empty")).toHaveLength(4);
  });

  it("extracts per-slot fields from a banner payload including legacy fallback", () => {
    const data = {
      image_1: "slot-1-img",
      image_2: "slot-2-img",
      link_1: "https://slot1.example",
      link_2: "https://slot2.example",
      start_date_1: "2026-06-01",
      enabled_2: false,
      start_date: "2026-01-01",
      end_date: "2026-01-31",
      enabled_1: false,
    } as BannerData;

    const slot1 = getBannerSlotRowFields(data, 1);
    const slot2 = getBannerSlotRowFields(data, 2);
    const slot3 = getBannerSlotRowFields(data, 3);

    expect(slot1.enabled).toBe(false);
    expect(slot1.startDate).toBe("2026-06-01");
    expect(slot2.enabled).toBe(false);
    expect(slot2.startDate).toBe("2026-01-01");
    expect(slot3.startDate).toBe("2026-01-01");
  });
});
