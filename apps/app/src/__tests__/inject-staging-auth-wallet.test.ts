import { describe, expect, it } from "vitest";

import {
  parseInjectArgs,
  resolveInjectAuthToken,
} from "../../scripts/inject-staging-auth-wallet.mjs";

describe("inject-staging-auth-wallet token resolution", () => {
  it("prefers the --auth-token CLI flag over the environment", () => {
    expect(
      resolveInjectAuthToken({ cliToken: "cli-token", env: { GOGOTRACK_AUTH_TOKEN: "env-token" } }),
    ).toBe("cli-token");
  });

  it("uses GOGOTRACK_AUTH_TOKEN, then GOGOSENSE_AUTH_TOKEN", () => {
    expect(
      resolveInjectAuthToken({ env: { GOGOTRACK_AUTH_TOKEN: "t1", GOGOSENSE_AUTH_TOKEN: "t2" } }),
    ).toBe("t1");
    expect(resolveInjectAuthToken({ env: { GOGOSENSE_AUTH_TOKEN: "t2" } })).toBe("t2");
  });

  it("returns null when no token is supplied — never falls back to a committed evidence token", () => {
    // Regression: the script used to fall back to readTokenFromEvidence() (a committed,
    // expired preflight-report.json token), so `adb am start` reported success while the
    // wallet stayed logged out. An unset token must now fail fast, not inject a stale JWT.
    expect(resolveInjectAuthToken({ env: {} })).toBeNull();
  });

  it("trims whitespace and treats blank tokens as absent", () => {
    expect(
      resolveInjectAuthToken({ cliToken: "   ", env: { GOGOTRACK_AUTH_TOKEN: "  real  " } }),
    ).toBe("real");
  });

  it("parses --auth-token and a positional callback url, defaulting to /wallet", () => {
    expect(parseInjectArgs(["--auth-token", "abc", "/wallet"])).toEqual({
      authToken: "abc",
      callbackUrl: "/wallet",
    });
    expect(parseInjectArgs([])).toEqual({ authToken: null, callbackUrl: "/wallet" });
  });
});
