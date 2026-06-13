/**
 * Tailwind class fragments for the integrated profile hub (`SubPage` + `showSubMenu` / `contentOnly`).
 * Border color uses `globals.css` `--gc-border` for parity with the rest of the app shell.
 */
export const PROFILE_SUBPAGE_CARD_CLASS =
  "flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-3xl border border-[var(--gc-border)] bg-white";

const PROFILE_SUBPAGE_MAIN_SCROLL_BASE =
  "flex min-h-0 min-w-0 flex-1 flex-col gap-0 px-3 py-4 sm:px-5 sm:py-6 md:px-8 md:py-9 lg:px-10";

/** Main column when the left nav rail is visible — vertical rule follows this column’s height. */
export const PROFILE_SUBPAGE_MAIN_SCROLL_WITH_RAIL_CLASS = `${PROFILE_SUBPAGE_MAIN_SCROLL_BASE} md:border-l md:border-[var(--gc-border)]`;

/** Main column without the embedded nav (e.g. `contentOnly`). */
export const PROFILE_SUBPAGE_MAIN_SCROLL_SOLO_CLASS = PROFILE_SUBPAGE_MAIN_SCROLL_BASE;
