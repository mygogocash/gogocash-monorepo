import { describe, expect, it, vi } from "vitest";

import { copyToClipboard } from "@mobile/lib/clipboard";

describe("copyToClipboard", () => {
  it("copy > given a web clipboard is available > then it writes via navigator and reports success", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const nativeWriter = vi.fn();

    const ok = await copyToClipboard("https://app.gogocash.co/?referral_id=42", {
      webClipboard: { writeText },
      nativeWriter,
    });

    expect(ok).toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://app.gogocash.co/?referral_id=42");
    expect(nativeWriter).not.toHaveBeenCalled();
  });

  it("copy > given no web clipboard > then it falls back to the native writer", async () => {
    const nativeWriter = vi.fn().mockResolvedValue(undefined);

    const ok = await copyToClipboard("CODE-123", {
      webClipboard: undefined,
      nativeWriter,
    });

    expect(ok).toBe(true);
    expect(nativeWriter).toHaveBeenCalledWith("CODE-123");
  });

  it("copy > given the web write rejects > then it falls back to the native writer", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    const nativeWriter = vi.fn().mockResolvedValue(undefined);

    const ok = await copyToClipboard("x", {
      webClipboard: { writeText },
      nativeWriter,
    });

    expect(ok).toBe(true);
    expect(nativeWriter).toHaveBeenCalledWith("x");
  });

  it("copy > given both paths fail > then it resolves false instead of throwing", async () => {
    const ok = await copyToClipboard("x", {
      webClipboard: { writeText: vi.fn().mockRejectedValue(new Error("no")) },
      nativeWriter: vi.fn().mockRejectedValue(new Error("no")),
    });

    expect(ok).toBe(false);
  });

  it("copy > given empty text > then it does nothing and reports false", async () => {
    const writeText = vi.fn();
    const nativeWriter = vi.fn();

    const ok = await copyToClipboard("", { webClipboard: { writeText }, nativeWriter });

    expect(ok).toBe(false);
    expect(writeText).not.toHaveBeenCalled();
    expect(nativeWriter).not.toHaveBeenCalled();
  });
});
