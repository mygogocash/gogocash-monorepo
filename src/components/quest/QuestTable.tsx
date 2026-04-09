"use client";

import React, { useState, useRef, useEffect } from "react";
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

export type QuestTaskType = "offer" | "merchant";
export type QuestCompletionLimit = "once" | "multiple";
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

/** Task summary for display in Quest details (no logo/file fields) */
export interface QuestTaskDisplay {
  taskType: QuestTaskType;
  offerId?: string;
  merchantId?: string;
  offerName?: string;
  merchantName?: string;
  points: number;
  completionLimit: QuestCompletionLimit;
  condition: QuestTaskCondition | null;
  link: string;
}

/** Quest with optional links and tasks for details modal */
export interface QuestDetails extends Record<string, unknown> {
  id: string;
  startDate: string;
  endDate: string;
  status: string;
  rewardStatus: string;
  facebookPage: string;
  facebookPost: string;
  line: string;
  bannerEn: string;
  bannerTh: string;
  subBannerEn: string;
  subBannerTh: string;
  facebookPageLink?: string;
  facebookPostLink?: string;
  lineLink?: string;
  tasks?: QuestTaskDisplay[];
}

function formatCondition(c: QuestTaskCondition | null): string {
  if (!c) return "—";
  const metric = c.metric === "sale" ? "Sale" : "Conversion";
  return `${metric} ${c.operator} ${c.amount} ${c.currency}`;
}

type UserPointRow = { userId: string; email: string; username: string; points: number; rewards: string };

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
  const body = rows.map((r, i) => `| ${i + 1} | ${r.userId} | ${r.username} | ${r.email} | ${r.points} | ${r.rewards} |`).join("\n");
  return `# ${questTitle}\n\n${header}\n${sep}\n${body}\n`;
}

function exportAsCsv(rows: UserPointRow[]): string {
  const escape = (v: string | number) => {
    const s = String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ["Rank", "User ID", "Username", "Email", "Points", "Rewards"].map(escape).join(",");
  const body = rows.map((r, i) => [i + 1, r.userId, r.username, r.email, r.points, r.rewards].map(escape).join(",")).join("\n");
  return "\uFEFF" + header + "\n" + body;
}

function exportAsExcelXml(rows: UserPointRow[]): string {
  const escape = (v: string) => String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const cols = '<Column ss:Index="1" ss:Width="50"/><Column ss:Width="100"/><Column ss:Width="100"/><Column ss:Width="180"/><Column ss:Width="80"/><Column ss:Width="90"/>';
  const headerRow = "<Row><Cell><Data ss:Type=\"String\">Rank</Data></Cell><Cell><Data ss:Type=\"String\">User ID</Data></Cell><Cell><Data ss:Type=\"String\">Username</Data></Cell><Cell><Data ss:Type=\"String\">Email</Data></Cell><Cell><Data ss:Type=\"String\">Points</Data></Cell><Cell><Data ss:Type=\"String\">Rewards</Data></Cell></Row>";
  const dataRows = rows
    .map(
      (r, i) =>
        `<Row><Cell><Data ss:Type="Number">${i + 1}</Data></Cell><Cell><Data ss:Type="String">${escape(r.userId)}</Data></Cell><Cell><Data ss:Type="String">${escape(r.username)}</Data></Cell><Cell><Data ss:Type="String">${escape(r.email)}</Data></Cell><Cell><Data ss:Type="Number">${r.points}</Data></Cell><Cell><Data ss:Type="String">${escape(r.rewards)}</Data></Cell></Row>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="User points"><Table>${cols}${headerRow}${dataRows}</Table></Worksheet>
</Workbook>`;
}

const MOCK_QUESTS: QuestDetails[] = [
  {
    id: "699dbee2508fddade48e1710",
    startDate: "2/1/2026",
    endDate: "2/28/2026",
    status: "active",
    rewardStatus: "claimed",
    facebookPage: "Yes",
    facebookPost: "Yes",
    line: "Yes",
    bannerEn: "Yes",
    bannerTh: "Yes",
    subBannerEn: "Yes",
    subBannerTh: "Yes",
    facebookPageLink: "https://facebook.com/gogocash",
    facebookPostLink: "https://facebook.com/gogocash/posts/quest-feb-2026",
    lineLink: "https://line.me/R/ti/p/@gogocash",
    tasks: [
      {
        taskType: "offer",
        offerId: "o1",
        offerName: "Banana IT TH - CPS",
        points: 50,
        completionLimit: "multiple",
        condition: null,
        link: "https://www.bananastore.com/th",
      },
      {
        taskType: "offer",
        offerId: "o2",
        offerName: "Adidas TH - CPS",
        points: 75,
        completionLimit: "once",
        condition: { operator: ">=", metric: "sale", amount: 100, currency: "THB" },
        link: "https://www.adidas.co.th",
      },
      {
        taskType: "merchant",
        merchantId: "m1",
        merchantName: "Merchant A",
        points: 25,
        completionLimit: "multiple",
        condition: null,
        link: "https://merchant-a.example.com",
      },
    ],
  },
  {
    id: "699dbee2508fddade48e1711",
    startDate: "3/1/2026",
    endDate: "3/31/2026",
    status: "pending",
    rewardStatus: "pending",
    facebookPage: "No",
    facebookPost: "No",
    line: "No",
    bannerEn: "No",
    bannerTh: "No",
    subBannerEn: "No",
    subBannerTh: "No",
  },
];

const POINTS_PAGE_SIZE_OPTIONS = [10, 25, 50, 100, 500, 0] as const; // 0 = All

const MOCK_POINTS_TOTAL = 1500; // Simulate 1000+ participants for first quest

// Format large numbers with commas for display
function formatCount(n: number): string {
  return n.toLocaleString();
}

// Mock user points per quest — supports 1000+ rows; real API would return paginated or full list
function getMockUserPointsForQuest(questId: string): UserPointRow[] {
  const rewardsOptions = ["—", "25 THB", "50 THB", "75 THB", "80 THB", "90 THB", "100 THB", "120 THB", "140 THB", "150 THB", "200 THB"];
  const total = questId === MOCK_QUESTS[0].id ? MOCK_POINTS_TOTAL : 20;
  const rows: UserPointRow[] = [];
  for (let i = 1; i <= total; i++) {
    const points = 50 + (i * 37 + i * i) % 500; // varied points 50–550
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
  const [quests] = useState(MOCK_QUESTS);
  const [pointsModalQuest, setPointsModalQuest] = useState<typeof MOCK_QUESTS[0] | null>(null);
  const [detailsModalQuest, setDetailsModalQuest] = useState<QuestDetails | null>(null);
  const [pointsModalPageSize, setPointsModalPageSize] = useState<number>(10);
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
    enabled: createModalOpen,
    staleTime: 30_000,
  });
  const offers: Offer[] = offersData?.data ?? [];

  const openPointsModal = (q: QuestDetails) => {
    setPointsModalPageSize(10);
    setExportOpen(false);
    setPointsModalQuest(q);
  };

  const closePointsModal = () => {
    setExportOpen(false);
    setPointsModalQuest(null);
  };

  useEffect(() => {
    if (!exportOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [exportOpen]);

  const handleExport = (format: "markdown" | "csv" | "excel") => {
    if (!pointsModalQuest) return;
    const rows = [...getMockUserPointsForQuest(pointsModalQuest.id)].sort((a, b) => b.points - a.points);
    const slug = pointsModalQuest.id.slice(-8);
    const questTitle = `Quest ${pointsModalQuest.id} (${pointsModalQuest.startDate} – ${pointsModalQuest.endDate})`;
    if (format === "markdown") {
      const text = exportAsMarkdown(rows, questTitle);
      downloadBlob(new Blob([text], { type: "text/markdown;charset=utf-8" }), `quest-user-points-${slug}.md`);
    } else if (format === "csv") {
      const text = exportAsCsv(rows);
      downloadBlob(new Blob([text], { type: "text/csv;charset=utf-8" }), `quest-user-points-${slug}.csv`);
    } else {
      const xml = exportAsExcelXml(rows);
      downloadBlob(new Blob([xml], { type: "application/vnd.ms-excel" }), `quest-user-points-${slug}.xls`);
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
          className="shrink-0 rounded px-2 py-1 text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          Create Quest
        </button>
      </div>
      <div className="min-w-0 overflow-x-auto border-t border-gray-100 dark:border-gray-700 dark:bg-white/[0.02]">
        <Table className="min-w-[480px]">
              <TableHeader className="border-gray-100 dark:border-gray-800">
                <TableRow>
                  <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">ID</TableCell>
                  <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">Start Date</TableCell>
                  <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">End Date</TableCell>
                  <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">Status</TableCell>
                  <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">Reward Status</TableCell>
                  <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">Action</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {quests.map((q) => (
                  <TableRow key={q.id}>
                    <TableCell className="whitespace-nowrap py-3 text-center font-mono text-theme-sm text-gray-800 dark:text-white/90" title={q.id}>
                      <span className="inline-block max-w-full truncate px-1 sm:max-w-[180px]">{q.id}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-3 text-center text-theme-sm text-gray-600 dark:text-gray-300">{q.startDate}</TableCell>
                    <TableCell className="whitespace-nowrap py-3 text-center text-theme-sm text-gray-600 dark:text-gray-300">{q.endDate}</TableCell>
                    <TableCell className="whitespace-nowrap py-3 text-center">
                      <Badge size="sm" color={q.status === "active" ? "success" : "warning"}>{q.status}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-3 text-center">
                      <Badge size="sm" color={q.rewardStatus === "claimed" ? "success" : "warning"}>{q.rewardStatus}</Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap py-3 text-center">
                      <div className="flex flex-wrap items-center justify-center gap-2">
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

      <Modal isOpen={!!pointsModalQuest} onClose={closePointsModal} isFullscreen showCloseButton={false} className="p-0">
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:p-6 md:p-8">
          {/* Title + Close in header row */}
          <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
            <div className="min-w-0">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                User points
              </h3>
              <p className="mt-1 max-w-full break-words text-sm text-gray-500 dark:text-gray-400" title={pointsModalQuest ? `Quest ${pointsModalQuest.id} (${pointsModalQuest.startDate} – ${pointsModalQuest.endDate})` : undefined}>
                {pointsModalQuest ? `Quest ${pointsModalQuest.id} (${pointsModalQuest.startDate} – ${pointsModalQuest.endDate})` : ""}
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

          {/* Show per page + Export */}
          <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <label htmlFor="points-show" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Show
              </label>
              <select
                id="points-show"
                value={pointsModalPageSize}
                onChange={(e) => setPointsModalPageSize(Number(e.target.value))}
                className="h-9 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              >
                {POINTS_PAGE_SIZE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? "All" : n}
                  </option>
                ))}
              </select>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {pointsModalQuest && (() => {
                  const total = getMockUserPointsForQuest(pointsModalQuest.id).length;
                  const showing = pointsModalPageSize === 0 ? total : Math.min(pointsModalPageSize, total);
                  return `${formatCount(showing)} of ${formatCount(total)}`;
                })()}
              </span>
            </div>
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600"
                title={pointsModalQuest ? `Export all ${formatCount(getMockUserPointsForQuest(pointsModalQuest.id).length)} participants` : undefined}
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 min-w-[200px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-700">
                  {pointsModalQuest && (
                    <p className="border-b border-gray-100 px-4 py-2 text-xs text-gray-500 dark:border-gray-600 dark:text-gray-400">
                      Export all {formatCount(getMockUserPointsForQuest(pointsModalQuest.id).length)} participants
                    </p>
                  )}
                  <button type="button" onClick={() => handleExport("markdown")} className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-600">
                    Markdown (.md)
                  </button>
                  <button type="button" onClick={() => handleExport("csv")} className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-600">
                    CSV (.csv)
                  </button>
                  <button type="button" onClick={() => handleExport("excel")} className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-600">
                    Excel (.xls)
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Table — fills remaining space; min-height fits header + 10 rows (py-3 × 11 ≈ 520px) */}
          <div className="min-h-0 min-w-0 flex-1 overflow-auto rounded-lg border border-gray-200 dark:border-gray-600" style={{ minHeight: 520 }}>
            <Table className="min-w-[380px]">
              <TableHeader className="sticky top-0 z-[1] border-b border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700">
                <TableRow>
                  <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">Rank</TableCell>
                  <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">User ID</TableCell>
                  <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">Username</TableCell>
                  <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">Email</TableCell>
                  <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">Points</TableCell>
                  <TableCell isHeader className="py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400">Rewards</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
                {pointsModalQuest &&
                  (() => {
                    const all = getMockUserPointsForQuest(pointsModalQuest.id);
                    const sorted = [...all].sort((a, b) => b.points - a.points);
                    const display = pointsModalPageSize === 0 ? sorted : sorted.slice(0, pointsModalPageSize);
                    return display.map((u, index) => (
                    <TableRow key={u.userId}>
                      <TableCell className="py-3 text-center text-theme-sm font-medium text-gray-800 dark:text-white/90">{index + 1}</TableCell>
                      <TableCell className="py-3 text-center font-mono text-theme-sm text-gray-800 dark:text-white/90" title={u.userId}>
                        {first5(u.userId)}
                      </TableCell>
                      <TableCell className="py-3 text-center text-theme-sm text-gray-600 dark:text-gray-300" title={u.username}>
                        {first5(u.username)}
                      </TableCell>
                      <TableCell className="py-3 text-center text-theme-sm text-gray-600 dark:text-gray-300" title={u.email}>
                        {first5(u.email)}
                      </TableCell>
                      <TableCell className="py-3 text-center text-theme-sm font-medium text-gray-800 dark:text-white/90">{u.points}</TableCell>
                      <TableCell className="py-3 text-center text-theme-sm text-gray-600 dark:text-gray-300">{u.rewards}</TableCell>
                    </TableRow>
                  ));
                  })()}
              </TableBody>
            </Table>
          </div>
        </div>
      </Modal>

      {/* Quest details modal — fullscreen */}
      <Modal
        isOpen={!!detailsModalQuest}
        onClose={() => setDetailsModalQuest(null)}
        isFullscreen
        showCloseButton={false}
        className="p-0"
      >
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:p-6 md:p-8">
          <div className="mb-4 flex w-full shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 pb-4 dark:border-gray-700">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Quest details</h3>
            <button
              type="button"
              onClick={() => setDetailsModalQuest(null)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
            >
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          {detailsModalQuest && (
            <>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">ID</dt>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Unique identifier for this quest. Use it when referring to the quest in APIs or exports.</p>
                <dd className="mt-1 font-mono text-gray-800 dark:text-white/90" title={detailsModalQuest.id}>{detailsModalQuest.id}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">Start Date</dt>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">When the quest becomes available for users to join and complete tasks.</p>
                <dd className="mt-1 text-gray-800 dark:text-white/90">{detailsModalQuest.startDate}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">End Date</dt>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Last day users can earn points or claim rewards for this quest.</p>
                <dd className="mt-1 text-gray-800 dark:text-white/90">{detailsModalQuest.endDate}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">Status</dt>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Whether the quest is currently active (live) or pending (scheduled).</p>
                <dd className="mt-1">
                  <Badge size="sm" color={detailsModalQuest.status === "active" ? "success" : "warning"}>{detailsModalQuest.status}</Badge>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">Reward Status</dt>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Whether the quest reward has been claimed or is still pending.</p>
                <dd className="mt-1">
                  <Badge size="sm" color={detailsModalQuest.rewardStatus === "claimed" ? "success" : "warning"}>{detailsModalQuest.rewardStatus}</Badge>
                </dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">Facebook Page</dt>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Whether this quest is promoted on the Facebook page (and if a link was set).</p>
                <dd className="mt-1 text-gray-800 dark:text-white/90">{detailsModalQuest.facebookPage}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">Facebook Post</dt>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Whether this quest was announced in a Facebook post (and if a link was set).</p>
                <dd className="mt-1 text-gray-800 dark:text-white/90">{detailsModalQuest.facebookPost}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">Line</dt>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Whether this quest is promoted via Line (and if a link was set).</p>
                <dd className="mt-1 text-gray-800 dark:text-white/90">{detailsModalQuest.line}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">Banner EN</dt>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Whether an English main banner image was uploaded for this quest.</p>
                <dd className="mt-1 text-gray-800 dark:text-white/90">{detailsModalQuest.bannerEn}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">Banner TH</dt>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Whether a Thai main banner image was uploaded for this quest.</p>
                <dd className="mt-1 text-gray-800 dark:text-white/90">{detailsModalQuest.bannerTh}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">Sub Banner EN</dt>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Whether an English sub-banner image was uploaded for this quest.</p>
                <dd className="mt-1 text-gray-800 dark:text-white/90">{detailsModalQuest.subBannerEn}</dd>
              </div>
              <div>
                <dt className="font-medium text-gray-500 dark:text-gray-400">Sub Banner TH</dt>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">Whether a Thai sub-banner image was uploaded for this quest.</p>
                <dd className="mt-1 text-gray-800 dark:text-white/90">{detailsModalQuest.subBannerTh}</dd>
              </div>
            </dl>

            {/* Links section — shown when any social channel is Yes */}
            {(detailsModalQuest.facebookPage === "Yes" || detailsModalQuest.facebookPost === "Yes" || detailsModalQuest.line === "Yes") && (
              <section className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
                <h4 className="mb-3 text-base font-semibold text-gray-800 dark:text-white">Links</h4>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">URLs for promotion channels. Shown when the channel is enabled above.</p>
                <dl className="space-y-3 text-sm">
                  {detailsModalQuest.facebookPage === "Yes" && (
                    <div>
                      <dt className="font-medium text-gray-500 dark:text-gray-400">Facebook Page link</dt>
                      <dd className="mt-1">
                        {detailsModalQuest.facebookPageLink ? (
                          <a href={detailsModalQuest.facebookPageLink} target="_blank" rel="noopener noreferrer" className="break-all text-brand-600 hover:underline dark:text-brand-400">
                            {detailsModalQuest.facebookPageLink}
                          </a>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Not set</span>
                        )}
                      </dd>
                    </div>
                  )}
                  {detailsModalQuest.facebookPost === "Yes" && (
                    <div>
                      <dt className="font-medium text-gray-500 dark:text-gray-400">Facebook Post link</dt>
                      <dd className="mt-1">
                        {detailsModalQuest.facebookPostLink ? (
                          <a href={detailsModalQuest.facebookPostLink} target="_blank" rel="noopener noreferrer" className="break-all text-brand-600 hover:underline dark:text-brand-400">
                            {detailsModalQuest.facebookPostLink}
                          </a>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Not set</span>
                        )}
                      </dd>
                    </div>
                  )}
                  {detailsModalQuest.line === "Yes" && (
                    <div>
                      <dt className="font-medium text-gray-500 dark:text-gray-400">Line link</dt>
                      <dd className="mt-1">
                        {detailsModalQuest.lineLink ? (
                          <a href={detailsModalQuest.lineLink} target="_blank" rel="noopener noreferrer" className="break-all text-brand-600 hover:underline dark:text-brand-400">
                            {detailsModalQuest.lineLink}
                          </a>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">Not set</span>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>
            )}

            {/* Tasks section */}
            {detailsModalQuest.tasks && detailsModalQuest.tasks.length > 0 && (
              <section className="mt-6 border-t border-gray-200 pt-6 dark:border-gray-700">
                <h4 className="mb-3 text-base font-semibold text-gray-800 dark:text-white">Tasks</h4>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Tasks linked to offers or merchants. Users complete these to earn points.</p>
                <div className="space-y-4">
                  {detailsModalQuest.tasks.map((task, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-600 dark:bg-gray-800/40"
                    >
                      <div className="mb-2 font-medium text-gray-800 dark:text-white">Task {index + 1}</div>
                      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">Type</dt>
                          <dd className="mt-0.5 capitalize text-gray-800 dark:text-white/90">{task.taskType}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">{task.taskType === "offer" ? "Offer" : "Merchant"}</dt>
                          <dd className="mt-0.5 text-gray-800 dark:text-white/90">
                            {task.taskType === "offer" ? (task.offerName ?? task.offerId ?? "—") : (task.merchantName ?? task.merchantId ?? "—")}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">Points</dt>
                          <dd className="mt-0.5 text-gray-800 dark:text-white/90">{task.points}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500 dark:text-gray-400">Completion</dt>
                          <dd className="mt-0.5 capitalize text-gray-800 dark:text-white/90">{task.completionLimit === "once" ? "Once" : "Multiple"}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-gray-500 dark:text-gray-400">Condition</dt>
                          <dd className="mt-0.5 text-gray-800 dark:text-white/90">{formatCondition(task.condition)}</dd>
                        </div>
                        <div className="sm:col-span-2">
                          <dt className="text-gray-500 dark:text-gray-400">Link</dt>
                          <dd className="mt-0.5">
                            {task.link ? (
                              <a href={task.link} target="_blank" rel="noopener noreferrer" className="break-all text-brand-600 hover:underline dark:text-brand-400">
                                {task.link}
                              </a>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">Not set</span>
                            )}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>
              </section>
            )}
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
        <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800 sm:p-6 md:p-8">
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
                  className="rounded-lg border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600"
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
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {facebookPage === "Yes" && (
                  <div className="mt-3">
                    <Label className="text-sm">Facebook Page link</Label>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      URL to the Facebook page or post. You can update this link.
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
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
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
                  className="mt-2 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
                {line === "Yes" && (
                  <div className="mt-3">
                    <Label className="text-sm">Line link</Label>
                    <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                      URL for Line (e.g. Line official account or campaign page). You can update this link.
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
                    <h4 className="text-base font-medium text-gray-900 dark:text-white">Tasks</h4>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      Add tasks linked to an Offer or Merchant. Set points, whether the task can be done once or multiple times, and optional conditions on sale/conversion amount.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTasks((prev) => [...prev, createEmptyTask()])}
                    className="shrink-0 rounded-lg border border-brand-500 bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600"
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
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Task {index + 1}</span>
                        <button
                          type="button"
                          onClick={() => setTasks((prev) => prev.filter((t) => t.id !== task.id))}
                          className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                          Remove
                        </button>
                      </div>
                      {/* Logo: show existing from offer or uploaded, allow upload/clear */}
                      <div className="mb-4 flex flex-wrap items-start gap-4 border-b border-gray-200 pb-4 dark:border-gray-600">
                        <div>
                          <Label className="block mb-2">Logo</Label>
                          {(() => {
                            const selectedOffer = task.taskType === "offer" && task.offerId ? offers.find((o) => o._id === task.offerId) : null;
                            const logoSrc =
                              task.logoPreviewUrl ||
                              (task.logoFile ? null : selectedOffer?.logo || selectedOffer?.logo_circle || selectedOffer?.logo_desktop || "");
                            return (
                              <div className="flex items-center gap-3">
                                {logoSrc || task.logoPreviewUrl ? (
                                  <RemoteOrBlobImage
                                    src={(task.logoPreviewUrl || logoSrc) as string}
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
                                      {logoSrc && !task.logoFile ? "Upload to replace" : "Upload logo"}
                                    </span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        if (task.logoPreviewUrl) URL.revokeObjectURL(task.logoPreviewUrl);
                                        setTasks((prev) =>
                                          prev.map((t) =>
                                            t.id === task.id
                                              ? { ...t, logoFile: file, logoPreviewUrl: URL.createObjectURL(file) }
                                              : t
                                          )
                                        );
                                      }}
                                    />
                                  </label>
                                  {(task.logoFile || task.logoPreviewUrl) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (task.logoPreviewUrl) URL.revokeObjectURL(task.logoPreviewUrl);
                                        setTasks((prev) =>
                                          prev.map((t) => (t.id === task.id ? { ...t, logoFile: null, logoPreviewUrl: undefined } : t))
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
                                    ? { ...t, taskType: e.target.value as QuestTaskType, offerId: t.taskType === "offer" ? t.offerId : "", merchantId: t.taskType === "merchant" ? t.merchantId : "" }
                                    : t
                                )
                              )
                            }
                            className="mt-1 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
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
                                setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, offerId: e.target.value } : t)))
                              }
                              className="mt-1 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                            >
                              <option value="">Select offer</option>
                              {offers.map((o) => (
                                <option key={o._id} value={o._id}>
                                  {o.offer_name_display || o.offer_name || o._id}
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
                                setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, merchantId: e.target.value } : t)))
                              }
                              className="mt-1 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
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
                                prev.map((t) => (t.id === task.id ? { ...t, points: Math.max(0, parseInt(e.target.value, 10) || 0) } : t))
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
                                prev.map((t) => (t.id === task.id ? { ...t, completionLimit: e.target.value as QuestCompletionLimit } : t))
                              )
                            }
                            className="mt-1 h-11 w-full rounded-lg border border-gray-200 bg-transparent px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                          >
                            <option value="multiple">Multiple times</option>
                            <option value="once">Once only</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4">
                        <Label className="block">Link (optional)</Label>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                          Merchant link or custom URL for this task (e.g. offer page, landing page).
                        </p>
                        <Input
                          type="url"
                          placeholder="https://..."
                          value={task.link}
                          onChange={(e) => setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, link: e.target.value } : t)))}
                          className="mt-2"
                        />
                      </div>
                      <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-600">
                        <Label className="mb-2 block">Condition (optional)</Label>
                        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                          Require sale/conversion amount to match operator and value (e.g. sale ≥ 100 THB). Set currency for the amount.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <Label className="text-xs">Operator</Label>
                            <select
                              value={task.condition?.operator ?? ""}
                              onChange={(e) => {
                                const op = e.target.value as ConditionOperator | "";
                                setTasks((prev) =>
                                  prev.map((t) =>
                                    t.id === task.id
                                      ? { ...t, condition: op ? { operator: op, metric: t.condition?.metric ?? "sale", amount: t.condition?.amount ?? 0, currency: t.condition?.currency ?? "THB" } : null }
                                      : t
                                  )
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
                                            ? { ...t.condition, metric: e.target.value as ConditionMetric }
                                            : { operator: "=" as ConditionOperator, metric: e.target.value as ConditionMetric, amount: 0, currency: "THB" },
                                        }
                                      : t
                                  )
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
                                            ? { ...t.condition, amount: Math.max(0, parseInt(e.target.value, 10) || 0) }
                                            : { operator: "=" as ConditionOperator, metric: "sale" as ConditionMetric, amount: Math.max(0, parseInt(e.target.value, 10) || 0), currency: "THB" },
                                        }
                                      : t
                                  )
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
                                            ? { ...t.condition, currency: e.target.value }
                                            : { operator: "=" as ConditionOperator, metric: "sale" as ConditionMetric, amount: 0, currency: e.target.value },
                                        }
                                      : t
                                  )
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
                          className="rounded-lg border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 dark:border-brand-500 dark:bg-brand-500 dark:hover:bg-brand-600"
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
