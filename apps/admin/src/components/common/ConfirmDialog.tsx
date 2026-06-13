"use client";

import { Modal } from "@/components/ui/modal";

type ConfirmDialogProps = {
  /** Whether the dialog is visible. */
  isOpen: boolean;
  /** Main question, e.g. "Are you sure to remove this item?". */
  title: string;
  /** Optional supporting line, e.g. "You cannot undo this action later". */
  description?: string;
  /** Confirm button text (defaults to "Confirm"). */
  confirmLabel?: string;
  /** Cancel button text (defaults to "Cancel"). */
  cancelLabel?: string;
  /** Visual tone of the confirm button. Destructive actions use "danger". */
  tone?: "danger" | "default";
  /** When true, both actions are disabled (e.g. a request is in flight). */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Reusable confirmation dialog. Mirrors the styled confirm modal used on the
 * Admin Users page so destructive actions share one look. Prefer this over
 * `window.confirm` for anything that needs a title + supporting line.
 */
export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirmClasses =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600"
      : "bg-brand-500 text-white hover:bg-brand-600";

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (!busy) onCancel();
      }}
      showCloseButton={false}
      className="max-w-md p-6"
    >
      <div className="text-center sm:text-left">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        {description ? (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 ${confirmClasses}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
