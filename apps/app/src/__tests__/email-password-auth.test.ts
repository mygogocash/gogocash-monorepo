// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { FIREBASE_NOT_CONFIGURED_CODE } from "@mobile/auth/authSendErrorKind";

const signInWithEmailAndPassword = vi.fn();
const createUserWithEmailAndPassword = vi.fn();

vi.mock("firebase/auth", () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => signInWithEmailAndPassword(...args),
  createUserWithEmailAndPassword: (...args: unknown[]) =>
    createUserWithEmailAndPassword(...args),
}));

const isFirebaseConfigured = vi.fn(() => true);

vi.mock("@mobile/auth/firebaseClient", () => ({
  getClientAuth: () => ({ kind: "auth" }),
  isFirebaseConfigured: () => isFirebaseConfigured(),
}));

const credential = { user: { getIdToken: vi.fn().mockResolvedValue("email-id-token") } };

describe("emailPasswordAuth > signInWithEmail", () => {
  beforeEach(() => {
    isFirebaseConfigured.mockReturnValue(true);
    signInWithEmailAndPassword.mockReset().mockResolvedValue(credential);
    createUserWithEmailAndPassword.mockReset().mockResolvedValue(credential);
  });

  it("given valid credentials > then returns the Firebase ID token", async () => {
    const { signInWithEmail } = await import("@mobile/auth/emailPasswordAuth");

    await expect(signInWithEmail("user@example.com", "hunter22")).resolves.toEqual({
      idToken: "email-id-token",
    });
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      { kind: "auth" },
      "user@example.com",
      "hunter22"
    );
  });

  it("given Firebase is not configured > then throws the configured error code", async () => {
    isFirebaseConfigured.mockReturnValue(false);
    const { signInWithEmail } = await import("@mobile/auth/emailPasswordAuth");

    await expect(signInWithEmail("user@example.com", "pw")).rejects.toMatchObject({
      code: FIREBASE_NOT_CONFIGURED_CODE,
    });
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();
  });
});

describe("emailPasswordAuth > registerWithEmail", () => {
  beforeEach(() => {
    isFirebaseConfigured.mockReturnValue(true);
    createUserWithEmailAndPassword.mockReset().mockResolvedValue(credential);
  });

  it("given a new account > then creates it and returns the Firebase ID token", async () => {
    const { registerWithEmail } = await import("@mobile/auth/emailPasswordAuth");

    await expect(registerWithEmail("new@example.com", "hunter22")).resolves.toEqual({
      idToken: "email-id-token",
    });
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      { kind: "auth" },
      "new@example.com",
      "hunter22"
    );
  });
});

describe("emailAuthErrorKind > toEmailAuthErrorKind", () => {
  it("maps Firebase error codes to screen-facing kinds without leaking account existence", async () => {
    const { toEmailAuthErrorKind } = await import("@mobile/auth/emailAuthErrorKind");
    const err = (code: string) => Object.assign(new Error(code), { code });

    // Wrong password and unknown user collapse into ONE kind — a different
    // message per case would let an attacker probe which emails exist.
    expect(toEmailAuthErrorKind(err("auth/wrong-password"))).toBe("invalid-credentials");
    expect(toEmailAuthErrorKind(err("auth/invalid-credential"))).toBe("invalid-credentials");
    expect(toEmailAuthErrorKind(err("auth/user-not-found"))).toBe("invalid-credentials");

    expect(toEmailAuthErrorKind(err("auth/email-already-in-use"))).toBe("email-in-use");
    expect(toEmailAuthErrorKind(err("auth/weak-password"))).toBe("weak-password");
    expect(toEmailAuthErrorKind(err("auth/invalid-email"))).toBe("invalid-email");
    expect(toEmailAuthErrorKind(err("auth/too-many-requests"))).toBe("rate-limit");
    expect(toEmailAuthErrorKind(err("auth/anything-else"))).toBe("generic");
    expect(toEmailAuthErrorKind(new Error("no code"))).toBe("generic");
  });
});
