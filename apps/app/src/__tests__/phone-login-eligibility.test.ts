import { describe, expect, it, vi } from "vitest";

import { checkPhoneLoginEligibility } from "@mobile/auth/phoneLoginEligibility";

describe("phone login eligibility", () => {
  it("posts the E.164 phone in the body and returns the boolean without putting PII in the URL", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ eligible: true }),
      ok: true,
      status: 201,
    } as unknown as Response);

    await expect(
      checkPhoneLoginEligibility({
        apiUrl: "https://api-staging.gogocash.co/",
        fetchImpl,
        phoneE164: "+66812345678",
      }),
    ).resolves.toBe(true);

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://api-staging.gogocash.co/auth/phone-sign-in/eligibility",
    );
    expect(url).not.toContain("66812345678");
    expect(JSON.parse(String(init.body))).toEqual({
      phone_e164: "+66812345678",
    });
  });

  it("returns false for an unlinked phone", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ eligible: false }),
      ok: true,
      status: 201,
    } as unknown as Response);

    await expect(
      checkPhoneLoginEligibility({
        apiUrl: "https://api-staging.gogocash.co",
        fetchImpl,
        phoneE164: "+6591234567",
      }),
    ).resolves.toBe(false);
  });

  it("fails closed when the API errors or does not return a boolean", async () => {
    const failedFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ message: "internal details" }),
      ok: false,
      status: 503,
    } as unknown as Response);
    const invalidFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ eligible: "yes" }),
      ok: true,
      status: 201,
    } as unknown as Response);

    await expect(
      checkPhoneLoginEligibility({
        apiUrl: "https://api-staging.gogocash.co",
        fetchImpl: failedFetch,
        phoneE164: "+66812345678",
      }),
    ).rejects.toThrow("Could not check phone sign-in eligibility");
    await expect(
      checkPhoneLoginEligibility({
        apiUrl: "https://api-staging.gogocash.co",
        fetchImpl: invalidFetch,
        phoneE164: "+66812345678",
      }),
    ).rejects.toThrow("Could not check phone sign-in eligibility");
  });

  it("preserves HTTP 429 as the existing auth rate-limit error contract", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ message: "internal details" }),
      ok: false,
      status: 429,
    } as unknown as Response);

    const error = await checkPhoneLoginEligibility({
      apiUrl: "https://api-staging.gogocash.co",
      fetchImpl,
      phoneE164: "+66812345678",
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ code: "auth/too-many-requests" });
    expect((error as Error).message).not.toContain("internal details");
  });
});
