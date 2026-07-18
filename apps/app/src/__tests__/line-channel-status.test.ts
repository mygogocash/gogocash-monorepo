import { describe, expect, it } from "vitest";
import { shouldWarnLineDevelopingChannel } from "@mobile/auth/lineChannelStatus";

describe("shouldWarnLineDevelopingChannel", () => {
  it("shouldWarnLineDevelopingChannel > given staging appEnv > then true", () => {
    expect(shouldWarnLineDevelopingChannel({ appEnv: "staging" })).toBe(true);
  });

  it("shouldWarnLineDevelopingChannel > given production hosts > then false", () => {
    expect(
      shouldWarnLineDevelopingChannel({
        appEnv: "production",
        frontendUrl: "https://app.gogocash.co",
        apiUrl: "https://api.gogocash.co",
      }),
    ).toBe(false);
  });

  it("shouldWarnLineDevelopingChannel > given staging URL without appEnv > then true", () => {
    expect(
      shouldWarnLineDevelopingChannel({
        appEnv: "production",
        frontendUrl: "https://app-staging.gogocash.co",
        apiUrl: "https://api-staging.gogocash.co",
      }),
    ).toBe(true);
  });
});
