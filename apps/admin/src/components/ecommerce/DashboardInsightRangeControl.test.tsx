// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardInsightRangeControl } from "./DashboardInsightRangeControl";

vi.mock("@/components/form/date-picker", () => ({
  default: ({
    id,
    value,
    onValueChange,
    ariaLabel,
  }: {
    id: string;
    value?: string;
    onValueChange?: (value: string) => void;
    ariaLabel?: string;
  }) => (
    <input
      aria-label={ariaLabel}
      data-datepicker-component="true"
      data-testid={id}
      value={value ?? ""}
      onChange={(event) => onValueChange?.(event.currentTarget.value)}
    />
  ),
}));

afterEach(cleanup);

describe("DashboardInsightRangeControl", () => {
  it("renders custom dashboard dates with the shared date picker component", () => {
    render(<DashboardInsightRangeControl value="30d" onChange={() => {}} />);

    expect(screen.getByTestId("dashboard-insight-from-date")).toHaveAttribute(
      "data-datepicker-component",
      "true",
    );
    expect(screen.getByTestId("dashboard-insight-to-date")).toHaveAttribute(
      "data-datepicker-component",
      "true",
    );
  });

  it("emits a custom range when picker dates change to a valid range", () => {
    const onChange = vi.fn();
    render(<DashboardInsightRangeControl value="30d" onChange={onChange} />);

    fireEvent.change(screen.getByTestId("dashboard-insight-from-date"), {
      target: { value: "2026-06-01" },
    });
    fireEvent.change(screen.getByTestId("dashboard-insight-to-date"), {
      target: { value: "2026-06-17" },
    });

    expect(onChange).toHaveBeenCalledWith("custom:2026-06-01:2026-06-17");
  });
});
