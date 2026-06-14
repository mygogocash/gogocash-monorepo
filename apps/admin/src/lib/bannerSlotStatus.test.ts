import { describe, expect, it } from "vitest";
import type { BannerData } from "@/types/banner";
import {
  getBannerSlotStatus,
  getBannerTableStatusCell,
  listInactiveBannerSlots,
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
      now: REF,
    });
    expect(cell.kind).toBe("live");
    if (cell.kind === "live") expect(cell.label).toBe("Scheduled");
  });

  it("marks past end as Ended and inactive on the table", () => {
    expect(
      getBannerSlotStatus({
        hasSlotContent: true,
        end_date: "2026-01-01",
        now: REF,
      }).status,
    ).toBe("Ended");
    expect(
      getBannerTableStatusCell({
        hasSlotContent: true,
        end_date: "2026-01-01",
        now: REF,
      }).kind,
    ).toBe("inactive");
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
});
