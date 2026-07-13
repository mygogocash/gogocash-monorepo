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

  it("seeds flow_type and subtitles from raw fields when present, defaulting to three_step with null subtitles", () => {
    const twoStep = offerToEditForm({
      _id: "offer-5",
      offer_name: "Two Step Brand",
      product_types: [],
      tracking_period_mode: "manual",
      tracking_days: 7,
      confirm_days: 45,
      flow_type: "two_step",
      tracking_subtitle: "after the return window closes",
      confirm_subtitle: "once the store approves",
    } as unknown as Offer);
    expect(twoStep.flow_type).toBe("two_step");
    expect(twoStep.tracking_subtitle).toBe("after the return window closes");
    expect(twoStep.confirm_subtitle).toBe("once the store approves");

    const legacy = offerToEditForm({
      _id: "offer-6",
      offer_name: "Legacy",
      product_types: [],
      tracking_period_mode: "auto",
    } as unknown as Offer);
    expect(legacy.flow_type).toBe("three_step");
    expect(legacy.tracking_subtitle).toBeNull();
    expect(legacy.confirm_subtitle).toBeNull();
  });

  it("seeds flow_type and subtitles from the derived tracking_period when raw fields are stripped", () => {
    const fromPublicDetail = offerToEditForm({
      _id: "offer-7",
      offer_name: "Two Step Brand",
      product_types: [],
      tracking_period: {
        tracking_days: 7,
        confirm_days: 45,
        source: "manual",
        flow_type: "two_step",
        tracking_subtitle: "after the return window closes",
        confirm_subtitle: "once the store approves",
      },
    } as unknown as Offer);
    expect(fromPublicDetail.flow_type).toBe("two_step");
    expect(fromPublicDetail.tracking_subtitle).toBe(
      "after the return window closes",
    );
    expect(fromPublicDetail.confirm_subtitle).toBe("once the store approves");
  });

  it("seeds default-equal subtitles from the derived object as null, so an unrelated save cannot pin the live default into storage", () => {
    // PR #282 review (MEDIUM): the public-detail resolver ALWAYS returns
    // subtitle strings — for never-customized offers they equal the live
    // defaults. Seeding those literals into the form meant any tracking-period
    // save persisted the default text verbatim, decoupling the offer from
    // future default-copy changes. Default-equal captions must seed as null
    // (saved as an explicit clear, which resolves to the live default).
    const neverCustomized = offerToEditForm({
      _id: "offer-8",
      offer_name: "Untouched Brand",
      product_types: [],
      tracking_period: {
        tracking_days: 30,
        confirm_days: 60,
        source: "partner",
        flow_type: "three_step",
        tracking_subtitle: "from the following month",
        confirm_subtitle: "after validation",
      },
    } as unknown as Offer);
    expect(neverCustomized.tracking_subtitle).toBeNull();
    expect(neverCustomized.confirm_subtitle).toBeNull();
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
