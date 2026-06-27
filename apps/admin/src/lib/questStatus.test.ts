import { describe, expect, it } from "vitest";
import {
  questStatusBadgeColor,
  questStatusLabel,
} from "./questStatus";

describe("questStatus", () => {
  it("questStatusLabel > maps API values to admin labels", () => {
    expect(questStatusLabel("open")).toBe("Active");
    expect(questStatusLabel("close")).toBe("Closed");
    expect(questStatusLabel("closed")).toBe("Closed");
    expect(questStatusLabel("scheduled")).toBe("Scheduled");
  });

  it("questStatusBadgeColor > maps statuses to badge colors", () => {
    expect(questStatusBadgeColor("open")).toBe("success");
    expect(questStatusBadgeColor("scheduled")).toBe("info");
    expect(questStatusBadgeColor("close")).toBe("warning");
  });
});
