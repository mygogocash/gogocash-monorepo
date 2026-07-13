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

  it("reconstructs a manual config from the derived tracking_period when raw fields are stripped (public detail route)", () => {
    // /brands/[id] loads offers via the PUBLIC GET /offer/:id, which strips
    // tracking_period_mode/tracking_days/confirm_days and attaches the derived
    // object. Without this reconstruction a stored manual config seeded as
    // "auto" and a routine Edit → Save silently flipped the brand back.
    const fromPublicDetail = offerToEditForm({
      _id: "offer-3",
      offer_name: "Manual Brand",
      product_types: [],
      tracking_period: { tracking_days: 7, confirm_days: 45, source: "manual" },
    } as unknown as Offer);
    expect(fromPublicDetail.tracking_period_mode).toBe("manual");
    expect(fromPublicDetail.tracking_days).toBe(7);
    expect(fromPublicDetail.confirm_days).toBe(45);

    const autoFromPartner = offerToEditForm({
      _id: "offer-4",
      offer_name: "Auto Brand",
      product_types: [],
      tracking_period: { tracking_days: 30, confirm_days: 60, source: "partner" },
    } as unknown as Offer);
    expect(autoFromPartner.tracking_period_mode).toBe("auto");
    expect(autoFromPartner.tracking_days).toBeNull();
    expect(autoFromPartner.confirm_days).toBeNull();
  });
});
