import { getTopBrandHref } from "@mobile/design/webDesignParity";

function parseShopIdFromHref(href: string): string | undefined {
  const match = href.match(/^\/shop\/([^/?#]+)/);
  return match?.[1];
}

export function resolveFavoriteOfferId(input: {
  readonly id?: string;
  readonly href?: string;
  readonly brand?: string;
}): string {
  if (input.id) {
    return input.id;
  }

  if (input.href) {
    const fromHref = parseShopIdFromHref(input.href);
    if (fromHref) {
      return fromHref;
    }
  }

  if (input.brand) {
    const mappedHref = getTopBrandHref(input.brand);
    return parseShopIdFromHref(mappedHref) ?? input.brand;
  }

  return "";
}
