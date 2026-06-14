import React from "react";

export type CategoryIconKey =
  | "shopping"
  | "travel"
  | "food"
  | "finance"
  | "entertainment"
  | "default";

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
  className = "h-8 w-8",
  strokeWidth = 1.8,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[categoryIconKey(name)]}
    </svg>
  );
}
