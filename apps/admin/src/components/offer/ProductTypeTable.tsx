"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { OfferProductTypeEntry } from "@/types/api";
import { SUPPORT_BUTTON_CLASS } from "../ui/button/SupportButton";

const ACTION_BUTTON_CLASS = `${SUPPORT_BUTTON_CLASS} gap-1 disabled:cursor-not-allowed disabled:opacity-50`;

interface ProductTypeTableProps {
  /** Heading shown above the table. */
  title: string;
  rows: OfferProductTypeEntry[];
  /** Row index the parent is currently editing in its draft (shows "Editing…", locks actions). */
  editingIndex: number | null;
  disabled?: boolean;
  onReorder: (from: number, to: number) => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

/**
 * Committed product-type / upsize lines as a sortable table — drag the handle to
 * reorder, an Action menu re-loads the parent's draft (Edit) or removes the row
 * (Delete). Shared by the Cashback "Added product type list" and the Upsize
 * "Added upsize lines" so both stay in sync. Renders nothing when there are no
 * rows. The action menu is portalled to <body> and closes on outside click /
 * Escape / scroll / resize.
 */
export default function ProductTypeTable({
  title,
  rows,
  editingIndex,
  disabled,
  onReorder,
  onEdit,
  onDelete,
}: ProductTypeTableProps) {
  const [dragSrcIndex, setDragSrcIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [openActionIdx, setOpenActionIdx] = useState<number | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (openActionIdx === null) return;
    const close = () => {
      setOpenActionIdx(null);
      setMenuAnchor(null);
    };
    const handleClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (actionsRef.current?.contains(t) || menuRef.current?.contains(t))
        return;
      close();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKey);
    // The menu is position:fixed, so any scroll/resize would detach it — close instead.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openActionIdx]);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-2">
      <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
        {title}
      </h5>
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th scope="col" className="w-8 px-2 py-2.5">
                <span className="sr-only">Reorder</span>
              </th>
              <th
                scope="col"
                className="px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
              >
                Name
              </th>
              <th
                scope="col"
                className="w-32 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
              >
                Pay in
              </th>
              <th
                scope="col"
                className="w-32 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
              >
                Value
              </th>
              <th
                scope="col"
                className="w-32 px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {rows.map((row, i) => {
              const isCash = row.pay_in === "cash";
              const value = isCash
                ? row.amount != null
                  ? `${row.amount} ${row.currency || ""}`.trim()
                  : "—"
                : row.commission_info
                  ? `${row.commission_info}%`
                  : "—";
              const isEditingThisRow = editingIndex === i;
              const editLocked = editingIndex !== null;
              const isDragSource = dragSrcIndex === i;
              const isDragTarget =
                dragSrcIndex !== null &&
                dragOverIndex === i &&
                dragSrcIndex !== i;
              return (
                <tr
                  key={i}
                  onDragOver={(e) => {
                    if (dragSrcIndex === null) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverIndex !== i) setDragOverIndex(i);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragSrcIndex !== null && dragSrcIndex !== i)
                      onReorder(dragSrcIndex, i);
                    setDragSrcIndex(null);
                    setDragOverIndex(null);
                  }}
                  className={`transition-colors ${
                    isEditingThisRow
                      ? "bg-brand-50 dark:bg-brand-500/10"
                      : isDragSource
                        ? "opacity-50"
                        : isDragTarget
                          ? "bg-brand-50 dark:bg-brand-500/10"
                          : row.is_tagline
                            ? "bg-gray-100/70 dark:bg-gray-800/60"
                            : "bg-white dark:bg-gray-900"
                  }`}
                >
                  <td className="px-2 py-2.5 text-center align-middle">
                    <button
                      type="button"
                      aria-label={`Drag to reorder ${row.name || "row"}`}
                      title="Drag to reorder"
                      draggable={!editLocked && !disabled}
                      onDragStart={(e) => {
                        setDragSrcIndex(i);
                        setOpenActionIdx(null);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(i));
                      }}
                      onDragEnd={() => {
                        setDragSrcIndex(null);
                        setDragOverIndex(null);
                      }}
                      disabled={disabled || editLocked}
                      className="cursor-grab px-1 leading-none text-gray-500 select-none hover:text-gray-700 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <span aria-hidden>⋮⋮</span>
                    </button>
                  </td>
                  {row.is_tagline ? (
                    <td
                      colSpan={3}
                      className="px-4 py-2.5 text-sm font-semibold tracking-wide text-gray-700 uppercase dark:text-gray-200"
                    >
                      <span
                        aria-hidden
                        className="mr-2 text-gray-400 dark:text-gray-500"
                      >
                        #
                      </span>
                      {row.name || "—"}
                    </td>
                  ) : (
                    <>
                      <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-100">
                        {row.name || "—"}
                        {row.description?.trim() ? (
                          <p className="mt-0.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                            {row.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="w-32 px-4 py-2.5">
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                          {isCash ? "Cash" : "Cashback %"}
                        </span>
                      </td>
                      <td className="w-32 px-4 py-2.5 text-gray-700 dark:text-gray-300">
                        {value}
                      </td>
                    </>
                  )}
                  <td className="relative w-32 px-4 py-2.5 text-left">
                    {isEditingThisRow ? (
                      <span className="bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium">
                        Editing…
                      </span>
                    ) : (
                      <div
                        ref={openActionIdx === i ? actionsRef : undefined}
                        className="relative inline-block text-left"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            if (openActionIdx === i) {
                              setOpenActionIdx(null);
                              setMenuAnchor(null);
                              return;
                            }
                            const r = e.currentTarget.getBoundingClientRect();
                            setMenuAnchor({
                              top: r.bottom + 4,
                              right: window.innerWidth - r.right,
                            });
                            setOpenActionIdx(i);
                          }}
                          disabled={disabled || editLocked}
                          aria-expanded={openActionIdx === i}
                          aria-haspopup="menu"
                          className={ACTION_BUTTON_CLASS}
                        >
                          Action
                          <svg
                            className="h-4 w-4 shrink-0 text-gray-500 dark:text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </button>
                        {openActionIdx === i &&
                          menuAnchor &&
                          createPortal(
                            <div
                              ref={menuRef}
                              style={{
                                position: "fixed",
                                top: menuAnchor.top,
                                right: menuAnchor.right,
                                zIndex: 100002,
                              }}
                              className="min-w-[8rem] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
                              role="menu"
                            >
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenActionIdx(null);
                                  setMenuAnchor(null);
                                  onEdit(i);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  setOpenActionIdx(null);
                                  setMenuAnchor(null);
                                  onDelete(i);
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                              >
                                Delete
                              </button>
                            </div>,
                            document.body,
                          )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
