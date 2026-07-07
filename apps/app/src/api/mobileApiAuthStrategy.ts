/** Pure platform gate — tested without react-native in Vitest. */
export function prefersFirebaseIdTokenForApiAuth(platformOs: string): boolean {
  return platformOs === "web";
}

function readPlatformOs(): string {
  try {
    // Lazy require keeps Vitest (Node) from parsing react-native at import time.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("react-native").Platform.OS as string;
  } catch {
    return "web";
  }
}

export function shouldAttachFirebasePreferredAuthToken(): boolean {
  return prefersFirebaseIdTokenForApiAuth(readPlatformOs());
}
