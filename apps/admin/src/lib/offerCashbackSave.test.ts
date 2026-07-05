import { describe, expect, it } from "vitest";
import { appendCashbackPatchFields } from "./offerCashbackSave";

describe("appendCashbackPatchFields", () => {
  it("given manual commission and max cap > then appends numeric cashback fields", () => {
    const fd = new FormData();
    appendCashbackPatchFields(fd, {
      commission_store: 7,
      max_cap: 500,
      all_product_types: true,
      product_types: [],
    });

    expect(fd.get("commission_store")).toBe("7");
    expect(fd.get("max_cap")).toBe("500");
    expect(fd.get("all_product_types")).toBe("true");
    expect(fd.get("product_types")).toBe("[]");
  });

  it("given null commission > then omits commission_store", () => {
    const fd = new FormData();
    appendCashbackPatchFields(fd, {
      commission_store: null,
      max_cap: null,
      all_product_types: false,
      product_types: [],
    });

    expect(fd.get("commission_store")).toBeNull();
    expect(fd.get("max_cap")).toBeNull();
    expect(fd.get("all_product_types")).toBe("false");
  });
});
