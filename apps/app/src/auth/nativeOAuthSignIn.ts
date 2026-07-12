/**
 * Native Facebook/Apple sign-in via Firebase's hosted generic OAuth flow.
 *
 * @react-native-firebase/auth (native since runtime 0.2.0) implements
 * signInWithPopup by launching a Custom Tab to the project's hosted handler
 * (https://<project-id>.firebaseapp.com/__/auth/handler) — redirect, nonce and
 * provider secrets all live server-side in the Firebase console. That means
 * NO new native module: this rides the binary every 0.3.0 build already ships
 * (pinned by native-oauth-config-parity.test.ts), so activation is OTA-able.
 *
 * Dormant until EXPO_PUBLIC_NATIVE_OAUTH_PROVIDERS lists the provider
 * (comma-separated, e.g. "facebook" then "facebook,apple") — staged
 * activation per provider, mirroring nativeGoogleAuth's env gating. The RNFB
 * module is loaded lazily so web bundles and the unit runner never touch it
 * (same convention as nativePhoneAuth).
 */

export type NativeOAuthProviderId = "facebook" | "apple";

const PROVIDER_CONFIG: Record<
  NativeOAuthProviderId,
  { providerId: string; scopes: readonly string[] }
> = {
  apple: { providerId: "apple.com", scopes: ["email", "name"] },
  facebook: { providerId: "facebook.com", scopes: ["email", "public_profile"] },
};

export class NativeOAuthNotConfiguredError extends Error {
  constructor(message = "Native social sign-in is not configured") {
    super(message);
    this.name = "NativeOAuthNotConfiguredError";
  }
}

export function isNativeOAuthProviderEnabled(provider: NativeOAuthProviderId): boolean {
  const enabled: string = process.env.EXPO_PUBLIC_NATIVE_OAUTH_PROVIDERS ?? "";
  return enabled
    .split(",")
    .map((entry: string) => entry.trim().toLowerCase())
    .includes(provider);
}

export async function signInWithNativeOAuth(
  provider: NativeOAuthProviderId,
): Promise<{ idToken: string }> {
  if (!isNativeOAuthProviderEnabled(provider)) {
    throw new NativeOAuthNotConfiguredError();
  }

  const { providerId, scopes } = PROVIDER_CONFIG[provider];
  // Lazy: import fails cleanly when the RNFB native module is absent (web,
  // tests, pre-0.2.0 binaries) instead of crashing at bundle load.
  const rnfbAuth = await import("@react-native-firebase/auth");
  const oauthProvider = new rnfbAuth.OAuthProvider(providerId);
  for (const scope of scopes) {
    oauthProvider.addScope(scope);
  }

  // RNFB types OAuthProvider.providerId as private, which fails structural
  // matching against the AuthProvider parameter — runtime shape is identical.
  const result = await rnfbAuth.signInWithPopup(
    rnfbAuth.getAuth(),
    oauthProvider as unknown as Parameters<typeof rnfbAuth.signInWithPopup>[1],
  );
  return { idToken: await result.user.getIdToken() };
}
