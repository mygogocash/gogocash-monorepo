"use client";

import { ResponseReferralList } from "@/interfaces/referral";
import {
  referralRowMatchesTab,
  type ReferralInviteTab,
} from "@/lib/referral/referralInvitationFilter";
import {
  PROFILE_TAB_STRIP_LIST_CLASS,
  profileTabButtonClassName,
} from "@/lib/ui/profileTabStripClasses";
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
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState, type KeyboardEvent } from "react";
import ReferralEmptyInvitationIllustration from "./ReferralEmptyInvitationIllustration";

export type { ReferralInviteTab };

const TAB_DEFS: { id: ReferralInviteTab; labelKey: string }[] = [
  { id: "all", labelKey: "referralTabAllInvitations" },
  { id: "account", labelKey: "referralTabCreatedAccount" },
  { id: "shop", labelKey: "referralTabShoppedWithUs" },
];

/**
 * Invitation list with wallet-aligned tab strip (shared classes with `WalletTransaction`).
 */
export default function ReferralInvitationPanel() {
  const t = useTranslations();
  const { data: session } = useSession();
  const [tab, setTab] = useState<ReferralInviteTab>("all");
  const tabButtonRefs = useRef<Partial<Record<ReferralInviteTab, HTMLButtonElement | null>>>({});

  const { data: rows } = useQuery<ResponseReferralList[]>({
    queryKey: ["getListReferral"],
    queryFn: () => fetcher(`/point/referral-list`),
    enabled: !!session?.user?._id,
  });

  const filtered = useMemo(() => {
    const list = rows ?? [];
    return list.filter((r) => referralRowMatchesTab(r, tab));
  }, [rows, tab]);

  const showEmpty = filtered.length === 0;

  const focusTabIndex = useCallback((index: number) => {
    const next = TAB_DEFS[index];
    if (!next) return;
    setTab(next.id);
    queueMicrotask(() => {
      tabButtonRefs.current[next.id]?.focus();
    });
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

      <div className="flex w-full flex-col gap-4">
        <div
          role="tablist"
          aria-label={t("referralInvitationTitle")}
          className={PROFILE_TAB_STRIP_LIST_CLASS}
          onKeyDown={onTabListKeyDown}
        >
          {TAB_DEFS.map(({ id, labelKey }) => {
            const selected = tab === id;
            return (
              <button
                key={id}
                ref={(el) => {
                  tabButtonRefs.current[id] = el;
                }}
                type="button"
                role="tab"
                id={`referral-tab-${id}`}
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => setTab(id)}
                className={profileTabButtonClassName(selected)}
              >
                {t(labelKey)}
              </button>
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
