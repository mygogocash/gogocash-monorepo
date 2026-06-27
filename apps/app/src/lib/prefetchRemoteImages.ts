import { Image } from "expo-image";

export function prefetchRemoteImages(urls: readonly (string | null | undefined)[]): void {
  const unique = [...new Set(urls.filter((url): url is string => typeof url === "string" && url.startsWith("http")))];

  if (unique.length === 0) {
    return;
  }

  void Promise.all(unique.map((uri) => Image.prefetch(uri))).catch(() => undefined);
}
