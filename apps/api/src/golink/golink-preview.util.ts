import { isIP } from 'node:net';

/** Registrable marketplace domains supported by GoGoLink previews. */
const ALLOWED_HOST_SUFFIXES = [
  'shp.ee',
  'shopee.co.th',
  'shopee.com',
  'shopee.sg',
  'shopee.com.my',
  'shopee.ph',
  'shopee.vn',
  'shopee.tw',
  'shopee.co.id',
  'shopee.com.br',
  'shopee.com.mx',
  'shopee.cl',
  'shopee.com.co',
  'lazada.co.th',
  'lazada.com',
  'lazada.sg',
  'lazada.com.my',
  'lazada.com.ph',
  'lazada.vn',
  'lazada.co.id',
  'tiktok.com',
  'klook.com',
  'konvy.com',
  'trip.com',
  'traveloka.com',
  'agoda.com',
  'aliexpress.com',
  'amazon.com',
  'amazon.co.uk',
  'amazon.de',
  'amazon.fr',
  'amazon.it',
  'amazon.es',
  'amazon.ca',
  'amazon.com.mx',
  'amazon.com.br',
  'amazon.com.au',
  'amazon.co.jp',
  'amazon.in',
  'amazon.nl',
  'amazon.se',
  'amazon.pl',
  'amazon.sg',
  'amazon.ae',
  'amazon.sa',
  'amazon.com.tr',
  'amazon.eg',
  'sephora.com',
  'sephora.co.th',
  'sephora.sg',
  'sephora.my',
  'watsons.com',
  'watsons.co.th',
  'watsons.com.sg',
  'watsons.com.my',
  'watsons.com.ph',
  'watsons.co.id',
  'watsons.vn',
  'watsons.com.hk',
  'watsons.com.tw',
] as const;

export function isAllowedGoLinkPreviewHost(hostname: string): boolean {
  const host = hostname.replace(/\.$/, '').toLowerCase();
  const addressCandidate = host.replace(/^\[|\]$/g, '');
  if (!host || isIP(addressCandidate) !== 0) {
    return false;
  }
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

/** Parse the user URL and enforce the pre-DNS part of the preview boundary. */
export function parseGoLinkPreviewUrl(value: string): URL | null {
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return null;
  }

  if (
    parsed.protocol !== 'https:' ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.port !== '' ||
    !isAllowedGoLinkPreviewHost(parsed.hostname)
  ) {
    return null;
  }

  return parsed;
}

const BLOCKED_IPV4_RANGES: ReadonlyArray<
  readonly [base: number, prefixLength: number]
> = [
  [0x00000000, 8], // Unspecified / current network.
  [0x0a000000, 8], // Private.
  [0x64400000, 10], // Carrier-grade NAT.
  [0x7f000000, 8], // Loopback.
  [0xa9fe0000, 16], // Link-local (includes cloud metadata endpoints).
  [0xac100000, 12], // Private.
  [0xc0000000, 24], // IETF protocol assignments.
  [0xc0000200, 24], // Documentation.
  [0xc0586300, 24], // Deprecated 6to4 relay anycast.
  [0xc0a80000, 16], // Private.
  [0xc6120000, 15], // Benchmarking.
  [0xc6336400, 24], // Documentation.
  [0xcb007100, 24], // Documentation.
  [0xe0000000, 4], // Multicast.
  [0xf0000000, 4], // Reserved / limited broadcast.
];

function parseIpv4(address: string): number | null {
  const octets = address.split('.');
  if (octets.length !== 4) {
    return null;
  }
  const values = octets.map((octet) => Number(octet));
  if (
    values.some(
      (value, index) =>
        !Number.isInteger(value) ||
        value < 0 ||
        value > 255 ||
        String(value) !== octets[index],
    )
  ) {
    return null;
  }
  return (
    (((values[0] << 24) >>> 0) |
      (values[1] << 16) |
      (values[2] << 8) |
      values[3]) >>>
    0
  );
}

function isBlockedIpv4(address: string): boolean {
  const numeric = parseIpv4(address);
  if (numeric === null) {
    return true;
  }
  return BLOCKED_IPV4_RANGES.some(([base, prefixLength]) => {
    const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
    return (numeric & mask) >>> 0 === (base & mask) >>> 0;
  });
}

function parseIpv6(address: string): number[] | null {
  if (address.includes('%')) {
    return null;
  }

  let normalized = address.toLowerCase();
  if (normalized.includes('.')) {
    const lastColon = normalized.lastIndexOf(':');
    const ipv4 = parseIpv4(normalized.slice(lastColon + 1));
    if (lastColon < 0 || ipv4 === null) {
      return null;
    }
    normalized = `${normalized.slice(0, lastColon + 1)}${(ipv4 >>> 16).toString(
      16,
    )}:${(ipv4 & 0xffff).toString(16)}`;
  }

  const halves = normalized.split('::');
  if (halves.length > 2) {
    return null;
  }
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - tail.length;
  if (
    (halves.length === 1 && missing !== 0) ||
    (halves.length === 2 && missing < 1)
  ) {
    return null;
  }

  const groups = [...head, ...Array(missing).fill('0'), ...tail];
  if (
    groups.length !== 8 ||
    groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))
  ) {
    return null;
  }

  return groups.flatMap((group) => {
    const value = Number.parseInt(group, 16);
    return [value >>> 8, value & 0xff];
  });
}

function hasPrefix(
  bytes: readonly number[],
  prefix: readonly number[],
  prefixLength: number,
): boolean {
  const wholeBytes = Math.floor(prefixLength / 8);
  for (let index = 0; index < wholeBytes; index += 1) {
    if (bytes[index] !== prefix[index]) {
      return false;
    }
  }
  const remainingBits = prefixLength % 8;
  if (remainingBits === 0) {
    return true;
  }
  const mask = (0xff << (8 - remainingBits)) & 0xff;
  return (bytes[wholeBytes] & mask) === (prefix[wholeBytes] & mask);
}

/**
 * Non-global ranges inside IPv6's 2000::/3 global-unicast allocation.
 * Keep this conservative list aligned with the IANA IPv6 Special-Purpose
 * Address Registry when that registry changes.
 */
const BLOCKED_IPV6_RANGES: ReadonlyArray<
  readonly [prefix: readonly number[], prefixLength: number]
> = [
  [[0x20, 0x01, 0x00], 23], // IETF protocol assignments and transition space.
  [[0x20, 0x01, 0x0d, 0xb8], 32], // Documentation.
  [[0x20, 0x02], 16], // 6to4.
  [[0x3f, 0xfe], 16], // Deprecated 6bone.
  [[0x3f, 0xff, 0x00], 20], // Documentation.
];

function isPublicIpv6(address: string): boolean {
  const bytes = parseIpv6(address);
  if (!bytes) {
    return false;
  }

  // Only global-unicast space is eligible. The explicit exclusions remove
  // IANA special-purpose ranges that are not globally reachable.
  return (
    hasPrefix(bytes, [0x20], 3) &&
    !BLOCKED_IPV6_RANGES.some(([prefix, prefixLength]) =>
      hasPrefix(bytes, prefix, prefixLength),
    )
  );
}

/** True only for a globally routable address safe for an outbound preview. */
export function isPublicGoLinkPreviewAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    return !isBlockedIpv4(address);
  }
  if (family === 6) {
    return isPublicIpv6(address);
  }
  return false;
}

export type GoLinkOpenGraphPreview = {
  title: string | null;
  imageUrl: string | null;
  description: string | null;
  price: string | null;
};

function metaContent(html: string, property: string): string | null {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const alt = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    'i',
  );
  const match = html.match(re) ?? html.match(alt);
  const value = match?.[1]?.trim();
  return value || null;
}

export function extractOpenGraphPreview(html: string): GoLinkOpenGraphPreview {
  const title = metaContent(html, 'og:title');
  const imageUrl = metaContent(html, 'og:image');
  const description = metaContent(html, 'og:description');
  const amount = metaContent(html, 'product:price:amount');
  const currency = metaContent(html, 'product:price:currency');
  const price =
    amount && currency ? `${amount} ${currency}` : amount ? amount : null;

  return { title, imageUrl, description, price };
}
