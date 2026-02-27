"use client";

import React from "react";

import { useSession } from "next-auth/react";
import { fetcher } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { ResponseDeeplink } from "@/types/deeplink";

export default function DeeplinkTable() {
  const { data } = useSession();
  const session = data as { accessToken?: string };

  const { data: list } = useQuery<ResponseDeeplink[]>({
    queryKey: ["listDeeplink"],
    queryFn: () => fetcher(`/admin/get-deep-link-list`),
    enabled: !!session?.accessToken,
  });

  const column2: GridColDef[] = [
    {
      field: "user_id",
      headerName: "USER ID",
      width: 250,
      renderCell: (params) => {
        return (
          <div>
            <p>{params.value}</p>
          </div>
        );
      },
    },
    {
      field: "email",
      headerName: "EMAIL",
      width: 200,
    },
    {
      field: "offer_name",
      headerName: "Offer Name",
      width: 150,
      renderCell: (params) => {
        return (
          <div>
            <p>{params.value}</p>
          </div>
        );
      },
    },
    {
      field: "deeplink",
      headerName: "Deeplink",
      width: 200,
    },
    {
      field: "createdAt",
      headerName: "Create Date",
      width: 150,
      renderCell: (params) => {
        return (
          <p>
            {new Date(params.value).toLocaleDateString() +
              ":" +
              new Date(params.value).toLocaleTimeString()}
          </p>
        );
      },
    },
    {
      field: "updatedAt",
      headerName: "Update Date",
      width: 150,
      renderCell: (params) => {
        return (
          <p>
            {new Date(params.value).toLocaleDateString() +
              ":" +
              new Date(params.value).toLocaleTimeString()}
          </p>
        );
      },
    },
  ];

  const [paginationModel] = React.useState({
    page: 0,
    pageSize: 10,
  });
  return (
    <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Lists
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {list?.length || 0}
          </p>
        </div>
      </div>

      <DataGrid
        rows={
          list?.map((item) => ({
            ...item,
            id: item._id,
            offer_name:
              item.offer?.offer_name_display || item.offer?.offer_name,
            email: item.user?.email || "",
          })) || []
        }
        columns={column2}
        initialState={{ pagination: { paginationModel } }}
        pageSizeOptions={[5, 10, 15, 20]}
        // checkboxSelection
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
    </div>
  );
}
