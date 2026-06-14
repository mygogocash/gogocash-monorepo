import { allowedOptimizedImageHostSet } from "@/config/imageHosts";

/**
 * Use `unoptimized` on next/image for blob/data URLs and remotes we have not allow-listed
 * in next.config `images.remotePatterns`.
 */
export function shouldUseUnoptimizedImageSrc(src: string): boolean {
  if (!src) return true;
  if (src.startsWith("blob:") || src.startsWith("data:")) return true;
  try {
    const { hostname } = new URL(src);
    return !allowedOptimizedImageHostSet().has(hostname.toLowerCase());
  } catch {
    return true;
  }
}
