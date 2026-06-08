// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { maybeOpenDatePicker } from "@/lib/openDatePicker";

function dateInput(overrides: Partial<HTMLInputElement> = {}) {
  const el = document.createElement("input");
  el.type = "date";
  const showPicker = vi.fn();
  // jsdom doesn't implement showPicker; attach a spy.
  (el as unknown as { showPicker: () => void }).showPicker = showPicker;
  Object.assign(el, overrides);
  return { el, showPicker };
}

describe("maybeOpenDatePicker", () => {
  it("opens the picker for an enabled date input", () => {
    const { el, showPicker } = dateInput();
    maybeOpenDatePicker(el);
    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it("ignores non-input targets", () => {
    const span = document.createElement("span");
    expect(() => maybeOpenDatePicker(span)).not.toThrow();
  });

  it("ignores non-date inputs", () => {
    const { el, showPicker } = dateInput();
    el.type = "text";
    maybeOpenDatePicker(el);
    expect(showPicker).not.toHaveBeenCalled();
  });

  it("ignores disabled or read-only date inputs", () => {
    const a = dateInput({ disabled: true });
    maybeOpenDatePicker(a.el);
    expect(a.showPicker).not.toHaveBeenCalled();
    const b = dateInput({ readOnly: true });
    maybeOpenDatePicker(b.el);
    expect(b.showPicker).not.toHaveBeenCalled();
  });

  it("swallows showPicker errors (no user gesture)", () => {
    const { el, showPicker } = dateInput();
    showPicker.mockImplementation(() => {
      throw new Error("NotAllowedError");
    });
    expect(() => maybeOpenDatePicker(el)).not.toThrow();
  });

  it("does nothing when showPicker is unsupported", () => {
    const el = document.createElement("input");
    el.type = "date";
    expect(() => maybeOpenDatePicker(el)).not.toThrow();
  });
});
