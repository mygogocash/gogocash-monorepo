"use client";

import type { QuestTaskType } from "@/types/quest";

const TASK_TYPE_OPTIONS: Array<{ value: QuestTaskType; label: string }> = [
  { value: "friend_referral", label: "Friend referral" },
  { value: "spend_target", label: "Reach spend amount" },
  { value: "brand_purchase", label: "Push on brand" },
];

export function QuestTaskTypeSelect({
  id,
  value,
  disabled = false,
  onChange,
}: {
  id: string;
  value: QuestTaskType | null;
  disabled?: boolean;
  onChange: (value: QuestTaskType) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-gray-500 dark:text-gray-400"
      >
        Task type
      </label>
      <select
        id={id}
        aria-label="Task type"
        value={value ?? ""}
        disabled={disabled}
        onChange={(event) => {
          if (event.currentTarget.value) {
            onChange(event.currentTarget.value as QuestTaskType);
          }
        }}
        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
      >
        <option value="">Choose task type</option>
        {TASK_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
