// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrackingPeriodManualEditor } from "./TrackingPeriodManualEditor";

const handlers = {
  onTrackingDaysChange: vi.fn(),
  onConfirmDaysChange: vi.fn(),
  onTrackingSubtitleChange: vi.fn(),
  onConfirmSubtitleChange: vi.fn(),
};

afterEach(cleanup);

describe("TrackingPeriodManualEditor", () => {
  it("#562 > given manual two_step > then renders one combined day input and one combined subtitle", () => {
    render(
      <TrackingPeriodManualEditor
        mode="manual"
        flowType="two_step"
        trackingDays={7}
        confirmDays={45}
        trackingSubtitle="hidden three-step copy"
        confirmSubtitle="after validation"
        {...handlers}
      />,
    );

    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
    expect(
      screen.getByRole("spinbutton", {
        name: "Tracking and confirm window (days)",
      }),
    ).toHaveValue(45);
    expect(screen.queryByLabelText("Tracking window (days)")).toBeNull();
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(
      screen.getByRole("textbox", {
        name: "Tracking and confirm subtitle",
      }),
    ).toHaveValue("after validation");
    expect(screen.queryByLabelText("Tracking subtitle")).toBeNull();
  });

  it("#562 > given manual three_step > then renders separate tracking and confirm controls", () => {
    render(
      <TrackingPeriodManualEditor
        mode="manual"
        flowType="three_step"
        trackingDays={7}
        confirmDays={45}
        trackingSubtitle="from the following month"
        confirmSubtitle="after validation"
        {...handlers}
      />,
    );

    expect(screen.getAllByRole("spinbutton")).toHaveLength(2);
    expect(screen.getByLabelText("Tracking window (days)")).toHaveValue(7);
    expect(screen.getByLabelText("Confirm window (days)")).toHaveValue(45);
    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getByLabelText("Tracking subtitle")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirm subtitle")).toBeInTheDocument();
  });
});
