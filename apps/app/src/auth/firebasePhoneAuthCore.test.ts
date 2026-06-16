import { describe, expect, it, vi } from "vitest";

import {
  confirmPhoneOtpWith,
  sendPhoneOtpWith,
  type PhoneAuthLike,
  type PhoneConfirmationLike,
} from "@mobile/auth/firebasePhoneAuthCore";

// The native phone-auth path (@react-native-firebase/auth) can't run in node, so the
// logic lives here behind injected `auth` / `confirmation` seams and is unit-tested
// with fakes. The thin `firebasePhoneAuth.native.ts` just wires the real module in.
describe("firebasePhoneAuthCore", () => {
  it("sendPhoneOtpWith > sends the E.164 number and returns the confirmation handle", async () => {
    const confirmation = { confirm: vi.fn() } as unknown as PhoneConfirmationLike;
    const auth = {
      signInWithPhoneNumber: vi.fn().mockResolvedValue(confirmation),
    } satisfies PhoneAuthLike;

    const result = await sendPhoneOtpWith(auth, "+66812345678");

    expect(auth.signInWithPhoneNumber).toHaveBeenCalledWith("+66812345678");
    expect(result).toBe(confirmation);
  });

  it("confirmPhoneOtpWith > confirms the code and returns the Firebase ID token", async () => {
    const getIdToken = vi.fn().mockResolvedValue("id-token-abc");
    const confirmation = {
      confirm: vi.fn().mockResolvedValue({ user: { getIdToken } }),
    } as unknown as PhoneConfirmationLike;

    const result = await confirmPhoneOtpWith(confirmation, "123456");

    expect(confirmation.confirm).toHaveBeenCalledWith("123456");
    expect(result).toEqual({ idToken: "id-token-abc" });
  });

  it("confirmPhoneOtpWith > given confirmation returns no signed-in user > throws", async () => {
    const confirmation = {
      confirm: vi.fn().mockResolvedValue({ user: null }),
    } as unknown as PhoneConfirmationLike;

    await expect(confirmPhoneOtpWith(confirmation, "123456")).rejects.toThrow(
      /no signed-in user/i
    );
  });
});
