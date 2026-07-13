export type SearchAnchorFrame = {
  readonly height: number;
  readonly width: number;
  readonly x: number;
  readonly y: number;
};

export type SearchPopoverFrame = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
};

// Gap between the search input's bottom edge and the popover.
export const SEARCH_POPOVER_ANCHOR_GAP = 8;

// Un-anchored fallback cap: matches the focused header search width so the
// panel reads as a search dropdown even before the input has been measured.
export const SEARCH_POPOVER_FALLBACK_MAX_WIDTH = 640;

// The popover renders on a viewport-absolute layer while the search input
// lives inside the centered desktop header cap, so its frame must come from
// the measured input — content padding has no relation to the input's position.
export function resolveSearchPopoverFrame({
  anchor,
  fallbackHorizontalPadding,
  fallbackTop,
  viewportWidth,
}: {
  anchor: SearchAnchorFrame | null;
  fallbackHorizontalPadding: number;
  fallbackTop: number;
  viewportWidth: number;
}): SearchPopoverFrame {
  if (anchor && anchor.width > 0) {
    const left = Math.max(0, anchor.x);
    return {
      left,
      top: anchor.y + anchor.height + SEARCH_POPOVER_ANCHOR_GAP,
      width: Math.min(anchor.width, Math.max(0, viewportWidth - left)),
    };
  }

  const width = Math.min(
    SEARCH_POPOVER_FALLBACK_MAX_WIDTH,
    Math.max(0, viewportWidth - fallbackHorizontalPadding * 2),
  );
  return {
    left: Math.max(fallbackHorizontalPadding, (viewportWidth - width) / 2),
    top: fallbackTop,
    width,
  };
}
