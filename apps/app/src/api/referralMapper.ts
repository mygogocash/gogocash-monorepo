import type { ReferralPointRecord, ReferralPointUser } from "@mobile/api/referralTypes";

// View-model row for the referral invitation table — same shape as the
// screen's fixture rows so the panel renders either source unchanged.
export type ReferralInviteRow = {
  category: "account" | "shop";
  date: string;
  point: string;
  status: string;
  user: string;
};

function maskReferredId(id: string | undefined): string {
  if (!id) {
    return "***????";
  }
  return `***${id.slice(-4).padStart(4, "*")}`;
}

// Identity rule (privacy boundary): username when set, else the masked id —
// never email, mobile, or any other populated PII field.
function resolveIdentity(referredUser: ReferralPointRecord["referral_id"]): string {
  if (typeof referredUser === "string") {
    return maskReferredId(referredUser);
  }
  const populated = referredUser as ReferralPointUser | null | undefined;
  return populated?.username?.trim() || maskReferredId(populated?._id);
}

// Matches the fixture rows' M/D/YYYY format ("3/28/2026").
function formatRowDate(createdAt: string | undefined): string {
  const parsed = createdAt ? new Date(createdAt) : null;
  if (!parsed || Number.isNaN(parsed.getTime())) {
    return "";
  }
  return `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`;
}

export function mapReferralPointsToInviteRows(
  points: ReferralPointRecord[]
): ReferralInviteRow[] {
  return points.map((record) => ({
    // Referral signup rewards are account-category in the invitation tabs.
    category: "account" as const,
    date: formatRowDate(record.createdAt),
    point: `${record.point ?? 0} pts`,
    status: record.type === "remove" ? "Reversed" : "Success",
    user: resolveIdentity(record.referral_id),
  }));
}
