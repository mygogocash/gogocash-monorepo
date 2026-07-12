import { describe, expect, it } from "vitest";

import { offerToEditForm } from "./offerEditForm";
import type { Offer } from "@/types/api";

describe("offerToEditForm", () => {
  it("maps offer fields into the edit form shape", () => {
    const offer = {
      _id: "offer-1",
      offer_name: "Partner Name",
      offer_name_display: "Display Name",
      lookup_value: "display_th",
      disabled: true,
      extra_store: true,
      product_types: [],
    } as unknown as Offer;

    const form = offerToEditForm(offer);
    expect(form.id).toBe("offer-1");
    expect(form.offer_name_display).toBe("Display Name");
    expect(form.lookup_value).toBe("display_th");
    expect(form.disabled).toBe(true);
    expect(form.extra_store).toBe(true);
  });

  it("seeds tracking period from the offer, defaulting to auto with null days", () => {
    const manual = offerToEditForm({
      _id: "offer-1",
      offer_name: "Partner Name",
      tracking_period_mode: "manual",
      tracking_days: 7,
      confirm_days: 45,
      product_types: [],
    } as unknown as Offer);
    expect(manual.tracking_period_mode).toBe("manual");
    expect(manual.tracking_days).toBe(7);
    expect(manual.confirm_days).toBe(45);

    const legacy = offerToEditForm({
      _id: "offer-2",
      offer_name: "Legacy",
      product_types: [],
    } as unknown as Offer);
    expect(legacy.tracking_period_mode).toBe("auto");
    expect(legacy.tracking_days).toBeNull();
    expect(legacy.confirm_days).toBeNull();
  });
});
