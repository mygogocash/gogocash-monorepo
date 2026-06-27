import { describe, expect, it } from "vitest";
import type { BannerRequestForm } from "@/types/banner";
import {
  buildBannerSlotFormData,
  buildBannerSlotFormState,
} from "./bannerFormPayload";

const baseForm: BannerRequestForm = {
  id: "1",
  image_1: null,
  image_2: null,
  image_3: null,
  image_4: null,
  image_5: null,
  link_1: "",
  link_2: "",
  link_3: "",
  link_4: "",
  link_5: "",
  enabled_1: true,
  enabled_2: true,
  enabled_3: true,
  enabled_4: true,
  enabled_5: true,
  start_date_1: "",
  start_date_2: "",
  start_date_3: "",
  start_date_4: "",
  start_date_5: "",
  end_date_1: "",
  end_date_2: "",
  end_date_3: "",
  end_date_4: "",
  end_date_5: "",
  end_forever_1: true,
  end_forever_2: true,
  end_forever_3: true,
  end_forever_4: true,
  end_forever_5: true,
};

describe("buildBannerSlotFormState", () => {
  it("given no banner doc yet > then returns empty defaults for the requested slot", () => {
    const form = buildBannerSlotFormState(null, 2);

    expect(form.id).toBe("2");
    expect(form.image_2).toBeNull();
    expect(form.link_2).toBe("");
    expect(form.enabled_2).toBe(true);
    expect(form.end_forever_2).toBe(true);
  });

  it("given existing banner data > then hydrates slot fields for editing", () => {
    const form = buildBannerSlotFormState(
      {
        image_1: "hero-1",
        image_2: null,
        image_3: null,
        image_4: null,
        image_5: null,
        link_1: "/promo",
        link_2: "",
        link_3: "",
        link_4: "",
        link_5: "",
        end_date_1: "2026-12-31",
      },
      1,
    );

    expect(form.id).toBe("1");
    expect(form.image_1).toBe("hero-1");
    expect(form.link_1).toBe("/promo");
    expect(form.end_date_1).toBe("2026-12-31");
    expect(form.end_forever_1).toBe(false);
  });
});

describe("buildBannerSlotFormData", () => {
  it("given an edited slot set to forever > then submits a blank end date to clear existing schedule", () => {
    const payload = buildBannerSlotFormData({
      ...baseForm,
      end_date_1: "2026-06-01",
      end_forever_1: true,
      link_1: "/quest",
    });

    expect(payload?.get("link_1")).toBe("/quest");
    expect(payload?.get("end_date_1")).toBe("");
  });

  it("given a cleared start date > then submits blank start date instead of omitting it", () => {
    const payload = buildBannerSlotFormData({
      ...baseForm,
      start_date_1: "",
      end_forever_1: false,
      end_date_1: "2026-07-31",
    });

    expect(payload?.get("start_date_1")).toBe("");
    expect(payload?.get("end_date_1")).toBe("2026-07-31");
  });

  it("given another slot is being edited > then only sends that slot keys", () => {
    const payload = buildBannerSlotFormData({
      ...baseForm,
      id: "3",
      link_3: "/slot-3",
      start_date_3: "2026-07-01",
      end_forever_3: false,
      end_date_3: "2026-07-31",
    });

    expect(payload?.get("link_3")).toBe("/slot-3");
    expect(payload?.get("start_date_3")).toBe("2026-07-01");
    expect(payload?.get("end_date_3")).toBe("2026-07-31");
    expect(payload?.has("link_1")).toBe(false);
    expect(payload?.has("end_date_1")).toBe(false);
  });
});
