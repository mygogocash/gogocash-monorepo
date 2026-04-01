"use client";

import { useSearchParams } from "next/navigation";
import ConversionSubNav from "@/components/conversion/ConversionSubNav";
import ConversionTable from "@/components/conversion/ConversionTable";
import CreatedConversionTable from "@/components/conversion/CreatedConversionTable";

export default function ConversionPageClient() {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") === "created" ? "created" : "lists";

  return (
    <div className="min-w-0 space-y-4">
      <ConversionSubNav />
      {activeTab === "lists" && <ConversionTable />}
      {activeTab === "created" && <CreatedConversionTable />}
    </div>
  );
}
