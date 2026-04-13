"use client";

import { useMediaQuery } from "@mui/material";

const MD_UP_QUERY = "(min-width:768px)";

/**
 * `min-width: 768px` — matches MUI `md` and existing app usage.
 * `defaultMatches: false` + `noSsr: true` keeps SSR, the first client paint, and
 * `getServerSnapshot` aligned so layout does not depend on `matchMedia` until after
 * hydration (avoids React #418 / tree mismatch noise from `useMediaQuery`).
 */
export function useBreakpointMdUp(): boolean {
  return useMediaQuery(MD_UP_QUERY, { defaultMatches: false, noSsr: true });
}
