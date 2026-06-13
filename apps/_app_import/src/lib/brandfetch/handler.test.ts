import { describe, expect, it, vi } from "vitest";
import { runBrandfetchGet } from "./handler";

describe("runBrandfetchGet", () => {
  it("returns bad_domain for invalid query", async () => {
    const fetchFn = vi.fn();
    const r = await runBrandfetchGet("..bad", "key", fetchFn);
    expect(r).toEqual({ status: 400, body: { ok: false, reason: "bad_domain" } });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns no_key when api key missing", async () => {
    const fetchFn = vi.fn();
    const r = await runBrandfetchGet("nike.com", undefined, fetchFn);
    expect(r).toEqual({ status: 200, body: { ok: false, reason: "no_key" } });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("returns 200 with assets on success", async () => {
    const payload = {
      name: "Nike",
      domain: "nike.com",
      logos: [{ type: "icon", formats: [{ src: "https://cdn.example/icon.png", format: "png" }] }],
      images: [
        { type: "banner", formats: [{ src: "https://cdn.example/b.webp", format: "webp" }] },
      ],
    };
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => payload,
    });

    const r = await runBrandfetchGet("nike.com", "secret", fetchFn);
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    if (r.body.ok) {
      expect(r.body.bannerUrl).toBe("https://cdn.example/b.webp");
      expect(r.body.iconUrl).toBe("https://cdn.example/icon.png");
    }
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("maps 404 to not_found", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 404, json: async () => ({}) });
    const r = await runBrandfetchGet("unknown-unknown-zz.co", "k", fetchFn);
    expect(r).toEqual({ status: 404, body: { ok: false, reason: "not_found" } });
  });
});
