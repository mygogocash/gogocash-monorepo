import { describe, expect, it } from "vitest";
import {
  ADMIN_DATETIME_ALT_FORMAT,
  resolveDatePickerTimeOptions,
} from "./adminDateTimeFormat";

describe("resolveDatePickerTimeOptions", () => {
  it("given enableTime > then forces 24-hour picker and English alt format", () => {
    expect(resolveDatePickerTimeOptions(true)).toEqual({
      altFormat: ADMIN_DATETIME_ALT_FORMAT,
      time_24hr: true,
    });
  });

  it("given enableTime with custom altFormat > then keeps custom format but stays 24-hour", () => {
    expect(resolveDatePickerTimeOptions(true, "d/m/Y H:i")).toEqual({
      altFormat: "d/m/Y H:i",
      time_24hr: true,
    });
  });

  it("given date-only picker > then does not override altFormat", () => {
    expect(
      resolveDatePickerTimeOptions(false, "d/m/Y"),
    ).toEqual({
      altFormat: "d/m/Y",
      time_24hr: true,
    });
  });
});
