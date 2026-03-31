"use client";

import { ResponseReferralList } from "@/interfaces/referral";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/axios/client";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState, type KeyboardEvent } from "react";
import ReferralEmptyInvitationIllustration from "./ReferralEmptyInvitationIllustration";

export type ReferralInviteTab = "all" | "account" | "shop";

const TAB_DEFS: { id: ReferralInviteTab; labelKey: string }[] = [
  { id: "all", labelKey: "referralTabAllInvitations" },
  { id: "account", labelKey: "referralTabCreatedAccount" },
  { id: "shop", labelKey: "referralTabShoppedWithUs" },
];

function rowMatchesTab(row: ResponseReferralList, tab: ReferralInviteTab): boolean {
  if (tab === "all") return true;
  const hay = `${row.type ?? ""} ${row.action ?? ""}`.toLowerCase();
  if (tab === "account") {
    return /account|signup|sign_?up|register|created|join|verify|email|profile|welcome/i.test(hay);
  }
  return /shop|purchase|order|transaction|cashback|spent|buy|sale|merchant|checkout/i.test(hay);
}

/**
 * Invitation list with Figma-style segmented tabs and empty state.
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=8514-132148
 */
export default function ReferralInvitationPanel() {
  const t = useTranslations();
  const { data: session } = useSession();
  const [tab, setTab] = useState<ReferralInviteTab>("all");

  const { data: rows } = useQuery<ResponseReferralList[]>({
    queryKey: ["getListReferral"],
    queryFn: () => fetcher(`/point/referral-list`),
    enabled: !!session?.user?._id,
  });

  const filtered = useMemo(() => {
    const list = rows ?? [];
    return list.filter((r) => rowMatchesTab(r, tab));
  }, [rows, tab]);

  const showEmpty = filtered.length === 0;

  const focusTabIndex = useCallback((index: number) => {
    const next = TAB_DEFS[index];
    if (!next) return;
    setTab(next.id);
    document.getElementById(`referral-tab-${next.id}`)?.focus();
  }, []);

  const onTabListKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      const i = TAB_DEFS.findIndex((d) => d.id === tab);
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        focusTabIndex((i + 1) % TAB_DEFS.length);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        focusTabIndex((i - 1 + TAB_DEFS.length) % TAB_DEFS.length);
      } else if (e.key === "Home") {
        e.preventDefault();
        focusTabIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        focusTabIndex(TAB_DEFS.length - 1);
      }
    },
    [focusTabIndex, tab]
  );

  return (
    <section className="flex w-full flex-col gap-6" aria-labelledby="referral-invitation-heading">
      <h2 id="referral-invitation-heading" className="text-2xl font-semibold text-[#3b3b3b]">
        {t("referralInvitationTitle")}
      </h2>

      <div className="flex w-full flex-col gap-6">
        <div
          role="tablist"
          aria-label={t("referralInvitationTitle")}
          className="flex w-full gap-4 border-b border-[#e4e4e4]"
          onKeyDown={onTabListKeyDown}
        >
          {TAB_DEFS.map(({ id, labelKey }) => {
            const selected = tab === id;
            return (
              <div
                key={id}
                className="flex min-w-0 flex-1 flex-col items-center sm:max-w-[240px] sm:flex-none"
              >
                <button
                  type="button"
                  role="tab"
                  id={`referral-tab-${id}`}
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => setTab(id)}
                  className="flex w-full flex-col items-center outline-none focus-visible:ring-2 focus-visible:ring-[#00cc99] focus-visible:ring-offset-2"
                >
                  <div
                    className={cn(
                      "flex h-12 w-full items-center justify-center px-6 py-3 text-base font-medium",
                      selected ? "text-[#00cc99]" : "rounded-t-2xl bg-[#f6f6f6] text-[#3b3b3b]"
                    )}
                  >
                    {t(labelKey)}
                  </div>
                  <div className="relative h-0.5 w-32 shrink-0" aria-hidden>
                    {selected ? (
                      <Image
                        alt=""
                        src="/referral/invitation-empty/moving-line.svg"
                        fill
                        sizes="128px"
                        unoptimized
                        className="pointer-events-none object-fill"
                      />
                    ) : null}
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id="referral-invitation-panel"
          aria-labelledby={`referral-tab-${tab}`}
          className="flex w-full flex-col"
        >
          {showEmpty ? (
            <div className="flex w-full flex-col items-center justify-center gap-6 py-[72px]">
              <ReferralEmptyInvitationIllustration />
              <div className="flex w-full flex-col items-center gap-0 text-center leading-normal">
                <p className="w-full text-2xl font-medium text-[#00aa80]">
                  {t("referralEmptyInvitesTitle")}
                </p>
                <p className="w-full text-base font-normal text-[#7f7f7f]">
                  {t("referralEmptyInvitesSubtitle")}
                </p>
              </div>
            </div>
          ) : (
            <TableContainer component={Paper} className="rounded-3xl shadow-sm">
              <Table sx={{ minWidth: 650 }} size="medium" aria-label={t("referralInvitationTitle")}>
                <TableHead className="bg-[#f6f6f6]">
                  <TableRow>
                    <TableCell>{t("referralTableDate")}</TableCell>
                    <TableCell>{t("referralTableUser")}</TableCell>
                    <TableCell>{t("referralTablePoint")}</TableCell>
                    <TableCell>{t("referralTableStatus")}</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow
                      key={row._id}
                      sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                    >
                      <TableCell>{new Date(row.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>{row.referral_id?.username || t("referralUnknownUser")}</TableCell>
                      <TableCell>
                        {row.point} {t("referralPointsSuffix")}
                      </TableCell>
                      <TableCell>
                        <div className="w-fit rounded-[30px] bg-[#E6F7ED] px-3 py-1 text-[#00B14F]">
                          {t("referralStatusSuccess")}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </div>
      </div>
    </section>
  );
}
