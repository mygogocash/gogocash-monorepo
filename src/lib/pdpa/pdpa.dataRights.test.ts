import { describe, expect, it } from "vitest";
import { addDays } from "./dataSubjectRightsService";

describe("data subject SLA", () => {
  it("due date is submitted + 30 days for standard requests", () => {
    const submitted = "2026-01-01T12:00:00.000Z";
    const due = addDays(submitted, 30);
    expect(due.slice(0, 10)).toBe("2026-01-31");
  });
});
