"use client";
import Link from "next/link";
import { fetcher, fetcherPost } from "@/lib/axios/client";
import { formatDate, formatDateTime } from "@/lib/dateFormat";
import StackedDateTime from "@/components/common/StackedDateTime";
import { planCycle, CYCLE_LABEL, CYCLE_BADGE } from "@/lib/subscriptionCycle";
import { tierFromScore, CREDIT_TIER_BADGE } from "@/lib/creditTier";
import { isCreditScoreEnabled, isGoGoPassEnabled } from "@/config/featureFlags";
import type { UserMembership } from "@/types/adminModules";
import type { GridColDef } from "@mui/x-data-grid";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { ResDataWithdrawsListByUser, ResMCBDetail } from "@/types/withdraw";
import Divider from "@mui/material/Divider";
import { pathImage } from "@/utils/helper";
import ModalWithdraw from "./ModalWithdraw";
import { Modal } from "@/components/ui/modal";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { MOCK_DEEPLINKS, filterDeeplinksForUser } from "@/data/mockDeeplinks";
import { normalizeUserEmails, normalizeUserMobiles } from "@/lib/userContact";
import {
  conversionAdvSummary,
  conversionGgcEarning,
  conversionUserEarning,
} from "@/lib/conversionFormat";
import {
  getMembershipUsers,
  resolveCashbackRequest,
} from "@/lib/api/adminModulesApi";
import { pendingExtraCashbackRequests } from "@/lib/cashbackRequests";
import { totalEarnedCashback } from "@/lib/cashbackTotals";
import NoData from "@/components/common/NoData";
import CashbackApprovalNotice from "@/components/wallet/CashbackApprovalNotice";
import UserWalletPanel from "@/components/wallet/UserWalletPanel";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";
import { isDirty } from "@/lib/isDirty";
import { shouldShowMockOtpHint } from "@/lib/mockOtpHint";
import {
  deleteWithdrawUserData,
  updateWithdrawUserProfile,
} from "@/lib/api/withdrawUserContactApi";
import WithdrawUserContactEditor from "@/components/withdraw/WithdrawUserContactEditor";
import {
  buildWithdrawUserContactSavePlan,
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
import SecondaryButton from "@/components/ui/button/SecondaryButton";
import MyCashbackProfileSection from "@/components/withdraw/MyCashbackProfileSection";
import UserActiveBenefits from "@/components/withdraw/UserActiveBenefits";
import { VerifiedPill } from "@/components/withdraw/VerifiedPill";
import type { MyCashbackResponse } from "@/types/user";
import toast from "react-hot-toast";

const WithdrawDetailDataGrid = dynamic(
  () => import("./WithdrawDetailLazyGrids"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
    ),
  },
);

type DetailTab =
  "user" | "subscription" | "conversion" | "withdraw" | "login" | "deleteData";

const DELETE_USER_DATA_CONFIRM_PHRASE = "DELETE";

const TABS: { id: DetailTab; label: string }[] = [
  { id: "user", label: "User Info" },
  { id: "subscription", label: "Benefits & Scoring" },
  { id: "conversion", label: "Conversions" },
  { id: "withdraw", label: "Finance" },
  { id: "login", label: "Login Tracking" },
  { id: "deleteData", label: "Delete user data" },
];

/** Frame color + status icon for the withdraw summary stat cards (keyed by
 * status name). Unknown statuses fall back to a neutral gray card. */
type StatusCardStyle = {
  card: string;
  head: string;
  value: string;
  icon: string;
};
const WITHDRAW_STATUS_STYLE: Record<string, StatusCardStyle> = {
  approved: {
    card: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/25 dark:bg-emerald-500/10",
    head: "text-emerald-700 dark:text-emerald-400",
    value: "text-emerald-800 dark:text-emerald-300",
    icon: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z",
  },
  pending: {
    card: "border-amber-200 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/10",
    head: "text-amber-700 dark:text-amber-400",
    value: "text-amber-800 dark:text-amber-300",
    icon: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z",
  },
  rejected: {
    card: "border-red-200 bg-red-50 dark:border-red-500/25 dark:bg-red-500/10",
    head: "text-red-700 dark:text-red-400",
    value: "text-red-800 dark:text-red-300",
    icon: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z",
  },
};
const WITHDRAW_STATUS_STYLE_FALLBACK: StatusCardStyle = {
  card: "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/40",
  head: "text-gray-600 dark:text-gray-400",
  value: "text-gray-800 dark:text-gray-200",
  icon: "M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-12a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
};

/** Saveable shape of the User Info edit form — what `saveUserEdit` persists.
 * Used to drive "disable Save until something changed": transient contact-row
 * UI state (OTP input/verification flags) is excluded so the dirty check only
 * reflects fields that actually get sent. */
type UserEditSnapshot = {
  emails: string[];
  mobiles: string[];
  fullName: string;
  gender: string;
  birthdate: string;
};

const buildUserEditSnapshot = (
  draft: WithdrawUserEditDraft,
): UserEditSnapshot => ({
  emails: ensureUserContactRows(draft.emailRows)
    .map((r) => r.value.trim())
    .filter(Boolean),
  mobiles: ensureUserContactRows(draft.mobileRows)
    .map((r) => r.value.trim())
    .filter(Boolean),
  fullName: draft.fullName,
  gender: draft.gender,
  birthdate: draft.birthdate,
});

/** One-time migration for drafts persisted before contact rows gained clientId. */
const ensureLegacyContactRowShape = (
  draft: WithdrawUserEditDraft,
): WithdrawUserEditDraft => {
  const emailsOk =
    Array.isArray(draft.emailRows) &&
    draft.emailRows.length > 0 &&
    typeof draft.emailRows[0] === "object" &&
    draft.emailRows[0] !== null &&
    "clientId" in draft.emailRows[0];
  const mobilesOk =
    Array.isArray(draft.mobileRows) &&
    draft.mobileRows.length > 0 &&
    typeof draft.mobileRows[0] === "object" &&
    draft.mobileRows[0] !== null &&
    "clientId" in draft.mobileRows[0];
  if (emailsOk && mobilesOk) return draft;
  return {
    ...draft,
    emailRows: emailsOk ? draft.emailRows : [createContactRow("")],
    mobileRows: mobilesOk ? draft.mobileRows : [createContactRow("")],
  };
};

const WithdrawDetail = () => {
  const queryClient = useQueryClient();
  const { id } = useParams();
  const searchParams = useSearchParams();
  const editUserFromQuery = searchParams.get("editUser") === "1";
  const openedEditFromQueryRef = useRef(false);
  // Allow deep-linking to a tab via ?tab= (e.g. from the membership /
  // subscription admin "View" buttons → Benefits & Scoring).
  const tabParam = searchParams.get("tab");
  // Pre-launch gating: the "Benefits & Scoring" tab hosts BOTH the credit-score
  // and GoGoPass surfaces, so it stays visible while EITHER flag is on and is
  // dropped only when BOTH are hidden. Deriving visibleTabs here (not just at
  // the tab bar) also feeds the activeTab initializer below, so a
  // ?tab=subscription deep-link can never strand activeTab on a removed tab.
  const subscriptionTabEnabled = isCreditScoreEnabled() || isGoGoPassEnabled();
  const visibleTabs = subscriptionTabEnabled
    ? TABS
    : TABS.filter((t) => t.id !== "subscription");
  const [activeTab, setActiveTab] = useState<DetailTab>(
    visibleTabs.some((t) => t.id === tabParam)
      ? (tabParam as DetailTab)
      : "user",
  );
  const [openModal, setOpenModal] = useState<DataWithdrawsList | boolean>(
    false,
  );

  const [form, setForm] = useState<WithdrawRequestForm>({
    file: null,
    id: "",
    status: "",
  });

  const [editingUser, setEditingUser] = useState(false);
  const [showWalletEdit, setShowWalletEdit] = useState(false);
  const [showMcbDetail, setShowMcbDetail] = useState(false);
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [userSaveError, setUserSaveError] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteUserDataLoading, setDeleteUserDataLoading] = useState(false);
  const [deleteUserDataError, setDeleteUserDataError] = useState<string | null>(
    null,
  );
  const [userDraft, setUserDraft] = useState<WithdrawUserEditDraft>(() =>
    ensureLegacyContactRowShape(emptyWithdrawUserEditDraft()),
  );

  const showMockOtpHint = useMemo(() => shouldShowMockOtpHint(), []);

  const [editInitialEmails, setEditInitialEmails] = useState<Set<string>>(
    () => new Set(),
  );
  const [editInitialMobiles, setEditInitialMobiles] = useState<Set<string>>(
    () => new Set(),
  );
  const [userEditSnapshot, setUserEditSnapshot] =
    useState<UserEditSnapshot | null>(null);

  const { data: withdrawDetail, refetch: fetchWithdrawDetail } =
    useQuery<ResDataWithdrawsListByUser>({
      queryKey: ["getWithdrawDetail", id],
      queryFn: () => fetcherPost(`/withdraw/list-check-admin/${id}`),
    });

  const { data: MCBDetail, refetch: fetchMCBDetail } = useQuery<ResMCBDetail>({
    queryKey: ["MCBDetail", id],
    queryFn: () => fetcherPost(`/withdraw/check-my-cashback-admin/${id}`),
  });

  const routeUserId = typeof id === "string" ? id : "";

  // Pending "Extra cashback" requests awaiting super-admin Approve/Reject.
  const cashbackRequests = pendingExtraCashbackRequests(
    withdrawDetail?.allConversions ?? [],
  );

  const resolveRequest = async (
    conversionId: number,
    action: "approve" | "reject",
    reason?: string,
  ) => {
    if (resolvingId !== null) return;
    setResolvingId(conversionId);
    try {
      await resolveCashbackRequest(conversionId, action, reason);
      toast.success(
        action === "approve"
          ? "Cashback approved and credited to the wallet"
          : "Cashback request rejected",
      );
      await fetchWithdrawDetail();
      void queryClient.invalidateQueries({ queryKey: ["admin", "wallet"] });
    } catch {
      toast.error("Could not update the request. Please try again.");
    } finally {
      setResolvingId(null);
    }
  };

  const {
    data: myCashbackRows,
    isLoading: myCashbackLoading,
    isError: myCashbackError,
  } = useQuery({
    queryKey: ["mycashbackUserProfile", routeUserId],
    queryFn: () =>
      fetcher(`/admin/get-mycashback-user/${encodeURIComponent(routeUserId)}`),
    enabled: Boolean(routeUserId),
  });

  const myCashbackUser = useMemo(() => {
    // API/mock contract is an array; tolerate a single object from older builds.
    if (!myCashbackRows) return null;
    if (Array.isArray(myCashbackRows)) {
      return (myCashbackRows[0] as MyCashbackResponse | undefined) ?? null;
    }
    return myCashbackRows as MyCashbackResponse;
  }, [myCashbackRows]);

  const column = useMemo<GridColDef[]>(
    () => [
      { field: "rowIndex", headerName: "#", width: 44, sortable: false },
      { field: "conversion_id", headerName: "Conversion ID", width: 120 },
      {
        field: "offer_name",
        headerName: "Offer name",
        width: 240,
        renderCell: (params) => {
          const description = conversionAdvSummary(params.row);
          return (
            <div className="flex h-full w-full min-w-0 flex-col justify-center leading-tight">
              <span className="block truncate font-semibold text-gray-800 dark:text-gray-200">
                {params.value ?? "—"}
              </span>
              {description ? (
                <span
                  className="block truncate text-xs text-gray-500 dark:text-gray-400"
                  title={description}
                >
                  {description}
                </span>
              ) : null}
            </div>
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
      {
        field: "payout",
        headerName: "Total Payout",
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
        // GoGoCash's fee earning on the conversion: a flat 30% of gross payout.
        field: "payout_ggc",
        headerName: "GGC Earning",
        width: 130,
        sortable: false,
        valueGetter: (_value, row) => conversionGgcEarning(row),
        renderCell: (params) => {
          const ggc = Number(params.value ?? 0);
          return (
            <span>
              {ggc.toFixed(2)} {params?.row?.currency}
            </span>
          );
        },
      },
      {
        // User's net cashback after the system fee is deducted from the gross
        // payout — same formula used by `totalsByStatusAndCurrency` on the
        // backend (withdraw.service.ts:657-662): payout − (payout × fee/100).
        // Manually-added "Extra cashback" carries no fee, so it equals payout.
        field: "payout_user",
        headerName: "User Earning",
        width: 130,
        sortable: false,
        valueGetter: (_value, row) => conversionUserEarning(row),
        renderCell: (params) => {
          const net = Number(params.value ?? 0);
          return (
            <span>
              {net.toFixed(2)} {params?.row?.currency}
            </span>
          );
        },
      },
      {
        field: "datetime_conversion",
        headerName: "Date",
        width: 100,
        renderCell: (params) => <StackedDateTime value={params.value} />,
      },
      {
        field: "affiliate_remarks",
        headerName: "Note",
        width: 180,
      },
    ],
    [],
  );

  const columnWithdraw = useMemo<GridColDef[]>(
    () => [
      { field: "rowIndex", headerName: "#", width: 44, sortable: false },

      {
        field: "mycashback_id",
        headerName: "Wallet",
        width: 60,
        renderCell: (params) => (
          <span>{params?.row?.mycashback_id?.length > 0 ? "GGC" : "MCB"}</span>
        ),
      },
      {
        field: "amount_total",
        headerName: "Requested Amount",
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
        headerName: "Net Amount",
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
        field: "method",
        headerName: "Method",
        width: 130,
        renderCell: (params) => {
          return <span>{params.value}</span>;
        },
      },
      {
        field: "method_details",
        headerName: "Details",
        width: 240,
        sortable: false,
        renderCell: (params) => {
          const row = params.row;
          const pairs =
            row?.method === "crypto"
              ? ([
                  ["Address", row?.address],
                  ["Tx Hash", row?.tx_hash],
                ] as const)
              : ([
                  ["Bank name", row?.bank_name],
                  ["Ac. number", row?.account_number],
                  ["Ac. name", row?.account_name],
                ] as const);
          return (
            <div className="flex h-full w-full min-w-0 flex-col justify-center">
              {pairs.map(([label, value]) => (
                <div key={label} className="flex min-w-0 gap-1 text-sm">
                  <span className="shrink-0 text-gray-500 dark:text-gray-400">
                    {label}:
                  </span>
                  <span className="truncate font-medium text-gray-800 dark:text-gray-100">
                    {value || "—"}
                  </span>
                </div>
              ))}
            </div>
          );
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
              Attached
            </a>
          ) : (
            <span>N/A</span>
          ),
      },
      {
        field: "createdAt",
        headerName: "Date",
        width: 100,
        renderCell: (params) => <StackedDateTime value={params.value} />,
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

  // System fee % (e.g. 30 = 30%) — split between GGC and the user. The same
  // formula drives the Approved/Pending/Rejected totals lower on this page,
  // so showing it per-row keeps the table consistent with those numbers.
  const systemFeePct = Number(withdrawDetail?.fee?.system ?? 0);
  const rowsData =
    withdrawDetail?.allConversions?.map((item, index) => ({
      ...item,
      rowIndex: index + 1,
      systemFeePct,
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

  // Per-user membership for the User Info tab (looked up by username, matched
  // back to this user id). Mirrors how Subscription data is fetched per-user.
  const { data: userMembershipResp } = useQuery({
    queryKey: ["admin", "membership", "withdraw-detail", withdrawUserId],
    queryFn: () =>
      getMembershipUsers({
        page: 1,
        limit: 20,
        search: withdrawDetail?.user?.username ?? "",
      }),
    enabled:
      Boolean(withdrawDetail?.user?.username) &&
      (activeTab === "user" || activeTab === "subscription"),
  });
  const userMembership =
    (userMembershipResp?.data ?? []).find(
      (m: UserMembership) => m.userId === withdrawUserId,
    ) ?? null;

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
    setEditInitialEmails(
      new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean)),
    );
    setEditInitialMobiles(
      new Set(mobiles.map((m) => m.trim()).filter(Boolean)),
    );
    const emailRows =
      emails.length > 0
        ? emails.map((value) => createContactRow(value))
        : [createContactRow("")];
    const mobileRows =
      mobiles.length > 0
        ? mobiles.map((value) => createContactRow(value))
        : [createContactRow("")];
    const loadedDraft: WithdrawUserEditDraft = {
      emailRows,
      mobileRows,
      fullName: u.fullName ?? "",
      gender: u.gender ?? "",
      birthdate: birthIso,
    };
    setUserDraft(loadedDraft);
    setUserEditSnapshot(buildUserEditSnapshot(loadedDraft));
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
  }, [editUserFromQuery, withdrawDetail?.user, beginEditUser]);

  const cancelEditUser = () => {
    setEditingUser(false);
    setUserSaveError(null);
  };

  const userContactSavePlan = buildWithdrawUserContactSavePlan(
    userDraft,
    editInitialEmails,
    editInitialMobiles,
  );
  const currentUserEditSnapshot = buildUserEditSnapshot(userDraft);
  const saveableUserEditSnapshot = userEditSnapshot
    ? {
        ...currentUserEditSnapshot,
        emails: userContactSavePlan.emails ?? userEditSnapshot.emails,
        mobiles: userContactSavePlan.mobiles ?? userEditSnapshot.mobiles,
      }
    : currentUserEditSnapshot;
  const userEditDirty = userEditSnapshot
    ? isDirty(saveableUserEditSnapshot, userEditSnapshot)
    : false;
  const deferredContactLabel = userContactSavePlan.deferredChannels
    .map((channel) => (channel === "mobile" ? "phone" : channel))
    .join(" and ");

  const saveUserEdit = async () => {
    if (!withdrawUserId) return;
    setUserSaveError(null);
    setSavingUser(true);
    try {
      await updateWithdrawUserProfile({
        userId: withdrawUserId,
        ...(userContactSavePlan.emails !== undefined
          ? { emails: userContactSavePlan.emails }
          : {}),
        ...(userContactSavePlan.mobiles !== undefined
          ? { mobiles: userContactSavePlan.mobiles }
          : {}),
        fullName: userDraft.fullName,
        gender: userDraft.gender,
        birthdate: userDraft.birthdate,
      });
      await fetchWithdrawDetail();
      setEditingUser(false);
      toast.success(
        deferredContactLabel
          ? `Changes saved. Unverified ${deferredContactLabel} changes were not saved.`
          : "Changes saved.",
      );
    } catch (e: unknown) {
      setUserSaveError(getApiErrorMessage(e, "Failed to save changes"));
    } finally {
      setSavingUser(false);
    }
  };

  const isUserDataDeleted =
    withdrawDetail?.user?.fullName === "User data deleted";

  const handleDeleteUserData = async () => {
    if (!withdrawUserId) return;
    if (deleteConfirmText.trim() !== DELETE_USER_DATA_CONFIRM_PHRASE) return;
    setDeleteUserDataError(null);
    setDeleteUserDataLoading(true);
    try {
      await deleteWithdrawUserData({ userId: withdrawUserId });
      toast.success("User data removed for this profile.");
      setDeleteConfirmText("");
      await fetchWithdrawDetail();
      await fetchMCBDetail();
      void queryClient.invalidateQueries({
        queryKey: ["admin", "subscription", "withdraw-detail", withdrawUserId],
      });
    } catch (e: unknown) {
      setDeleteUserDataError(
        getApiErrorMessage(e, "Failed to delete user data"),
      );
    } finally {
      setDeleteUserDataLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-white/[0.03]">
        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav
            className="-mb-px flex flex-wrap gap-1 overflow-x-auto sm:gap-2"
            aria-label="Tabs"
          >
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const danger = tab.id === "deleteData";
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-t-lg border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none dark:focus:ring-offset-gray-900 ${
                    isActive
                      ? danger
                        ? "border-red-600 bg-red-50/90 text-red-800 hover:bg-red-50 hover:text-red-900 dark:border-red-500 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60 dark:hover:text-red-100"
                        : "border-blue-600 bg-blue-50/80 text-blue-700 hover:bg-blue-50 hover:text-blue-800 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/40 dark:hover:text-blue-200"
                      : danger
                        ? "border-transparent text-red-700/90 hover:bg-red-50 hover:text-red-900 dark:text-red-400/90 dark:hover:bg-red-950/30 dark:hover:text-red-300"
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
        <div className="min-w-0 pt-4">
          {activeTab === "user" && (
            <div className="space-y-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800/50">
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                    User Info
                  </h3>
                  {!editingUser ? (
                    <SecondaryButton
                      onClick={beginEditUser}
                      disabled={!withdrawDetail?.user || isUserDataDeleted}
                    >
                      Edit user
                    </SecondaryButton>
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
                          savingUser || !withdrawUserId || !userEditDirty
                        }
                        className="border-brand-600 bg-brand-600 hover:bg-brand-700 dark:border-brand-500 dark:bg-brand-600 dark:hover:bg-brand-500 rounded-lg border px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                {editingUser && deferredContactLabel && (
                  <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                    Unverified {deferredContactLabel} changes will not be saved.
                    You can still save other profile fields and verified contact
                    changes.
                  </p>
                )}

                {!editingUser ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                        <h4 className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                          User ID
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                          <span className="min-w-0 font-mono break-all">
                            {withdrawDetail?.user?._id ?? (id as string) ?? "—"}
                          </span>
                          <CopyButton
                            value={
                              withdrawDetail?.user?._id ?? (id as string) ?? ""
                            }
                          />
                        </div>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                        <h4 className="mb-3 text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                          Wallet
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
                          <span className="min-w-0 font-mono break-all">
                            {withdrawDetail?.user?.wallet ?? "—"}
                          </span>
                          <CopyButton
                            value={withdrawDetail?.user?.wallet || ""}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                            Email addresses
                          </h4>
                          <VerifiedPill
                            verified={withdrawDetail?.user?.emailVerified}
                            label="Email"
                          />
                        </div>
                        {viewEmails.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            —
                          </p>
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
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold tracking-wide text-gray-500 uppercase dark:text-gray-400">
                            Phone numbers
                          </h4>
                          <VerifiedPill
                            verified={withdrawDetail?.user?.phoneVerified}
                            label="Phone"
                          />
                        </div>
                        {viewMobiles.length === 0 ? (
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            —
                          </p>
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
                                <span className="min-w-0 font-mono break-all">
                                  {m}
                                </span>
                                <CopyButton value={m} />
                              </li>
                            ))}
                          </ol>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          User ID:
                        </span>{" "}
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
                      initialEmails={editInitialEmails}
                      initialMobiles={editInitialMobiles}
                      initialEmailVerified={
                        withdrawDetail?.user?.emailVerified === true
                      }
                      initialMobileVerified={
                        withdrawDetail?.user?.phoneVerified === true
                      }
                    />

                    <div>
                      <Label htmlFor="wd-user-fullname">Full name</Label>
                      <Input
                        id="wd-user-fullname"
                        value={userDraft.fullName}
                        onChange={(e) =>
                          setUserDraft((d) => ({
                            ...d,
                            fullName: e.target.value,
                          }))
                        }
                        className="h-11"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wd-user-gender">Gender</Label>
                      <select
                        id="wd-user-gender"
                        value={userDraft.gender}
                        onChange={(e) =>
                          setUserDraft((d) => ({
                            ...d,
                            gender: e.target.value,
                          }))
                        }
                        className="focus:border-brand-500 focus:ring-brand-500/20 dark:focus:border-brand-400 dark:focus:ring-brand-400/25 h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="LGBTQIA+">LGBTQIA+</option>
                        <option value="Prefer not to say">
                          Prefer not to say
                        </option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="wd-user-birthdate">Birth date</Label>
                      <Input
                        id="wd-user-birthdate"
                        type="date"
                        value={userDraft.birthdate}
                        onChange={(e) =>
                          setUserDraft((d) => ({
                            ...d,
                            birthdate: e.target.value,
                          }))
                        }
                        className="h-11"
                      />
                    </div>
                  </div>
                )}
              </div>

              {!editingUser && (
                <>
                  {(() => {
                    const wu = withdrawDetail?.user;
                    if (!wu) return null;
                    const fmtIso = (s?: string) =>
                      s ? formatDateTime(s, { fallback: s }) : "—";
                    const fullName =
                      wu.fullName?.trim() ||
                      [wu.firstName, wu.lastName].filter(Boolean).join(" ");
                    return (
                      <div>
                        <h3 className="mb-3 text-sm font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                          General information
                        </h3>
                        <div className="rounded-lg border border-gray-200 bg-white/80 p-4 dark:border-gray-700 dark:bg-gray-900/40">
                          {/* Part 1 — Identity & address */}
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium">First name:</span>{" "}
                              {wu.firstName ?? "—"}
                              {wu.firstName ? (
                                <CopyButton value={wu.firstName} />
                              ) : null}
                            </p>
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium">Last name:</span>{" "}
                              {wu.lastName ?? "—"}
                              {wu.lastName ? (
                                <CopyButton value={wu.lastName} />
                              ) : null}
                            </p>
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium">Full name:</span>{" "}
                              {fullName || "—"}
                              {fullName ? (
                                <CopyButton
                                  value={fullName}
                                  title="Copy full name"
                                />
                              ) : null}
                            </p>
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium">Username:</span>{" "}
                              {wu.username ?? "—"}
                              {wu.username ? (
                                <CopyButton value={wu.username} />
                              ) : null}
                            </p>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium">Birth date:</span>{" "}
                              {formatDate(wu.birthdate)}
                            </p>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium">Gender:</span>{" "}
                              {wu.gender ?? "—"}
                            </p>
                            <p className="text-sm text-gray-800 sm:col-span-2 dark:text-gray-200">
                              <span className="font-medium">Address:</span>{" "}
                              {wu.streetAddress ?? "—"}
                            </p>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium">City:</span>{" "}
                              {wu.city ?? "—"}
                            </p>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium">Country:</span>{" "}
                              {wu.country ?? "—"}
                            </p>
                            <p className="text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium">Zip code:</span>{" "}
                              {wu.zipCode ?? "—"}
                            </p>
                          </div>

                          {/* Part 2 — Standing (pre-launch gated). The whole
                           * section is dropped when BOTH flags are off so no
                           * empty grid / doubled divider is left behind; each
                           * row is additionally gated by its own flag so a
                           * single-flag rollout shows only the live rows. */}
                          {subscriptionTabEnabled && (
                            <>
                              <hr className="my-4 border-gray-200 dark:border-gray-700" />

                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {isCreditScoreEnabled() && (
                                  <p className="text-sm text-gray-800 dark:text-gray-200">
                                    <span className="font-medium">
                                      Credit Score:
                                    </span>{" "}
                                    {wu.creditScore != null
                                      ? wu.creditScore
                                      : "—"}
                                  </p>
                                )}
                                {isGoGoPassEnabled() && (
                                  <p className="flex items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                                    <span className="font-medium">
                                      Membership:
                                    </span>{" "}
                                    {userMembership ? (
                                      <span
                                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                          userMembership.tierName ===
                                          "GoGoPass Plus"
                                            ? "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
                                            : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                        }`}
                                      >
                                        {userMembership.tierName}
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </p>
                                )}
                                {isCreditScoreEnabled() && (
                                  <p className="flex items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                                    <span className="font-medium">
                                      Credit Tier:
                                    </span>{" "}
                                    {wu.creditScore != null ? (
                                      <span
                                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold capitalize ${CREDIT_TIER_BADGE[tierFromScore(wu.creditScore)]}`}
                                      >
                                        {tierFromScore(wu.creditScore)}
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </p>
                                )}
                                {isGoGoPassEnabled() && (
                                  <p className="flex items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                                    <span className="font-medium">
                                      Subscription:
                                    </span>{" "}
                                    {withdrawDetail?.user?.subscriptionPlan ? (
                                      <span
                                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${CYCLE_BADGE[planCycle(withdrawDetail.user.subscriptionPlan)]}`}
                                      >
                                        {
                                          CYCLE_LABEL[
                                            planCycle(
                                              withdrawDetail.user
                                                .subscriptionPlan,
                                            )
                                          ]
                                        }
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </p>
                                )}
                              </div>
                            </>
                          )}

                          <hr className="my-4 border-gray-200 dark:border-gray-700" />

                          {/* Part 3 — Account metadata */}
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium">
                                Account created:
                              </span>{" "}
                              {fmtIso(wu.createdAt)}
                            </p>
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium">Last updated:</span>{" "}
                              {fmtIso(wu.updatedAt)}
                            </p>
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium">Buyer ID:</span>{" "}
                              {wu.buyerId ?? "—"}
                              {wu.buyerId ? (
                                <CopyButton value={wu.buyerId} />
                              ) : null}
                            </p>
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                              <span className="font-medium">Publisher ID:</span>{" "}
                              {wu.publisherId ?? "—"}
                              {wu.publisherId ? (
                                <CopyButton value={wu.publisherId} />
                              ) : null}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <MyCashbackProfileSection
                    loading={myCashbackLoading}
                    error={myCashbackError}
                    user={myCashbackUser}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === "subscription" && subscriptionTabEnabled && (
            <UserActiveBenefits
              withdrawUserId={withdrawUserId}
              username={withdrawDetail?.user?.username ?? ""}
              scrollToScoring={searchParams.get("section") === "scoring"}
            />
          )}

          {activeTab === "conversion" && (
            <>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Cashback Wallet
                </h2>
                {!showWalletEdit && (
                  <SecondaryButton onClick={() => setShowWalletEdit(true)}>
                    Adjust Wallet
                  </SecondaryButton>
                )}
              </div>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/40">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm12 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm13-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM1.75 14.5a.75.75 0 0 0 0 1.5c4.417 0 8.693.603 12.749 1.73 1.111.309 2.251-.512 2.251-1.696v-.784a.75.75 0 0 0-1.5 0v.784a.272.272 0 0 1-.35.25A49.043 49.043 0 0 0 1.75 14.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Total earned cashback
                  </div>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                    {`${totalEarnedCashback(withdrawDetail).toFixed(2)} THB`}
                  </p>
                </div>
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M1 4.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 2H3.25A2.25 2.25 0 0 0 1 4.25ZM1 7.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 5H3.25A2.25 2.25 0 0 0 1 7.25ZM7 8a1 1 0 0 1 1 1 2 2 0 1 0 4 0 1 1 0 0 1 1-1h3.75A2.25 2.25 0 0 1 19 10.25v5.5A2.25 2.25 0 0 1 16.75 18H3.25A2.25 2.25 0 0 1 1 15.75v-5.5A2.25 2.25 0 0 1 3.25 8H7Z" />
                    </svg>
                    GoGoCash Wallet
                  </div>
                  <p className="mt-1 text-base font-semibold text-emerald-800 dark:text-emerald-300">
                    {withdrawDetail?.totalsByStatusAndCurrency
                      ?.find((item) => item.status === "approved")
                      ?.totalTHB?.toFixed(2) ?? "0"}{" "}
                    THB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMcbDetail(true)}
                  title="View MCB detail"
                  className="w-full cursor-pointer rounded-lg border border-blue-200 bg-blue-50 p-3 text-left transition hover:bg-blue-100 dark:border-blue-500/25 dark:bg-blue-500/10 dark:hover:bg-blue-500/15"
                >
                  <div className="flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path d="M1 4.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 2H3.25A2.25 2.25 0 0 0 1 4.25ZM1 7.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 5H3.25A2.25 2.25 0 0 0 1 7.25ZM7 8a1 1 0 0 1 1 1 2 2 0 1 0 4 0 1 1 0 0 1 1-1h3.75A2.25 2.25 0 0 1 19 10.25v5.5A2.25 2.25 0 0 1 16.75 18H3.25A2.25 2.25 0 0 1 1 15.75v-5.5A2.25 2.25 0 0 1 3.25 8H7Z" />
                    </svg>
                    MyCashback Wallet
                  </div>
                  <p className="mt-1 text-base font-semibold text-blue-800 dark:text-blue-300">
                    {MCBDetail?.availableTHB?.toFixed(2) ?? "0"} THB
                  </p>
                </button>
              </div>
              <CashbackApprovalNotice
                requests={cashbackRequests}
                resolvingId={resolvingId}
                onResolve={resolveRequest}
              />
              {showWalletEdit && (
                <UserWalletPanel
                  userId={routeUserId}
                  onAdjusted={() => void fetchWithdrawDetail()}
                  onClose={() => setShowWalletEdit(false)}
                />
              )}
              <Divider className="!my-8 !border-gray-200 dark:!border-gray-700" />
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                All Conversions
              </h2>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Approved
                  </div>
                  <p className="mt-1 text-base font-semibold text-emerald-800 dark:text-emerald-300">
                    {withdrawDetail?.totalsByStatusAndCurrency
                      ?.find((item) => item.status === "approved")
                      ?.totalTHB?.toFixed(2) ?? "0"}{" "}
                    THB
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/25 dark:bg-amber-500/10">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Pending
                  </div>
                  <p className="mt-1 text-base font-semibold text-amber-800 dark:text-amber-300">
                    {withdrawDetail?.totalsByStatusAndCurrency
                      ?.find((item) => item.status === "pending")
                      ?.totalTHB?.toFixed(2) ?? "0"}{" "}
                    THB
                  </p>
                </div>
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/25 dark:bg-red-500/10">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-red-700 dark:text-red-400">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Rejected
                  </div>
                  <p className="mt-1 text-base font-semibold text-red-800 dark:text-red-300">
                    {withdrawDetail?.totalsByStatusAndCurrency
                      ?.find((item) => item.status === "rejected")
                      ?.totalTHB?.toFixed(2) ?? "0"}{" "}
                    THB
                  </p>
                </div>
              </div>
              <WithdrawDetailDataGrid
                rows={rowsData}
                columns={column}
                pageSizeOptions={[5, 10, 15, 20]}
              />
              <Divider className="!my-8 !border-gray-200 dark:!border-gray-700" />
              <div className="space-y-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Tracking links from offers, shops & brands
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Tracking links associated with this user (mock data).
                    Replace with API when available.
                  </p>
                </div>
                {!withdrawDetail ? (
                  <div className="h-40 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
                ) : userDeeplinks.length === 0 ? (
                  <NoData>
                    No tracking link records for this user in mock data.
                    <div className="mt-1">
                      Global tracking link admin:{" "}
                      <Link
                        href="/brands?tab=deeplink"
                        className="text-brand-600 dark:text-brand-400 underline"
                      >
                        User tracking link
                      </Link>{" "}
                      <span className="text-gray-400 dark:text-gray-500">
                        (Brands Management → User tracking link)
                      </span>
                    </div>
                  </NoData>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 px-4 py-1 dark:border-gray-700">
                    <Table className="min-w-[820px] [&_td]:px-1 [&_th]:px-1">
                      <TableHeader className="border-gray-100 dark:border-gray-800">
                        <TableRow>
                          <TableCell
                            isHeader
                            className="text-theme-xs py-3 text-left font-medium text-gray-500 dark:text-gray-400"
                          >
                            Source
                          </TableCell>
                          <TableCell
                            isHeader
                            className="text-theme-xs py-3 text-center font-medium text-gray-500 dark:text-gray-400"
                          >
                            Clicks
                          </TableCell>
                          <TableCell
                            isHeader
                            className="text-theme-xs py-3 text-left font-medium text-gray-500 dark:text-gray-400"
                          >
                            Tracking link
                          </TableCell>
                          <TableCell
                            isHeader
                            className="text-theme-xs py-3 text-left font-medium text-gray-500 dark:text-gray-400"
                          >
                            Created
                          </TableCell>
                          <TableCell
                            isHeader
                            className="text-theme-xs py-3 text-left font-medium text-gray-500 dark:text-gray-400"
                          >
                            Updated
                          </TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {userDeeplinks.map((d, idx) => (
                          <TableRow key={`${d.deeplink}-${idx}`}>
                            <TableCell className="text-theme-sm py-3 text-gray-700 dark:text-gray-200">
                              <div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
                                <span className="text-theme-xs inline-flex rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                                  {d.sourceType}
                                </span>
                                <span className="whitespace-nowrap text-gray-800 dark:text-white/90">
                                  {d.offerName}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-theme-sm py-3 text-center font-medium text-gray-800 dark:text-gray-200">
                              {d.clicks}
                            </TableCell>
                            <TableCell className="text-theme-sm w-full py-3">
                              <a
                                href={d.deeplink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-brand-600 dark:text-brand-400 break-all hover:underline"
                              >
                                {d.deeplink}
                              </a>
                            </TableCell>
                            <TableCell className="text-theme-sm py-3 whitespace-nowrap">
                              <StackedDateTime value={d.createDate} />
                            </TableCell>
                            <TableCell className="text-theme-sm py-3 whitespace-nowrap">
                              <StackedDateTime value={d.updateDate} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "withdraw" && (
            <>
              <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                Withdraw Transactions
              </h2>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {Object.keys(withdrawDetail?.withdrawSumByCurrency || {})
                  .filter((status) => status !== "approved")
                  .map((status) => {
                    const style =
                      WITHDRAW_STATUS_STYLE[status] ??
                      WITHDRAW_STATUS_STYLE_FALLBACK;
                    const byCurrency =
                      withdrawDetail?.withdrawSumByCurrency?.[status];
                    const label =
                      status === "pending" ? "Requested Withdraw" : status;
                    return (
                      <div
                        key={status}
                        className={`rounded-lg border p-3 ${style.card}`}
                      >
                        <div
                          className={`flex items-center gap-1.5 text-xs font-medium ${style.head}`}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            className="h-4 w-4"
                            aria-hidden="true"
                          >
                            <path
                              fillRule="evenodd"
                              d={style.icon}
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="capitalize">{label}</span>
                        </div>
                        <p
                          className={`mt-1 text-base font-semibold ${style.value}`}
                        >
                          {byCurrency
                            ? Object.keys(byCurrency).map((currency) => (
                                <span key={currency}>
                                  {`${byCurrency[currency]?.netAmount?.toFixed(2)} ${currency} `}
                                </span>
                              ))
                            : "—"}
                        </p>
                      </div>
                    );
                  })}
                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900/40">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="h-4 w-4"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM10 7a.75.75 0 0 1 .55.24l2.5 2.69a.75.75 0 1 1-1.1 1.02l-1.2-1.29V13a.75.75 0 0 1-1.5 0V9.66l-1.2 1.29a.75.75 0 1 1-1.1-1.02l2.5-2.69A.75.75 0 0 1 10 7Z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Total Withdrawn
                  </div>
                  <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                    {withdrawDetail?.withdrawList
                      ?.filter((w) => w.status === "approved")
                      .reduce((sum, w) => sum + (w.amount_net ?? 0), 0)
                      .toFixed(2) ?? "0"}{" "}
                    THB
                  </p>
                </div>
              </div>
              <WithdrawDetailDataGrid
                rows={rowsDataWithdraw}
                columns={columnWithdraw}
                rowHeight={80}
                pageSizeOptions={[5, 10, 15, 20]}
              />
              <Divider className="!my-8 !border-gray-200 dark:!border-gray-700" />
              <div>
                <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                  Withdrawal Methods
                </h2>
                {withdrawDetail?.withdrawList &&
                withdrawDetail.withdrawList.length > 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900/50">
                    {withdrawDetail.withdrawList.map((bank, idx) => (
                      <div
                        key={bank._id}
                        className="border-b border-gray-100 p-4 last:border-b-0 dark:border-gray-800"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          {withdrawDetail.withdrawList.length > 1 ? (
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Account {idx + 1}
                            </p>
                          ) : (
                            <span />
                          )}
                          {idx === 0 && (
                            <span
                              title="Default withdrawal method"
                              className="bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="h-3.5 w-3.5"
                                aria-hidden="true"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.6a1 1 0 0 1-1.42.006l-3.5-3.5a1 1 0 1 1 1.414-1.414l2.79 2.79 6.796-6.89a1 1 0 0 1 1.414-.006Z"
                                  clipRule="evenodd"
                                />
                              </svg>
                              Default
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                            <span className="min-w-[120px] font-medium">
                              Bank:
                            </span>{" "}
                            {bank.bank_name || "N/A"}
                            <CopyButton
                              value={bank.bank_name?.trim() || "N/A"}
                            />
                          </p>
                          <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                            <span className="min-w-[120px] font-medium">
                              Account Number:
                            </span>{" "}
                            {bank.account_number || "N/A"}
                            <CopyButton
                              value={bank.account_number?.trim() || "N/A"}
                            />
                          </p>
                          <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                            <span className="min-w-[120px] font-medium">
                              Account Name:
                            </span>{" "}
                            {bank.account_name || "N/A"}
                            <CopyButton
                              value={bank.account_name?.trim() || "N/A"}
                            />
                          </p>
                          {bank.method && bank.method !== "bank_transfer" && (
                            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-800 dark:text-gray-200">
                              <span className="min-w-[120px] font-medium">
                                Address:
                              </span>{" "}
                              {bank.address || "N/A"}
                              <CopyButton
                                value={bank.address?.trim() || "N/A"}
                              />
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No bank accounts
                  </p>
                )}
              </div>
            </>
          )}

          {activeTab === "login" && (
            <div>
              <h3 className="mb-3 text-sm font-semibold tracking-wider text-gray-500 uppercase dark:text-gray-400">
                User log
              </h3>
              {withdrawDetail?.user?.userLog &&
              withdrawDetail.user.userLog.length > 0 ? (
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
                            {formatDateTime(entry.at)}
                          </td>
                          <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                            {entry.ip ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
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
          )}

          {activeTab === "deleteData" && (
            <div className="space-y-5 rounded-xl border border-red-200 bg-red-50/40 p-4 sm:p-6 dark:border-red-900/50 dark:bg-red-950/20">
              <div>
                <h2 className="text-lg font-semibold text-red-900 dark:text-red-200">
                  Delete user data
                </h2>
                <p className="mt-1 text-sm text-red-800/90 dark:text-red-300/90">
                  Permanently remove this user&apos;s personal data and activity
                  from the admin view. When wired to a real backend, this should
                  follow your retention policy and legal requirements.
                </p>
              </div>

              {isUserDataDeleted ? (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
                  User data for this profile has already been removed. Lists and
                  profile fields below are cleared in the mock environment.
                </div>
              ) : (
                <>
                  <ul className="list-inside list-disc space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                    <li>Profile contacts, wallet, and login history (mock)</li>
                    <li>
                      Conversion and withdrawal rows shown on this page (mock)
                    </li>
                    <li>Tracking link rows for this user (mock)</li>
                  </ul>
                  <div>
                    <Label className="mb-1.5 block text-gray-800 dark:text-gray-200">
                      Type{" "}
                      <span className="font-mono font-semibold text-red-700 dark:text-red-400">
                        {DELETE_USER_DATA_CONFIRM_PHRASE}
                      </span>{" "}
                      to confirm
                    </Label>
                    <Input
                      type="text"
                      autoComplete="off"
                      placeholder={DELETE_USER_DATA_CONFIRM_PHRASE}
                      value={deleteConfirmText}
                      onChange={(e) => {
                        setDeleteConfirmText(e.target.value);
                        setDeleteUserDataError(null);
                      }}
                      className="max-w-[280px]"
                    />
                  </div>
                  {deleteUserDataError ? (
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {deleteUserDataError}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    disabled={
                      deleteUserDataLoading ||
                      !withdrawUserId ||
                      deleteConfirmText.trim() !==
                        DELETE_USER_DATA_CONFIRM_PHRASE
                    }
                    onClick={() => void handleDeleteUserData()}
                    className="rounded-lg border border-red-600 bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-500 dark:bg-red-600 dark:hover:bg-red-500"
                  >
                    {deleteUserDataLoading ? "Deleting…" : "Delete user data"}
                  </button>
                </>
              )}
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
      <Modal
        isOpen={showMcbDetail}
        onClose={() => setShowMcbDetail(false)}
        className="max-w-sm p-6"
      >
        <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          MCB Detail
        </h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Total {MCBDetail?.totalMyCashbackTHB?.toFixed(2) ?? "0"} THB
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Available {MCBDetail?.availableTHB?.toFixed(2) ?? "0"} THB
        </p>
      </Modal>
    </>
  );
};

export default WithdrawDetail;
