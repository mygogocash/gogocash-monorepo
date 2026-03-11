"use client";

import React from "react";

import { useSession } from "next-auth/react";
import client, { fetcher } from "@/lib/axios/client";
import { useQuery } from "@tanstack/react-query";
import { ResponseQuestCreateForm, ResponseQuestDate } from "@/types/quest";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import FormQuest from "./FormQuest";
import toast from "react-hot-toast";

export default function QuestTable() {
  const { data } = useSession();
  const session = data as { accessToken?: string };
  const [openModal, setOpenModal] = React.useState<boolean | ResponseQuestDate>(
    false,
  );

  const [loadingForm, setLoadingForm] = React.useState<boolean>(false);
  const [form, setForm] = React.useState<ResponseQuestCreateForm>(
    {} as ResponseQuestCreateForm,
  );
  const { data: listQuest, refetch } = useQuery<ResponseQuestDate[]>({
    queryKey: ["listQuest"],
    queryFn: () => fetcher(`/point/admin-get-quest`),
    enabled: !!session?.accessToken,
  });

  const closeQuest = () => {
    client
      .patch(
        `/point/close-quest`,
        { status: "close" },
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        },
      )
      .then(() => {
        toast.success("Close quest successfully");
        refetch();
      })
      .catch((err) => {
        console.log("err", err);
        toast.error("Failed to close quest");
      });
  };

  const column2: GridColDef[] = [
    { field: "id", headerName: "ID", width: 250 },
    {
      field: "start_date",
      headerName: "Start Date",
      width: 130,
      renderCell: (params) => {
        return <p>{new Date(params.value).toLocaleDateString()}</p>;
      },
    },
    {
      field: "end_date",
      headerName: "End Date",
      width: 130,
      renderCell: (params) => {
        return <p>{new Date(params.value).toLocaleDateString()}</p>;
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 100,
    },
    {
      field: "reward_status",
      headerName: "Reward Status",
      width: 100,
    },

    {
      field: "facebook_page",
      headerName: "Facebook Page",
      width: 100,
    },
    {
      field: "facebook_post",
      headerName: "Facebook Post",
      width: 100,
    },
    {
      field: "line",
      headerName: "Line",
      width: 100,
    },
    {
      field: "banner_en",
      headerName: "Banner EN",
      width: 100,
    },
    {
      field: "banner_th",
      headerName: "Banner TH",
      width: 100,
    },
    {
      field: "sub_banner_en",
      headerName: "Sub Banner EN",
      width: 100,
    },
    {
      field: "sub_banner_th",
      headerName: "Sub Banner TH",
      width: 100,
    },
    {
      field: "_id",
      headerName: "Action",
      width: 100,
      renderCell: (params) => {
        const isActive = params.row.status === "open";
        return (
          <>
            {params.row.status === "open" ? (
              <div className="flex h-full items-center justify-center gap-2">
                <button
                  className={`rounded px-2 py-1 text-sm font-medium ${"bg-blue-500 text-white"}`}
                  onClick={() => {
                    // Handle status toggle logic here
                    // You can make an API call to update the status and then refetch the data
                    console.log("Toggle status for ID:", params.row.id);
                    setOpenModal(params.row);
                    setForm({
                      ...params.row,
                      start_date: new Date(params.row.start_date)
                        .toISOString()
                        .split("T")[0],
                      end_date: new Date(params.row.end_date)
                        .toISOString()
                        .split("T")[0],
                    } as ResponseQuestCreateForm);
                  }}
                >
                  Edit
                </button>
                <button
                  className={`rounded px-2 py-1 text-sm font-medium ${
                    isActive
                      ? "bg-red-500 text-white"
                      : "bg-green-500 text-white"
                  }`}
                  onClick={() => {
                    // Handle status toggle logic here
                    // You can make an API call to update the status and then refetch the data
                    console.log("Toggle status for ID:", params.row.id);
                    closeQuest();
                  }}
                >
                  close
                </button>
              </div>
            ) : (
              "closed"
            )}
          </>
        );
      },
    },
  ];

  const [paginationModel] = React.useState({
    page: 0,
    pageSize: 5,
  });
  return (
    <div className="max-w-[1160px] rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Lists
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {listQuest?.length || 0}
          </p>
        </div>
        <div>
          <button
            className={`rounded px-2 py-1 text-sm font-medium ${"bg-blue-500 text-white"}`}
            onClick={() => {
              setOpenModal(true);
              setForm({} as ResponseQuestCreateForm);
            }}
          >
            Create Quest
          </button>
        </div>
      </div>
      <FormQuest
        fetchData={refetch}
        openModal={openModal}
        setOpenModal={setOpenModal}
        form={form}
        setForm={setForm}
        isLoading={loadingForm}
        setIsLoading={setLoadingForm}
      />
      <DataGrid
        rows={
          listQuest?.map((item) => ({
            ...item,
            id: item._id,
            status: item.status,
          })) || []
        }
        columns={column2}
        initialState={{ pagination: { paginationModel } }}
        pageSizeOptions={[5, 10]}
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
