// Maps the real customer quest endpoints (verified live on api-beta 2026-07-22) onto the
// shapes the Quest screen already renders. Pure functions, no I/O — mirrors questTaskMapper.
//
// Endpoints (served by the shared apps/api; proven by the prod gogocash_app contract):
//   GET /point/get-quest-open              -> active quest window (dates + banners), public
//   GET /point/check-points/:start/:end    -> leaderboard rows sorted desc by point, public
//   GET /point/my-quest-list/:start/:end   -> current user's rank + points + breakdown, auth
export const questWindowEndpoint = "/point/get-quest-open";
export const questLeaderboardEndpoint = "/point/check-points";
export const questMyRankEndpoint = "/point/my-quest-list";

// The compact leaderboard panel renders a small top-N slice (parity with the prior fixture).
export const QUEST_LEADERBOARD_TOP_N = 5;

export type QuestLeaderboardRow = {
  key: string;
  name: string;
  points: string;
};

export type QuestWindow = {
  startPath: string;
  endPath: string;
  bannerEn?: string;
  bannerTh?: string;
  subBannerEn?: string;
  subBannerTh?: string;
};

export type QuestMyRankValues = {
  rankValue: string;
  pointsValue: string;
  spendingValue: string;
  specialTasksValue: string;
};

export function mapQuestLeaderboardRows(
  payload: unknown,
  topN: number = QUEST_LEADERBOARD_TOP_N,
): QuestLeaderboardRow[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .slice(0, Math.max(0, topN))
    .map((raw, index) => {
      if (!isRecord(raw)) return null;
      const name = truncateName(firstText(raw.username) ?? "");
      const point = toFiniteNumber(raw.point) ?? 0;
      // key: prefer a stable id, fall back to index. NEVER surface email.
      const key = firstText(raw.user_id, raw._id) ?? `row-${index}`;
      return { key, name, points: formatCount(point) };
    })
    .filter((row): row is QuestLeaderboardRow => row !== null);
}

export function mapMyQuestRank(payload: unknown): QuestMyRankValues | null {
  const row = Array.isArray(payload) ? payload[0] : payload;
  if (!isRecord(row)) return null;
  // The backend returns rank=0 (findIndex(-1)+1) with no point field when the authed user
  // has no qualifying points in the window — i.e. they are UNRANKED. Only a rank >= 1 is a
  // real placement; anything else maps to null so the card shows the honest signed-out
  // zeros ("-"/"0") instead of a fabricated "0th".
  const rank = toFiniteNumber(row.rank);
  if (rank == null || rank < 1) return null;
  const point = toFiniteNumber(row.point);

  const specialTasks =
    (toFiniteNumber(row.extra_point_received) ?? 0) +
    (toFiniteNumber(row.extra_point_referral) ?? 0) +
    (toFiniteNumber(row.bonus_over_300_received) ?? 0) +
    (toFiniteNumber(row.point_social_reward) ?? 0);
  const totalPoints = point ?? 0;
  const spending = totalPoints - specialTasks;

  return {
    rankValue: rank == null ? "-" : ordinal(rank),
    pointsValue: formatCount(totalPoints),
    spendingValue: formatCount(spending),
    specialTasksValue: formatCount(specialTasks),
  };
}

export function mapQuestWindow(payload: unknown): QuestWindow | null {
  const row = Array.isArray(payload) ? payload[0] : payload;
  if (!isRecord(row)) return null;
  const startPath = formatQuestDate(row.start_date);
  const endPath = formatQuestDate(row.end_date);
  if (!startPath || !endPath) return null;
  return {
    startPath,
    endPath,
    ...optional("bannerEn", firstText(row.banner_en)),
    ...optional("bannerTh", firstText(row.banner_th)),
    ...optional("subBannerEn", firstText(row.sub_banner_en)),
    ...optional("subBannerTh", firstText(row.sub_banner_th)),
  };
}

/**
 * Mirrors the prod gogocash_app ListRank truncation exactly:
 *   len <= 11 -> slice(0,3) + "..." + slice(-3)
 *   len  > 11 -> slice(0,6) + "..." + slice(-6)   (formatAddress(name, 6, 6))
 */
function truncateName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 11) {
    return `${trimmed.slice(0, 3)}...${trimmed.slice(-3)}`;
  }
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-6)}`;
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    value,
  );
}

/**
 * Ordinal suffix — intentionally mirrors prod's naive rule (only exact 1/2/3 get
 * st/nd/rd, everything else -> th) so the beta My Rank string matches app.gogocash.co.
 */
function ordinal(rank: number): string {
  const suffix = rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th";
  return `${rank}${suffix}`;
}

// UTC YYYY-MM-DD. The quest window is defined at T00:00:00.000Z, so UTC yields the
// canonical date and is timezone-safe (these exact params were verified against
// api-beta /point/check-points). Returns null for an unparseable value.
function formatQuestDate(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function optional<K extends string>(
  key: K,
  value: string | undefined,
): Record<K, string> | Record<string, never> {
  return value ? ({ [key]: value } as Record<K, string>) : {};
}

function firstText(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
