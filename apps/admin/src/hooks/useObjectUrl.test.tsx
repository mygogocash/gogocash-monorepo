// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useObjectUrl } from "@/hooks/useObjectUrl";

describe("useObjectUrl", () => {
  let created: string[];
  let revoked: string[];

  beforeEach(() => {
    created = [];
    revoked = [];
    let n = 0;
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => {
        const u = `blob:mock/${n++}`;
        created.push(u);
        return u;
      }),
      revokeObjectURL: vi.fn((u: string) => {
        revoked.push(u);
      }),
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("returns null and creates nothing when there is no file", () => {
    const { result } = renderHook(() => useObjectUrl(null));
    expect(result.current).toBeNull();
    expect(created).toHaveLength(0);
  });

  it("creates a url for a file and revokes it on unmount", () => {
    const file = new File(["x"], "a.png", { type: "image/png" });
    const { result, unmount } = renderHook(() => useObjectUrl(file));
    expect(result.current).toBe("blob:mock/0");
    expect(created).toHaveLength(1);
    unmount();
    expect(revoked).toContain("blob:mock/0");
  });

  it("revokes the previous url when the file changes", () => {
    const f1 = new File(["1"], "1.png", { type: "image/png" });
    const f2 = new File(["2"], "2.png", { type: "image/png" });
    const { result, rerender } = renderHook(
      ({ f }: { f: File }) => useObjectUrl(f),
      { initialProps: { f: f1 } },
    );
    expect(result.current).toBe("blob:mock/0");
    rerender({ f: f2 });
    expect(result.current).toBe("blob:mock/1");
    expect(revoked).toContain("blob:mock/0");
  });
});
