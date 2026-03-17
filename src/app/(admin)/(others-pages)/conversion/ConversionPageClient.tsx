"use client";

import React, { useState } from "react";
import ConversionTable from "@/components/conversion/ConversionTable";
import CreatedConversionTable from "@/components/conversion/CreatedConversionTable";

type TabId = "lists" | "created";

const TABS: { id: TabId; label: string }[] = [
  { id: "lists", label: "Conversion Lists" },
  { id: "created", label: "Created Conversion" },
];

export default function ConversionPageClient() {
  const [activeTab, setActiveTab] = useState<TabId>("lists");

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400"
                : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "lists" && <ConversionTable />}
      {activeTab === "created" && <CreatedConversionTable />}
    </div>
  );
}
