"use client";

import type { ReactNode } from "react";
import CopyButton from "@/components/ui/CopyButton";
import type { MyCashbackResponse } from "@/types/user";

function fmtDateTime(v: unknown): string {
  if (v == null || v === "") return "—";
  const d =
    v instanceof Date ? v : new Date(typeof v === "string" || typeof v === "number" ? v : String(v));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function fmtDateOnly(v: unknown): string {
  if (v == null || v === "") return "—";
  const d =
    v instanceof Date ? v : new Date(typeof v === "string" || typeof v === "number" ? v : String(v));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function strPublisherId(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "object" && v !== null && "$oid" in v) {
    return String((v as { $oid: string }).$oid);
  }
  return String(v);
}

function YesNo(v: boolean | undefined): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return "—";
}

type RowProps = { label: string; children: ReactNode };

function FieldRow({ label, children }: RowProps) {
  return (
    <p className="flex flex-wrap items-start gap-1 text-sm text-gray-800 dark:text-gray-200">
      <span className="min-w-[140px] shrink-0 font-medium text-gray-600 dark:text-gray-400">
        {label}
      </span>
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

export type MyCashbackProfileSectionProps = {
  loading: boolean;
  error: boolean;
  user: MyCashbackResponse | null;
};

export default function MyCashbackProfileSection({
  loading,
  error,
  user,
}: MyCashbackProfileSectionProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 bg-white/60 p-4 dark:border-gray-600 dark:bg-gray-900/40">
        <div className="mb-2 h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
        MyCashBack profile could not be loaded for this user ID.
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const m = user.metadata;
  const token = user.buyerToken?.trim() ?? "";
  const tokenPreview =
    token.length > 14 ? `${token.slice(0, 8)}…${token.slice(-4)}` : token || "—";

  return (
    <div className="rounded-lg border border-gray-200 bg-white/90 p-4 dark:border-gray-700 dark:bg-gray-900/50">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
        MyCashBack profile
      </h3>
      <p className="mb-4 text-xs text-gray-500 dark:text-gray-500">
        Sourced from <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">/admin/get-mycashback-user</code>
      </p>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="space-y-2">
          <FieldRow label="Buyer ID">
            <>
              {user.buyerId || "—"}
              {user.buyerId ? <CopyButton value={user.buyerId} /> : null}
            </>
          </FieldRow>
          <FieldRow label="Publisher ID">
            <>
              {strPublisherId(user.publisherId as unknown)}
              {user.publisherId ? <CopyButton value={strPublisherId(user.publisherId as unknown)} /> : null}
            </>
          </FieldRow>
          <FieldRow label="First / last name">
            {[user.firstName, user.lastName].filter(Boolean).join(" ") || "—"}
          </FieldRow>
          <FieldRow label="Email verified">{YesNo(user.emailVerified)}</FieldRow>
          <FieldRow label="Phone verified">{YesNo(user.phoneNumberVerified)}</FieldRow>
          <FieldRow label="Binded">{YesNo(user.binded)}</FieldRow>
          <FieldRow label="Banned">
            {user.banned ? (
              <span className="font-medium text-red-700 dark:text-red-400">Yes</span>
            ) : (
              "No"
            )}
          </FieldRow>
          <FieldRow label="Banned note">{user.bannedNote?.trim() ? user.bannedNote : "—"}</FieldRow>
          <FieldRow label="Admin note">{user.note?.trim() ? user.note : "—"}</FieldRow>
          <FieldRow label="Rating">{user.rating != null ? String(user.rating) : "—"}</FieldRow>
          <FieldRow label="Credit score type">
            {user.creditScoreType != null ? String(user.creditScoreType) : "—"}
          </FieldRow>
          <FieldRow label="Re-seller">{YesNo(user.isReSeller)}</FieldRow>
        </div>

        <div className="space-y-2">
          <FieldRow label="Buyer token">
            <>
              <span className="font-mono text-xs">{tokenPreview}</span>
              {token ? <CopyButton value={token} /> : null}
            </>
          </FieldRow>
          <FieldRow label="Address">{user.address?.trim() ? user.address : "—"}</FieldRow>
          <FieldRow label="City">{user.city?.trim() ? user.city : "—"}</FieldRow>
          <FieldRow label="Zip code">{user.zipCode?.trim() ? user.zipCode : "—"}</FieldRow>
          <FieldRow label="Date of birth">{fmtDateOnly(user.dateOfBirth as unknown)}</FieldRow>
          <FieldRow label="Line">{user.lineIdentity?.trim() ? user.lineIdentity : "—"}</FieldRow>
          <FieldRow label="Facebook">{user.facebookIdentity?.trim() ? user.facebookIdentity : "—"}</FieldRow>
          <FieldRow label="Instagram">{user.instagramIdentity?.trim() ? user.instagramIdentity : "—"}</FieldRow>
          <FieldRow label="Twitter">{user.twitterIdentity?.trim() ? user.twitterIdentity : "—"}</FieldRow>
          <FieldRow label="Flags: TNGD token">{YesNo(user.flags?.hasRequestTNGDToken)}</FieldRow>
          <FieldRow label="Flags: browser redirect">{YesNo(user.flags?.isRedirectedFromBrowser)}</FieldRow>
          <FieldRow label="Created">{fmtDateTime(user.createdAt)}</FieldRow>
          <FieldRow label="Updated">{fmtDateTime(user.updatedAt)}</FieldRow>
        </div>
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Bonuses & metadata
        </h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <FieldRow label="First-time bonus amount">
            {m?.firstTimeBonusAmount != null ? String(m.firstTimeBonusAmount) : "—"}
          </FieldRow>
          <FieldRow label="Got first-time bonus">{YesNo(m?.gotFirstTimeBonus)}</FieldRow>
          <FieldRow label="Stair sequence bonus">{YesNo(m?.joinedStairSequenceBonus)}</FieldRow>
          <FieldRow label="Stair joined at">{fmtDateTime(m?.joinedStairSequenceBonusAt as unknown)}</FieldRow>
          <FieldRow label="VIP bonus">{YesNo(m?.joinedVipBonus)}</FieldRow>
          <FieldRow label="VIP joined at">{fmtDateTime(m?.joinedVipBonusAt as unknown)}</FieldRow>
          <FieldRow label="VIP expired at">{fmtDateTime(m?.expiredVipBonusAt as unknown)}</FieldRow>
          <FieldRow label="Current language">
            {m?.currentLanguage != null && String(m.currentLanguage).length > 0
              ? String(m.currentLanguage)
              : "—"}
          </FieldRow>
        </div>
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Balances
        </h4>
        {!user.balance?.length ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">No balance rows</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                <tr>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Currency</th>
                  <th className="px-3 py-2">Country</th>
                  <th className="px-3 py-2">Last updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {user.balance.map((b) => (
                  <tr key={b._id} className="bg-white dark:bg-gray-900/40">
                    <td className="px-3 py-2 font-mono tabular-nums">{b.amount}</td>
                    <td className="px-3 py-2">{b.currency}</td>
                    <td className="px-3 py-2">{"countryCode" in b && b.countryCode ? b.countryCode : "—"}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDateTime(b.lastUpdated)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
