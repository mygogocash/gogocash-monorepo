/**
 * Cloudflare Image Resizing rewrite for gogocash-hosted media.
 *
 * The media zones serve original admin uploads (banner PNGs run 2.7–9.1 MB
 * each) but have Image Resizing enabled, so prefixing the path with
 * `/cdn-cgi/image/<options>/` returns a right-sized AVIF/WebP/JPEG at ~1–2% of
 * the bytes. This helper rewrites ONLY allowlisted gogocash media hosts —
 * external CDNs (img.involve.asia, cdn.simpleicons.org, drive.google.com) and
 * api hosts pass through untouched. `onerror=redirect` makes Cloudflare fall
 * back to the original asset on any processing error.
 *
 * media.gogocash.co is allowlisted alongside media-staging: both are subdomains
 * of the SAME gogocash.co zone and Image Resizing is a zone-level feature.
 * Measured on the production host against a 9,584,617 B PNG — w=1600 returns
 * 99,747 B AVIF and w=320 returns 12,300 B. Leaving it un-allowlisted would
 * ship the 9.1 MB original to every visitor.
 */

// Per-surface transform widths. Shared constants so the same asset resolves to
// the same URL everywhere (one CDN variant, one expo-image cache entry).
export const HERO_BANNER_IMAGE_WIDTH = 1600;
export const SIDE_BANNER_IMAGE_WIDTH = 800;
export const SHOP_BANNER_IMAGE_WIDTH = 1080;
export const BRAND_LOGO_IMAGE_WIDTH = 320;

const DEFAULT_IMAGE_QUALITY = 78;
const CDN_IMAGE_SEGMENT = "cdn-cgi/image/";
const OPTIMIZED_IMAGE_URL_PREFIXES = [
  "https://media-staging.gogocash.co/",
  "https://media.gogocash.co/",
] as const;

/**
 * The set of hosts routed through Cloudflare Image Resizing. The built-in media
 * hosts are always included; `EXPO_PUBLIC_MEDIA_HOST` extends it so that if the
 * API's `R2_PUBLIC_BASE_URL` is ever repointed to a new host, setting the
 * matching env keeps optimization working instead of silently serving raw. Read
 * per call (not memoized) so the value stays correct under env changes/tests.
 */
function optimizedImagePrefixes(): string[] {
  const prefixes: string[] = [...OPTIMIZED_IMAGE_URL_PREFIXES];
  const configured = process.env.EXPO_PUBLIC_MEDIA_HOST?.trim();
  if (configured) {
    const origin = configured.startsWith("http")
      ? configured
      : `https://${configured}`;
    const withSlash = origin.endsWith("/") ? origin : `${origin}/`;
    if (!prefixes.includes(withSlash)) {
      prefixes.push(withSlash);
    }
  }
  return prefixes;
}

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

  const prefix = optimizedImagePrefixes().find((candidate) =>
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
