"use client";

import MissingOrdersPage from "@/features/missing-orders/MissingOrdersPage";

export default function PageClient() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <MissingOrdersPage />
    </div>
  );
}
