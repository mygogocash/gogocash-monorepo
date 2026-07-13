/** Marketplace host allowlist for GoGoLink link-preview (SSRF guard). */
const HOST_NEEDLES = [
  'shp.ee',
  'shopee',
  'lazada',
  'tiktok',
  'klook',
  'trip.com',
  'traveloka',
  'agoda',
  'aliexpress',
  'amazon',
  'sephora',
  'watsons',
] as const;

export function isAllowedGoLinkPreviewHost(hostname: string): boolean {
  const host = hostname.replace(/^www\./i, '').toLowerCase();
  if (!host || host.includes(':') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
    return false;
  }
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    return false;
  }
  return HOST_NEEDLES.some((needle) => host === needle || host.includes(needle));
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
