/**
 * Mirrors the customer app's top-brand landed-position math so the admin
 * panel can preview where each brand in the (unsaved) order actually lands.
 *
 * Source of truth being mirrored:
 * - apps/app/src/design/webDesignParity.ts — card width 176, gap 16,
 *   2 rows per pager page, desktop content frame 1200 (viewport >= 1200),
 *   tablet content frame 900 (viewport 1024-1199, still the pager),
 *   getDesktopBrandColumnsPerRow = floor((frame + gap) / (card + gap)).
 * - apps/app/src/screens/home/homeHelpers.ts — chunkTopBrandCards +
 *   getPromoSectionLayoutMode (<= 4 cards on mobile renders a static
 *   2-column grid; more cards free-scroll as vertical pairs).
 * - apps/app/src/screens/home/TopBrandSection.tsx — desktop and mobile rails
 *   render consecutive pairs as vertical 2-card columns. On desktop, those
 *   columns are paged according to the available content frame.
 *
 * The app pins its side of this contract in web-design-parity tests; the
 * numbers here are pinned by topBrandPreviewLayout.test.ts. If either side
 * changes, one of the pinned suites fails and the mirror must be re-synced.
 */

export const TOP_BRAND_CARD_WIDTH = 176;
export const TOP_BRAND_GAP = 16;
export const TOP_BRAND_ROWS_PER_PAGE = 2;
/** Customer desktop design frame — applies to windows >= 1200 px. */
export const DESKTOP_CONTENT_FRAME = 1200;
/** Customer tablet design frame — 1024-1199 px windows (still the pager). */
export const TABLET_CONTENT_FRAME = 900;
/** On mobile, this many cards or fewer renders a static 2-column grid. */
export const MOBILE_STATIC_GRID_MAX_CARDS = 4;

export function desktopColumnsPerRow(
  frameWidth: number = DESKTOP_CONTENT_FRAME,
): number {
  return Math.max(
    1,
    Math.floor(
      (frameWidth + TOP_BRAND_GAP) / (TOP_BRAND_CARD_WIDTH + TOP_BRAND_GAP),
    ),
  );
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

/** Desktop pager: logical pages of columns x 2 slots. */
export function desktopPreviewPages<T>(
  items: readonly T[],
  frameWidth: number = DESKTOP_CONTENT_FRAME,
): T[][] {
  return chunk(
    items,
    desktopColumnsPerRow(frameWidth) * TOP_BRAND_ROWS_PER_PAGE,
  );
}

export type DesktopPreviewSlot<T> = {
  item: T;
  /** Index inside the logical page, used for drag/drop and saved ordering. */
  sourceIndex: number;
};

/**
 * Project one logical desktop page into the two visible rows used by the
 * customer rail: positions 1,3,5… above positions 2,4,6….
 *
 * `sourceIndex` deliberately survives the visual projection so an admin drag
 * still mutates the original ordered list rather than the rendered row order.
 */
export function desktopPreviewRows<T>(
  pageItems: readonly T[],
): [DesktopPreviewSlot<T>[], DesktopPreviewSlot<T>[]] {
  const rows: [DesktopPreviewSlot<T>[], DesktopPreviewSlot<T>[]] = [[], []];
  pageItems.forEach((item, sourceIndex) => {
    rows[sourceIndex % TOP_BRAND_ROWS_PER_PAGE].push({ item, sourceIndex });
  });
  return rows;
}

/**
 * Mobile free-scroll rail (> 4 cards): consecutive pairs render as vertical
 * 2-card columns, so order index 1 sits BELOW index 0, not beside it.
 */
export function mobilePreviewColumns<T>(items: readonly T[]): T[][] {
  return chunk(items, TOP_BRAND_ROWS_PER_PAGE);
}

export function isMobileStaticGrid(cardCount: number): boolean {
  return cardCount <= MOBILE_STATIC_GRID_MAX_CARDS;
}
