/**
 * Cloudflare Image Resizing rewrite for gogocash-hosted media.
 *
 * The staging media zone serves original admin uploads (banner PNGs run
 * 2.7–9.1 MB each) but has Image Resizing enabled, so prefixing the path with
 * `/cdn-cgi/image/<options>/` returns a right-sized AVIF/WebP/JPEG at ~1–2% of
 * the bytes. This helper rewrites ONLY allowlisted gogocash media hosts —
 * external CDNs (img.involve.asia, cdn.simpleicons.org, drive.google.com) and
 * api hosts pass through untouched. The production media host is deliberately
 * NOT allowlisted until its zone's Image Resizing support is verified;
 * `onerror=redirect` makes Cloudflare fall back to the original asset on any
 * processing error.
 */

// Per-surface transform widths. Shared constants so the same asset resolves to
// the same URL everywhere (one CDN variant, one expo-image cache entry).
export const HERO_BANNER_IMAGE_WIDTH = 1600;
export const SIDE_BANNER_IMAGE_WIDTH = 800;
export const SHOP_BANNER_IMAGE_WIDTH = 1080;
export const BRAND_LOGO_IMAGE_WIDTH = 320;

const DEFAULT_IMAGE_QUALITY = 78;
const CDN_IMAGE_SEGMENT = "cdn-cgi/image/";
const OPTIMIZED_IMAGE_URL_PREFIXES = ["https://media-staging.gogocash.co/"] as const;

export type OptimizedImageOptions = {
  width: number;
  quality?: number;
};

export function optimizedImageUrl(
  url: string | undefined,
  options: OptimizedImageOptions,
): string | undefined {
  if (!url) {
    return url;
  }

  const prefix = OPTIMIZED_IMAGE_URL_PREFIXES.find((candidate) =>
    url.startsWith(candidate),
  );
  if (!prefix) {
    return url;
  }

  const path = url.slice(prefix.length);
  if (!path || path.startsWith(CDN_IMAGE_SEGMENT)) {
    return url;
  }

  const quality = options.quality ?? DEFAULT_IMAGE_QUALITY;
  const transform = `width=${options.width},quality=${quality},fit=scale-down,format=auto,onerror=redirect`;
  return `${prefix}${CDN_IMAGE_SEGMENT}${transform}/${path}`;
}
