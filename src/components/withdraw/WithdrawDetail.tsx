"use client";
import Link from "next/link";
import client, { fetcherPost } from "@/lib/axios/client";
import type { GridColDef } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ResDataWithdrawsListByUser, ResMCBDetail } from "@/types/withdraw";
import Divider from "@mui/material/Divider";
import { pathImage } from "@/utils/helper";
import ModalWithdraw from "./ModalWithdraw";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { MOCK_DEEPLINKS, filterDeeplinksForUser } from "@/data/mockDeeplinks";
import {
  normalizeUserEmails,
  normalizeUserMobiles,
} from "@/lib/userContact";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { shouldShowMockOtpHint } from "@/lib/mockOtpHint";
import { updateWithdrawUserProfile } from "@/lib/api/withdrawUserContactApi";
import WithdrawUserContactEditor, {
  withdrawUserContactsReady,
} from "@/components/withdraw/WithdrawUserContactEditor";
import {
  createContactRow,
  ensureUserContactRows,
  emptyWithdrawUserEditDraft,
  type WithdrawUserEditDraft,
} from "@/lib/withdrawUserContactState";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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

type DetailTab = "user" | "conversion" | "withdraw" | "deeplink" | "login";

const TABS: { id: DetailTab; label: string }[] = [
  { id: "user", label: "User Info" },
  { id: "conversion", label: "Conversion All" },
  { id: "withdraw", label: "Withdraw All" },
  { id: "deeplink", label: "Deeplinks" },
  { id: "login", label: "Login Tracking" },
];

const WithdrawDetail = () => {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const editUserFromQuery = searchParams.get("editUser") === "1";
  const openedEditFromQueryRef = useRef(false);
  const [activeTab, setActiveTab] = useState<DetailTab>("user");
  const [openModal, setOpenModal] = useState<DataWithdrawsList | boolean>(
    false,
  );

  const [form, setForm] = useState<WithdrawRequestForm>({
    file: null,
    id: "",
    status: "",
  });

  const [editingUser, setEditingUser] = useState(false);
  const [savingUser, setSavingUser] = useState(false);
  const [userSaveError, setUserSaveError] = useState<string | null>(null);
  const [userDraft, setUserDraft] = useState<WithdrawUserEditDraft>(() =>
    emptyWithdrawUserEditDraft(),
  );

  const showMockOtpHint = useMemo(() => shouldShowMockOtpHint(), []);

  const initialEmailsRef = useRef<Set<string>>(new Set());
  const initialMobilesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setUserDraft((d) => {
      const emailsOk =
        Array.isArray(d.emailRows) &&
        d.emailRows.length > 0 &&
        typeof d.emailRows[0] === "object" &&
        d.emailRows[0] !== null &&
        "clientId" in d.emailRows[0];
      const mobilesOk =
        Array.isArray(d.mobileRows) &&
        d.mobileRows.length > 0 &&
        typeof d.mobileRows[0] === "object" &&
        d.mobileRows[0] !== null &&
        "clientId" in d.mobileRows[0];
      if (emailsOk && mobilesOk) return d;
      return {
        ...d,
        emailRows: emailsOk ? d.emailRows : [createContactRow("")],
        mobileRows: mobilesOk ? d.mobileRows : [createContactRow("")],
      };
    });
  }, []);

  const { data: withdrawDetail, refetch: fetchWithdrawDetail } =
    useQuery<ResDataWithdrawsListByUser>({
      queryKey: ["getWithdrawDetail", id],
      queryFn: () => fetcherPost(`/withdraw/list-check-admin/${id}`),
    });

  const { data: MCBDetail, refetch: fetchMCBDetail } = useQuery<ResMCBDetail>({
    queryKey: ["MCBDetail", id],
    queryFn: () => fetcherPost(`/withdraw/check-my-cashback-admin/${id}`),
  });

  const column = useMemo<GridColDef[]>(
    () => [
    { field: "rowIndex", headerName: "#", width: 44, sortable: false },
    { field: "conversion_id", headerName: "Conversion ID", width: 120 },
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
  ],
    [],
  );

  const columnWithdraw = useMemo<GridColDef[]>(
    () => [
    { field: "rowIndex", headerName: "#", width: 44, sortable: false },

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
  ],
    [],
  );

  const rowsData =
    withdrawDetail?.allConversions?.map((item, index) => ({
      ...item,
      rowIndex: index + 1,
    })) || [];

  const rowsDataWithdraw =
    withdrawDetail?.withdrawList?.map((item, index) => ({
      ...item,
      rowIndex: index + 1,
    })) || [];

  const userDeeplinks = useMemo(() => {
    const uid = withdrawDetail?.user?._id ?? (typeof id === "string" ? id : "");
    const emails = normalizeUserEmails(withdrawDetail?.user);
    return filterDeeplinksForUser(MOCK_DEEPLINKS, uid, emails);
  }, [withdrawDetail?.user, id]);

  const viewEmails = useMemo(
    () => normalizeUserEmails(withdrawDetail?.user),
    [withdrawDetail?.user],
  );
  const viewMobiles = useMemo(
    () => normalizeUserMobiles(withdrawDetail?.user),
    [withdrawDetail?.user],
  );

  const withdrawUserId =
    withdrawDetail?.user?._id ?? (typeof id === "string" ? id : "") ?? "";

  const beginEditUser = useCallback(() => {
    const u = withdrawDetail?.user;
    if (!u) return;
    const raw = u.birthdate ?? "";
    let birthIso = "";
    if (raw) {
      birthIso = /^\d{4}-\d{2}-\d{2}/.test(raw)
        ? raw.slice(0, 10)
        : (() => {
            try {
              return new Date(raw).toISOString().slice(0, 10);
            } catch {
              return "";
            }
          })();
    }
    const emails = normalizeUserEmails(u);
    const mobiles = normalizeUserMobiles(u);
    initialEmailsRef.current = new Set(
      emails.map((e) => e.trim().toLowerCase()).filter(Boolean),
    );
    initialMobilesRef.current = new Set(mobiles.map((m) => m.trim()).filter(Boolean));
    const emailRows =
      emails.length > 0 ? emails.map((value) => createContactRow(value)) : [createContactRow("")];
    const mobileRows =
      mobiles.length > 0 ? mobiles.map((value) => createContactRow(value)) : [createContactRow("")];
    setUserDraft({
      emailRows,
      mobileRows,
      fullName: u.fullName ?? "",
      gender: u.gender ?? "",
      birthdate: birthIso,
      wallet: u.wallet ?? "",
      gogopassActive: u.gogopassActive === true,
    });
    setUserSaveError(null);
    setEditingUser(true);
  }, [withdrawDetail?.user]);

  useEffect(() => {
    openedEditFromQueryRef.current = false;
  }, [id]);

  useEffect(() => {
    if (!editUserFromQuery || !withdrawDetail?.user) return;
    if (openedEditFromQueryRef.current) return;
    openedEditFromQueryRef.current = true;
    setActiveTab("user");
    beginEditUser();
  }, [
    editUserFromQuery,
    withdrawDetail?.user,
    beginEditUser,
  ]);

  const cancelEditUser = () => {
    setEditingUser(false);
    setUserSaveError(null);
  };

  const saveUserEdit = async () => {
    if (!withdrawUserId) return;
    setUserSaveError(null);
    const emailRows = ensureUserContactRows(userDraft.emailRows);
    const mobileRows = ensureUserContactRows(userDraft.mobileRows);
    if (
      !withdrawUserContactsReady(userDraft, initialEmailsRef.current, initialMobilesRef.current)
    ) {
      setUserSaveError(
        "Send OTP and verify every new email and phone number before saving.",
      );
      return;
    }
    setSavingUser(true);
    try {
      const emailsPayload = emailRows.map((r) => r.value.trim()).filter(Boolean);
      const mobilesPayload = mobileRows.map((r) => r.value.trim()).filter(Boolean);
      await updateWithdrawUserProfile({
        userId: withdrawUserId,
        emails: emailsPayload,
        mobiles: mobilesPayload,
        fullName: userDraft.fullName,
        gender: userDraft.gender,
        birthdate: userDraft.birthdate,
        wallet: userDraft.wallet,
        gogopassActive: userDraft.gogopassActive,
      });
      await fetchWithdrawDetail();
      setEditingUser(false);
    } catch (e: unknown) {
      setUserSaveError(getApiErrorMessage(e, "Failed to save changes"));
    } finally {
      setSavingUser(false);
    }
  };

  const userContactsReadyForSave = withdrawUserContactsReady(
    userDraft,
    initialEmailsRef.current,
    initialMobilesRef.current,
  );

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
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    User Info
                  </h3>
                  {!editingUser ? (
                    <button
                      type="button"
                      onClick={beginEditUser}
                      disabled={!withdrawDetail?.user}
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      Edit user
                    </button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={cancelEditUser}
                        disabled={savingUser}
                        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveUserEdit()}
                        disabled={
                          savingUser ||
                          !withdrawUserId ||
                          !userContactsReadyForSave
                        }
                        className="rounded-lg border border-brand-600 bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500"
                      >
                        {savingUser ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  )}
                </div>

                {userSaveError && (
                  <p className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    {userSaveError}
                  </p>
                )}

                {!editingUser ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                        <span className="min-w-[100px] font-medium">User ID:</span>{" "}
                        {withdrawDetail?.user?._id ?? (id as string) ?? "—"}
                        <CopyButton value={withdrawDetail?.user?._id ?? (id as string) ?? ""} />
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Email addresses
                        </h4>
                        {viewEmails.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">—</p>
                        ) : (
                          <ol className="list-none space-y-2.5 p-0">
                            {viewEmails.map((em, i) => (
                              <li
                                key={`wd-email-${i}`}
                                className="flex flex-wrap items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
                              >
                                <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                  {i + 1}
                                </span>
                                <span className="min-w-0 break-all">{em}</span>
                                <CopyButton value={em} />
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                        <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          Phone numbers
                        </h4>
                        {viewMobiles.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">—</p>
                        ) : (
                          <ol className="list-none space-y-2.5 p-0">
                            {viewMobiles.map((m, i) => (
                              <li
                                key={`wd-mobile-${i}`}
                                className="flex flex-wrap items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
                              >
                                <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-gray-100 text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                                  {i + 1}
                                </span>
                                <span className="min-w-0 break-all font-mono">{m}</span>
                                <CopyButton value={m} />
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                        <span className="min-w-[100px] font-medium">Full name:</span>{" "}
                        {withdrawDetail?.user?.fullName ?? "—"}
                        <CopyButton value={withdrawDetail?.user?.fullName ?? ""} />
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
                        <span className="min-w-[130px] shrink-0 font-medium">GoGoPass status:</span>{" "}
                        {withdrawDetail?.user?.gogopassActive === true ? (
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            Active
                          </span>
                        ) : withdrawDetail?.user?.gogopassActive === false ? (
                          <span className="text-gray-500 dark:text-gray-400">Not Active</span>
                        ) : (
                          "—"
                        )}
                      </p>
                      <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200 sm:col-span-2">
                        <span className="min-w-[100px] font-medium">Wallet:</span>{" "}
                        {withdrawDetail?.user?.wallet ?? "—"}
                        <CopyButton value={withdrawDetail?.user?.wallet || ""} />
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-gray-800 dark:text-gray-200">User ID:</span>{" "}
                        {withdrawUserId || "—"}
                        <CopyButton value={withdrawUserId} />
                      </p>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                        User ID cannot be changed from this screen.
                      </p>
                    </div>

                    <WithdrawUserContactEditor
                      userId={withdrawUserId}
                      showMockOtpHint={showMockOtpHint}
                      userDraft={userDraft}
                      setUserDraft={setUserDraft}
                      initialEmails={initialEmailsRef.current}
                      initialMobiles={initialMobilesRef.current}
                    />

                    <div>
                      <Label htmlFor="wd-user-fullname">Full name</Label>
                      <Input
                        id="wd-user-fullname"
                        value={userDraft.fullName}
                        onChange={(e) => setUserDraft((d) => ({ ...d, fullName: e.target.value }))}
                        className="h-11"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wd-user-gender">Gender</Label>
                      <Input
                        id="wd-user-gender"
                        value={userDraft.gender}
                        onChange={(e) => setUserDraft((d) => ({ ...d, gender: e.target.value }))}
                        placeholder="e.g. Female"
                        className="h-11"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wd-user-birthdate">Birth date</Label>
                      <Input
                        id="wd-user-birthdate"
                        type="date"
                        value={userDraft.birthdate}
                        onChange={(e) => setUserDraft((d) => ({ ...d, birthdate: e.target.value }))}
                        className="h-11"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wd-user-wallet">Wallet</Label>
                      <Input
                        id="wd-user-wallet"
                        value={userDraft.wallet}
                        onChange={(e) => setUserDraft((d) => ({ ...d, wallet: e.target.value }))}
                        className="h-11 font-mono text-sm"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wd-user-gogopass">GoGoPass status</Label>
                      <select
                        id="wd-user-gogopass"
                        value={userDraft.gogopassActive ? "active" : "inactive"}
                        onChange={(e) =>
                          setUserDraft((d) => ({
                            ...d,
                            gogopassActive: e.target.value === "active",
                          }))
                        }
                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white dark:focus:border-brand-400 dark:focus:ring-brand-400/25"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Not Active</option>
                      </select>
                    </div>
                  </div>
                )}
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
                          <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                            <span className="min-w-[120px] font-medium">Bank:</span>{" "}
                            {bank.bank_name || "N/A"}
                            <CopyButton value={bank.bank_name?.trim() || "N/A"} />
                          </p>
                          <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                            <span className="min-w-[120px] font-medium">Account Number:</span>{" "}
                            {bank.account_number || "N/A"}
                            <CopyButton value={bank.account_number?.trim() || "N/A"} />
                          </p>
                          <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                            <span className="min-w-[120px] font-medium">Account Name:</span>{" "}
                            {bank.account_name || "N/A"}
                            <CopyButton value={bank.account_name?.trim() || "N/A"} />
                          </p>
                          {bank.method && bank.method !== "bank_transfer" && (
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                              <span className="min-w-[120px] font-medium">Address:</span>{" "}
                              {bank.address || "N/A"}
                              <CopyButton value={bank.address?.trim() || "N/A"} />
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

          {activeTab === "deeplink" && (
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Deeplinks from offers, shops & brands
                </h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Tracking links associated with this user (mock data). Replace with API when available.
                </p>
              </div>
              {!withdrawDetail ? (
                <div className="h-40 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
              ) : userDeeplinks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-10 text-center dark:border-gray-600 dark:bg-gray-800/50">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    No deeplink records for this user in mock data.
                  </p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    Global deeplink admin:{" "}
                    <Link
                      href="/offers?tab=deeplink"
                      className="text-brand-600 underline dark:text-brand-400"
                    >
                      User Deeplink
                    </Link>
                    {" "}
                    <span className="text-gray-400 dark:text-gray-500">
                      (Offers Management → User Deeplink)
                    </span>
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                  <Table className="min-w-[820px]">
                    <TableHeader className="border-gray-100 dark:border-gray-800">
                      <TableRow>
                        <TableCell
                          isHeader
                          className="py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                        >
                          Source
                        </TableCell>
                        <TableCell
                          isHeader
                          className="py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                        >
                          Offer / shop / brand
                        </TableCell>
                        <TableCell
                          isHeader
                          className="py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                        >
                          Deeplink
                        </TableCell>
                        <TableCell
                          isHeader
                          className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                        >
                          Clicks
                        </TableCell>
                        <TableCell
                          isHeader
                          className="py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                        >
                          Created
                        </TableCell>
                        <TableCell
                          isHeader
                          className="py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                        >
                          Updated
                        </TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {userDeeplinks.map((d, idx) => (
                        <TableRow key={`${d.deeplink}-${idx}`}>
                          <TableCell className="py-3 text-theme-sm text-gray-700 dark:text-gray-200">
                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-theme-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                              {d.sourceType}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 text-theme-sm text-gray-800 dark:text-white/90">
                            {d.offerName}
                          </TableCell>
                          <TableCell className="max-w-[280px] py-3 text-theme-sm">
                            <a
                              href={d.deeplink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all text-brand-600 hover:underline dark:text-brand-400"
                            >
                              {d.deeplink}
                            </a>
                          </TableCell>
                          <TableCell className="py-3 text-center text-theme-sm font-medium text-gray-800 dark:text-gray-200">
                            {d.clicks}
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                            {d.createDate}
                          </TableCell>
                          <TableCell className="whitespace-nowrap py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                            {d.updateDate}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
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
