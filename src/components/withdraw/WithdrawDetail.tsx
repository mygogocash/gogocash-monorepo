"use client";
import { fetcherPost } from "@/lib/axios/client";
import type { GridColDef } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ResDataWithdrawsListByUser, ResMCBDetail } from "@/types/withdraw";
import Divider from "@mui/material/Divider";
import { pathImage } from "@/utils/helper";
import ModalWithdraw from "./ModalWithdraw";
import { useState } from "react";
import { WithdrawRequestForm } from "./WithdrawTable";
import { DataWithdrawsList } from "@/types/api";
import CopyButton from "@/components/ui/CopyButton";

const WithdrawDetailDataGrid = dynamic(
  () => import("./WithdrawDetailLazyGrids"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
    ),
  },
);

type DetailTab = "user" | "conversion" | "withdraw" | "login";

const TABS: { id: DetailTab; label: string }[] = [
  { id: "user", label: "User Info" },
  { id: "conversion", label: "Conversion All" },
  { id: "withdraw", label: "Withdraw All" },
  { id: "login", label: "Login Tracking" },
];

const WithdrawDetail = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<DetailTab>("user");
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

  const { data: MCBDetail, refetch: fetchMCBDetail } = useQuery<ResMCBDetail>({
    queryKey: ["MCBDetail", id],
    queryFn: () => fetcherPost(`/withdraw/check-my-cashback-admin/${id}`),
  });
  const column: GridColDef[] = [
    { field: "id", headerName: "ID", width: 40 },
    { field: "conversion_id", headerName: "ID", width: 100 },
    {
      field: "offer_name",
      headerName: "Offer name",
      width: 140,
      renderCell: (params) => (
        <span className="text-gray-800 dark:text-gray-200">
          {params.value ?? "—"}
        </span>
      ),
    },
    {
      field: "adv_sub1",
      headerName: "Description",
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
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/[0.03] sm:p-5">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav
            className="-mb-px flex flex-wrap gap-1 overflow-x-auto sm:gap-2"
            aria-label="Tabs"
          >
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap rounded-t-lg border-b-2 px-4 py-3 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
                    isActive
                      ? "border-blue-600 bg-blue-50/80 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40 dark:hover:text-blue-200"
                      : "border-transparent text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab content */}
        <div className="pt-4">
          {activeTab === "user" && (
            <div className="space-y-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  User Info
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <p className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                    <span className="min-w-[100px] font-medium">User ID:</span>{" "}
                    {withdrawDetail?.user?._id ?? (id as string) ?? "—"}
                    <CopyButton value={withdrawDetail?.user?._id ?? (id as string) ?? ""} />
                  </p>
                  <p className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                    <span className="min-w-[100px] font-medium">Email:</span>{" "}
                    {withdrawDetail?.user?.email ?? "—"}
                    <CopyButton value={withdrawDetail?.user?.email || ""} />
                  </p>
                  <p className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                    <span className="min-w-[100px] font-medium">Mobile:</span>{" "}
                    {withdrawDetail?.user?.mobile ?? "—"}
                    <CopyButton value={withdrawDetail?.user?.mobile || ""} />
                  </p>
                  <p className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                    <span className="min-w-[100px] font-medium">Full name:</span>{" "}
                    {withdrawDetail?.user?.fullName ?? "—"}
                  </p>
                  <p className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                    <span className="min-w-[100px] font-medium">Gender:</span>{" "}
                    {withdrawDetail?.user?.gender ?? "—"}
                  </p>
                  <p className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                    <span className="min-w-[100px] font-medium">Birth date:</span>{" "}
                    {withdrawDetail?.user?.birthdate
                      ? new Date(withdrawDetail.user.birthdate).toLocaleDateString()
                      : "—"}
                  </p>
                  <p className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                    <span className="min-w-[100px] font-medium">Wallet:</span>{" "}
                    {withdrawDetail?.user?.wallet ?? "—"}
                    <CopyButton value={withdrawDetail?.user?.wallet || ""} />
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Bank accounts
                </h3>
                {withdrawDetail?.withdrawList && withdrawDetail.withdrawList.length > 0 ? (
                  <div className="space-y-4">
                    {withdrawDetail.withdrawList.map((bank, idx) => (
                      <div
                        key={bank._id}
                        className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/50"
                      >
                        {withdrawDetail.withdrawList.length > 1 && (
                          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                            Account {idx + 1}
                          </p>
                        )}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <p className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                            <span className="min-w-[120px] font-medium">Bank:</span>{" "}
                            {bank.bank_name || "N/A"}
                            <CopyButton value={bank.bank_name} />
                          </p>
                          <p className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                            <span className="min-w-[120px] font-medium">Account Number:</span>{" "}
                            {bank.account_number || "N/A"}
                            <CopyButton value={bank.account_number} />
                          </p>
                          <p className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                            <span className="min-w-[120px] font-medium">Account Name:</span>{" "}
                            {bank.account_name || "N/A"}
                            <CopyButton value={bank.account_name} />
                          </p>
                          {bank.method && bank.method !== "bank_transfer" && (
                            <p className="flex items-center text-sm text-gray-800 dark:text-gray-200">
                              <span className="min-w-[120px] font-medium">Address:</span>{" "}
                              {bank.address || "N/A"}
                              <CopyButton value={bank.address} />
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No bank accounts</p>
                )}
              </div>

              {withdrawDetail?.user?.userLog && withdrawDetail.user.userLog.length > 0 && (
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    User log
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-100 dark:bg-gray-800">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                            Action
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                            Date and time
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300">
                            IP
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {withdrawDetail.user.userLog.map((entry, i) => (
                          <tr key={i} className="bg-white dark:bg-gray-900/50">
                            <td className="px-3 py-2 text-gray-800 dark:text-gray-200">
                              {entry.action ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                              {entry.at
                                ? new Date(entry.at).toLocaleString()
                                : "—"}
                            </td>
                            <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                              {entry.ip ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Total cashback
                </h3>
                <p className="mb-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                  {withdrawDetail?.user?.totalCashback != null
                    ? `${Number(withdrawDetail.user.totalCashback).toLocaleString()} ${withdrawDetail.user.totalCashbackCurrency ?? "THB"}`
                    : MCBDetail != null
                      ? `${MCBDetail.totalMyCashbackTHB?.toFixed(2) ?? "0"} THB`
                      : "—"}
                </p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span className="text-amber-600 dark:text-amber-400">
                    Pending:{" "}
                    {withdrawDetail?.totalsByStatusAndCurrency
                      ?.find((t) => t.status === "pending")
                      ?.totalTHB?.toFixed(2) ?? "0"}{" "}
                    THB
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Approved:{" "}
                    {withdrawDetail?.totalsByStatusAndCurrency
                      ?.find((t) => t.status === "approved")
                      ?.totalTHB?.toFixed(2) ?? "0"}{" "}
                    THB
                  </span>
                  <span className="text-blue-600 dark:text-blue-400">
                    Withdrawn:{" "}
                    {withdrawDetail?.withdrawList
                      ?.filter((w) => w.status === "approved")
                      .reduce((sum, w) => sum + (w.amount_net ?? 0), 0)
                      .toFixed(2) ?? "0"}{" "}
                    THB
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "conversion" && (
            <>
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                Conversion All
              </h2>
              <WithdrawDetailDataGrid rows={rowsData} columns={column} />
              <div className="mt-4 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                <p>
                  Approved:{" "}
                  {withdrawDetail?.totalsByStatusAndCurrency
                    ?.find((item) => item.status === "approved")
                    ?.totalTHB?.toFixed(2) ?? "0"}{" "}
                  THB
                </p>
                <p>
                  Pending:{" "}
                  {withdrawDetail?.totalsByStatusAndCurrency
                    ?.find((item) => item.status === "pending")
                    ?.totalTHB?.toFixed(2) ?? "0"}{" "}
                  THB
                </p>
                <p>
                  Rejected:{" "}
                  {withdrawDetail?.totalsByStatusAndCurrency
                    ?.find((item) => item.status === "rejected")
                    ?.totalTHB?.toFixed(2) ?? "0"}{" "}
                  THB
                </p>
              </div>
              <Divider className="!my-5 !border-amber-700" />
              <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                MCB Detail
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Total {MCBDetail?.totalMyCashbackTHB?.toFixed(2) ?? "0"} THB
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Available {MCBDetail?.availableTHB?.toFixed(2) ?? "0"} THB
              </p>
            </>
          )}

          {activeTab === "withdraw" && (
            <>
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                Withdraw All
              </h2>
              <WithdrawDetailDataGrid rows={rowsDataWithdraw} columns={columnWithdraw} />
              <div className="mt-4 space-y-1 text-sm text-gray-700 dark:text-gray-300">
                {Object.keys(withdrawDetail?.withdrawSumByCurrency || {}).map(
                  (status) => (
                    <p key={status}>
                      {status}:{" "}
                      {withdrawDetail?.withdrawSumByCurrency?.[status] ? (
                        Object.keys(
                          withdrawDetail.withdrawSumByCurrency[status],
                        ).map((currency) => (
                          <span key={currency}>
                            {`${withdrawDetail.withdrawSumByCurrency?.[status]?.[currency]?.netAmount?.toFixed(2)} ${currency} `}
                          </span>
                        ))
                      ) : (
                        <span>-</span>
                      )}
                    </p>
                  ),
                )}
              </div>
            </>
          )}

          {activeTab === "login" && (
            <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-12 text-center dark:border-gray-600 dark:bg-gray-800/50">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Login tracking data will appear here.
              </p>
              <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                Connect a login/session data source to show history.
              </p>
            </div>
          )}
        </div>
      </div>
      <ModalWithdraw
        openModal={openModal}
        setOpenModal={setOpenModal}
        form={form}
        setForm={setForm}
        fetchData={() => {
          fetchWithdrawDetail();
          fetchMCBDetail();
        }}
      />
    </>
  );
};

export default WithdrawDetail;
