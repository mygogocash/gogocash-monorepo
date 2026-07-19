import { describe, expect, it, vi } from "vitest";

import {
  STAGING_ACCEPTANCE_MARKER,
  logStagingAcceptanceMarker,
} from "@mobile/updates/stagingAcceptanceMarker";

describe("stagingAcceptanceMarker", () => {
  it("exports a stable issue-35 OTA apply marker string", () => {
    expect(STAGING_ACCEPTANCE_MARKER).toBe("issue-35-ota-2026-07-19");
  });

  it("logs the marker for device logcat proof", () => {
    const log = vi.fn();
    logStagingAcceptanceMarker(log);
    expect(log).toHaveBeenCalledWith(
      "[gogocash] stagingAcceptanceMarker=issue-35-ota-2026-07-19",
    );
  });
});
