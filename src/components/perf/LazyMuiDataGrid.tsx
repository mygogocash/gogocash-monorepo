"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * Code-splits @mui/x-data-grid (~large). `dynamic()` loses row generics — typed loosely at boundaries.
 */
export const LazyDataGrid = dynamic(
  () => import("@mui/x-data-grid").then((mod) => mod.DataGrid),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[240px] w-full animate-pulse rounded-lg bg-[#f6f6f6]" aria-hidden />
    ),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MUI DataGrid row generic is lost through next/dynamic
) as ComponentType<any>;

export type { GridColDef } from "@mui/x-data-grid";
