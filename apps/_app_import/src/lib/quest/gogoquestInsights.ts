import type { QuestMonthlyPointsRow } from "@/interfaces/questHistory";

export type MonthOverMonthInsight =
  | {
      kind: "up" | "down";
      percent: number;
      recentMonth: string;
      olderMonth: string;
      recentPoints: number;
      olderPoints: number;
    }
  | {
      kind: "flat";
      recentMonth: string;
      olderMonth: string;
      points: number;
    }
  | {
      kind: "first_month";
      month: string;
      points: number;
    }
  | null;

/**
 * Compares the two most recent months by `YYYY-MM` (descending).
 */
export function computeMonthOverMonthInsight(
  monthly: QuestMonthlyPointsRow[]
): MonthOverMonthInsight {
  if (monthly.length === 0) return null;
  const sorted = [...monthly].sort((a, b) => b.month.localeCompare(a.month));
  const recent = sorted[0];
  if (!recent) return null;
  if (sorted.length === 1) {
    return {
      kind: "first_month",
      month: recent.month,
      points: recent.points,
    };
  }
  const older = sorted[1];
  if (!older) return null;

  if (recent.points === older.points) {
    return {
      kind: "flat",
      recentMonth: recent.month,
      olderMonth: older.month,
      points: recent.points,
    };
  }

  if (older.points === 0) {
    if (recent.points > 0) {
      return {
        kind: "up",
        percent: 100,
        recentMonth: recent.month,
        olderMonth: older.month,
        recentPoints: recent.points,
        olderPoints: older.points,
      };
    }
    return {
      kind: "flat",
      recentMonth: recent.month,
      olderMonth: older.month,
      points: recent.points,
    };
  }

  const raw = ((recent.points - older.points) / older.points) * 100;
  const percent = Math.round(Math.abs(raw));
  return {
    kind: recent.points > older.points ? "up" : "down",
    percent,
    recentMonth: recent.month,
    olderMonth: older.month,
    recentPoints: recent.points,
    olderPoints: older.points,
  };
}

/**
 * How many of the last `windowMonths` calendar months (including current) had quest points > 0.
 */
export function countActiveMonthsInWindow(
  monthly: QuestMonthlyPointsRow[],
  windowMonths: number,
  now = new Date()
): number {
  if (windowMonths < 1) return 0;
  const keys = new Set<string>();
  for (let i = 0; i < windowMonths; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    keys.add(`${y}-${String(m).padStart(2, "0")}`);
  }
  return monthly.filter((r) => keys.has(r.month) && r.points > 0).length;
}

const SOFT_GOALS = [100, 250, 500, 1000, 2500, 5000] as const;

/**
 * Next soft milestone when leaderboard gap is not meaningful (e.g. solo or already at top).
 */
export function nextSoftGoal(points: number): number | null {
  for (const g of SOFT_GOALS) {
    if (points < g) return g;
  }
  return null;
}
