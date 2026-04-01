"use client";

import SubPage from "@/features/profile/layout/SubPage";
import { GogoquestHistoryInsightSection } from "@/features/quest/component/GogoquestHistoryInsightSection";
import { GogoquestPlayerSummaryDialog } from "@/features/quest/component/GogoquestPlayerSummaryDialog";
import ListRank from "@/features/quest/component/ListRank";
import { useCountUp } from "@/hooks/useCountUp";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { Link } from "@/i18n/navigation";
import type { QuestRankResponse, ResponseQuestDate } from "@/interfaces/quest";
import type { QuestHistorySummary } from "@/interfaces/questHistory";
import client, { fetcher } from "@/lib/axios/client";
import {
  computeMonthOverMonthInsight,
  countActiveMonthsInWindow,
  nextSoftGoal,
} from "@/lib/quest/gogoquestInsights";
import { monthKeyToRangeEnCA } from "@/lib/quest/monthRangeEnCA";
import { formatNumber } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import toast from "react-hot-toast";
import Button from "@mui/material/Button";
import { useEffect, useMemo, useRef, useState } from "react";

function formatMonthYear(monthKey: string, locale: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  if (!y || !m) return monthKey;
  const d = new Date(Date.UTC(y, m - 1, 1));
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(d);
}

function formatFriendlyDateRange(start: Date, end: Date, locale: string): string {
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" };
  const a = start.toLocaleDateString(locale, opts);
  const b = end.toLocaleDateString(locale, opts);
  return `${a} – ${b}`;
}

function daysRemainingInclusive(endDate: Date): number {
  const now = new Date();
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = end.getTime() - startOfToday.getTime();
  return Math.ceil(diffMs / 86400000);
}

function isRewardGrantRecent(grantedAt: string, withinMs = 7 * 86400000): boolean {
  const t = new Date(grantedAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= withinMs;
}

export default function GogoquestHistory() {
  const t = useTranslations();
  const locale = useLocale();
  const { data: session } = useSession();
  const reducedMotion = usePrefersReducedMotion();

  const { data: questDateOpen } = useQuery<ResponseQuestDate>({
    queryKey: ["questDateOpen"],
    queryFn: () => fetcher("/point/get-quest-open"),
  });

  const startMs = questDateOpen?.start_date
    ? new Date(questDateOpen.start_date).getTime()
    : Number.NaN;
  const endMs = questDateOpen?.end_date ? new Date(questDateOpen.end_date).getTime() : Number.NaN;
  const hasValidQuestRange = Number.isFinite(startMs) && Number.isFinite(endMs);
  const campaignStart = hasValidQuestRange ? new Date(questDateOpen!.start_date) : null;
  const campaignEnd = hasValidQuestRange ? new Date(questDateOpen!.end_date) : null;
  const campaignStartEnCA = campaignStart ? campaignStart.toLocaleDateString("en-CA") : "";
  const campaignEndEnCA = campaignEnd ? campaignEnd.toLocaleDateString("en-CA") : "";

  const daysLeft = campaignEnd && hasValidQuestRange ? daysRemainingInclusive(campaignEnd) : null;
  const roundIsActive = daysLeft !== null && daysLeft >= 0;

  const { data: myCampaignQuest } = useQuery<QuestRankResponse>({
    queryKey: ["my-quest-list", "campaign", campaignStartEnCA, campaignEndEnCA],
    queryFn: () =>
      client
        .get(`/point/my-quest-list/${campaignStartEnCA}/${campaignEndEnCA}`)
        .then((res) => res.data),
    enabled: Boolean(session) && hasValidQuestRange,
  });

  const { data: campaignLeaderboard } = useQuery<QuestRankResponse[]>({
    queryKey: ["quest-list", "campaign", campaignStartEnCA, campaignEndEnCA],
    queryFn: () =>
      client
        .get(`/point/check-points/${campaignStartEnCA}/${campaignEndEnCA}`)
        .then((res) => res.data),
    enabled:
      Boolean(session) && hasValidQuestRange && Boolean(campaignStartEnCA && campaignEndEnCA),
  });

  const { data: historySummary } = useQuery<QuestHistorySummary>({
    queryKey: ["quest-history-summary"],
    queryFn: () => fetcher("/point/quest-history-summary"),
    enabled: Boolean(session),
  });

  const [leaderboardMonthKey, setLeaderboardMonthKey] = useState<string>("campaign");
  const [viewUserId, setViewUserId] = useState<string | null>(null);
  const [rankUpChipVisible, setRankUpChipVisible] = useState(false);
  const [scorePulse, setScorePulse] = useState(false);
  const [monthlyListVisible, setMonthlyListVisible] = useState(reducedMotion);
  const pulseScheduledRef = useRef(false);

  const campaignPointTarget = myCampaignQuest?.point ?? 0;
  const displayCampaignPoints = useCountUp(
    campaignPointTarget,
    680,
    Boolean(session) && hasValidQuestRange,
    reducedMotion
  );

  useEffect(() => {
    if (reducedMotion || !session || !hasValidQuestRange || pulseScheduledRef.current) return;
    if (displayCampaignPoints < campaignPointTarget) return;
    pulseScheduledRef.current = true;
    try {
      const k = `gq-score-pulse-${campaignStartEnCA}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch {
      return;
    }
    let cancelled = false;
    let timeoutId: number | undefined;
    queueMicrotask(() => {
      if (cancelled) return;
      setScorePulse(true);
      timeoutId = window.setTimeout(() => {
        if (!cancelled) setScorePulse(false);
      }, 1100);
    });
    return () => {
      cancelled = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, [
    reducedMotion,
    session,
    hasValidQuestRange,
    displayCampaignPoints,
    campaignPointTarget,
    campaignStartEnCA,
  ]);

  useEffect(() => {
    let cancelled = false;
    let raf = 0;
    queueMicrotask(() => {
      if (cancelled) return;
      if (reducedMotion) {
        setMonthlyListVisible(true);
        return;
      }
      setMonthlyListVisible(false);
      raf = requestAnimationFrame(() => {
        if (!cancelled) setMonthlyListVisible(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [reducedMotion, historySummary?.monthly]);

  const momInsight = useMemo(
    () => computeMonthOverMonthInsight(historySummary?.monthly ?? []),
    [historySummary?.monthly]
  );

  const activeMonthsInWindow = useMemo(
    () => countActiveMonthsInWindow(historySummary?.monthly ?? [], 3),
    [historySummary?.monthly]
  );

  useEffect(() => {
    if (!hasValidQuestRange) {
      const first = historySummary?.monthly?.[0]?.month;
      if (first) {
        queueMicrotask(() => {
          setLeaderboardMonthKey((k) => (k === "campaign" ? first : k));
        });
      }
    }
  }, [hasValidQuestRange, historySummary?.monthly]);

  const leaderboardRange =
    leaderboardMonthKey === "campaign"
      ? hasValidQuestRange
        ? { start: campaignStartEnCA, end: campaignEndEnCA }
        : null
      : monthKeyToRangeEnCA(leaderboardMonthKey);

  const leaderboardStart = leaderboardRange?.start ?? "";
  const leaderboardEnd = leaderboardRange?.end ?? "";

  const { data: leaderboardList } = useQuery<QuestRankResponse[]>({
    queryKey: ["quest-list", leaderboardStart, leaderboardEnd],
    queryFn: () =>
      client
        .get(`/point/check-points/${leaderboardStart}/${leaderboardEnd}`)
        .then((res) => res.data),
    enabled: Boolean(leaderboardStart && leaderboardEnd),
  });

  const { data: myLeaderboardQuest } = useQuery<QuestRankResponse>({
    queryKey: ["my-quest-list", leaderboardStart, leaderboardEnd],
    queryFn: () =>
      client
        .get(`/point/my-quest-list/${leaderboardStart}/${leaderboardEnd}`)
        .then((res) => res.data),
    enabled: Boolean(session) && Boolean(leaderboardStart && leaderboardEnd),
  });

  useEffect(() => {
    queueMicrotask(() => setRankUpChipVisible(false));
  }, [leaderboardStart, leaderboardEnd]);

  useEffect(() => {
    if (!session?.user || myLeaderboardQuest?.rank == null) return;
    const uid = String(session.user.id ?? session.user._id ?? "");
    if (!uid) return;
    const key = `gogocash.gq.rank.v1.${uid}.${leaderboardStart}.${leaderboardEnd}`;
    const cur = myLeaderboardQuest.rank;
    const prevRaw = localStorage.getItem(key);
    if (prevRaw != null) {
      const prev = Number(prevRaw);
      if (Number.isFinite(prev) && cur < prev) {
        toast.success(t("gogoquestHistoryRankUpToast", { from: prev, to: cur }));
        queueMicrotask(() => setRankUpChipVisible(true));
      }
    }
    localStorage.setItem(key, String(cur));
  }, [session?.user, myLeaderboardQuest?.rank, leaderboardStart, leaderboardEnd, t]);

  useEffect(() => {
    if (!rankUpChipVisible) return;
    const id = window.setTimeout(() => setRankUpChipVisible(false), 12000);
    return () => clearTimeout(id);
  }, [rankUpChipVisible]);

  const monthOptions = (() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    const push = (value: string, label: string) => {
      if (seen.has(value)) return;
      seen.add(value);
      opts.push({ value, label });
    };
    if (hasValidQuestRange) {
      push("campaign", t("gogoquestHistoryLeaderboardMonthCampaign"));
    }
    const months = [...(historySummary?.monthly ?? [])].sort((a, b) =>
      b.month.localeCompare(a.month)
    );
    for (const row of months) {
      push(row.month, formatMonthYear(row.month, locale));
    }
    return opts;
  })();

  const friendlyPeriodLabel =
    campaignStart && campaignEnd
      ? formatFriendlyDateRange(campaignStart, campaignEnd, locale)
      : t("gogoquestHistoryPeriodPending");

  const leaderboardPeriodDescription = (() => {
    if (leaderboardMonthKey === "campaign") return friendlyPeriodLabel;
    if (!leaderboardRange) return "";
    const s = new Date(`${leaderboardStart}T12:00:00.000Z`);
    const e = new Date(`${leaderboardEnd}T12:00:00.000Z`);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) {
      return `${leaderboardStart} – ${leaderboardEnd}`;
    }
    return formatFriendlyDateRange(s, e, locale);
  })();

  const monthlyMaxPoints = useMemo(() => {
    const rows = historySummary?.monthly ?? [];
    if (!rows.length) return 1;
    return Math.max(...rows.map((r) => r.points), 1);
  }, [historySummary?.monthly]);

  const topCampaignPoints = campaignLeaderboard?.[0]?.point;
  const gapToLeader =
    typeof topCampaignPoints === "number" && campaignPointTarget < topCampaignPoints
      ? topCampaignPoints - campaignPointTarget
      : null;
  const softMilestone =
    myCampaignQuest?.rank === 1 || gapToLeader === 0
      ? null
      : gapToLeader != null && gapToLeader > 0
        ? null
        : nextSoftGoal(campaignPointTarget);

  return (
    <SubPage title="profilePopperGogoquestHistory" showSubMenu>
      <div className="flex flex-col gap-12">
        {/* Hero — plain language, scannable */}
        <header className="flex flex-col gap-4 rounded-3xl border border-[#e4e4e4] bg-linear-to-br from-[#f0fdf9] via-white to-[#f6f6f6] p-6 md:flex-row md:items-stretch md:gap-8 md:p-8">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#00aa80]">
              {t("gogoquestHistoryHeroKicker")}
            </p>
            <h2 className="text-[22px] font-semibold leading-tight tracking-tight text-[#103522] md:text-[26px]">
              {t("gogoquestHistoryHeroTitle")}
            </h2>
            <p className="max-w-[640px] text-[15px] leading-relaxed text-[#4a5c54]">
              {t("gogoquestHistoryPageIntro")}
            </p>
          </div>
          <div className="flex w-full shrink-0 flex-col justify-center gap-3 rounded-2xl border border-[#00aa80]/20 bg-white/90 p-5 shadow-sm md:max-w-[320px]">
            <p className="text-[14px] font-medium text-[#103522]">
              {t("gogoquestHistoryPlanTitle")}
            </p>
            <ol className="list-decimal space-y-2 pl-4 text-[14px] leading-relaxed text-[#5b6b61]">
              <li>{t("gogoquestHistoryPlanStep1")}</li>
              <li>{t("gogoquestHistoryPlanStep2")}</li>
              <li>{t("gogoquestHistoryPlanStep3")}</li>
            </ol>
            <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <Button
                variant="outlined"
                color="primary"
                component={Link}
                href="/quest"
                className="w-full normal-case sm:w-auto"
              >
                {t("gogoquestHistoryViewQuestHub")}
              </Button>
              <Button
                variant="contained"
                component={Link}
                href="/shop"
                className="w-full normal-case sm:w-auto"
                sx={{ bgcolor: "#00AA80", "&:hover": { bgcolor: "#009970" } }}
              >
                {t("gogoquestHistoryPlanCtaBrowse")}
              </Button>
            </div>
          </div>
        </header>

        {/* This round — big numbers, human dates */}
        <section className="flex flex-col gap-4" aria-labelledby="gogoquest-current-heading">
          <div className="flex flex-col gap-1">
            <h2
              id="gogoquest-current-heading"
              className="text-[18px] font-semibold tracking-tight text-[#103522] md:text-[20px]"
            >
              {t("gogoquestHistoryCurrentCampaign")}
            </h2>
            <p className="text-[14px] text-[#5b6b61]">{t("gogoquestHistoryRoundShopHint")}</p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-[#e4e4e4] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:gap-10 md:p-8">
              <div className="flex min-w-0 flex-col gap-2">
                <p className="text-[13px] font-medium text-[#87948b]">
                  {t("gogoquestHistoryPeriodLabel")}
                </p>
                <p className="text-[18px] font-semibold text-[#103522] md:text-[20px]">
                  {friendlyPeriodLabel}
                </p>
                {hasValidQuestRange && roundIsActive && daysLeft !== null ? (
                  <p className="mt-1 inline-flex w-fit items-center rounded-full bg-[#e6faf5] px-3 py-1 text-[13px] font-semibold text-[#007d5e]">
                    {t("gogoquestHistoryDaysLeft", { count: daysLeft })}
                  </p>
                ) : null}
                {hasValidQuestRange && !roundIsActive ? (
                  <p className="mt-1 text-[14px] text-[#5b6b61]">
                    {t("gogoquestHistoryRoundEnded")}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-col items-start gap-1 rounded-2xl bg-[#f6f6f6] px-6 py-5 md:min-w-[200px] md:items-center md:text-center">
                <p className="text-[13px] font-medium text-[#87948b]">
                  {t("gogoquestHistoryYourScoreLabel")}
                </p>
                {session ? (
                  <p
                    className={`text-[36px] font-bold leading-none tabular-nums tracking-tight text-[#00aa80] md:text-[42px] ${scorePulse ? "gq-score-pulse-on" : ""}`}
                  >
                    {formatNumber(displayCampaignPoints, 0)}
                  </p>
                ) : (
                  <p className="text-[15px] text-[#5b6b61]">{t("gogoquestHistorySignInHint")}</p>
                )}
                {session ? (
                  <p className="max-w-[220px] text-left text-[12px] leading-snug text-[#87948b] md:text-center">
                    {t("gogoquestHistoryScoreFootnote")}
                  </p>
                ) : null}
                {session && hasValidQuestRange && roundIsActive ? (
                  <div className="mt-3 max-w-[240px] text-left text-[13px] leading-snug text-[#5b6b61] md:text-center">
                    {myCampaignQuest?.rank === 1 ? (
                      <p className="font-medium text-[#007d5e]">
                        {t("gogoquestHistoryMilestoneTop")}
                      </p>
                    ) : null}
                    {myCampaignQuest?.rank !== 1 && gapToLeader != null && gapToLeader > 0 ? (
                      <p>
                        {t("gogoquestHistoryMilestoneGap", {
                          points: formatNumber(gapToLeader, 0),
                        })}
                      </p>
                    ) : null}
                    {myCampaignQuest?.rank !== 1 && softMilestone != null ? (
                      <p>
                        {t("gogoquestHistoryMilestoneSoftGoal", {
                          goal: formatNumber(softMilestone, 0),
                        })}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {session && momInsight ? (
          <GogoquestHistoryInsightSection
            locale={locale}
            insight={momInsight}
            activeMonthsInWindow={activeMonthsInWindow}
            formatMonthYear={formatMonthYear}
          />
        ) : null}

        {session ? (
          <>
            <section className="flex flex-col gap-4" aria-labelledby="gogoquest-monthly-heading">
              <div className="flex flex-col gap-1">
                <h2
                  id="gogoquest-monthly-heading"
                  className="text-[18px] font-semibold tracking-tight text-[#103522] md:text-[20px]"
                >
                  {t("gogoquestHistoryMonthlySection")}
                </h2>
                <p className="text-[14px] text-[#5b6b61]">
                  {t("gogoquestHistoryMonthlySectionHint")}
                </p>
              </div>
              {historySummary?.monthly?.length ? (
                <ul className="flex flex-col gap-3">
                  {historySummary.monthly.map((row, index) => {
                    const pct = Math.min(100, Math.round((row.points / monthlyMaxPoints) * 100));
                    return (
                      <li
                        key={row.month}
                        className="rounded-2xl border border-[#e4e4e4] bg-white px-5 py-4 shadow-sm transition-[transform,box-shadow] duration-200 motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
                        style={{
                          opacity: monthlyListVisible ? 1 : 0,
                          transform: monthlyListVisible ? "translateY(0)" : "translateY(10px)",
                          transitionProperty: "opacity, transform, box-shadow",
                          transitionDuration: reducedMotion ? "0ms" : "420ms",
                          transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
                          transitionDelay: reducedMotion ? "0ms" : `${index * 55}ms`,
                        }}
                      >
                        <div className="flex flex-wrap items-end justify-between gap-2">
                          <span className="text-[15px] font-semibold text-[#103522]">
                            {formatMonthYear(row.month, locale)}
                          </span>
                          <span className="text-[15px] font-bold tabular-nums text-[#00aa80]">
                            {formatNumber(row.points, 0)}{" "}
                            <span className="text-[13px] font-semibold text-[#87948b]">
                              {t("gogoquestHistoryPointsSuffix")}
                            </span>
                          </span>
                        </div>
                        <div
                          className="mt-3 h-2 overflow-hidden rounded-full bg-[#eef1ef]"
                          role="presentation"
                          aria-hidden
                        >
                          <div
                            className="h-full rounded-full bg-[#00aa80]/85 transition-[width] duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="rounded-2xl border border-dashed border-[#e4e4e4] bg-[#fafafa] px-5 py-6 text-[15px] text-[#5b6b61]">
                  {t("gogoquestHistoryEmptyMonthly")}
                </p>
              )}
            </section>

            <section className="flex flex-col gap-4" aria-labelledby="gogoquest-rewards-heading">
              <div className="flex flex-col gap-1">
                <h2
                  id="gogoquest-rewards-heading"
                  className="text-[18px] font-semibold tracking-tight text-[#103522] md:text-[20px]"
                >
                  {t("gogoquestHistoryRewardsSection")}
                </h2>
                <p className="text-[14px] text-[#5b6b61]">
                  {t("gogoquestHistoryRewardsSectionHint")}
                </p>
              </div>
              {historySummary?.rewards?.length ? (
                <ul className="flex flex-col gap-3">
                  {historySummary.rewards.map((r) => (
                    <li
                      key={r._id}
                      className="rounded-2xl border border-[#e4e4e4] bg-white px-5 py-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-[#103522]">{r.title}</p>
                            {isRewardGrantRecent(r.grantedAt) ? (
                              <span className="rounded-full bg-[#fff4e5] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#b45309]">
                                {t("gogoquestHistoryRewardNewBadge")}
                              </span>
                            ) : null}
                          </div>
                          {r.description ? (
                            <p className="mt-1 text-[14px] leading-relaxed text-[#5b6b61]">
                              {r.description}
                            </p>
                          ) : null}
                          <p className="mt-2 text-[13px] text-[#87948b]">
                            {new Date(r.grantedAt).toLocaleDateString(locale, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        {typeof r.points === "number" ? (
                          <span className="shrink-0 rounded-lg bg-[#e6faf5] px-2.5 py-1 text-[14px] font-bold tabular-nums text-[#007d5e]">
                            +{formatNumber(r.points, 0)} {t("gogoquestHistoryPointsSuffix")}
                          </span>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-2xl border border-dashed border-[#e4e4e4] bg-[#fafafa] px-5 py-6 text-[15px] text-[#5b6b61]">
                  {t("gogoquestHistoryEmptyRewards")}
                </p>
              )}
            </section>
          </>
        ) : null}

        <section className="flex flex-col gap-4" aria-labelledby="gogoquest-leaderboard-heading">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <div>
                <h2
                  id="gogoquest-leaderboard-heading"
                  className="text-[18px] font-semibold tracking-tight text-[#103522] md:text-[20px]"
                >
                  {t("gogoquestHistoryLeaderboardSection")}
                </h2>
                <p className="text-[14px] leading-relaxed text-[#5b6b61]">
                  {t("gogoquestHistoryLeaderboardHelp")}
                </p>
              </div>
              {rankUpChipVisible ? (
                <div className="flex shrink-0 items-center gap-2 rounded-full border border-[#00aa80]/35 bg-[#e6faf5] px-3 py-1.5">
                  <span className="text-[13px] font-semibold text-[#007d5e]">
                    {t("gogoquestHistoryRankUpChip")}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRankUpChipVisible(false)}
                    className="text-[12px] font-medium text-[#007d5e] underline decoration-[#007d5e]/50"
                  >
                    {t("gogoquestHistoryRankUpChipDismiss")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          {monthOptions.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-[#e4e4e4] bg-[#fafafa] p-4 md:p-5">
              <p className="text-[14px] font-medium text-[#3b3b3b]">
                {t("gogoquestHistoryLeaderboardPickMonth")}
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="listbox"
                aria-label={t("gogoquestHistoryLeaderboardPickMonth")}
              >
                {monthOptions.map((opt) => {
                  const selected = leaderboardMonthKey === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => setLeaderboardMonthKey(opt.value)}
                      className={`rounded-full border px-4 py-2.5 text-left text-[14px] font-medium transition-colors ${
                        selected
                          ? "border-[#00aa80] bg-[#00aa80] text-white shadow-sm"
                          : "border-[#e4e4e4] bg-white text-[#3b3b3b] hover:border-[#00aa80]/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {leaderboardPeriodDescription ? (
                <p className="text-[13px] text-[#87948b]">
                  {t("gogoquestHistoryLeaderboardSelectedPeriod", {
                    period: leaderboardPeriodDescription,
                  })}
                </p>
              ) : null}
            </div>
          ) : null}

          {!leaderboardRange ? (
            <p className="rounded-2xl border border-dashed border-[#e4e4e4] bg-[#fafafa] px-5 py-6 text-[15px] text-[#5b6b61]">
              {t("gogoquestHistoryLeaderboardNoPeriod")}
            </p>
          ) : (
            <div className="rounded-2xl border border-[#e4e4e4] bg-white p-4 shadow-sm md:p-6">
              <ListRank
                list={leaderboardList}
                myQuest={myLeaderboardQuest}
                hidePromoBanner
                onViewPlayer={(item) => setViewUserId(item.user_id)}
                viewPlayerLabel={t("gogoquestHistoryViewPlayer")}
              />
            </div>
          )}
        </section>
      </div>

      <GogoquestPlayerSummaryDialog
        open={viewUserId != null}
        onClose={() => setViewUserId(null)}
        userId={viewUserId}
        periodStart={leaderboardStart}
        periodEnd={leaderboardEnd}
      />
    </SubPage>
  );
}
