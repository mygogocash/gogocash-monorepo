"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { Modal } from "@/components/ui/modal";
import Label from "@/components/form/Label";
import Input from "@/components/form/input/InputField";
import { fetchOffersList, offersListQueryKey } from "@/lib/query/offersQueries";
import type { Offer, OffersQuery } from "@/types/api";
import { RemoteOrBlobImage } from "@/components/common/RemoteOrBlobImage";
import { MOCK_QUESTS, mockQuestParticipantTotal } from "@/data/mockQuests";
import type {
  QuestCompletionLimit,
  QuestDetails,
  QuestTaskDisplay,
  QuestTaskType,
} from "@/types/questTable";

export type {
  QuestDetails,
  QuestTaskDisplay,
  QuestTaskType,
  QuestCompletionLimit,
};
export type ConditionOperator = "<" | ">" | "=" | ">=" | "<=";
export type ConditionMetric = "sale" | "conversion";

export interface QuestTaskCondition {
  operator: ConditionOperator;
  metric: ConditionMetric;
  amount: number;
  currency: string;
}

export interface QuestTask {
  id: string;
  taskType: QuestTaskType;
  offerId: string;
  merchantId: string;
  points: number;
  completionLimit: QuestCompletionLimit;
  condition: QuestTaskCondition | null;
  /** Uploaded logo file (overrides offer/merchant logo when set) */
  logoFile: File | null;
  /** Object URL for logoFile preview (set when logoFile is set, cleared when cleared) */
  logoPreviewUrl?: string;
  /** Merchant or custom link URL for this task */
  link: string;
}

const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "<", label: "<" },
  { value: ">", label: ">" },
  { value: "=", label: "=" },
  { value: ">=", label: ">=" },
  { value: "<=", label: "<=" },
];

const MOCK_MERCHANTS = [
  { id: "m1", name: "Merchant A" },
  { id: "m2", name: "Merchant B" },
  { id: "m3", name: "Merchant C" },
];

const CONDITION_CURRENCIES = ["THB", "USD", "EUR"] as const;

function formatCondition(c: QuestTaskCondition | null): string {
  if (!c) return "—";
  const metric = c.metric === "sale" ? "Sale" : "Conversion";
  return `${metric} ${c.operator} ${c.amount} ${c.currency}`;
}

type UserPointRow = {
  userId: string;
  email: string;
  username: string;
  points: number;
  rewards: string;
};

type UserPointsSortKey = "points" | "userId" | "username" | "email" | "rewards";

const USER_POINTS_SORT_OPTIONS: { value: UserPointsSortKey; label: string }[] =
  [
    { value: "points", label: "Points" },
    { value: "userId", label: "User ID" },
    { value: "username", label: "Username" },
    { value: "email", label: "Email" },
    { value: "rewards", label: "Rewards" },
  ];

function filterUserPointRows(rows: UserPointRow[], q: string): UserPointRow[] {
  const s = q.trim().toLowerCase();
  if (!s) return rows;
  return rows.filter((r) => {
    return (
      r.userId.toLowerCase().includes(s) ||
      r.username.toLowerCase().includes(s) ||
      r.email.toLowerCase().includes(s) ||
      r.rewards.toLowerCase().includes(s) ||
      String(r.points).includes(s)
    );
  });
}

function sortUserPointRows(
  rows: UserPointRow[],
  sort: { key: UserPointsSortKey; dir: "asc" | "desc" },
): UserPointRow[] {
  const m = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    let v = 0;
    switch (sort.key) {
      case "points":
        v = a.points - b.points;
        break;
      case "userId":
        v = a.userId.localeCompare(b.userId, undefined, {
          numeric: true,
          sensitivity: "base",
        });
        break;
      case "username":
        v = a.username.localeCompare(b.username, undefined, {
          sensitivity: "base",
        });
        break;
      case "email":
        v = a.email.localeCompare(b.email, undefined, { sensitivity: "base" });
        break;
      case "rewards":
        v = a.rewards.localeCompare(b.rewards, undefined, {
          numeric: true,
          sensitivity: "base",
        });
        break;
      default:
        v = 0;
    }
    return v * m;
  });
}

function first5(s: string): string {
  if (s.length <= 5) return s;
  return s.slice(0, 5) + "…";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAsMarkdown(rows: UserPointRow[], questTitle: string): string {
  const header = "| Rank | User ID | Username | Email | Points | Rewards |";
  const sep = "|------|---------|----------|-------|--------|---------|";
  const body = rows
    .map(
      (r, i) =>
        `| ${i + 1} | ${r.userId} | ${r.username} | ${r.email} | ${r.points} | ${r.rewards} |`,
    )
    .join("\n");
  return `# ${questTitle}\n\n${header}\n${sep}\n${body}\n`;
}

function exportAsCsv(rows: UserPointRow[]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const header = ["Rank", "User ID", "Username", "Email", "Points", "Rewards"]
    .map(escape)
    .join(",");
  const body = rows
    .map((r, i) =>
      [i + 1, r.userId, r.username, r.email, r.points, r.rewards]
        .map(escape)
        .join(","),
    )
    .join("\n");
  return "\uFEFF" + header + "\n" + body;
}

function exportAsExcelXml(rows: UserPointRow[]): string {
  const escape = (v: string) =>
    String(v)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const cols =
    '<Column ss:Index="1" ss:Width="50"/><Column ss:Width="100"/><Column ss:Width="100"/><Column ss:Width="180"/><Column ss:Width="80"/><Column ss:Width="90"/>';
  const headerRow =
    '<Row><Cell><Data ss:Type="String">Rank</Data></Cell><Cell><Data ss:Type="String">User ID</Data></Cell><Cell><Data ss:Type="String">Username</Data></Cell><Cell><Data ss:Type="String">Email</Data></Cell><Cell><Data ss:Type="String">Points</Data></Cell><Cell><Data ss:Type="String">Rewards</Data></Cell></Row>';
  const dataRows = rows
    .map(
      (r, i) =>
        `<Row><Cell><Data ss:Type="Number">${i + 1}</Data></Cell><Cell><Data ss:Type="String">${escape(r.userId)}</Data></Cell><Cell><Data ss:Type="String">${escape(r.username)}</Data></Cell><Cell><Data ss:Type="String">${escape(r.email)}</Data></Cell><Cell><Data ss:Type="Number">${r.points}</Data></Cell><Cell><Data ss:Type="String">${escape(r.rewards)}</Data></Cell></Row>`,
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="User points"><Table>${cols}${headerRow}${dataRows}</Table></Worksheet>
</Workbook>`;
}

const POINTS_PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 500, 0] as const; // 0 = All

// Format large numbers with commas for display
function formatCount(n: number): string {
  return n.toLocaleString();
}

// Mock user points per quest — supports 1000+ rows; real API would return paginated or full list
function getMockUserPointsForQuest(questId: string): UserPointRow[] {
  const rewardsOptions = [
    "—",
    "25 THB",
    "50 THB",
    "75 THB",
    "80 THB",
    "90 THB",
    "100 THB",
    "120 THB",
    "140 THB",
    "150 THB",
    "200 THB",
  ];
  const total = mockQuestParticipantTotal(questId);
  const rows: UserPointRow[] = [];
  for (let i = 1; i <= total; i++) {
    const points = 50 + ((i * 37 + i * i) % 500); // varied points 50–550
    const rewards = rewardsOptions[i % rewardsOptions.length];
    rows.push({
      userId: `u${i}`,
      email: `user${i}@example.com`,
      username: `user${i}`,
      points,
      rewards,
    });
  }
  return rows;
}

function createEmptyTask(): QuestTask {
  return {
    id: crypto.randomUUID?.() ?? String(Date.now()),
    taskType: "offer",
    offerId: "",
    merchantId: "",
    points: 0,
    completionLimit: "multiple",
    condition: null,
    logoFile: null,
    link: "",
  };
}

const QUEST_MODAL_OFFERS_QUERY: OffersQuery = {
  search: "",
  limit: 100,
  page: 1,
  country: "",
};

export default function QuestTable() {
  const [quests, setQuests] = useState<QuestDetails[]>(MOCK_QUESTS);
  const [pointsModalQuest, setPointsModalQuest] = useState<
    (typeof MOCK_QUESTS)[0] | null
  >(null);
  const [detailsModalQuest, setDetailsModalQuest] =
    useState<QuestDetails | null>(null);
  const [detailsEditMode, setDetailsEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<QuestDetails | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const startEditQuest = useCallback(() => {
    if (!detailsModalQuest) return;
    setEditDraft({
      ...detailsModalQuest,
      tasks: detailsModalQuest.tasks
        ? detailsModalQuest.tasks.map((t, i) => ({
            ...t,
            id: t.id ?? crypto.randomUUID?.() ?? `task-${Date.now()}-${i}`,
          }))
        : undefined,
    });
    setDetailsEditMode(true);
  }, [detailsModalQuest]);

  const cancelEditQuest = useCallback(() => {
    setDetailsEditMode(false);
    setEditDraft(null);
  }, []);

  const saveEditQuest = useCallback(() => {
    if (!editDraft) return;
    setEditSubmitting(true);
    // Mock persistence — in production this would call the API.
    setTimeout(() => {
      setQuests((prev) =>
        prev.map((q) => (q.id === editDraft.id ? editDraft : q)),
      );
      setDetailsModalQuest(editDraft);
      setDetailsEditMode(false);
      setEditDraft(null);
      setEditSubmitting(false);
    }, 300);
  }, [editDraft]);

  const patchEditDraft = useCallback((patch: Partial<QuestDetails>) => {
    setEditDraft((d) => (d ? { ...d, ...patch } : d));
  }, []);

  const closeDetailsModal = useCallback(() => {
    setDetailsModalQuest(null);
    setDetailsEditMode(false);
    setEditDraft(null);
  }, []);
  const [pointsModalPageSize, setPointsModalPageSize] = useState<number>(10);
  const [pointsModalSearch, setPointsModalSearch] = useState("");
  const [pointsSort, setPointsSort] = useState<{
    key: UserPointsSortKey;
    dir: "asc" | "desc";
  }>({
    key: "points",
    dir: "desc",
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Create Quest form state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [facebookPage, setFacebookPage] = useState("No");
  const [facebookPageLink, setFacebookPageLink] = useState("");
  const [facebookPost, setFacebookPost] = useState("No");
  const [facebookPostLink, setFacebookPostLink] = useState("");
  const [line, setLine] = useState("No");
  const [lineLink, setLineLink] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [tasks, setTasks] = useState<QuestTask[]>([]);

  const { data: offersData } = useQuery({
    queryKey: offersListQueryKey(QUEST_MODAL_OFFERS_QUERY),
    queryFn: () => fetchOffersList(QUEST_MODAL_OFFERS_QUERY),
    enabled: createModalOpen || detailsEditMode,
    staleTime: 30_000,
  });
  const offers: Offer[] = offersData?.data ?? [];

  // Helpers for the inline task editor inside the Quest details edit mode.
  const patchEditTask = useCallback(
    (index: number, patch: Partial<QuestTaskDisplay>) => {
      setEditDraft((d) => {
        if (!d || !d.tasks) return d;
        return {
          ...d,
          tasks: d.tasks.map((t, i) => (i === index ? { ...t, ...patch } : t)),
        };
      });
    },
    [],
  );

  const removeEditTask = useCallback((index: number) => {
    setEditDraft((d) => {
      if (!d || !d.tasks) return d;
      return { ...d, tasks: d.tasks.filter((_, i) => i !== index) };
    });
  }, []);

  const moveEditTask = useCallback((index: number, direction: -1 | 1) => {
    setEditDraft((d) => {
      if (!d || !d.tasks) return d;
      const target = index + direction;
      if (target < 0 || target >= d.tasks.length) return d;
      const next = [...d.tasks];
      [next[index], next[target]] = [next[target], next[index]];
      return { ...d, tasks: next };
    });
  }, []);

  // Drag-and-drop reorder for the edit-mode tasks list (uses native HTML5 DnD).
  const [dragSrcIndex, setDragSrcIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const reorderEditTasks = useCallback((from: number, to: number) => {
    setEditDraft((d) => {
      if (!d || !d.tasks) return d;
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= d.tasks.length ||
        to >= d.tasks.length
      )
        return d;
      const next = [...d.tasks];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...d, tasks: next };
    });
  }, []);

  const addEditTask = useCallback(() => {
    setEditDraft((d) => {
      if (!d) return d;
      const empty: QuestTaskDisplay = {
        id: crypto.randomUUID?.() ?? `task-${Date.now()}`,
        taskType: "offer",
        offerId: "",
        offerName: "",
        points: 0,
        completionLimit: "once",
        condition: null,
        link: "",
      };
      return { ...d, tasks: d.tasks ? [...d.tasks, empty] : [empty] };
    });
  }, []);

  const openPointsModal = (q: QuestDetails) => {
    setPointsModalPageSize(10);
    setPointsModalSearch("");
    setPointsSort({ key: "points", dir: "desc" });
    setExportOpen(false);
    setPointsModalQuest(q);
  };

  const closePointsModal = () => {
    setExportOpen(false);
    setPointsModalSearch("");
    setPointsModalQuest(null);
  };

  const onPointsSortHeaderClick = useCallback((key: UserPointsSortKey) => {
    setPointsSort((s) =>
      s.key === key
        ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
        : { key, dir: key === "points" ? "desc" : "asc" },
    );
  }, []);

  const pointsModalPrepared = useMemo(() => {
    if (!pointsModalQuest) return null;
    const all = getMockUserPointsForQuest(pointsModalQuest.id);
    const filtered = filterUserPointRows(all, pointsModalSearch);
    const sorted = sortUserPointRows(filtered, pointsSort);
    const pageSize = pointsModalPageSize;
    const display = pageSize === 0 ? sorted : sorted.slice(0, pageSize);
    return { all, filtered, sorted, display };
  }, [pointsModalQuest, pointsModalSearch, pointsSort, pointsModalPageSize]);

  useEffect(() => {
    if (!exportOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node))
        setExportOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportOpen]);

  const handleExport = (format: "markdown" | "csv" | "excel") => {
    if (!pointsModalQuest || !pointsModalPrepared) return;
    const rows = pointsModalPrepared.sorted;
    const slug = pointsModalQuest.id.slice(-8);
    const questTitle = `Quest ${pointsModalQuest.id} (${pointsModalQuest.startDate} – ${pointsModalQuest.endDate})`;
    if (format === "markdown") {
      const text = exportAsMarkdown(rows, questTitle);
      downloadBlob(
        new Blob([text], { type: "text/markdown;charset=utf-8" }),
        `quest-user-points-${slug}.md`,
      );
    } else if (format === "csv") {
      const text = exportAsCsv(rows);
      downloadBlob(
        new Blob([text], { type: "text/csv;charset=utf-8" }),
        `quest-user-points-${slug}.csv`,
      );
    } else {
      const xml = exportAsExcelXml(rows);
      downloadBlob(
        new Blob([xml], { type: "application/vnd.ms-excel" }),
        `quest-user-points-${slug}.xls`,
      );
    }
    setExportOpen(false);
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="min-w-0">
          <h3 className="truncate text-base font-medium text-gray-800 dark:text-white/90">
            Quest Lists
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Total: {quests.length}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="shrink-0 rounded bg-blue-500 px-2 py-1 text-sm font-medium text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          Create Quest
        </button>
      </div>
      <div className="min-w-0 overflow-x-auto border-t border-gray-100 dark:border-gray-700 dark:bg-white/[0.02]">
        <Table className="min-w-[480px]">
          <TableHeader className="border-gray-100 dark:border-gray-800">
            <TableRow>
              <TableCell
                isHeader
                className="text-theme-xs py-3 text-center font-medium text-gray-500 dark:text-gray-400"
              >
                ID
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs py-3 text-center font-medium text-gray-500 dark:text-gray-400"
              >
                Start Date
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs py-3 text-center font-medium text-gray-500 dark:text-gray-400"
              >
                End Date
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs py-3 text-center font-medium text-gray-500 dark:text-gray-400"
              >
                Status
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs py-3 text-center font-medium text-gray-500 dark:text-gray-400"
              >
                Reward Status
              </TableCell>
              <TableCell
                isHeader
                className="text-theme-xs py-3 text-center font-medium text-gray-500 dark:text-gray-400"
              >
                Action
              </TableCell>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {quests.map((q) => (
              <TableRow
                key={q.id}
                title="Click row for quick view"
                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80"
                onClick={() => setDetailsModalQuest(q)}
              >
                <TableCell
                  className="text-theme-sm py-3 text-center font-mono whitespace-nowrap text-gray-800 dark:text-white/90"
                  title={q.id}
                >
                  <span className="inline-block max-w-full truncate px-1 sm:max-w-[180px]">
                    {q.id}
                  </span>
                </TableCell>
                <TableCell className="text-theme-sm py-3 text-center whitespace-nowrap text-gray-600 dark:text-gray-300">
                  {q.startDate}
                </TableCell>
                <TableCell className="text-theme-sm py-3 text-center whitespace-nowrap text-gray-600 dark:text-gray-300">
                  {q.endDate}
                </TableCell>
                <TableCell className="py-3 text-center whitespace-nowrap">
                  <Badge
                    size="sm"
                    color={q.status === "active" ? "success" : "warning"}
                  >
                    {q.status}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 text-center whitespace-nowrap">
                  <Badge
                    size="sm"
                    color={q.rewardStatus === "claimed" ? "success" : "warning"}
                  >
                    {q.rewardStatus}
                  </Badge>
                </TableCell>
                <TableCell className="py-3 text-center whitespace-nowrap">
                  <div
                    className="flex flex-wrap items-center justify-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setDetailsModalQuest(q)}
                      className="shrink-0 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      View Quest details
                    </button>
                    <button
                      type="button"
                      onClick={() => openPointsModal(q)}
                      className="shrink-0 rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                    >
                      View points
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Modal
        isOpen={!!pointsModalQuest}
        onClose={closePointsModal}
        isFullscreen
        showCloseButton={false}
        className="p-0"
      >
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 md:p-8 dark:border-gray-700 dark:bg-gray-800">
          {/* Title + Close in header row */}
          <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                User points
              </h3>
              <p
                className="mt-1 max-w-full text-sm break-words text-gray-500 dark:text-gray-400"
                title={
                  pointsModalQuest
                    ? `Quest ${pointsModalQuest.id} (${pointsModalQuest.startDate} – ${pointsModalQuest.endDate})`
                    : undefined
                }
              >
                {pointsModalQuest
                  ? `Quest ${pointsModalQuest.id} (${pointsModalQuest.startDate} – ${pointsModalQuest.endDate})`
                  : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={closePointsModal}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>

          {/* Search + sort / page size / export toolbar */}
          <div className="mb-4 flex shrink-0 flex-col gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
            <div className="min-w-0 flex-1">
              <label
                htmlFor="points-search"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Search participants
              </label>
              <Input
                id="points-search"
                type="search"
                placeholder="User ID, username, email, points, rewards…"
                value={pointsModalSearch}
                onChange={(e) => setPointsModalSearch(e.target.value)}
                className="w-full min-w-0 sm:max-w-xl"
                autoComplete="off"
                enterKeyHint="search"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="points-sort-key"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Sort by
                  </label>
                  <select
                    id="points-sort-key"
                    value={pointsSort.key}
                    onChange={(e) => {
                      const key = e.target.value as UserPointsSortKey;
                      setPointsSort({
                        key,
                        dir: key === "points" ? "desc" : "asc",
                      });
                    }}
                    className="focus:ring-brand-500/20 h-9 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {USER_POINTS_SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="points-sort-dir"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Order
                  </label>
                  <select
                    id="points-sort-dir"
                    value={pointsSort.dir}
                    onChange={(e) =>
                      setPointsSort((s) => ({
                        ...s,
                        dir: e.target.value as "asc" | "desc",
                      }))
                    }
                    className="focus:ring-brand-500/20 h-9 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="points-show"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Show
                  </label>
                  <select
                    id="points-show"
                    value={pointsModalPageSize}
                    onChange={(e) =>
                      setPointsModalPageSize(Number(e.target.value))
                    }
                    className="focus:ring-brand-500/20 h-9 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 focus:ring-2 focus:outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  >
                    {POINTS_PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n === 0 ? "All" : n}
                      </option>
                    ))}
                  </select>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {pointsModalPrepared
                      ? (() => {
                          const { all, filtered, display } =
                            pointsModalPrepared;
                          const showing = display.length;
                          const matchTotal = filtered.length;
                          const allTotal = all.length;
                          const suffix =
                            matchTotal !== allTotal || pointsModalSearch.trim()
                              ? ` matching (${formatCount(allTotal)} total)`
                              : "";
                          return `${formatCount(showing)} of ${formatCount(matchTotal)}${suffix}`;
                        })()
                      : ""}
                  </span>
                </div>
              </div>
              <div className="relative shrink-0" ref={exportRef}>
                <button
                  type="button"
                  onClick={() => setExportOpen((o) => !o)}
                  className="shadow-theme-xs flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                  title={
                    pointsModalQuest && pointsModalPrepared
                      ? pointsModalSearch.trim() ||
                        pointsModalPrepared.filtered.length !==
                          pointsModalPrepared.all.length
                        ? `Export ${formatCount(pointsModalPrepared.sorted.length)} matching participants (current sort & search)`
                        : `Export all ${formatCount(pointsModalPrepared.all.length)} participants (current sort)`
                      : undefined
                  }
                >
                  <svg
                    className="h-4 w-4 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Export
                </button>
                {exportOpen && (
                  <div className="absolute top-full right-auto left-0 z-20 mt-1 max-w-[min(20rem,calc(100vw-1.5rem))] min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg sm:right-0 sm:left-auto sm:max-w-none dark:border-gray-600 dark:bg-gray-700">
                    {pointsModalQuest && pointsModalPrepared && (
                      <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
                        Export {formatCount(pointsModalPrepared.sorted.length)}{" "}
                        {pointsModalPrepared.sorted.length === 1
                          ? "row"
                          : "rows"}
                        {pointsModalSearch.trim() ||
                        pointsModalPrepared.filtered.length !==
                          pointsModalPrepared.all.length
                          ? ` (search/filter; ${formatCount(pointsModalPrepared.all.length)} total in quest)`
                          : ""}
                        . Order matches the table.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => handleExport("markdown")}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-600"
                    >
                      Markdown (.md)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("csv")}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-600"
                    >
                      CSV (.csv)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport("excel")}
                      className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-600"
                    >
                      Excel (.xls)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Table — fills remaining space; min-height fits header + 10 rows (py-3 × 11 ≈ 520px) */}
          <div
            className="min-h-0 min-w-0 flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-600"
            style={{ minHeight: 520 }}
          >
            <Table className="min-w-[380px]">
              <TableHeader className="sticky top-0 z-[1] border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
                <TableRow>
                  <TableCell
                    isHeader
                    className="text-theme-xs py-3 text-center font-medium text-gray-500 dark:text-gray-400"
                  >
                    Rank
                  </TableCell>
                  {(
                    [
                      ["User ID", "userId"],
                      ["Username", "username"],
                      ["Email", "email"],
                      ["Points", "points"],
                      ["Rewards", "rewards"],
                    ] as const
                  ).map(([label, sortKey]) => {
                    const active = pointsSort.key === sortKey;
                    return (
                      <TableCell
                        key={sortKey}
                        isHeader
                        className="text-theme-xs p-0 text-center font-medium text-gray-500 dark:text-gray-400"
                      >
                        <button
                          type="button"
                          onClick={() => onPointsSortHeaderClick(sortKey)}
                          className="text-theme-xs flex w-full items-center justify-center gap-1 px-2 py-3 font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-600/50"
                          title={
                            active
                              ? `Sorted ${pointsSort.dir === "asc" ? "ascending" : "descending"}. Click to reverse.`
                              : "Click to sort"
                          }
                        >
                          <span>{label}</span>
                          <span
                            className="inline-flex h-4 w-3 flex-col justify-center gap-0 text-[9px] leading-[0.65]"
                            aria-hidden
                          >
                            <span
                              className={
                                active && pointsSort.dir === "asc"
                                  ? "text-gray-800 dark:text-white"
                                  : "text-gray-300 dark:text-gray-600"
                              }
                            >
                              {"\u25B2"}
                            </span>
                            <span
                              className={
                                active && pointsSort.dir === "desc"
                                  ? "text-gray-800 dark:text-white"
                                  : "text-gray-300 dark:text-gray-600"
                              }
                            >
                              {"\u25BC"}
                            </span>
                          </span>
                        </button>
                      </TableCell>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {pointsModalPrepared &&
                  (pointsModalPrepared.display.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        className="text-theme-sm py-10 text-center text-gray-500 dark:text-gray-400"
                      >
                        No participants match your search.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pointsModalPrepared.display.map((u, index) => (
                      <TableRow key={u.userId}>
                        <TableCell className="text-theme-sm py-3 text-center font-medium text-gray-800 dark:text-white/90">
                          {index + 1}
                        </TableCell>
                        <TableCell
                          className="text-theme-sm py-3 text-center font-mono text-gray-800 dark:text-white/90"
                          title={u.userId}
                        >
                          {first5(u.userId)}
                        </TableCell>
                        <TableCell
                          className="text-theme-sm py-3 text-center text-gray-600 dark:text-gray-300"
                          title={u.username}
                        >
                          {first5(u.username)}
                        </TableCell>
                        <TableCell
                          className="text-theme-sm py-3 text-center text-gray-600 dark:text-gray-300"
                          title={u.email}
                        >
                          {first5(u.email)}
                        </TableCell>
                        <TableCell className="text-theme-sm py-3 text-center font-medium text-gray-800 dark:text-white/90">
                          {u.points}
                        </TableCell>
                        <TableCell className="text-theme-sm py-3 text-center text-gray-600 dark:text-gray-300">
                          {u.rewards}
                        </TableCell>
                      </TableRow>
                    ))
                  ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Modal>

      {/* Quest details modal — fullscreen */}
      <Modal
        isOpen={!!detailsModalQuest}
        onClose={closeDetailsModal}
        isFullscreen
        showCloseButton={false}
        className="p-0"
      >
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 md:p-8 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {detailsEditMode ? "Edit quest" : "Quest details"}
            </h3>
            <div className="flex shrink-0 items-center gap-2">
              {detailsEditMode ? (
                <>
                  <button
                    type="button"
                    onClick={cancelEditQuest}
                    disabled={editSubmitting}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEditQuest}
                    disabled={editSubmitting}
                    className="border-brand-500 bg-brand-500 hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600 rounded-lg border px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    {editSubmitting ? "Saving…" : "Save changes"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={startEditQuest}
                    className="border-brand-500 bg-brand-500 hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600 rounded-lg border px-4 py-2 text-sm font-medium text-white"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={closeDetailsModal}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-4">
            {detailsModalQuest && (
              <>
                <dl className="space-y-4 text-sm">
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      ID
                    </dt>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Unique identifier for this quest. Use it when referring to
                      the quest in APIs or exports.
                    </p>
                    <dd
                      className="mt-1 font-mono text-gray-800 dark:text-white/90"
                      title={detailsModalQuest.id}
                    >
                      {detailsModalQuest.id}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Start Date
                    </dt>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      When the quest becomes available for users to join and
                      complete tasks.
                    </p>
                    {detailsEditMode && editDraft ? (
                      <Input
                        type="text"
                        value={editDraft.startDate}
                        onChange={(e) =>
                          patchEditDraft({ startDate: e.target.value })
                        }
                        placeholder="Ex.(2026-02-01)"
                        className="mt-2"
                      />
                    ) : (
                      <dd className="mt-1 text-gray-800 dark:text-white/90">
                        {detailsModalQuest.startDate}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      End Date
                    </dt>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Last day users can earn points or claim rewards for this
                      quest.
                    </p>
                    {detailsEditMode && editDraft ? (
                      <Input
                        type="text"
                        value={editDraft.endDate}
                        onChange={(e) =>
                          patchEditDraft({ endDate: e.target.value })
                        }
                        placeholder="Ex.(2026-02-28)"
                        className="mt-2"
                      />
                    ) : (
                      <dd className="mt-1 text-gray-800 dark:text-white/90">
                        {detailsModalQuest.endDate}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Status
                    </dt>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Whether the quest is currently active (live) or pending
                      (scheduled).
                    </p>
                    {detailsEditMode && editDraft ? (
                      <select
                        value={editDraft.status}
                        onChange={(e) =>
                          patchEditDraft({ status: e.target.value })
                        }
                        className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="active">active</option>
                        <option value="pending">pending</option>
                      </select>
                    ) : (
                      <dd className="mt-1">
                        <Badge
                          size="sm"
                          color={
                            detailsModalQuest.status === "active"
                              ? "success"
                              : "warning"
                          }
                        >
                          {detailsModalQuest.status}
                        </Badge>
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Reward Status
                    </dt>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Whether the quest reward has been claimed or is still
                      pending.
                    </p>
                    {detailsEditMode && editDraft ? (
                      <select
                        value={editDraft.rewardStatus}
                        onChange={(e) =>
                          patchEditDraft({ rewardStatus: e.target.value })
                        }
                        className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="claimed">claimed</option>
                        <option value="pending">pending</option>
                      </select>
                    ) : (
                      <dd className="mt-1">
                        <Badge
                          size="sm"
                          color={
                            detailsModalQuest.rewardStatus === "claimed"
                              ? "success"
                              : "warning"
                          }
                        >
                          {detailsModalQuest.rewardStatus}
                        </Badge>
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Facebook Page
                    </dt>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Whether this quest is promoted on the Facebook page (and
                      if a link was set).
                    </p>
                    {detailsEditMode && editDraft ? (
                      <select
                        value={editDraft.facebookPage}
                        onChange={(e) =>
                          patchEditDraft({ facebookPage: e.target.value })
                        }
                        className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : (
                      <dd className="mt-1 text-gray-800 dark:text-white/90">
                        {detailsModalQuest.facebookPage}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Facebook Post
                    </dt>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Whether this quest was announced in a Facebook post (and
                      if a link was set).
                    </p>
                    {detailsEditMode && editDraft ? (
                      <select
                        value={editDraft.facebookPost}
                        onChange={(e) =>
                          patchEditDraft({ facebookPost: e.target.value })
                        }
                        className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : (
                      <dd className="mt-1 text-gray-800 dark:text-white/90">
                        {detailsModalQuest.facebookPost}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Line
                    </dt>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Whether this quest is promoted via Line (and if a link was
                      set).
                    </p>
                    {detailsEditMode && editDraft ? (
                      <select
                        value={editDraft.line}
                        onChange={(e) =>
                          patchEditDraft({ line: e.target.value })
                        }
                        className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : (
                      <dd className="mt-1 text-gray-800 dark:text-white/90">
                        {detailsModalQuest.line}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Banner EN
                    </dt>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Whether an English main banner image was uploaded for this
                      quest.
                    </p>
                    {detailsEditMode && editDraft ? (
                      <select
                        value={editDraft.bannerEn}
                        onChange={(e) =>
                          patchEditDraft({ bannerEn: e.target.value })
                        }
                        className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : (
                      <dd className="mt-1 text-gray-800 dark:text-white/90">
                        {detailsModalQuest.bannerEn}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Banner TH
                    </dt>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Whether a Thai main banner image was uploaded for this
                      quest.
                    </p>
                    {detailsEditMode && editDraft ? (
                      <select
                        value={editDraft.bannerTh}
                        onChange={(e) =>
                          patchEditDraft({ bannerTh: e.target.value })
                        }
                        className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : (
                      <dd className="mt-1 text-gray-800 dark:text-white/90">
                        {detailsModalQuest.bannerTh}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Sub Banner EN
                    </dt>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Whether an English sub-banner image was uploaded for this
                      quest.
                    </p>
                    {detailsEditMode && editDraft ? (
                      <select
                        value={editDraft.subBannerEn}
                        onChange={(e) =>
                          patchEditDraft({ subBannerEn: e.target.value })
                        }
                        className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : (
                      <dd className="mt-1 text-gray-800 dark:text-white/90">
                        {detailsModalQuest.subBannerEn}
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="font-medium text-gray-500 dark:text-gray-400">
                      Sub Banner TH
                    </dt>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      Whether a Thai sub-banner image was uploaded for this
                      quest.
                    </p>
                    {detailsEditMode && editDraft ? (
                      <select
                        value={editDraft.subBannerTh}
                        onChange={(e) =>
                          patchEditDraft({ subBannerTh: e.target.value })
                        }
                        className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      >
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>
                    ) : (
                      <dd className="mt-1 text-gray-800 dark:text-white/90">
                        {detailsModalQuest.subBannerTh}
                      </dd>
                    )}
                  </div>
                </dl>

                {/* Links section — shown when any social channel is Yes (uses draft when editing) */}
                {(() => {
                  const linkSource =
                    detailsEditMode && editDraft
                      ? editDraft
                      : detailsModalQuest;
                  const showSection =
                    linkSource.facebookPage === "Yes" ||
                    linkSource.facebookPost === "Yes" ||
                    linkSource.line === "Yes";
                  if (!showSection) return null;
                  return (
                    <section className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
                      <h4 className="mb-3 text-base font-semibold text-gray-800 dark:text-white">
                        Links
                      </h4>
                      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
                        URLs for promotion channels. Shown when the channel is
                        enabled above.
                      </p>
                      <dl className="space-y-3 text-sm">
                        {linkSource.facebookPage === "Yes" && (
                          <div>
                            <dt className="font-medium text-gray-500 dark:text-gray-400">
                              Facebook Page link
                            </dt>
                            {detailsEditMode && editDraft ? (
                              <Input
                                type="url"
                                value={editDraft.facebookPageLink ?? ""}
                                onChange={(e) =>
                                  patchEditDraft({
                                    facebookPageLink: e.target.value,
                                  })
                                }
                                placeholder="https://..."
                                className="mt-2"
                              />
                            ) : (
                              <dd className="mt-1">
                                {detailsModalQuest.facebookPageLink ? (
                                  <a
                                    href={detailsModalQuest.facebookPageLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-600 dark:text-brand-400 break-all hover:underline"
                                  >
                                    {detailsModalQuest.facebookPageLink}
                                  </a>
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    Not set
                                  </span>
                                )}
                              </dd>
                            )}
                          </div>
                        )}
                        {linkSource.facebookPost === "Yes" && (
                          <div>
                            <dt className="font-medium text-gray-500 dark:text-gray-400">
                              Facebook Post link
                            </dt>
                            {detailsEditMode && editDraft ? (
                              <Input
                                type="url"
                                value={editDraft.facebookPostLink ?? ""}
                                onChange={(e) =>
                                  patchEditDraft({
                                    facebookPostLink: e.target.value,
                                  })
                                }
                                placeholder="https://..."
                                className="mt-2"
                              />
                            ) : (
                              <dd className="mt-1">
                                {detailsModalQuest.facebookPostLink ? (
                                  <a
                                    href={detailsModalQuest.facebookPostLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-600 dark:text-brand-400 break-all hover:underline"
                                  >
                                    {detailsModalQuest.facebookPostLink}
                                  </a>
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    Not set
                                  </span>
                                )}
                              </dd>
                            )}
                          </div>
                        )}
                        {linkSource.line === "Yes" && (
                          <div>
                            <dt className="font-medium text-gray-500 dark:text-gray-400">
                              Line link
                            </dt>
                            {detailsEditMode && editDraft ? (
                              <Input
                                type="url"
                                value={editDraft.lineLink ?? ""}
                                onChange={(e) =>
                                  patchEditDraft({ lineLink: e.target.value })
                                }
                                placeholder="https://..."
                                className="mt-2"
                              />
                            ) : (
                              <dd className="mt-1">
                                {detailsModalQuest.lineLink ? (
                                  <a
                                    href={detailsModalQuest.lineLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-brand-600 dark:text-brand-400 break-all hover:underline"
                                  >
                                    {detailsModalQuest.lineLink}
                                  </a>
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    Not set
                                  </span>
                                )}
                              </dd>
                            )}
                          </div>
                        )}
                      </dl>
                    </section>
                  );
                })()}

                {/* Tasks section — read-only in view mode, fully editable in edit mode (reorder/edit/remove/add) */}
                {(() => {
                  const taskSource =
                    detailsEditMode && editDraft
                      ? editDraft
                      : detailsModalQuest;
                  const tasksList = taskSource.tasks ?? [];
                  const showSection = detailsEditMode || tasksList.length > 0;
                  if (!showSection) return null;
                  return (
                    <section className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="text-base font-semibold text-gray-800 dark:text-white">
                            Tasks
                          </h4>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                            {detailsEditMode
                              ? "Drag the ⋮⋮ handle (or use the arrow buttons) to reorder. Edit fields inline, or remove a task. Logo uploads stay in the Create Quest flow."
                              : "Tasks linked to offers or merchants. Users complete these to earn points."}
                          </p>
                        </div>
                        {detailsEditMode && (
                          <button
                            type="button"
                            onClick={addEditTask}
                            className="border-brand-500 bg-brand-500 hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600 shrink-0 rounded-lg border px-3 py-2 text-sm font-medium text-white"
                          >
                            Add task
                          </button>
                        )}
                      </div>
                      {tasksList.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800/40 dark:text-gray-400">
                          No tasks yet. Click &quot;Add task&quot; to create
                          one.
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {tasksList.map((task, index) => {
                            const isDragSource = dragSrcIndex === index;
                            const isDragTarget =
                              detailsEditMode &&
                              dragSrcIndex !== null &&
                              dragOverIndex === index &&
                              dragSrcIndex !== index;
                            return (
                              <div
                                key={task.id ?? index}
                                onDragOver={
                                  detailsEditMode
                                    ? (e) => {
                                        if (dragSrcIndex === null) return;
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = "move";
                                        if (dragOverIndex !== index)
                                          setDragOverIndex(index);
                                      }
                                    : undefined
                                }
                                onDrop={
                                  detailsEditMode
                                    ? (e) => {
                                        e.preventDefault();
                                        if (
                                          dragSrcIndex !== null &&
                                          dragSrcIndex !== index
                                        ) {
                                          reorderEditTasks(dragSrcIndex, index);
                                        }
                                        setDragSrcIndex(null);
                                        setDragOverIndex(null);
                                      }
                                    : undefined
                                }
                                className={[
                                  "rounded-lg border bg-gray-50/50 p-4 transition-all dark:bg-gray-800/40",
                                  isDragSource
                                    ? "border-brand-400 opacity-50"
                                    : "border-gray-200 dark:border-gray-600",
                                  isDragTarget
                                    ? "border-brand-500 ring-brand-500/30 ring-2"
                                    : "",
                                ]
                                  .filter(Boolean)
                                  .join(" ")}
                              >
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    {detailsEditMode && (
                                      <button
                                        type="button"
                                        aria-label="Drag to reorder"
                                        title="Drag to reorder"
                                        draggable
                                        onDragStart={(e) => {
                                          setDragSrcIndex(index);
                                          e.dataTransfer.effectAllowed = "move";
                                          e.dataTransfer.setData(
                                            "text/plain",
                                            String(index),
                                          );
                                        }}
                                        onDragEnd={() => {
                                          setDragSrcIndex(null);
                                          setDragOverIndex(null);
                                        }}
                                        className="cursor-grab rounded border border-gray-300 bg-white px-1.5 py-1 text-sm leading-none text-gray-500 select-none hover:bg-gray-100 active:cursor-grabbing dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                      >
                                        <span aria-hidden>⋮⋮</span>
                                      </button>
                                    )}
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      Task {index + 1}
                                    </span>
                                  </div>
                                  {detailsEditMode && (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        aria-label="Move task up"
                                        onClick={() => moveEditTask(index, -1)}
                                        disabled={index === 0}
                                        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                      >
                                        ↑
                                      </button>
                                      <button
                                        type="button"
                                        aria-label="Move task down"
                                        onClick={() => moveEditTask(index, 1)}
                                        disabled={
                                          index === tasksList.length - 1
                                        }
                                        className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                      >
                                        ↓
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeEditTask(index)}
                                        className="ml-1 rounded border border-red-300 bg-white px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-red-700 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-red-900/20"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  )}
                                </div>
                                {detailsEditMode ? (
                                  <div className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2">
                                    <div>
                                      <Label className="text-xs">Type</Label>
                                      <select
                                        value={task.taskType}
                                        onChange={(e) => {
                                          const taskType = e.target
                                            .value as QuestTaskType;
                                          // Clear the now-irrelevant id/name when switching task type so we don't keep stale references.
                                          patchEditTask(
                                            index,
                                            taskType === "offer"
                                              ? {
                                                  taskType,
                                                  merchantId: undefined,
                                                  merchantName: undefined,
                                                }
                                              : {
                                                  taskType,
                                                  offerId: undefined,
                                                  offerName: undefined,
                                                },
                                          );
                                        }}
                                        className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                      >
                                        <option value="offer">Offer</option>
                                        <option value="merchant">
                                          Merchant
                                        </option>
                                      </select>
                                    </div>
                                    <div>
                                      <Label className="text-xs">
                                        {task.taskType === "offer"
                                          ? "Offer"
                                          : "Merchant"}
                                      </Label>
                                      {task.taskType === "offer" ? (
                                        <select
                                          value={task.offerId ?? ""}
                                          onChange={(e) => {
                                            const offerId = e.target.value;
                                            const offer = offers.find(
                                              (o) => o._id === offerId,
                                            );
                                            patchEditTask(index, {
                                              offerId,
                                              offerName:
                                                offer?.offer_name ?? "",
                                            });
                                          }}
                                          className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                        >
                                          <option value="">
                                            — Select an offer —
                                          </option>
                                          {/* Keep existing offer visible even if not in fetched list */}
                                          {task.offerId &&
                                            !offers.find(
                                              (o) => o._id === task.offerId,
                                            ) && (
                                              <option value={task.offerId}>
                                                {task.offerName ?? task.offerId}
                                              </option>
                                            )}
                                          {offers.map((o) => (
                                            <option key={o._id} value={o._id}>
                                              {o.offer_name}
                                            </option>
                                          ))}
                                        </select>
                                      ) : (
                                        <select
                                          value={task.merchantId ?? ""}
                                          onChange={(e) => {
                                            const merchantId = e.target.value;
                                            const merchant =
                                              MOCK_MERCHANTS.find(
                                                (m) => m.id === merchantId,
                                              );
                                            patchEditTask(index, {
                                              merchantId,
                                              merchantName:
                                                merchant?.name ?? "",
                                            });
                                          }}
                                          className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                        >
                                          <option value="">
                                            — Select a merchant —
                                          </option>
                                          {MOCK_MERCHANTS.map((m) => (
                                            <option key={m.id} value={m.id}>
                                              {m.name}
                                            </option>
                                          ))}
                                        </select>
                                      )}
                                    </div>
                                    <div>
                                      <Label className="text-xs">Points</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={String(task.points)}
                                        onChange={(e) =>
                                          patchEditTask(index, {
                                            points:
                                              Number.parseInt(
                                                e.target.value,
                                                10,
                                              ) || 0,
                                          })
                                        }
                                        className="mt-2"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">
                                        Completion
                                      </Label>
                                      <select
                                        value={task.completionLimit}
                                        onChange={(e) =>
                                          patchEditTask(index, {
                                            completionLimit: e.target
                                              .value as QuestCompletionLimit,
                                          })
                                        }
                                        className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                      >
                                        <option value="once">Once</option>
                                        <option value="multiple">
                                          Multiple
                                        </option>
                                      </select>
                                    </div>
                                    <div className="sm:col-span-2">
                                      <div className="flex items-center justify-between">
                                        <Label className="text-xs">
                                          Condition
                                        </Label>
                                        <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                          <input
                                            type="checkbox"
                                            checked={!!task.condition}
                                            onChange={(e) =>
                                              patchEditTask(index, {
                                                condition: e.target.checked
                                                  ? {
                                                      operator: ">=",
                                                      metric: "sale",
                                                      amount: 0,
                                                      currency: "THB",
                                                    }
                                                  : null,
                                              })
                                            }
                                          />
                                          Has condition
                                        </label>
                                      </div>
                                      {task.condition ? (
                                        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                          <select
                                            value={task.condition.metric}
                                            onChange={(e) =>
                                              patchEditTask(index, {
                                                condition: {
                                                  ...(task.condition as QuestTaskCondition),
                                                  metric: e.target
                                                    .value as ConditionMetric,
                                                },
                                              })
                                            }
                                            className="focus:ring-brand-500/10 h-11 rounded-lg border border-gray-200 bg-transparent px-2 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                          >
                                            <option value="sale">Sale</option>
                                            <option value="conversion">
                                              Conversion
                                            </option>
                                          </select>
                                          <select
                                            value={task.condition.operator}
                                            onChange={(e) =>
                                              patchEditTask(index, {
                                                condition: {
                                                  ...(task.condition as QuestTaskCondition),
                                                  operator: e.target
                                                    .value as ConditionOperator,
                                                },
                                              })
                                            }
                                            className="focus:ring-brand-500/10 h-11 rounded-lg border border-gray-200 bg-transparent px-2 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                          >
                                            {CONDITION_OPERATORS.map((op) => (
                                              <option
                                                key={op.value}
                                                value={op.value}
                                              >
                                                {op.label}
                                              </option>
                                            ))}
                                          </select>
                                          <Input
                                            type="number"
                                            min="0"
                                            value={String(
                                              task.condition.amount,
                                            )}
                                            onChange={(e) =>
                                              patchEditTask(index, {
                                                condition: {
                                                  ...(task.condition as QuestTaskCondition),
                                                  amount:
                                                    Number.parseFloat(
                                                      e.target.value,
                                                    ) || 0,
                                                },
                                              })
                                            }
                                          />
                                          <select
                                            value={task.condition.currency}
                                            onChange={(e) =>
                                              patchEditTask(index, {
                                                condition: {
                                                  ...(task.condition as QuestTaskCondition),
                                                  currency: e.target.value,
                                                },
                                              })
                                            }
                                            className="focus:ring-brand-500/10 h-11 rounded-lg border border-gray-200 bg-transparent px-2 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                                          >
                                            {CONDITION_CURRENCIES.map((c) => (
                                              <option key={c} value={c}>
                                                {c}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      ) : (
                                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                          No condition — task completes
                                          regardless of sale/conversion amount.
                                        </p>
                                      )}
                                    </div>
                                    <div className="sm:col-span-2">
                                      <Label className="text-xs">Link</Label>
                                      <Input
                                        type="url"
                                        value={task.link}
                                        onChange={(e) =>
                                          patchEditTask(index, {
                                            link: e.target.value,
                                          })
                                        }
                                        placeholder="https://..."
                                        className="mt-2"
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                                    <div>
                                      <dt className="text-gray-500 dark:text-gray-400">
                                        Type
                                      </dt>
                                      <dd className="mt-0.5 text-gray-800 capitalize dark:text-white/90">
                                        {task.taskType}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-gray-500 dark:text-gray-400">
                                        {task.taskType === "offer"
                                          ? "Offer"
                                          : "Merchant"}
                                      </dt>
                                      <dd className="mt-0.5 text-gray-800 dark:text-white/90">
                                        {task.taskType === "offer"
                                          ? (task.offerName ??
                                            task.offerId ??
                                            "—")
                                          : (task.merchantName ??
                                            task.merchantId ??
                                            "—")}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-gray-500 dark:text-gray-400">
                                        Points
                                      </dt>
                                      <dd className="mt-0.5 text-gray-800 dark:text-white/90">
                                        {task.points}
                                      </dd>
                                    </div>
                                    <div>
                                      <dt className="text-gray-500 dark:text-gray-400">
                                        Completion
                                      </dt>
                                      <dd className="mt-0.5 text-gray-800 capitalize dark:text-white/90">
                                        {task.completionLimit === "once"
                                          ? "Once"
                                          : "Multiple"}
                                      </dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                      <dt className="text-gray-500 dark:text-gray-400">
                                        Condition
                                      </dt>
                                      <dd className="mt-0.5 text-gray-800 dark:text-white/90">
                                        {formatCondition(task.condition)}
                                      </dd>
                                    </div>
                                    <div className="sm:col-span-2">
                                      <dt className="text-gray-500 dark:text-gray-400">
                                        Link
                                      </dt>
                                      <dd className="mt-0.5">
                                        {task.link ? (
                                          <a
                                            href={task.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-brand-600 dark:text-brand-400 break-all hover:underline"
                                          >
                                            {task.link}
                                          </a>
                                        ) : (
                                          <span className="text-gray-500 dark:text-gray-400">
                                            Not set
                                          </span>
                                        )}
                                      </dd>
                                    </div>
                                  </dl>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </section>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        isFullscreen
        showCloseButton={false}
        className="p-0"
      >
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 md:p-8 dark:border-gray-700 dark:bg-gray-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!startDate.trim() || !endDate.trim()) {
                alert("Please enter Start Date and End Date");
                return;
              }
              setCreateSubmitting(true);
              setTimeout(() => {
                setCreateSubmitting(false);
                setCreateModalOpen(false);
                setStartDate("");
                setEndDate("");
                setFacebookPage("No");
                setFacebookPageLink("");
                setFacebookPost("No");
                setFacebookPostLink("");
                setLine("No");
                setLineLink("");
                setTasks([]);
                alert("Quest created successfully (mock).");
              }, 400);
            }}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            {/* Header: title + Close + Create */}
            <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
              <div className="min-w-0">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Create Quest
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Set dates and upload banners for the new quest.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={createSubmitting}
                  className="border-brand-500 bg-brand-500 hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600 rounded-lg border px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {createSubmitting ? "Creating…" : "Create"}
                </button>
              </div>
            </div>
            {/* Scrollable form body */}
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-4">
              <div>
                <Label>Start Date</Label>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  First day of the quest period (e.g. 2026-02-01).
                </p>
                <Input
                  type="text"
                  placeholder="Ex.(2026-02-01)"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  Last day of the quest period (e.g. 2026-02-28).
                </p>
                <Input
                  type="text"
                  placeholder="Ex.(2026-02-28)"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Upload banner_en:</Label>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  Main banner image in English. Shown in the app for this quest.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-sm text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 dark:text-gray-400 dark:file:bg-gray-700 dark:file:text-gray-200"
                />
              </div>
              <div>
                <Label>Upload banner_th:</Label>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  Main banner image in Thai. Shown in the app for this quest.
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-sm text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 dark:text-gray-400 dark:file:bg-gray-700 dark:file:text-gray-200"
                />
              </div>
              <div>
                <Label>Upload sub_banner_en:</Label>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  Secondary banner image in English (optional).
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-sm text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 dark:text-gray-400 dark:file:bg-gray-700 dark:file:text-gray-200"
                />
              </div>
              <div>
                <Label>Upload sub_banner_th:</Label>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  Secondary banner image in Thai (optional).
                </p>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-2 block w-full text-sm text-gray-600 file:mr-2 file:rounded file:border-0 file:bg-gray-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 dark:text-gray-400 dark:file:bg-gray-700 dark:file:text-gray-200"
                />
              </div>
              <div>
                <Label>Facebook Page:</Label>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  Whether this quest is promoted on the Facebook page.
                </p>
                <select
                  value={facebookPage}
                  onChange={(e) => setFacebookPage(e.target.value)}
                  className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {facebookPage === "Yes" && (
                  <div className="mt-3">
                    <Label className="text-sm">Facebook Page link</Label>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      URL to the Facebook page or post. You can update this
                      link.
                    </p>
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={facebookPageLink}
                      onChange={(e) => setFacebookPageLink(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>Facebook Post:</Label>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  Whether this quest is announced in a Facebook post.
                </p>
                <select
                  value={facebookPost}
                  onChange={(e) => setFacebookPost(e.target.value)}
                  className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {facebookPost === "Yes" && (
                  <div className="mt-3">
                    <Label className="text-sm">Facebook Post link</Label>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      URL to the Facebook post. You can update this link.
                    </p>
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={facebookPostLink}
                      onChange={(e) => setFacebookPostLink(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>
              <div>
                <Label>Line:</Label>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  Whether this quest is promoted via Line.
                </p>
                <select
                  value={line}
                  onChange={(e) => setLine(e.target.value)}
                  className="focus:ring-brand-500/10 mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {line === "Yes" && (
                  <div className="mt-3">
                    <Label className="text-sm">Line link</Label>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      URL for Line (e.g. Line official account or campaign
                      page). You can update this link.
                    </p>
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={lineLink}
                      onChange={(e) => setLineLink(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                )}
              </div>

              {/* Tasks: Offer or Merchant, points, completion limit, condition */}
              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-medium text-gray-900 dark:text-white">
                      Tasks
                    </h4>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      Add tasks linked to an Offer or Merchant. Set points,
                      whether the task can be done once or multiple times, and
                      optional conditions on sale/conversion amount.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setTasks((prev) => [...prev, createEmptyTask()])
                    }
                    className="border-brand-500 bg-brand-500 hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600 shrink-0 rounded-lg border px-3 py-2 text-sm font-medium text-white"
                  >
                    Add task
                  </button>
                </div>
                <div className="space-y-4">
                  {tasks.map((task, index) => (
                    <div
                      key={task.id}
                      className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-600 dark:bg-gray-800/40"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          Task {index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setTasks((prev) =>
                              prev.filter((t) => t.id !== task.id),
                            )
                          }
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                          Remove
                        </button>
                      </div>
                      {/* Logo: show existing from offer or uploaded, allow upload/clear */}
                      <div className="mb-4 flex flex-wrap items-start gap-4 border-b border-gray-200 pb-4 dark:border-gray-600">
                        <div>
                          <Label className="mb-2 block">Logo</Label>
                          {(() => {
                            const selectedOffer =
                              task.taskType === "offer" && task.offerId
                                ? offers.find((o) => o._id === task.offerId)
                                : null;
                            const logoSrc =
                              task.logoPreviewUrl ||
                              (task.logoFile
                                ? null
                                : selectedOffer?.logo ||
                                  selectedOffer?.logo_circle ||
                                  selectedOffer?.logo_desktop ||
                                  "");
                            return (
                              <div className="flex items-center gap-3">
                                {logoSrc || task.logoPreviewUrl ? (
                                  <RemoteOrBlobImage
                                    src={
                                      (task.logoPreviewUrl || logoSrc) as string
                                    }
                                    alt="Task logo"
                                    width={56}
                                    height={56}
                                    className="h-14 w-14 shrink-0 rounded-lg border border-gray-200 object-cover dark:border-gray-600"
                                  />
                                ) : (
                                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-100 text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                    No logo
                                  </div>
                                )}
                                <div className="flex flex-col gap-2">
                                  <label className="cursor-pointer">
                                    <span className="inline-block rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
                                      {logoSrc && !task.logoFile
                                        ? "Upload to replace"
                                        : "Upload logo"}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        if (task.logoPreviewUrl)
                                          URL.revokeObjectURL(
                                            task.logoPreviewUrl,
                                          );
                                        setTasks((prev) =>
                                          prev.map((t) =>
                                            t.id === task.id
                                              ? {
                                                  ...t,
                                                  logoFile: file,
                                                  logoPreviewUrl:
                                                    URL.createObjectURL(file),
                                                }
                                              : t,
                                          ),
                                        );
                                      }}
                                    />
                                  </label>
                                  {(task.logoFile || task.logoPreviewUrl) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (task.logoPreviewUrl)
                                          URL.revokeObjectURL(
                                            task.logoPreviewUrl,
                                          );
                                        setTasks((prev) =>
                                          prev.map((t) =>
                                            t.id === task.id
                                              ? {
                                                  ...t,
                                                  logoFile: null,
                                                  logoPreviewUrl: undefined,
                                                }
                                              : t,
                                          ),
                                        );
                                      }}
                                      className="text-left text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                      Clear uploaded
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <Label>Type</Label>
                          <select
                            value={task.taskType}
                            onChange={(e) =>
                              setTasks((prev) =>
                                prev.map((t) =>
                                  t.id === task.id
                                    ? {
                                        ...t,
                                        taskType: e.target
                                          .value as QuestTaskType,
                                        offerId:
                                          t.taskType === "offer"
                                            ? t.offerId
                                            : "",
                                        merchantId:
                                          t.taskType === "merchant"
                                            ? t.merchantId
                                            : "",
                                      }
                                    : t,
                                ),
                              )
                            }
                            className="focus:ring-brand-500/10 mt-1 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                          >
                            <option value="offer">Offer</option>
                            <option value="merchant">Merchant</option>
                          </select>
                        </div>
                        {task.taskType === "offer" ? (
                          <div>
                            <Label>Offer</Label>
                            <select
                              value={task.offerId}
                              onChange={(e) =>
                                setTasks((prev) =>
                                  prev.map((t) =>
                                    t.id === task.id
                                      ? { ...t, offerId: e.target.value }
                                      : t,
                                  ),
                                )
                              }
                              className="focus:ring-brand-500/10 mt-1 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                            >
                              <option value="">Select offer</option>
                              {offers.map((o) => (
                                <option key={o._id} value={o._id}>
                                  {o.offer_name_display ||
                                    o.offer_name ||
                                    o._id}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div>
                            <Label>Merchant</Label>
                            <select
                              value={task.merchantId}
                              onChange={(e) =>
                                setTasks((prev) =>
                                  prev.map((t) =>
                                    t.id === task.id
                                      ? { ...t, merchantId: e.target.value }
                                      : t,
                                  ),
                                )
                              }
                              className="focus:ring-brand-500/10 mt-1 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                            >
                              <option value="">Select merchant</option>
                              {MOCK_MERCHANTS.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <Label>Points</Label>
                          <Input
                            type="number"
                            min="0"
                            value={task.points || ""}
                            onChange={(e) =>
                              setTasks((prev) =>
                                prev.map((t) =>
                                  t.id === task.id
                                    ? {
                                        ...t,
                                        points: Math.max(
                                          0,
                                          parseInt(e.target.value, 10) || 0,
                                        ),
                                      }
                                    : t,
                                ),
                              )
                            }
                            className="mt-1"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <Label>Completion</Label>
                          <select
                            value={task.completionLimit}
                            onChange={(e) =>
                              setTasks((prev) =>
                                prev.map((t) =>
                                  t.id === task.id
                                    ? {
                                        ...t,
                                        completionLimit: e.target
                                          .value as QuestCompletionLimit,
                                      }
                                    : t,
                                ),
                              )
                            }
                            className="focus:ring-brand-500/10 mt-1 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:ring-3 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                          >
                            <option value="multiple">Multiple times</option>
                            <option value="once">Once only</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Label className="block">Link (optional)</Label>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          Merchant link or custom URL for this task (e.g. offer
                          page, landing page).
                        </p>
                        <Input
                          type="url"
                          placeholder="https://..."
                          value={task.link}
                          onChange={(e) =>
                            setTasks((prev) =>
                              prev.map((t) =>
                                t.id === task.id
                                  ? { ...t, link: e.target.value }
                                  : t,
                              ),
                            )
                          }
                          className="mt-2"
                        />
                      </div>
                      <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-600">
                        <Label className="mb-2 block">
                          Condition (optional)
                        </Label>
                        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                          Require sale/conversion amount to match operator and
                          value (e.g. sale ≥ 100 THB). Set currency for the
                          amount.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <Label className="text-xs">Operator</Label>
                            <select
                              value={task.condition?.operator ?? ""}
                              onChange={(e) => {
                                const op = e.target.value as
                                  | ConditionOperator
                                  | "";
                                setTasks((prev) =>
                                  prev.map((t) =>
                                    t.id === task.id
                                      ? {
                                          ...t,
                                          condition: op
                                            ? {
                                                operator: op,
                                                metric:
                                                  t.condition?.metric ?? "sale",
                                                amount:
                                                  t.condition?.amount ?? 0,
                                                currency:
                                                  t.condition?.currency ??
                                                  "THB",
                                              }
                                            : null,
                                        }
                                      : t,
                                  ),
                                );
                              }}
                              className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                            >
                              <option value="">None</option>
                              {CONDITION_OPERATORS.map((o) => (
                                <option key={o.value} value={o.value}>
                                  {o.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">Metric</Label>
                            <select
                              value={task.condition?.metric ?? "sale"}
                              onChange={(e) =>
                                setTasks((prev) =>
                                  prev.map((t) =>
                                    t.id === task.id
                                      ? {
                                          ...t,
                                          condition: t.condition
                                            ? {
                                                ...t.condition,
                                                metric: e.target
                                                  .value as ConditionMetric,
                                              }
                                            : {
                                                operator:
                                                  "=" as ConditionOperator,
                                                metric: e.target
                                                  .value as ConditionMetric,
                                                amount: 0,
                                                currency: "THB",
                                              },
                                        }
                                      : t,
                                  ),
                                )
                              }
                              className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                            >
                              <option value="sale">Sale</option>
                              <option value="conversion">Conversion</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs">Amount</Label>
                            <Input
                              type="number"
                              min="0"
                              value={task.condition?.amount ?? ""}
                              onChange={(e) =>
                                setTasks((prev) =>
                                  prev.map((t) =>
                                    t.id === task.id
                                      ? {
                                          ...t,
                                          condition: t.condition
                                            ? {
                                                ...t.condition,
                                                amount: Math.max(
                                                  0,
                                                  parseInt(
                                                    e.target.value,
                                                    10,
                                                  ) || 0,
                                                ),
                                              }
                                            : {
                                                operator:
                                                  "=" as ConditionOperator,
                                                metric:
                                                  "sale" as ConditionMetric,
                                                amount: Math.max(
                                                  0,
                                                  parseInt(
                                                    e.target.value,
                                                    10,
                                                  ) || 0,
                                                ),
                                                currency: "THB",
                                              },
                                        }
                                      : t,
                                  ),
                                )
                              }
                              className="mt-1"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Currency</Label>
                            <select
                              value={task.condition?.currency ?? "THB"}
                              onChange={(e) =>
                                setTasks((prev) =>
                                  prev.map((t) =>
                                    t.id === task.id
                                      ? {
                                          ...t,
                                          condition: t.condition
                                            ? {
                                                ...t.condition,
                                                currency: e.target.value,
                                              }
                                            : {
                                                operator:
                                                  "=" as ConditionOperator,
                                                metric:
                                                  "sale" as ConditionMetric,
                                                amount: 0,
                                                currency: e.target.value,
                                              },
                                        }
                                      : t,
                                  ),
                                )
                              }
                              className="mt-1 h-10 w-full rounded-lg border border-gray-200 bg-transparent px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                            >
                              {CONDITION_CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end border-t border-gray-200 pt-4 dark:border-gray-600">
                        <button
                          type="button"
                          onClick={() => {
                            const t = task;
                            if (t.taskType === "offer" && !t.offerId) {
                              alert("Please select an offer for this task.");
                              return;
                            }
                            if (t.taskType === "merchant" && !t.merchantId) {
                              alert("Please select a merchant for this task.");
                              return;
                            }
                            alert(`Task ${index + 1} saved.`);
                          }}
                          className="border-brand-500 bg-brand-500 hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600 rounded-lg border px-4 py-2 text-sm font-medium text-white"
                        >
                          Save task
                        </button>
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="rounded-lg border border-dashed border-gray-300 py-6 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                      No tasks yet. Click &quot;Add task&quot; to add one.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
