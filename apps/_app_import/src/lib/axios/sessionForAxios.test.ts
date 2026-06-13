import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { clearAxiosSessionCache, getSessionForAxios } from "./sessionForAxios";

const getSession = vi.fn();

vi.mock("next-auth/react", () => ({
  getSession: (...args: unknown[]) => getSession(...args),
}));

describe("sessionForAxios", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    clearAxiosSessionCache();
    getSession.mockReset();
    getSession.mockResolvedValue({ user: { access_token: "token-a" } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("dedupes concurrent getSession calls", async () => {
    const a = getSessionForAxios();
    const b = getSessionForAxios();
    const [ra, rb] = await Promise.all([a, b]);
    expect(ra).toEqual(rb);
    expect(getSession).toHaveBeenCalledTimes(1);
  });

  it("clearAxiosSessionCache forces a fresh getSession", async () => {
    await getSessionForAxios();
    clearAxiosSessionCache();
    await getSessionForAxios();
    expect(getSession).toHaveBeenCalledTimes(2);
  });
});
