import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuth = vi.fn(() => ({ kind: "rnfb-auth" }));
const signInWithPopup = vi.fn();

class MockOAuthProvider {
  providerId: string;
  scopes: string[] = [];
  constructor(providerId: string) {
    this.providerId = providerId;
  }
  addScope(scope: string) {
    this.scopes.push(scope);
    return this;
  }
}

vi.mock("@react-native-firebase/auth", () => ({
  OAuthProvider: MockOAuthProvider,
  getAuth: () => getAuth(),
  signInWithPopup: (...args: unknown[]) => signInWithPopup(...args),
}));

describe("nativeOAuthSignIn", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    getAuth.mockClear();
    signInWithPopup.mockReset();
  });

  it("signInWithNativeOAuth > given no enabled providers > throws NativeOAuthNotConfiguredError without touching the SDK", async () => {
    vi.stubEnv("EXPO_PUBLIC_NATIVE_OAUTH_PROVIDERS", "");

    const { NativeOAuthNotConfiguredError, signInWithNativeOAuth } = await import(
      "@mobile/auth/nativeOAuthSignIn"
    );

    await expect(signInWithNativeOAuth("facebook")).rejects.toBeInstanceOf(
      NativeOAuthNotConfiguredError,
    );
    expect(getAuth).not.toHaveBeenCalled();
    expect(signInWithPopup).not.toHaveBeenCalled();
  });

  it("signInWithNativeOAuth > given facebook enabled > runs the hosted OAuth flow and returns the Firebase idToken", async () => {
    vi.stubEnv("EXPO_PUBLIC_NATIVE_OAUTH_PROVIDERS", "facebook");

    const getIdToken = vi.fn().mockResolvedValue("firebase-id-token");
    signInWithPopup.mockResolvedValue({ user: { getIdToken } });

    const { signInWithNativeOAuth } = await import("@mobile/auth/nativeOAuthSignIn");

    await expect(signInWithNativeOAuth("facebook")).resolves.toEqual({
      idToken: "firebase-id-token",
    });

    expect(signInWithPopup).toHaveBeenCalledTimes(1);
    const [authArg, providerArg] = signInWithPopup.mock.calls[0] as [
      { kind: string },
      MockOAuthProvider,
    ];
    expect(authArg).toEqual({ kind: "rnfb-auth" });
    expect(providerArg.providerId).toBe("facebook.com");
    expect(providerArg.scopes).toEqual(["email", "public_profile"]);
    expect(getIdToken).toHaveBeenCalled();
  });

  it("signInWithNativeOAuth > given apple enabled > uses the apple.com provider with apple scopes", async () => {
    vi.stubEnv("EXPO_PUBLIC_NATIVE_OAUTH_PROVIDERS", "facebook,apple");

    const getIdToken = vi.fn().mockResolvedValue("apple-firebase-id-token");
    signInWithPopup.mockResolvedValue({ user: { getIdToken } });

    const { signInWithNativeOAuth } = await import("@mobile/auth/nativeOAuthSignIn");

    await expect(signInWithNativeOAuth("apple")).resolves.toEqual({
      idToken: "apple-firebase-id-token",
    });

    const providerArg = signInWithPopup.mock.calls[0][1] as MockOAuthProvider;
    expect(providerArg.providerId).toBe("apple.com");
    expect(providerArg.scopes).toEqual(["email", "name"]);
  });

  it("signInWithNativeOAuth > given only facebook enabled > apple stays dormant (staged activation)", async () => {
    vi.stubEnv("EXPO_PUBLIC_NATIVE_OAUTH_PROVIDERS", "facebook");

    const { NativeOAuthNotConfiguredError, signInWithNativeOAuth } = await import(
      "@mobile/auth/nativeOAuthSignIn"
    );

    await expect(signInWithNativeOAuth("apple")).rejects.toBeInstanceOf(
      NativeOAuthNotConfiguredError,
    );
    expect(signInWithPopup).not.toHaveBeenCalled();
  });

  it("isNativeOAuthProviderEnabled > parses the comma list with whitespace and case tolerance", async () => {
    vi.stubEnv("EXPO_PUBLIC_NATIVE_OAUTH_PROVIDERS", " Facebook , APPLE ");

    const { isNativeOAuthProviderEnabled } = await import("@mobile/auth/nativeOAuthSignIn");

    expect(isNativeOAuthProviderEnabled("facebook")).toBe(true);
    expect(isNativeOAuthProviderEnabled("apple")).toBe(true);
  });
});
