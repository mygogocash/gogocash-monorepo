import { describe, expect, it } from "vitest";
import { appendUpsizePatchFields } from "./offerUpsizeSave";

describe("appendUpsizePatchFields", () => {
  it("given upsize lines and period > then appends multipart fields", () => {
    const fd = new FormData();
    appendUpsizePatchFields(fd, {
      upsize_start_date: "2026-07-01",
      upsize_end_date: "2026-07-31",
      upsize_start_time: "09:00",
      upsize_end_time: "21:00",
      upsize_all_product_types: false,
      upsize_special_commission: null,
      upsize_max_cap: null,
      upsize_product_types: [
        {
          name: "OPPO Find X9",
          pay_in: "cashback",
          commission_info: "3.5",
        },
      ],
    });

    expect(fd.get("upsize_start_date")).toBe("2026-07-01");
    expect(fd.get("upsize_end_date")).toBe("2026-07-31");
    expect(fd.get("upsize_start_time")).toBe("09:00");
    expect(fd.get("upsize_end_time")).toBe("21:00");
    expect(fd.get("upsize_all_product_types")).toBe("false");
    expect(fd.get("upsize_special_commission")).toBe("");
    expect(fd.get("upsize_max_cap")).toBe("");
    expect(fd.get("upsize_product_types")).toContain("OPPO Find X9");
  });

  it("given null dates and all-product commission > then clears dates and sends commission", () => {
    const fd = new FormData();
    appendUpsizePatchFields(fd, {
      upsize_start_date: null,
      upsize_end_date: null,
      upsize_start_time: null,
      upsize_end_time: null,
      upsize_all_product_types: true,
      upsize_special_commission: 4.2,
      upsize_max_cap: 1000,
      upsize_product_types: [],
    });

    expect(fd.get("upsize_start_date")).toBe("");
    expect(fd.get("upsize_all_product_types")).toBe("true");
    expect(fd.get("upsize_special_commission")).toBe("4.2");
    expect(fd.get("upsize_max_cap")).toBe("1000");
    expect(fd.get("upsize_product_types")).toBe("[]");
  });
});
