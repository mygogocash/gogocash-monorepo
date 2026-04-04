import { describe, expect, it } from "vitest";
import { computePdpcDeadline, breachEscalationDue } from "./breachService";
import type { DataBreachLog } from "./types";

describe("breach PDPC timing", () => {
  it("computes 72h deadline", () => {
    const detected = "2026-01-01T00:00:00.000Z";
    const deadline = computePdpcDeadline(detected);
    const d = new Date(deadline).getTime() - new Date(detected).getTime();
    expect(d).toBe(72 * 60 * 60 * 1000);
  });

  it("escalation T71 when near deadline", () => {
    const detected = new Date(Date.now() - 71.5 * 60 * 60 * 1000).toISOString();
    const breach: DataBreachLog = {
      breachId: "b1",
      detectedAt: detected,
      reportedToPDPC: false,
      pdpcNotificationDeadline: computePdpcDeadline(detected),
      pdpcNotifiedAt: null,
      severity: "HIGH",
      affectedUsers: 1,
      dataCategories: ["email"],
      description: "x",
      rootCause: "y",
      containmentActions: [],
      userNotificationRequired: true,
      usersNotifiedAt: null,
      status: "DETECTED",
      timeline: [],
    };
    expect(breachEscalationDue(breach, new Date())).toBe("T71");
  });
});
