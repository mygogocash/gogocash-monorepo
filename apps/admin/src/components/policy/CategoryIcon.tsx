import React from "react";
import { isCategoryIconKey, type CategoryIconKey } from "@gogocash/contracts";

export {
  CATEGORY_ICON_KEYS,
  CATEGORY_ICON_OPTIONS,
  type CategoryIconKey,
} from "@gogocash/contracts";

export function resolveCategoryIconKey(
  persisted: unknown,
  name: string,
): CategoryIconKey {
  return isCategoryIconKey(persisted) ? persisted : categoryIconKey(name);
}

/** Match `token` as a whole word (avoids "automobile"→mobile, "facebook"→book). */
function hasToken(haystack: string, token: string): boolean {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`).test(haystack);
}

function hasAnyToken(haystack: string, tokens: readonly string[]): boolean {
  return tokens.some((token) => hasToken(haystack, token));
}

/**
 * Map a category name to a related icon by keyword (case-insensitive). Falls
 * back to a generic tag for anything unrecognised so every row gets an icon.
 */
export function categoryIconKey(name: string): CategoryIconKey {
  const n = (name || "").toLowerCase();

  if (n.includes("shop")) return "shopping";
  if (n.includes("travel") || n.includes("flight") || n.includes("hotel"))
    return "travel";
  if (
    n.includes("food") ||
    n.includes("drink") ||
    n.includes("restaurant") ||
    n.includes("grocery")
  )
    return "food";
  if (
    n.includes("financ") ||
    n.includes("bank") ||
    n.includes("insurance") ||
    n.includes("invest")
  )
    return "finance";
  if (
    n.includes("entertain") ||
    n.includes("movie") ||
    n.includes("music") ||
    n.includes("game")
  )
    return "entertainment";

  // Auto before electronics — "automobile" must not match bare "mobile".
  if (
    n.includes("automobile") ||
    n.includes("automotive") ||
    n.includes("vehicle") ||
    hasAnyToken(n, ["auto", "car", "cars", "motor", "motors"])
  )
    return "auto";

  if (
    n.includes("electronic") ||
    n.includes("gadget") ||
    n.includes("tech") ||
    n.includes("computer") ||
    n.includes("laptop") ||
    n.includes("camera") ||
    n.includes("smartphone") ||
    n.includes("cellphone") ||
    n.includes("mobile phone") ||
    hasAnyToken(n, ["phone", "phones"])
  )
    return "electronics";

  if (
    n.includes("fashion") ||
    n.includes("cloth") ||
    n.includes("apparel") ||
    n.includes("shoe") ||
    hasToken(n, "wear")
  )
    return "fashion";
  if (
    n.includes("beauty") ||
    n.includes("cosmetic") ||
    n.includes("makeup") ||
    n.includes("skincare") ||
    n.includes("salon")
  )
    return "beauty";
  if (
    n.includes("health") ||
    n.includes("pharmac") ||
    n.includes("wellness") ||
    n.includes("medical") ||
    n.includes("clinic")
  )
    return "health";
  if (
    n.includes("home") ||
    n.includes("furnitur") ||
    n.includes("living") ||
    n.includes("decor") ||
    n.includes("household")
  )
    return "home";
  if (
    n.includes("educat") ||
    n.includes("course") ||
    n.includes("learn") ||
    n.includes("school") ||
    n.includes("tuition") ||
    hasAnyToken(n, ["book", "books"])
  )
    return "education";
  if (
    n.includes("gift") ||
    n.includes("craft") ||
    n.includes("souvenir") ||
    n.includes("present")
  )
    return "gift";
  if (
    n.includes("sport") ||
    n.includes("fitness") ||
    n.includes("gym") ||
    n.includes("outdoor")
  )
    return "sports";
  // Whole-word "pet"/"pets" — avoid "carpet" / "competition".
  if (hasAnyToken(n, ["pet", "pets", "animal", "animals", "vet"]))
    return "pets";
  if (
    n.includes("baby") ||
    n.includes("kids") ||
    n.includes("infant") ||
    n.includes("maternity") ||
    hasAnyToken(n, ["kid", "child", "children"])
  )
    return "baby";
  if (
    n.includes("service") ||
    n.includes("digital service") ||
    n.includes("recharge") ||
    n.includes("top-up") ||
    n.includes("topup") ||
    n.includes("utility")
  )
    return "services";
  return "default";
}

const PATHS: Record<CategoryIconKey, React.ReactNode> = {
  shopping: (
    <>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
      <path d="M3 6h18" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </>
  ),
  travel: (
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  ),
  food: (
    <>
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <line x1="6" x2="6" y1="2" y2="4" />
      <line x1="10" x2="10" y1="2" y2="4" />
      <line x1="14" x2="14" y1="2" y2="4" />
    </>
  ),
  finance: (
    <>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </>
  ),
  entertainment: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M7 3v18" />
      <path d="M3 7.5h4" />
      <path d="M3 12h18" />
      <path d="M3 16.5h4" />
      <path d="M17 3v18" />
      <path d="M17 7.5h4" />
      <path d="M17 16.5h4" />
    </>
  ),
  electronics: (
    <>
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </>
  ),
  fashion: (
    <path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z" />
  ),
  beauty: (
    <>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .962 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.962 0z" />
      <path d="M20 3v4" />
      <path d="M22 5h-4" />
      <path d="M4 17v2" />
      <path d="M5 18H3" />
    </>
  ),
  health: (
    <>
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
      <path d="M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27" />
    </>
  ),
  home: (
    <>
      <path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8" />
      <path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </>
  ),
  education: (
    <>
      <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z" />
      <path d="M22 10v6" />
      <path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </>
  ),
  sports: (
    <>
      <path d="M6.3 14.7 11 10.1a3.5 3.5 0 0 1 5 0l.7.7" />
      <path d="m19.4 15.4-2.1-2.1" />
      <circle cx="17.5" cy="17.5" r="3.5" />
      <path d="m5.8 11.5 2.9-2.9" />
      <circle cx="5.5" cy="5.5" r="2.5" />
    </>
  ),
  pets: (
    <>
      <circle cx="11" cy="4" r="2" />
      <circle cx="18" cy="8" r="2" />
      <circle cx="20" cy="16" r="2" />
      <path d="M9 10a5 5 0 0 1 5 5v3.5a3.5 3.5 0 0 1-6.84 1.045Q6.52 17.48 4.46 16.84A3.5 3.5 0 0 1 5.5 10Z" />
    </>
  ),
  baby: (
    <>
      <path d="M10 16c.5.3 1.2.5 2 .5s1.5-.2 2-.5" />
      <path d="M15 12h.01" />
      <path d="M19.38 6.813A9 9 0 0 1 20.8 10.2a2 2 0 0 1 0 3.6 9 9 0 0 1-17.6 0 2 2 0 0 1 0-3.6A9 9 0 0 1 12 3c2 0 3.5 1.1 3.5 2.5s-.9 2.5-2 2.5c-.8 0-1.5-.4-1.5-1" />
      <path d="M9 12h.01" />
    </>
  ),
  auto: (
    <>
      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
      <circle cx="7" cy="17" r="2" />
      <path d="M9 17h6" />
      <circle cx="17" cy="17" r="2" />
    </>
  ),
  services: (
    <>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </>
  ),
  default: (
    <>
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </>
  ),
};

/** A category-related icon (defaults to 32px / h-8). Colour follows currentColor. */
export default function CategoryIcon({
  name,
  iconKey,
  className = "h-8 w-8",
  strokeWidth = 1.8,
}: {
  name: string;
  iconKey?: unknown;
  className?: string;
  strokeWidth?: number;
}) {
  const resolvedIconKey = resolveCategoryIconKey(iconKey, name);
  return (
    <svg
      data-category-icon={resolvedIconKey}
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[resolvedIconKey]}
    </svg>
  );
}
