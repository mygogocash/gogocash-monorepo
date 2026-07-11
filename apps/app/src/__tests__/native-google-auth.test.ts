import { beforeEach, describe, expect, it, vi } from "vitest";

const configure = vi.fn();
const signIn = vi.fn();
const getTokens = vi.fn();
const hasPlayServices = vi.fn();

vi.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: (...args: unknown[]) => configure(...args),
    signIn: (...args: unknown[]) => signIn(...args),
    getTokens: (...args: unknown[]) => getTokens(...args),
    hasPlayServices: (...args: unknown[]) => hasPlayServices(...args),
  },
}));

const signInWithCredential = vi.fn();
const credential = vi.fn((idToken: string) => ({ kind: "google-credential", idToken }));

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: {
    credential: (idToken: string) => credential(idToken),
  },
  signInWithCredential: (...args: unknown[]) => signInWithCredential(...args),
}));

vi.mock("@mobile/auth/firebaseClient", () => ({
  getClientAuth: () => ({ kind: "auth" }),
}));

describe("nativeGoogleAuth", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    configure.mockReset();
    signIn.mockReset();
    getTokens.mockReset();
    hasPlayServices.mockReset();
    signInWithCredential.mockReset();
    credential.mockClear();
    hasPlayServices.mockResolvedValue(true);
  });

  it("signInWithNativeGoogle > given empty webClientId > throws GoogleSignInNotConfiguredError", async () => {
    vi.stubEnv("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID", "");
    vi.stubEnv("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID", "");

    const { GoogleSignInNotConfiguredError, signInWithNativeGoogle } = await import(
      "@mobile/auth/nativeGoogleAuth"
    );

    await expect(signInWithNativeGoogle()).rejects.toBeInstanceOf(GoogleSignInNotConfiguredError);
    expect(configure).not.toHaveBeenCalled();
    expect(signIn).not.toHaveBeenCalled();
  });

  it("signInWithNativeGoogle > given webClientId > configures, signs in, exchanges Firebase credential, returns idToken", async () => {
    vi.stubEnv("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID", "web-client.apps.googleusercontent.com");
    vi.stubEnv("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID", "ios-client.apps.googleusercontent.com");

    signIn.mockResolvedValue({
      type: "success",
      data: { idToken: "google-native-id-token" },
    });
    const getIdToken = vi.fn().mockResolvedValue("firebase-id-token");
    signInWithCredential.mockResolvedValue({
      user: { getIdToken },
    });

    const { signInWithNativeGoogle } = await import("@mobile/auth/nativeGoogleAuth");

    await expect(signInWithNativeGoogle()).resolves.toEqual({ idToken: "firebase-id-token" });

    expect(configure).toHaveBeenCalledWith({
      webClientId: "web-client.apps.googleusercontent.com",
      iosClientId: "ios-client.apps.googleusercontent.com",
    });
    expect(signIn).toHaveBeenCalled();
    expect(credential).toHaveBeenCalledWith("google-native-id-token");
    expect(signInWithCredential).toHaveBeenCalledWith(
      { kind: "auth" },
      { kind: "google-credential", idToken: "google-native-id-token" }
    );
    expect(getIdToken).toHaveBeenCalled();
  });
});
