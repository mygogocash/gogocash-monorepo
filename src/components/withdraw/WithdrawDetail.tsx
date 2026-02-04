"use client";
import { fetcherPost } from "@/lib/axios/client";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { paginationModel } from "../offer/Detail";
import { ResDataWithdrawsListByUser } from "@/types/withdraw";
import Divider from "@mui/material/Divider";
import { pathImage } from "@/utils/helper";
import ModalWithdraw from "./ModalWithdraw";
import { useState } from "react";
import { WithdrawRequestForm } from "./WithdrawTable";
import { DataWithdrawsList } from "@/types/api";
export const CSSTable = {
  border: 0,
  "& .MuiSvgIcon-root": { fill: "#00B14F" },
  "& .MuiDataGrid-columnHeader": {
    backgroundColor: "#F6F6F6",
  },
  "& .MuiDataGrid-filler": {
    backgroundColor: "#F6F6F6 !important",
  },
};
const WithdrawDetail = () => {
  const { id } = useParams();
  const [openModal, setOpenModal] = useState<DataWithdrawsList | boolean>(
    false,
  );

  const [form, setForm] = useState<WithdrawRequestForm>({
    file: null,
    id: "",
    status: "",
  });
  const { data: withdrawDetail, refetch: fetchWithdrawDetail } =
    useQuery<ResDataWithdrawsListByUser>({
      queryKey: ["getWithdrawDetail", id],
      queryFn: () => fetcherPost(`/withdraw/list-check-admin/${id}`),
    });
  const column: GridColDef[] = [
    { field: "id", headerName: "ID", width: 40 },
    { field: "conversion_id", headerName: "ID", width: 100 },
    // { field: "withdraw_id", headerName: "Withdraw ID", width: 130 },
    {
      field: "adv_sub1",
      headerName: "Name",
      width: 100,
      renderCell: (params) => {
        return (
          <span>
            {params.value} , {params?.row?.adv_sub2} , {params?.row?.adv_sub3} ,{" "}
            {params?.row?.adv_sub4}
          </span>
        );
      },
    },
    {
      field: "conversion_status",
      headerName: "Status",
      width: 100,
      renderCell: (params) => {
        return (
          <span
            className={`${params.value === "approved" ? "text-green-600" : params.value === "pending" ? "text-yellow-600" : "text-red-600"} `}
          >
            {params.value}
          </span>
        );
      },
    },
    {
      field: "affiliate_remarks",
      headerName: "Affiliate Remarks",
    },
    {
      field: "datetime_conversion",
      headerName: "Date",
      width: 180,
      renderCell: (params) => {
        return <span>{new Date(params.value).toLocaleString()}</span>;
      },
    },

    {
      field: "payout",
      headerName: "Payout",
      width: 130,
      renderCell: (params) => {
        return (
          <span>
            {params.value} {params?.row?.currency}
          </span>
        );
      },
    },
    {
      field: "sale_amount",
      headerName: "Sale Amount",
      width: 130,
      renderCell: (params) => {
        return (
          <span>
            {params.value} {params?.row?.currency}
          </span>
        );
      },
    },
  ];

  const columnWithdraw: GridColDef[] = [
    {
      field: "id",
      headerName: "ID",
      width: 40,
    },

    {
      field: "mycashback_id",
      headerName: "Company",
      width: 60,
      renderCell: (params) => (
        <span>{params?.row?.mycashback_id?.length > 0 ? "GGC" : "MCB"}</span>
      ),
    },
    {
      field: "bank_name",
      headerName: "Bank Name",
      width: 100,
    },
    {
      field: "account_number",
      headerName: "Account Number",
      width: 100,
    },
    {
      field: "account_name",
      headerName: "Account Name",
      width: 100,
    },
    {
      field: "amount_total",
      headerName: "Amount Total",
      width: 130,
      renderCell: (params) => {
        return (
          <span>
            {params.value?.toFixed(2)} {params?.row?.currency}
          </span>
        );
      },
    },
    {
      field: "amount_net",
      headerName: "Amount Net",
      width: 130,
      renderCell: (params) => {
        return (
          <span>
            {params.value?.toFixed(2)} {params?.row?.currency}
          </span>
        );
      },
    },
    {
      field: "method",
      headerName: "Method",
      width: 130,
      renderCell: (params) => {
        return <span>{params.value}</span>;
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 100,
      renderCell: (params) => {
        return (
          <span
            className={`${params.value === "approved" ? "text-green-600" : params.value === "pending" ? "text-yellow-600" : "text-red-600"} `}
          >
            {params.value}
          </span>
        );
      },
    },

    {
      field: "createdAt",
      headerName: "Date",
      width: 180,
      renderCell: (params) => {
        return <span>{new Date(params.value).toLocaleString()}</span>;
      },
    },
    {
      field: "slip_file",
      headerName: "Slip File",
      width: 100,
      renderCell: (params) =>
        params.value ? (
          <a
            href={pathImage(params.value)}
            target="_blank"
            rel="noopener noreferrer"
          >
            View
          </a>
        ) : (
          <span>N/A</span>
        ),
    },
    {
      field: "address",
      headerName: "Address",
      width: 100,
    },
    {
      field: "tx_hash",
      headerName: "Tx Hash",
      width: 180,
    },
    {
      field: "_id",
      headerName: "Action",
      width: 180,
      renderCell: (params) => (
        <button
          onClick={() => {
            setOpenModal(params.row);
            setForm({
              id: params.row._id,
              file: null,
              status: params.row.status,
            });
          }}
          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {params.row.status === "pending" ? "Update" : "View"}
        </button>
      ),
    },
  ];

  const rowsData =
    withdrawDetail?.allConversions?.map((item, index) => {
      return {
        ...item,
        id: index + 1,
      };
    }) || [];

  const rowsDataWithdraw =
    withdrawDetail?.withdrawList?.map((item, index) => {
      return {
        ...item,
        id: index + 1,
      };
    }) || [];

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        USER: {withdrawDetail?.user?.email} <br />
        {withdrawDetail?.user?.mobile}
        {/* {isLoadingWithdrawDetail ? (
          <div>Loading...</div>
        ) : (
          <div className="mt-4">
            <pre className="rounded-lg bg-gray-100 p-4 break-words whitespace-pre-wrap dark:bg-gray-800">
              {JSON.stringify(withdrawDetail, null, 2)}
            </pre>
          </div>
        )} */}
        <h1 className="mt-3 mb-2"> Conversion All</h1>
        <DataGrid
          rows={rowsData}
          columns={column}
          initialState={{ pagination: { paginationModel } }}
          pageSizeOptions={[5, 10]}
          sx={CSSTable}
          // checkboxSelection
        />
        <p>
          Approved:{" "}
          {withdrawDetail?.totalsByStatusAndCurrency
            .find((item) => item.status === "approved")
            ?.totalTHB?.toFixed(2) || 0}{" "}
          THB
        </p>
        <p>
          Pending:{" "}
          {withdrawDetail?.totalsByStatusAndCurrency
            .find((item) => item.status === "pending")
            ?.totalTHB?.toFixed(2) || 0}{" "}
          THB
        </p>
        <p>
          Rejected:{" "}
          {withdrawDetail?.totalsByStatusAndCurrency
            .find((item) => item.status === "rejected")
            ?.totalTHB?.toFixed(2) || 0}{" "}
          THB
        </p>
        <Divider className="!border-amber-700 !py-5" />
        <h1 className="mt-3 mb-2"> Withdraw All</h1>
        <DataGrid
          rows={rowsDataWithdraw}
          columns={columnWithdraw}
          initialState={{ pagination: { paginationModel } }}
          pageSizeOptions={[5, 10]}
          sx={CSSTable}
          // checkboxSelection
        />
        {Object.keys(withdrawDetail?.withdrawSumByCurrency || {}).map(
          (status) => (
            <p key={status}>
              {status}:{" "}
              {withdrawDetail?.withdrawSumByCurrency?.[status] ? (
                Object.keys(
                  withdrawDetail?.withdrawSumByCurrency?.[status],
                ).map((currency) => (
                  <span key={currency}>
                    {`${withdrawDetail?.withdrawSumByCurrency?.[status]?.[currency]?.netAmount?.toFixed(2)} ${currency} `}{" "}
                  </span>
                ))
              ) : (
                <span key={status}>-</span>
              )}
            </p>
          ),
        )}
      </div>
      <ModalWithdraw
        openModal={openModal}
        setOpenModal={setOpenModal}
        form={form}
        setForm={setForm}
        fetchData={fetchWithdrawDetail}
      />
    </>
  );
};

export default WithdrawDetail;
