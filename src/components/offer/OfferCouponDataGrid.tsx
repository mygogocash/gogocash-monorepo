"use client";

import { useMemo } from "react";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import type { CouponData } from "@/types/coupon";
import { paginationModel } from "./muiGridShared";

/** Row shape passed to parent when editing (matches prior DataGrid `params.row`). */
export type OfferCouponGridRow = {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  code: string;
  offer_id: CouponData["offer_id"];
  eligibility: string;
  min_spend: string;
  discount: number;
  disabled: boolean;
  link: string;
  _id: string;
};

type Props = {
  couponDetail: CouponData[] | undefined;
  onEditRow: (row: OfferCouponGridRow) => void;
};

export default function OfferCouponDataGrid({ couponDetail, onEditRow }: Props) {
  const columns = useMemo<GridColDef[]>(
    () => [
      { field: "id", headerName: "ID", width: 200 },
      { field: "name", headerName: "Name", width: 100 },
      { field: "code", headerName: "Code", width: 100 },
      { field: "link", headerName: "Link", width: 100 },
      { field: "description", headerName: "Description", width: 100 },
      { field: "start_date", headerName: "Start Date", width: 100 },
      { field: "end_date", headerName: "End Date", width: 100 },
      { field: "min_spend", headerName: "Min Spend", width: 100 },
      { field: "eligibility", headerName: "Eligibility", width: 100 },
      { field: "discount", headerName: "Discount", width: 100 },
      {
        field: "action",
        headerName: "Action",
        width: 100,
        renderCell: (params) => (
          <button
            type="button"
            onClick={() => onEditRow(params.row as OfferCouponGridRow)}
            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
          >
            Edit
          </button>
        ),
      },
    ],
    [onEditRow],
  );

  const rows = useMemo(
    () =>
      couponDetail?.map((coupon) => ({
        id: coupon._id,
        name: coupon.name,
        description: coupon.description,
        start_date: coupon.start_date,
        end_date: coupon.end_date,
        code: coupon.code,
        offer_id: coupon.offer_id,
        eligibility: coupon.eligibility,
        min_spend: coupon.min_spend,
        discount: coupon.discount,
        disabled: coupon.disabled,
        link: coupon.link,
        _id: coupon._id,
      })) ?? [],
    [couponDetail],
  );

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      initialState={{ pagination: { paginationModel } }}
      pageSizeOptions={[5, 10]}
      sx={{
        border: 0,
        "& .MuiSvgIcon-root": { fill: "#00B14F" },
        "& .MuiDataGrid-columnHeader": {
          backgroundColor: "#F6F6F6",
        },
        "& .MuiDataGrid-filler": {
          backgroundColor: "#F6F6F6 !important",
        },
      }}
    />
  );
}
