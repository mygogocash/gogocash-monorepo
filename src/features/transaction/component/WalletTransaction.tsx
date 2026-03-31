"use client";

import SubPage from "@/features/profile/layout/SubPage";
import {
  Box,
  Chip,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
  Tooltip,
} from "@mui/material";
import { LazyDataGrid, type GridColDef } from "@/components/perf/LazyMuiDataGrid";
import ContentCopyOutlined from "@mui/icons-material/ContentCopyOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import SearchIcon from "@mui/icons-material/Search";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { fetcher, fetcherPost } from "@/lib/axios/client";
import {
  ConversionHistory,
  DataWithdrawHistory,
  ResConversionHistory,
  ResGetSummaryListCheck,
  ResponseWithdrawCheck,
  ResponseWithdrawHistory,
} from "@/interfaces/withdraw";
import React, { memo, useCallback, useMemo, useState } from "react";
import { checkThai, formatAddress, formatNumber } from "@/lib/utils";
import { combineAvailableBalance } from "@/lib/withdraw/combineAvailableBalance";
import { CashbackSummaryBreakdownCard } from "@/components/common/CashbackSummaryBreakdownCard";
import { getWithdrawCheckLastUpdatedAt } from "@/components/common/WalletSummaryHeroCard";
import { useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import NoDataWallet from "./NoDataWallet";
import { useSearchParams } from "next/navigation";
import { ProfileSupportHelpBanner } from "@/components/common/ProfileSupportHelpBanner";
import {
  getMissingOrderClaimAccountKey,
  readMissingOrderClaimsFromLocalStorage,
} from "@/lib/missingOrders/walletClaimSubmissions";
import { useMissingOrderClaimRefresh } from "@/lib/missingOrders/useMissingOrderClaimRefresh";
import {
  PROFILE_TAB_STRIP_LIST_CLASS,
  profileTabButtonClassName,
} from "@/lib/ui/profileTabStripClasses";

const paginationModel = { page: 0, pageSize: 5 };

type TxRowType = "earn" | "withdraw" | "missingOrderClaim";

type UnifiedTxRow = {
  id: string;
  rowType: TxRowType;
  rowNumber: number;
  brand: string;
  conversionDate: string;
  transactionLabel: "Earn" | "Withdraw" | "Claim";
  currency: string;
  amount: string;
  info: string;
  status: string;
  conversionId: string;
};

function chipSxForStatus(status: string) {
  const s = status.toLowerCase();
  if (s === "submitted") {
    return {
      backgroundColor: "#ffb020",
      color: "#3b3b3b",
      fontWeight: 400,
      fontSize: "11px",
      height: 22,
    } as const;
  }
  if (s === "approved" || s === "paid") {
    return {
      background: "linear-gradient(90deg, #00b852 0%, #00a148 100%)",
      color: "#fff",
      fontWeight: 400,
      fontSize: "11px",
      height: 22,
    } as const;
  }
  if (s === "rejected" || s === "failed" || s === "fail") {
    return {
      backgroundColor: "#cd0d0d",
      color: "#fff",
      fontWeight: 400,
      fontSize: "11px",
      height: 22,
    } as const;
  }
  return {
    backgroundColor: "#ffb020",
    color: "#3b3b3b",
    fontWeight: 400,
    fontSize: "11px",
    height: 22,
  } as const;
}

function formatStatusLabel(status: string) {
  const s = status.toLowerCase();
  if (s === "approved") return "Approved";
  if (s === "paid") return "Paid";
  if (s === "pending") return "Pending";
  if (s === "rejected" || s === "failed") return "Fail";
  return status || "—";
}

const walletDataGridSx = {
  border: 0,
  fontSize: "13px",
  "& .MuiDataGrid-columnHeaders": { borderBottom: "1px solid #e8e8e8" },
  "& .MuiDataGrid-columnHeader": {
    backgroundColor: "#f3f4f6",
    color: "#374151",
    fontWeight: 400,
    fontSize: "12px",
    letterSpacing: "normal",
    textTransform: "none" as const,
  },
  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 400 },
  "& .MuiDataGrid-row:nth-of-type(even)": { backgroundColor: "#fafafa" },
  "& .MuiDataGrid-row:hover": { backgroundColor: "#f0fdf9 !important" },
  "& .MuiDataGrid-cell": {
    borderColor: "#efefef",
    alignItems: "center",
    display: "flex",
    py: "10px",
    fontWeight: 400,
  },
  "& .MuiDataGrid-footerContainer": {
    borderTop: "1px solid #e8e8e8",
    backgroundColor: "#fafafa",
    minHeight: "48px",
  },
  "& .MuiDataGrid-filler": { backgroundColor: "#f3f4f6 !important" },
  "& .MuiSvgIcon-root": { fill: "#00CC99" },
};

/** Shared pill controls for search / date / status (aligned width + height). */
const walletFilterOutlinedInputSx = {
  borderRadius: "9999px",
  minHeight: 48,
  boxSizing: "border-box" as const,
  backgroundColor: "#ffffff",
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "#e4e4e4",
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: "#bdbdbd",
  },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
    borderColor: "#00cc99",
    borderWidth: 1,
  },
} as const;

const walletFilterSearchFieldSx = {
  flex: 1,
  minWidth: 200,
  maxWidth: "100%",
  "& .MuiOutlinedInput-root": { ...walletFilterOutlinedInputSx },
} as const;

const walletFilterDateFieldSx = {
  width: 220,
  minWidth: 220,
  maxWidth: "100%",
  "& .MuiOutlinedInput-root": {
    ...walletFilterOutlinedInputSx,
    backgroundColor: "#f6f6f6",
    "&.Mui-disabled": {
      backgroundColor: "#f6f6f6",
    },
  },
} as const;

const walletFilterStatusFormSx = {
  width: 220,
  minWidth: 220,
  maxWidth: "100%",
  "& .MuiOutlinedInput-root": walletFilterOutlinedInputSx,
} as const;

const WithdrawTransaction = () => {
  const router = useRouter();
  const params = useSearchParams();
  const activeParam = params.get("active");
  const { data: session } = useSession();
  /** 1 = All, 2 = Earning, 3 = Withdraw (Figma `8439:87089`) */
  const [active, setActive] = useState(activeParam === "withdraw" ? 3 : 1);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [withdrawSearch, setWithdrawSearch] = useState("");
  const [withdrawStatusFilter, setWithdrawStatusFilter] = useState("");
  const t = useTranslations();
  const locale = useLocale();

  const claimAccountKey = useMemo(
    () => getMissingOrderClaimAccountKey(session?.user),
    [session?.user]
  );
  const claimRefresh = useMissingOrderClaimRefresh(claimAccountKey);

  const walletStatusFilterOptions = useMemo(
    () => [
      { value: "", label: t("walletTransactionsStatusFilterAll") },
      { value: "pending", label: t("walletTransactionsStatusPending") },
      { value: "submitted", label: t("walletTransactionsStatusSubmitted") },
      { value: "approved", label: t("walletTransactionsStatusApproved") },
      { value: "paid", label: t("walletTransactionsStatusPaid") },
      { value: "rejected", label: t("walletTransactionsStatusRejected") },
      { value: "failed", label: t("walletTransactionsStatusFailed") },
    ],
    [t]
  );

  const onWalletStatusFilterChange = useCallback(
    (e: SelectChangeEvent<string>) => {
      const v = e.target.value;
      if (active === 3) setWithdrawStatusFilter(v);
      else setStatusFilter(v);
    },
    [active]
  );

  const {
    data: getCheck,
    // error,
    // isLoading,
    // isError,
  } = useQuery<ResponseWithdrawCheck>({
    queryKey: ["getCheck"],
    queryFn: () => fetcherPost("/withdraw/check"),
    staleTime: Infinity,
    enabled: session?.user != null,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const {
    data: getListCheck,
    // error: errorListCheck,
    // isLoading,
    // isError,
  } = useQuery<ResGetSummaryListCheck>({
    queryKey: ["getListCheck"],
    queryFn: () => fetcherPost("/withdraw/list-check"),
    staleTime: Infinity,
    enabled: session?.user != null,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const withdrawURL = `/withdraw?search=&limit=100&page=1`;
  const [query] = React.useState({ search: "", limit: 100, page: 1 });

  const { data: withdrawList, isLoading: isWithdrawHistoryLoading } =
    useQuery<ResponseWithdrawHistory>({
      queryKey: ["responseWithdrawHistory", query, withdrawURL],
      queryFn: () => fetcher(withdrawURL),
      enabled: query.page > 0,
      staleTime: 0,
    });
  const [queryCon] = React.useState({ limit: 100, page: 1 });

  const { data: conversationList } = useQuery<ResConversionHistory>({
    queryKey: ["conversationList", queryCon],
    queryFn: () => fetcherPost([`/involve/conversion-all`, { data: { ...queryCon } }]),
    enabled: queryCon.page > 0,
    staleTime: 0,
  });

  const percent = Number(getListCheck?.fee?.system) || 0;

  const list = useMemo(() => {
    return conversationList?.data?.map((item: ConversionHistory, index: number) => {
      const payout =
        item.offer_name === "reward_conversion_quest"
          ? Number(item.payout)
          : Number(item.payout) - Number((Number(item.payout) * percent) / 100);

      return {
        ...item,
        id: index + 1,
        conversion_id: item.conversion_id || "",
        offer_name: item.offer_name || "",
        adv_sub2: item.adv_sub2 || "",
        sale_amount: item.sale_amount || "",
        payout: percent > 0 ? payout?.toFixed(2) : "-",
        currency: item.currency || "",
        datetime_conversion: item.datetime_conversion || "",
        conversion_status: item.conversion_status || "",
      };
    });
  }, [conversationList?.data, percent]);

  const applyFilters = useCallback(
    (rows: UnifiedTxRow[]) => {
      return rows.filter((row) => {
        if (searchText.trim()) {
          const q = searchText.toLowerCase();
          const blob =
            `${row.brand} ${row.info} ${row.status} ${row.amount} ${row.currency} ${row.conversionId}`.toLowerCase();
          if (!blob.includes(q)) return false;
        }
        if (statusFilter.trim()) {
          if (!row.status.toLowerCase().includes(statusFilter.trim().toLowerCase())) return false;
        }
        return true;
      });
    },
    [searchText, statusFilter]
  );

  const claimRowsUnified = useMemo((): Omit<UnifiedTxRow, "rowNumber">[] => {
    void claimRefresh;
    return readMissingOrderClaimsFromLocalStorage(claimAccountKey).map((r) => ({
      id: r.id,
      rowType: "missingOrderClaim" as const,
      brand: r.shopLabel,
      conversionDate: r.submittedAt,
      transactionLabel: "Claim" as const,
      currency: r.currency,
      amount: r.amount,
      info: t("walletTransactionsMissingOrderClaimInfo", { orderId: r.orderId }),
      status: "submitted",
      conversionId: r.orderId,
    }));
  }, [claimAccountKey, claimRefresh, t]);

  const earningRowsFromList = useMemo((): Omit<UnifiedTxRow, "rowNumber">[] => {
    return (list || []).map((item, index) => {
      const info = String(item.offer_name || item.adv_sub2 || "—");
      const brand =
        String(item.adv_sub1 || "")
          .trim()
          .replace(/^publisher:[^:]+$/i, "")
          .trim() ||
        String(item.offer_name || "").trim() ||
        "—";
      return {
        id: `earn-${item.conversion_id}-${index}`,
        rowType: "earn",
        brand,
        conversionDate: String(item.datetime_conversion || ""),
        transactionLabel: "Earn",
        currency: String(item.currency || ""),
        amount: String(item.payout ?? ""),
        info,
        status: String(item.conversion_status || ""),
        conversionId: String(item.conversion_id || ""),
      };
    });
  }, [list]);

  const withdrawRowsUnified = useMemo((): Omit<UnifiedTxRow, "rowNumber">[] => {
    return (withdrawList?.data || []).map((item: DataWithdrawHistory, i: number) => {
      const last4 = String(item.account_number || "")
        .replace(/\s/g, "")
        .slice(-4);
      const mask = last4 ? `***${last4}` : "";
      const bankLine =
        item.bank_name && mask
          ? `${t("walletTransactionsWithdrawTo")} ${item.bank_name} ${mask}`
          : item.address
            ? formatAddress(item.address)
            : [item.bank_name, item.account_name, item.account_number]
                .filter(Boolean)
                .join(" - ") || "—";
      return {
        id: `wd-${item._id ?? i}`,
        rowType: "withdraw",
        brand: "—",
        conversionDate: String(item.createdAt || ""),
        transactionLabel: "Withdraw",
        currency: String(item.currency || ""),
        amount: String(item.amount_net ?? ""),
        info: bankLine,
        status: String(item.status || ""),
        conversionId: "",
      };
    });
  }, [withdrawList?.data, t]);

  const unifiedRows = useMemo(() => {
    const merged: Omit<UnifiedTxRow, "rowNumber">[] = [
      ...earningRowsFromList,
      ...withdrawRowsUnified,
      ...claimRowsUnified,
    ];
    merged.sort((a, b) => {
      const ta = new Date(a.conversionDate).getTime();
      const tb = new Date(b.conversionDate).getTime();
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });
    return merged.map((r, i) => ({ ...r, rowNumber: i + 1 }));
  }, [earningRowsFromList, withdrawRowsUnified, claimRowsUnified]);

  const unifiedRowsFiltered = useMemo(() => {
    const filtered = applyFilters(unifiedRows);
    return filtered.map((r, i) => ({ ...r, rowNumber: i + 1 }));
  }, [unifiedRows, applyFilters]);

  const earningRowsFiltered = useMemo(() => {
    const base: UnifiedTxRow[] = earningRowsFromList.map((r, i) => ({ ...r, rowNumber: i + 1 }));
    const filtered = applyFilters(base);
    return filtered.map((r, i) => ({ ...r, rowNumber: i + 1 }));
  }, [earningRowsFromList, applyFilters]);

  type WithdrawGridRow = {
    id: string;
    rowNumber: number;
    amount: string | number;
    currency: string;
    method: string;
    status: string;
    bank_name: string;
    account_name: string;
    account_number: string;
    address: string;
    created_at: string | Date;
    conversion_id: number[];
    mycashback_id: string[];
  };

  const withdrawGridRows = useMemo((): WithdrawGridRow[] => {
    return (withdrawList?.data || []).map((item: DataWithdrawHistory, index: number) => ({
      id: item._id || `withdraw-${index}`,
      rowNumber: index + 1,
      amount: item.amount_net || "",
      currency: item.currency || "",
      method: item.method || "",
      status: item.status || "",
      bank_name: item.bank_name || "",
      account_name: item.account_name || "",
      account_number: item.account_number || "",
      address: item.address || "",
      created_at: item.createdAt || "",
      conversion_id: item.conversion_id || [],
      mycashback_id: item.mycashback_id || [],
    }));
  }, [withdrawList?.data]);

  const applyWithdrawFilters = useCallback(
    (rows: WithdrawGridRow[]) =>
      rows.filter((row) => {
        if (withdrawSearch.trim()) {
          const q = withdrawSearch.toLowerCase();
          const blob =
            `${row.bank_name} ${row.account_name} ${row.account_number} ${row.status} ${row.amount} ${row.currency} ${row.method} ${row.address}`.toLowerCase();
          if (!blob.includes(q)) return false;
        }
        if (withdrawStatusFilter.trim()) {
          if (
            !String(row.status).toLowerCase().includes(withdrawStatusFilter.trim().toLowerCase())
          ) {
            return false;
          }
        }
        return true;
      }),
    [withdrawSearch, withdrawStatusFilter]
  );

  const withdrawRowsFiltered = useMemo(() => {
    const filtered = applyWithdrawFilters(withdrawGridRows);
    return filtered.map((r, i) => ({ ...r, rowNumber: i + 1 }));
  }, [withdrawGridRows, applyWithdrawFilters]);

  const transactionGridColumns = useMemo<GridColDef<UnifiedTxRow>[]>(
    () => [
      {
        field: "rowNumber",
        headerName: t("walletTransactionsColNo"),
        width: 72,
        align: "center",
        headerAlign: "center",
      },
      {
        field: "brand",
        headerName: t("walletTransactionsColBrand"),
        width: 152,
        minWidth: 112,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const text = String(params.value || "—");
          return (
            <p
              className="line-clamp-2 w-full text-center text-sm font-normal text-[#1f2937]"
              title={text}
            >
              {text}
            </p>
          );
        },
      },
      {
        field: "conversionDate",
        headerName: t("walletTransactionsColConversionDate"),
        width: 148,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const raw = String(params.value || "");
          if (!raw) return <p className="w-full text-center text-sm text-[#9ca3af]">—</p>;
          const ms = new Date(raw).getTime();
          if (Number.isNaN(ms)) return <p className="w-full text-center text-sm">{raw}</p>;
          const date = new Date(ms - 7 * 60 * 60 * 1000);
          return (
            <div className="flex w-full flex-col items-center gap-0.5 text-center leading-tight">
              <span className="text-[13px] font-normal text-[#1f2937]">
                {date.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="text-[11px] font-normal text-[#6b7280]">
                {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        },
      },
      {
        field: "transactionLabel",
        headerName: t("walletTransactionsColTransaction"),
        width: 120,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const row = params.row;
          if (row.transactionLabel === "Claim") {
            return (
              <p className="w-full text-center text-sm font-normal text-[#00AA80]">
                {t("walletTransactionsClaim")}
              </p>
            );
          }
          const isEarn = row.transactionLabel === "Earn";
          return (
            <p
              className={`w-full text-center text-sm font-normal ${
                isEarn ? "text-[#00a148]" : "text-[#cd0d0d]"
              }`}
            >
              {isEarn ? t("walletTransactionsEarn") : t("walletTransactionsWithdraw")}
            </p>
          );
        },
      },
      {
        field: "currency",
        headerName: t("Currency"),
        width: 88,
        align: "center",
        headerAlign: "center",
      },
      {
        field: "amount",
        headerName: t("walletTransactionsColAmount"),
        width: 120,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const row = params.row;
          const raw = row.amount;
          if (raw === "-" || raw === "")
            return <p className="w-full text-center text-sm text-[#9ca3af]">—</p>;
          const n = Number(raw);
          return (
            <p className="w-full text-center text-sm font-normal tabular-nums text-[#111827]">
              {Number.isFinite(n) ? formatNumber(n) : raw}
            </p>
          );
        },
      },
      {
        field: "info",
        headerName: t("walletTransactionsColTransactionInfo"),
        flex: 1,
        minWidth: 200,
        align: "left",
        headerAlign: "left",
        renderCell: (params) => {
          const text = String(params.value || "—");
          return (
            <p
              className="line-clamp-2 text-sm font-normal leading-snug text-[#374151]"
              title={text}
            >
              {text}
            </p>
          );
        },
      },
      {
        field: "status",
        headerName: t("Status"),
        width: 168,
        sortable: false,
        align: "center",
        headerAlign: "center",
        renderCell: (params) => {
          const row = params.row;
          const status = String(params.value || "");
          const statusLower = status.toLowerCase();
          const chipLabel =
            statusLower === "submitted"
              ? t("walletTransactionsStatusSubmitted")
              : formatStatusLabel(status);
          const statusChip = <Chip label={chipLabel} size="small" sx={chipSxForStatus(status)} />;
          return (
            <div className="flex w-full flex-col items-center justify-center gap-1.5 py-0.5">
              {row.rowType === "missingOrderClaim" && statusLower === "submitted" ? (
                <Tooltip title={t("walletTransactionsClaimLocalDeviceHint")} arrow placement="top">
                  <span className="inline-flex">{statusChip}</span>
                </Tooltip>
              ) : (
                statusChip
              )}
              {(row.rowType === "earn" || row.rowType === "missingOrderClaim") &&
              row.conversionId ? (
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#d1fae5] bg-white px-2 py-1 text-xs font-normal text-[#047857] shadow-sm transition hover:bg-emerald-50"
                  onClick={() => {
                    void navigator.clipboard.writeText(row.conversionId);
                    toast.success(t("walletTransactionsCopied"));
                  }}
                >
                  <ContentCopyOutlined sx={{ fontSize: 14 }} aria-hidden />
                  {t("walletTransactionsCopyOrderId")}
                </button>
              ) : row.rowType === "withdraw" ? (
                <button
                  type="button"
                  className="text-center text-xs font-normal text-[#2563eb] underline decoration-transparent underline-offset-2 hover:decoration-current"
                  onClick={() => router.push("/withdraw")}
                >
                  {t("walletTransactionsViewDetail")}
                </button>
              ) : null}
            </div>
          );
        },
      },
    ],
    [t, router]
  );

  const column2: GridColDef[] = useMemo(
    () => [
      {
        field: "rowNumber",
        headerName: t("walletTransactionsColNo"),
        width: 72,
        align: "center",
        headerAlign: "center",
      },
      {
        field: "amount",
        headerName: t("Amount"),
        width: 150,
        align: "center",
        headerAlign: "center",
        renderCell: (props) => {
          const amount = Number(props.row.amount);
          return (
            <div className="w-full text-center text-sm font-normal tabular-nums text-[#111827]">
              {formatNumber(amount || 0)} {props.row.currency}{" "}
              {props.row.mycashback_id?.length > 0 && "(MCB)"}
            </div>
          );
        },
      },
      {
        field: "method",
        headerName: t("Method"),
        width: 100,
        align: "center",
        headerAlign: "center",
        renderCell: (props) => (
          <p className="w-full text-center text-sm font-normal">{props.row.method}</p>
        ),
      },
      {
        field: "address",
        headerName: t("Address"),
        width: 300,
        align: "left",
        headerAlign: "left",
        renderCell: (props) => {
          const address = props.row.address;
          return (
            <p className="text-left text-sm font-normal">
              {address
                ? formatAddress(address || "")
                : `${props.row.bank_name} - ${props.row.account_name} - ${props.row.account_number}`}
            </p>
          );
        },
      },
      {
        field: "status",
        headerName: t("Status"),
        width: 140,
        align: "center",
        headerAlign: "center",
        renderCell: (props) => {
          const status = String(props.row.status || "");
          return (
            <div className="flex w-full justify-center">
              <Chip label={formatStatusLabel(status)} size="small" sx={chipSxForStatus(status)} />
            </div>
          );
        },
      },
      {
        field: "created_at",
        headerName: t("walletTransactionsColConversionDate"),
        width: 148,
        align: "center",
        headerAlign: "center",
        renderCell: (props) => {
          const date = new Date(props.row.created_at);
          if (Number.isNaN(date.getTime()))
            return <p className="w-full text-center text-sm text-[#9ca3af]">—</p>;
          return (
            <div className="flex w-full flex-col items-center gap-0.5 text-center leading-tight">
              <span className="text-[13px] font-normal text-[#1f2937]">
                {date.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="text-[11px] font-normal text-[#6b7280]">
                {date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          );
        },
      },
    ],
    [t]
  );

  const thaiForBalance = checkThai || session?.user?.region === "Thailand";

  const walletSummaryLastUpdatedA11y = useMemo(() => {
    const d = getWithdrawCheckLastUpdatedAt(getCheck);
    const loc = locale === "th" ? "th-TH" : "en-GB";
    return `${d.toLocaleDateString(loc, {
      day: "numeric",
      month: "short",
      year: "numeric",
    })} ${d.toLocaleTimeString(loc, { hour: "2-digit", minute: "2-digit", hour12: false })}`;
  }, [getCheck, locale]);

  React.useEffect(() => {
    if (activeParam === "withdraw") setActive(3);
  }, [activeParam]);

  return (
    <SubPage title="My Wallet" showSubMenu>
      <section
        className="mt-5 flex w-full flex-col items-center gap-4"
        aria-labelledby="wallet-summary-banner-heading"
      >
        <h2 id="wallet-summary-banner-heading" className="sr-only">
          {t("Wallet")} — {t("Cashback Summary")}
        </h2>
        <p className="sr-only" aria-live="polite">
          {t("Total Cashback Available")}:{" "}
          {formatNumber(combineAvailableBalance(getCheck, thaiForBalance))}. {t("Last Updated")}:{" "}
          {walletSummaryLastUpdatedA11y}. {t("Cashback Summary")}: {t("Rejected Cashback")}{" "}
          {thaiForBalance
            ? getListCheck?.totalsByStatusAndCurrency
                ?.find((ele) => ele.status === "rejected")
                ?.totalTHB?.toFixed(2) || 0
            : getListCheck?.totalsByStatusAndCurrency
                ?.find((ele) => ele.status === "rejected")
                ?.totalUSD?.toFixed(2) || 0}
          , {t("Pending Cashback")}{" "}
          {thaiForBalance
            ? getListCheck?.totalsByStatusAndCurrency
                ?.find((ele) => ele.status === "pending")
                ?.totalTHB?.toFixed(2) || 0
            : getListCheck?.totalsByStatusAndCurrency
                ?.find((ele) => ele.status === "pending")
                ?.totalUSD?.toFixed(2) || 0}
          , {t("Approved Cashback")}{" "}
          {thaiForBalance
            ? getListCheck?.totalsByStatusAndCurrency
                ?.find((ele) => ele.status === "approved")
                ?.totalTHB?.toFixed(2) || 0
            : getListCheck?.totalsByStatusAndCurrency
                ?.find((ele) => ele.status === "approved")
                ?.totalUSD?.toFixed(2) || 0}
          .
        </p>
        <ProfileSupportHelpBanner className="max-w-[874px] md:max-w-[916px]" />
        <div className="mx-auto w-full max-w-[916px]">
          <CashbackSummaryBreakdownCard
            layout="stacked"
            getListCheck={getListCheck}
            withdrawnTotal={withdrawList?.totalAmount}
            thai={thaiForBalance}
          />
        </div>
      </section>
      <div className="my-6 flex w-full flex-col gap-4">
        <div className={PROFILE_TAB_STRIP_LIST_CLASS}>
          {(
            [
              { key: 1 as const, label: t("walletTransactionsTabAll") },
              { key: 2 as const, label: t("walletTransactionsTabEarning") },
              { key: 3 as const, label: t("Withdraw Transactions") },
            ] as const
          ).map((tab) => {
            const on = active === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActive(tab.key)}
                className={profileTabButtonClassName(on)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
        {(active === 1 || active === 2 || active === 3) && (
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <TextField
              size="small"
              placeholder={t("walletTransactionsSearch")}
              value={active === 3 ? withdrawSearch : searchText}
              onChange={(e) =>
                active === 3 ? setWithdrawSearch(e.target.value) : setSearchText(e.target.value)
              }
              sx={walletFilterSearchFieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: "#9e9e9e", fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              size="small"
              placeholder={t("Date")}
              disabled
              sx={walletFilterDateFieldSx}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarTodayOutlinedIcon sx={{ color: "#9e9e9e", fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={walletFilterStatusFormSx}>
              <Select
                value={active === 3 ? withdrawStatusFilter : statusFilter}
                onChange={onWalletStatusFilterChange}
                displayEmpty
                inputProps={{ "aria-label": t("Status") }}
                renderValue={(selected) => {
                  if (selected === "") return t("walletTransactionsStatusFilterAll");
                  const opt = walletStatusFilterOptions.find((o) => o.value === selected);
                  return opt?.label ?? String(selected);
                }}
              >
                {walletStatusFilterOptions.map((opt) => (
                  <MenuItem key={opt.value === "" ? "__all" : opt.value} value={opt.value}>
                    {opt.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        )}
      </div>
      <div className="flex w-full flex-col overflow-hidden rounded-2xl border border-[#e0e0e0] bg-[#f9fafb] shadow-sm">
        <Box
          sx={{ " .MuiSvgIcon-root": { fill: "#00CC99" } }}
          className="flex w-full flex-col gap-2 overflow-auto bg-white px-3 pb-4 pt-4 md:px-5 md:pb-5 md:pt-5"
        >
          {active === 1 ? (
            <>
              {unifiedRows.length <= 0 ? (
                <NoDataWallet reason="noData" />
              ) : unifiedRowsFiltered.length <= 0 ? (
                <NoDataWallet reason="filtered" />
              ) : (
                <LazyDataGrid
                  rows={unifiedRowsFiltered}
                  columns={transactionGridColumns}
                  getRowId={(row: UnifiedTxRow) => row.id}
                  initialState={{ pagination: { paginationModel } }}
                  pageSizeOptions={[5, 10]}
                  sx={walletDataGridSx}
                />
              )}
            </>
          ) : active === 2 ? (
            <>
              {earningRowsFromList.length <= 0 ? (
                <NoDataWallet reason="noData" />
              ) : earningRowsFiltered.length <= 0 ? (
                <NoDataWallet reason="filtered" />
              ) : (
                <LazyDataGrid
                  rows={earningRowsFiltered}
                  columns={transactionGridColumns}
                  getRowId={(row: UnifiedTxRow) => row.id}
                  initialState={{ pagination: { paginationModel } }}
                  pageSizeOptions={[5, 10]}
                  sx={walletDataGridSx}
                />
              )}
            </>
          ) : (
            <>
              {isWithdrawHistoryLoading ? (
                <div className="flex min-h-[280px] items-center justify-center text-sm text-[#7f7f7f]">
                  {t("walletTransactionsLoading")}
                </div>
              ) : !withdrawList?.data?.length ? (
                <NoDataWallet reason="noData" />
              ) : withdrawRowsFiltered.length <= 0 ? (
                <NoDataWallet reason="filtered" />
              ) : (
                <LazyDataGrid
                  rows={withdrawRowsFiltered}
                  columns={column2}
                  getRowId={(row: WithdrawGridRow) => row.id}
                  initialState={{ pagination: { paginationModel } }}
                  pageSizeOptions={[5, 10]}
                  sx={walletDataGridSx}
                />
              )}
            </>
          )}
        </Box>
      </div>
    </SubPage>
  );
};
export default memo(WithdrawTransaction);
