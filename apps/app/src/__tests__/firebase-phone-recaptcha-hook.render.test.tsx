import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const clearPhoneOtpRecaptcha = vi.fn();
const sendPhoneOtp = vi.fn();

vi.mock("@mobile/auth/firebasePhoneAuth", () => ({
  clearPhoneOtpRecaptcha: (owner?: object) => clearPhoneOtpRecaptcha(owner),
  sendPhoneOtp: (...args: unknown[]) => sendPhoneOtp(...args),
}));

import { useFirebasePhoneRecaptcha } from "@mobile/auth/useFirebasePhoneRecaptcha.web";

describe("useFirebasePhoneRecaptcha (web)", () => {
  beforeEach(() => {
    clearPhoneOtpRecaptcha.mockReset();
    sendPhoneOtp.mockReset();
    sendPhoneOtp.mockResolvedValue({ confirm: vi.fn() });
  });

  it("clears only its owned verifier when an older auth screen unmounts", async () => {
    const first = renderHook(() => useFirebasePhoneRecaptcha());
    const second = renderHook(() => useFirebasePhoneRecaptcha());

    await act(async () => {
      await first.result.current.sendPhoneOtpWithRecaptcha("+66811111111");
      await second.result.current.sendPhoneOtpWithRecaptcha("+66822222222");
    });

    const firstOwner = sendPhoneOtp.mock.calls[0]?.[2];
    const secondOwner = sendPhoneOtp.mock.calls[1]?.[2];
    expect(firstOwner).toBeDefined();
    expect(secondOwner).toBeDefined();
    expect(firstOwner).not.toBe(secondOwner);

    expect(clearPhoneOtpRecaptcha).not.toHaveBeenCalled();
    first.unmount();

    expect(clearPhoneOtpRecaptcha).toHaveBeenCalledExactlyOnceWith(firstOwner);

    second.unmount();

    expect(clearPhoneOtpRecaptcha).toHaveBeenNthCalledWith(2, secondOwner);
  });
});
