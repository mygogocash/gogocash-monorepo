"use client";

import { useState } from "react";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import { paginationModel as defaultPaginationModel } from "@/components/offer/muiGridShared";
import { AdminPaginationBar } from "@/components/common/AdminPaginationBar";
import { getWithdrawDetailDataGridSx } from "./withdrawDataGridSx";

export type WithdrawDetailGridProps = {
  rows: Record<string, unknown>[];
  columns: GridColDef[];
  /** Override the fixed row height (px). Omit to use the MUI default (52). */
  rowHeight?: number;
  /**
   * When provided, the footer shows a page-size ("rolls") dropdown with these
   * options (and the grid accepts them). Omit to keep a fixed page size of 5.
   */
  pageSizeOptions?: number[];
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

export default function WithdrawDetailDataGrid({
  rows,
  columns,
  rowHeight,
  pageSizeOptions,
}: WithdrawDetailGridProps) {
  // Controlled pagination so the footer can be the shared AdminPaginationBar
  // (the same Previous / page / Next control used by the Users, Membership,
  // and other admin tables) instead of MUI's default TablePagination.
  const [pagination, setPagination] = useState<GridPaginationModel>(
    defaultPaginationModel,
  );
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize));
  // Clamp to a valid page (derived during render — no effect) so the footer
  // never shows an out-of-range page after the row set shrinks.
  const page = Math.min(pagination.page, totalPages - 1);

  return (
    <>
      <div className="-mx-4 w-full min-w-0 overflow-x-auto overscroll-x-contain px-4 [-webkit-overflow-scrolling:touch] sm:mx-0 sm:px-0">
        <DataGrid
          rows={rows}
          columns={columns}
          rowHeight={rowHeight}
          getRowId={(row) =>
            rowIdFromWithdrawGridRow(row as Record<string, unknown>)
          }
          paginationModel={{ page, pageSize: pagination.pageSize }}
          onPaginationModelChange={setPagination}
          pageSizeOptions={pageSizeOptions ?? [5, 10]}
          hideFooter
          sx={(muiTheme) => getWithdrawDetailDataGridSx(muiTheme)}
        />
      </div>
      {total > 0 && (
        <AdminPaginationBar
          page={page + 1}
          totalPages={totalPages}
          total={total}
          limit={pagination.pageSize}
          onPageChange={(p) =>
            setPagination((prev) => ({ ...prev, page: p - 1 }))
          }
          onPageSizeChange={
            pageSizeOptions
              ? (size) => setPagination({ page: 0, pageSize: size })
              : undefined
          }
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </>
  );
}
