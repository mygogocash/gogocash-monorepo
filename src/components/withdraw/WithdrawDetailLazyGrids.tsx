"use client";

import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { paginationModel } from "@/components/offer/muiGridShared";
import { getWithdrawDetailDataGridSx } from "./withdrawDataGridSx";

export type WithdrawDetailGridProps = {
  rows: Record<string, unknown>[];
  columns: GridColDef[];
};

function rowIdFromWithdrawGridRow(row: Record<string, unknown>): string {
  const id = row._id;
  if (typeof id === "string" && id.length > 0) return id;
  const conv = row.conversion_id;
  const offer = row.offer_id;
  if (typeof conv === "number") {
    return `conversion-${conv}-${typeof offer === "number" ? offer : "na"}`;
  }
  return "withdraw-detail-row";
}

export default function WithdrawDetailDataGrid({ rows, columns }: WithdrawDetailGridProps) {
  return (
    <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <DataGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => rowIdFromWithdrawGridRow(row as Record<string, unknown>)}
        initialState={{ pagination: { paginationModel } }}
        pageSizeOptions={[5, 10]}
        sx={(muiTheme) => getWithdrawDetailDataGridSx(muiTheme)}
      />
    </div>
  );
}
