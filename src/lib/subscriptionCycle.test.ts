import { describe, expect, it } from "vitest";
import { planCycle, CYCLE_LABEL } from "@/lib/subscriptionCycle";

describe("planCycle", () => {
  it("given a name containing 'Monthly' > then returns monthly", () => {
    expect(planCycle("Monthly Premium")).toBe("monthly");
  });

  it("given a name containing 'Annual' > then returns annual", () => {
    expect(planCycle("Annual Premium")).toBe("annual");
  });

  it("recognises 'Yearly' as annual", () => {
    expect(planCycle("Yearly Saver")).toBe("annual");
  });

  it("given a name containing 'Quarterly' > then returns quarterly", () => {
    expect(planCycle("Quarterly Pro")).toBe("quarterly");
  });

  it("is case-insensitive", () => {
    expect(planCycle("ANNUAL PLAN")).toBe("annual");
  });

  it("defaults to monthly for an unrecognised name", () => {
    expect(planCycle("Mystery Tier")).toBe("monthly");
  });
});

describe("CYCLE_LABEL", () => {
  it("labels annual as 'Annually'", () => {
    expect(CYCLE_LABEL.annual).toBe("Annually");
  });

  it("labels monthly as 'Monthly'", () => {
    expect(CYCLE_LABEL.monthly).toBe("Monthly");
  });
});
