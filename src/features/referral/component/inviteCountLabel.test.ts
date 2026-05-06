import { describe, expect, it } from "vitest";
import { formatInvitedCountLabel } from "./inviteCountLabel";

describe("formatInvitedCountLabel", () => {
  it("given 0 returns 'Invited : 0'", () => {
    expect(formatInvitedCountLabel(0)).toBe("Invited : 0");
  });

  it("given 1 returns 'Invited : 1'", () => {
    expect(formatInvitedCountLabel(1)).toBe("Invited : 1");
  });

  it("given 12 returns 'Invited : 12'", () => {
    expect(formatInvitedCountLabel(12)).toBe("Invited : 12");
  });

  it("given negative count clamps to 0", () => {
    expect(formatInvitedCountLabel(-3)).toBe("Invited : 0");
  });

  it("given non-integer floors to integer", () => {
    expect(formatInvitedCountLabel(2.7)).toBe("Invited : 2");
  });
});
