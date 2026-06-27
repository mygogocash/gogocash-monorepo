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
    } as Offer;

    const form = offerToEditForm(offer);
    expect(form.id).toBe("offer-1");
    expect(form.offer_name_display).toBe("Display Name");
    expect(form.lookup_value).toBe("display_th");
    expect(form.disabled).toBe(true);
    expect(form.extra_store).toBe(true);
  });
});
