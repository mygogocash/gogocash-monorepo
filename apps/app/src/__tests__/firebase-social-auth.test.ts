// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";

import { FIREBASE_NOT_CONFIGURED_CODE } from "@mobile/auth/authSendErrorKind";
import {
  isFirebaseSocialProviderId,
  signInWithSocialProvider,
} from "@mobile/auth/firebaseSocialAuth";

vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

const signInWithPopup = vi.fn();
const getIdToken = vi.fn();

vi.mock("firebase/auth", () => ({
  FacebookAuthProvider: class FacebookAuthProvider {},
  GoogleAuthProvider: class GoogleAuthProvider {},
  OAuthProvider: class OAuthProvider {
    addScope = vi.fn();
    constructor(public providerId: string) {}
  },
  signInWithPopup: (...args: unknown[]) => signInWithPopup(...args),
}));

vi.mock("@mobile/auth/firebaseClient", () => ({
  getClientAuth: () => ({ kind: "auth" }),
  isFirebaseConfigured: vi.fn(() => true),
}));

describe("firebaseSocialAuth", () => {
  it("isFirebaseSocialProviderId > recognizes supported Firebase OAuth providers", () => {
    expect(isFirebaseSocialProviderId("google")).toBe(true);
    expect(isFirebaseSocialProviderId("telegram")).toBe(false);
  });

  it("signInWithSocialProvider > returns a Firebase ID token after popup sign-in", async () => {
    signInWithPopup.mockResolvedValue({
      user: { getIdToken: getIdToken.mockResolvedValue("social-id-token") },
    });

    await expect(signInWithSocialProvider("google")).resolves.toEqual({
      idToken: "social-id-token",
    });
    expect(signInWithPopup).toHaveBeenCalled();
  });

  it("signInWithSocialProvider > throws when Firebase is not configured", async () => {
    const { isFirebaseConfigured } = await import("@mobile/auth/firebaseClient");
    vi.mocked(isFirebaseConfigured).mockReturnValueOnce(false);

    await expect(signInWithSocialProvider("google")).rejects.toMatchObject({
      code: FIREBASE_NOT_CONFIGURED_CODE,
    });
  });
});
