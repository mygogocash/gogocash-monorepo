import { Linking } from "react-native";

/**
 * Opens an affiliate tracking URL from GoGoTrack activation. Tries the platform
 * handler first; on restrictive canOpenURL checks still attempts openURL so
 * https Involve links work on Android.
 */
export async function openAffiliateDeeplink(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("Missing affiliate link");
  }

  try {
    const canOpen = await Linking.canOpenURL(trimmed);
    if (canOpen) {
      await Linking.openURL(trimmed);
      return;
    }
  } catch {
    // canOpenURL is restrictive on some platforms; fall through to openURL.
  }

  await Linking.openURL(trimmed);
}
