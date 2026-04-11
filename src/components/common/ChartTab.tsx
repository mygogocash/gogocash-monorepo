import React, { useState } from "react";

const TABS = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Monthly" },
  { id: "quarter", label: "Quarterly" },
  { id: "year", label: "Annually" },
] as const;

export type ChartTabId = (typeof TABS)[number]["id"];

type ChartTabProps = {
  /** Controlled selected tab */
  value?: ChartTabId;
  /** Used when uncontrolled */
  defaultValue?: ChartTabId;
  onChange?: (id: ChartTabId) => void;
};

const ChartTab: React.FC<ChartTabProps> = ({
  value,
  defaultValue = "month",
  onChange,
}) => {
  const [internal, setInternal] = useState<ChartTabId>(defaultValue);
  const selected = value !== undefined ? value : internal;

  const setSelected = (id: ChartTabId) => {
    if (value === undefined) {
      setInternal(id);
    }
    onChange?.(id);
  };

  return (
    <div className="flex w-full min-w-0 max-w-full flex-wrap items-center justify-start gap-0.5 rounded-lg bg-gray-100 p-0.5 sm:w-auto sm:justify-end dark:bg-gray-900">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setSelected(tab.id)}
          className={`min-h-10 rounded-md px-2 py-2 text-theme-sm font-medium whitespace-nowrap transition-all duration-200 ease-out active:scale-[0.97] sm:min-h-0 sm:px-3 ${
            selected === tab.id
              ? "bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white"
              : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default ChartTab;
