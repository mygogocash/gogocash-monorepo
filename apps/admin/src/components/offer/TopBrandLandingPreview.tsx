import {
  desktopColumnsPerRow,
  desktopPreviewPages,
  isMobileStaticGrid,
  mobilePreviewColumns,
} from "@/lib/topBrandPreviewLayout";

type TopBrandLandingPreviewProps = {
  /** Current (possibly unsaved) top-brand order — offer ids. */
  order: readonly string[];
  /** Resolves an offer id to the label admins recognise. */
  labelFor: (offerId: string) => string;
};

function SlotChip({
  position,
  label,
  testId,
}: {
  position: number;
  label: string;
  testId: string;
}) {
  return (
    <div
      data-testid={testId}
      className="flex min-w-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs dark:border-gray-700 dark:bg-gray-900"
    >
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        {position}
      </span>
      <span className="truncate text-gray-700 dark:text-gray-200">{label}</span>
    </div>
  );
}

/**
 * Schematic preview of where the current order lands on the customer
 * homepage per device. Layout math mirrors the customer app — see
 * topBrandPreviewLayout.ts for the pinned contract (#378).
 */
export default function TopBrandLandingPreview({
  order,
  labelFor,
}: TopBrandLandingPreviewProps) {
  if (order.length === 0) return null;

  const columns = desktopColumnsPerRow();
  const pages = desktopPreviewPages(order);
  const pageSize = columns * 2;
  const mobileGrid = isMobileStaticGrid(order.length);
  const mobileColumns = mobilePreviewColumns(order);

  return (
    <div
      data-testid="top-brand-landing-preview"
      className="mt-8 space-y-4 border-t border-gray-200 pt-6 dark:border-gray-700"
    >
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Landing preview
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Where the order above (including unsaved changes) lands on the
          customer homepage. Desktop fills each page left to right, top to
          bottom; the phone rail stacks brands in vertical pairs — so the same
          brand sits in a different spot on each device.
        </p>
      </div>

      <div>
        <h4 className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300">
          Desktop — {columns} per row, {pages.length}{" "}
          {pages.length === 1 ? "page" : "pages"}
        </h4>
        <div className="mt-2 space-y-3">
          {pages.map((pageItems, pageIndex) => (
            <div key={`preview-desktop-page-${pageIndex}`}>
              {pages.length > 1 ? (
                <p className="mb-1 text-[10px] text-gray-400 dark:text-gray-500">
                  Page {pageIndex + 1} (swipe {pageIndex === 0 ? "start" : "→"})
                </p>
              ) : null}
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {pageItems.map((offerId, slotIndex) => (
                  <SlotChip
                    key={offerId}
                    position={pageIndex * pageSize + slotIndex + 1}
                    label={labelFor(offerId)}
                    testId={`top-brand-preview-desktop-page-${pageIndex}-slot-${slotIndex}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
          Windows 1,200&nbsp;px and wider fit 6 per row; 1,024–1,199&nbsp;px
          windows fit 4 per row, shifting later positions.
        </p>
      </div>

      <div>
        <h4 className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300">
          {mobileGrid
            ? "Mobile — static 2-column grid (4 or fewer brands)"
            : "Mobile — swipeable rail of vertical pairs"}
        </h4>
        {mobileGrid ? (
          <div className="mt-2 grid max-w-xs grid-cols-2 gap-1.5">
            {order.map((offerId, index) => (
              <SlotChip
                key={offerId}
                position={index + 1}
                label={labelFor(offerId)}
                testId={`top-brand-preview-mobile-grid-slot-${index}`}
              />
            ))}
          </div>
        ) : (
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {mobileColumns.map((columnItems, columnIndex) => (
              <div
                key={`preview-mobile-col-${columnIndex}`}
                className="flex w-36 shrink-0 flex-col gap-1.5"
              >
                {columnItems.map((offerId, rowIndex) => (
                  <SlotChip
                    key={offerId}
                    position={columnIndex * 2 + rowIndex + 1}
                    label={labelFor(offerId)}
                    testId={`top-brand-preview-mobile-col-${columnIndex}-row-${rowIndex}`}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[10px] text-gray-400 dark:text-gray-500">
        Preview shows the full saved list. Brands hidden in a customer&apos;s
        region are skipped there, shifting later brands forward.
      </p>
    </div>
  );
}
