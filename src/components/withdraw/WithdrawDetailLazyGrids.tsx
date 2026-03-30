"use client";

import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import { paginationModel } from "@/components/offer/muiGridShared";
import { getWithdrawDetailDataGridSx } from "./withdrawDataGridSx";

export type WithdrawDetailGridProps = {
  rows: { id: number }[];
  columns: GridColDef[];
};

export default function WithdrawDetailDataGrid({ rows, columns }: WithdrawDetailGridProps) {
  return (
    <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <DataGrid
        rows={rows}
        columns={columns}
        initialState={{ pagination: { paginationModel } }}
        pageSizeOptions={[5, 10]}
        sx={(muiTheme) => getWithdrawDetailDataGridSx(muiTheme)}
      />
    </div>
  );
}
