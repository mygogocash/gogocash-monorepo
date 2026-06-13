import type { DesktopMenuBarItem } from "@/constants/navigation";

/**
 * Whether a locale-stripped pathname (e.g. from `usePathname()` in next-intl) matches
 * an internal app href, including when the URL is percent-encoded.
 */
export function isInternalHrefActive(pathname: string, href: string): boolean {
  if (!href || href.startsWith("http")) return false;
  const p = pathname || "";
  if (p === href) return true;
  if (p.startsWith(`${href}/`)) return true;

  let normP: string;
  let normH: string;
  try {
    normP = decodeURIComponent(p);
    normH = decodeURIComponent(href);
  } catch {
    return false;
  }
  if (normP === normH) return true;
  if (normP.startsWith(`${normH}/`)) return true;
  return false;
}

/** Active state for `desktopMenuBarNav` items (single source: `item.href`). */
export function isMenuBarItemActive(pathname: string, item: DesktopMenuBarItem): boolean {
  const p = pathname || "";
  if (item.productDiscover || item.supportOnly || item.external) return false;
  if (item.id === "top-brands") return p === "/" || p === "";
  if (!item.href) return false;
  return isInternalHrefActive(p, item.href);
}
