import { useCallback, useState, type DragEvent } from "react";
import {
  desktopColumnsPerRow,
  desktopPreviewPages,
  isMobileStaticGrid,
  mobilePreviewColumns,
} from "@/lib/topBrandPreviewLayout";

const DND_INDEX_KEY = "application/gogocash-top-brand-index";

type TopBrandLandingPreviewProps = {
  /** Desktop homepage order (possibly unsaved) — offer ids. */
  orderDesktop: readonly string[];
  /** Mobile homepage order (possibly unsaved) — offer ids. */
  orderMobile: readonly string[];
  /** Resolves an offer id to the label admins recognise. */
  labelFor: (offerId: string) => string;
  /** When true, chips are drag-reorderable and removable (#476). */
  canEdit?: boolean;
  onReorder?: (
    device: "desktop" | "mobile",
    fromIndex: number,
    toIndex: number,
  ) => void;
  onRemove?: (offerId: string) => void;
};

function SlotChip({
  position,
  label,
  testId,
  canEdit,
  isDragging,
  isDropTarget,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onRemove,
}: {
  position: number;
  label: string;
  testId: string;
  canEdit: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  onDragStart?: (e: DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: DragEvent) => void;
  onDragLeave?: (e: DragEvent) => void;
  onDrop?: (e: DragEvent) => void;
  onRemove?: () => void;
}) {
  return (
    <div
      data-testid={testId}
      draggable={canEdit}
      aria-grabbed={canEdit && isDragging ? true : undefined}
      onDragStart={canEdit ? onDragStart : undefined}
      onDragEnd={canEdit ? onDragEnd : undefined}
      onDragOver={canEdit ? onDragOver : undefined}
      onDragLeave={canEdit ? onDragLeave : undefined}
      onDrop={canEdit ? onDrop : undefined}
      className={`flex min-w-0 items-center gap-1.5 rounded-lg border bg-white px-2 py-1.5 text-xs transition-[opacity,box-shadow] dark:bg-gray-900 ${
        isDragging
          ? "cursor-grabbing border-gray-200 opacity-60 dark:border-gray-700"
          : canEdit
            ? "cursor-grab border-gray-200 dark:border-gray-700"
            : "border-gray-200 dark:border-gray-700"
      } ${
        isDropTarget
          ? "border-brand-400 ring-brand-400/40 dark:border-brand-500 ring-2"
          : ""
      }`}
    >
      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        {position}
      </span>
      <span className="min-w-0 flex-1 truncate text-gray-700 dark:text-gray-200">
        {label}
      </span>
      {canEdit && onRemove ? (
        <button
          type="button"
          title="Remove from both device lists"
          draggable={false}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 rounded px-1 text-[10px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}

/**
 * Schematic preview of where each device order lands on the customer
 * homepage. Layout math mirrors the customer app — see
 * topBrandPreviewLayout.ts for the pinned contract (#378).
 *
 * #476 — when `canEdit`, this preview is the reorder surface (drag chips);
 * the duplicate Desktop/Mobile order lists are removed from the panel.
 */
export default function TopBrandLandingPreview({
  orderDesktop,
  orderMobile,
  labelFor,
  canEdit = false,
  onReorder,
  onRemove,
}: TopBrandLandingPreviewProps) {
  const [draggingDevice, setDraggingDevice] = useState<
    "desktop" | "mobile" | null
  >(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback(
    (e: DragEvent, device: "desktop" | "mobile", index: number) => {
      setDraggingDevice(device);
      setDraggingIndex(index);
      e.dataTransfer.setData(DND_INDEX_KEY, `${device}:${index}`);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", `${device}:${index}`);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingDevice(null);
    setDraggingIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex((prev) => (prev === index ? prev : index));
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    const related = e.relatedTarget as Node | null;
    if (related && (e.currentTarget as HTMLElement).contains(related)) return;
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, device: "desktop" | "mobile", dropIndex: number) => {
      e.preventDefault();
      const raw =
        e.dataTransfer.getData(DND_INDEX_KEY) ||
        e.dataTransfer.getData("text/plain");
      const [rawDevice, rawFrom] = raw.split(":");
      const from = parseInt(rawFrom, 10);
      setDraggingDevice(null);
      setDraggingIndex(null);
      setDragOverIndex(null);
      if (rawDevice !== device || Number.isNaN(from)) return;
      onReorder?.(device, from, dropIndex);
    },
    [onReorder],
  );

  const columns = desktopColumnsPerRow();
  const pages = desktopPreviewPages(orderDesktop);
  const pageSize = columns * 2;
  const mobileGrid = isMobileStaticGrid(orderMobile.length);
  const mobileColumns = mobilePreviewColumns(orderMobile);

  const chipProps = (device: "desktop" | "mobile", index: number) => ({
    canEdit,
    isDragging: draggingDevice === device && draggingIndex === index,
    isDropTarget:
      draggingDevice === device &&
      dragOverIndex === index &&
      draggingIndex !== null &&
      draggingIndex !== index,
    onDragStart: (e: DragEvent) => handleDragStart(e, device, index),
    onDragEnd: handleDragEnd,
    onDragOver: (e: DragEvent) => handleDragOver(e, index),
    onDragLeave: handleDragLeave,
    onDrop: (e: DragEvent) => handleDrop(e, device, index),
  });

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
          {canEdit
            ? "Drag chips to reorder each device independently. Remove drops the brand from both desktop and mobile."
            : "Where each device order (including unsaved changes) lands on the customer homepage. Desktop and mobile can diverge after Phase 2."}
        </p>
      </div>

      <div>
        <h4 className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300">
          Desktop — {columns} per row, {pages.length || 1}{" "}
          {(pages.length || 1) === 1 ? "page" : "pages"}
        </h4>
        {orderDesktop.length === 0 ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            No desktop brands yet. Use the form above to add offers.
          </p>
        ) : (
          <div className="mt-2 space-y-3">
            {pages.map((pageItems, pageIndex) => (
              <div key={`preview-desktop-page-${pageIndex}`}>
                {pages.length > 1 ? (
                  <p className="mb-1 text-[10px] text-gray-400 dark:text-gray-500">
                    Page {pageIndex + 1} (swipe{" "}
                    {pageIndex === 0 ? "start" : "→"})
                  </p>
                ) : null}
                <div
                  className="grid gap-1.5"
                  style={{
                    gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  }}
                >
                  {pageItems.map((offerId, slotIndex) => {
                    const index = pageIndex * pageSize + slotIndex;
                    return (
                      <SlotChip
                        key={offerId}
                        position={index + 1}
                        label={labelFor(offerId)}
                        testId={`top-brand-preview-desktop-page-${pageIndex}-slot-${slotIndex}`}
                        {...chipProps("desktop", index)}
                        onRemove={
                          canEdit && onRemove
                            ? () => onRemove(offerId)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">
          Windows 1,200&nbsp;px and wider fit 6 per row; 1,024–1,199&nbsp;px
          windows fit 4 per row, shifting later positions.
        </p>
      </div>

      <div>
        <h4 className="text-xs font-semibold tracking-wide text-gray-600 uppercase dark:text-gray-300">
          {orderMobile.length === 0
            ? "Mobile"
            : mobileGrid
              ? "Mobile — static 2-column grid (4 or fewer brands)"
              : "Mobile — swipeable rail of vertical pairs"}
        </h4>
        {orderMobile.length === 0 ? (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            No mobile brands yet. Use the form above to add offers.
          </p>
        ) : mobileGrid ? (
          <div className="mt-2 grid max-w-xs grid-cols-2 gap-1.5">
            {orderMobile.map((offerId, index) => (
              <SlotChip
                key={offerId}
                position={index + 1}
                label={labelFor(offerId)}
                testId={`top-brand-preview-mobile-grid-slot-${index}`}
                {...chipProps("mobile", index)}
                onRemove={
                  canEdit && onRemove ? () => onRemove(offerId) : undefined
                }
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
                {columnItems.map((offerId, rowIndex) => {
                  const index = columnIndex * 2 + rowIndex;
                  return (
                    <SlotChip
                      key={offerId}
                      position={index + 1}
                      label={labelFor(offerId)}
                      testId={`top-brand-preview-mobile-col-${columnIndex}-row-${rowIndex}`}
                      {...chipProps("mobile", index)}
                      onRemove={
                        canEdit && onRemove
                          ? () => onRemove(offerId)
                          : undefined
                      }
                    />
                  );
                })}
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
