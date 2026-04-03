"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import {
  displayAffiliatePartner,
  formatSubmitted,
} from "@/components/offer/PendingOfferReviewContent";
import { getMockPendingOffers, type PendingOfferRow } from "@/data/mockPendingOffers";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

const NOTIFICATION_EMAIL = "info@gogocash.co";

/** Mock withdrawal notifications (internal). New requests trigger alert to NOTIFICATION_EMAIL. */
const MOCK_WITHDRAWAL_NOTIFICATIONS = [
  { id: "1", user: "Alice Smith", amount: "1,500 THB", time: "2 min ago", status: "pending" },
  { id: "2", user: "Bob Johnson", amount: "3,200 THB", time: "15 min ago", status: "pending" },
  { id: "3", user: "Charlie Lee", amount: "50 USD", time: "1 hr ago", status: "pending" },
];

function formatRelativeSubmitted(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffMs = Math.max(0, now - d.getTime());
    const minutes = Math.floor(diffMs / 60_000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days === 1 ? "" : "s"} ago`;
    if (hours > 0) return `${hours} hr${hours === 1 ? "" : "s"} ago`;
    if (minutes > 0) return `${minutes} min ago`;
    return "Just now";
  } catch {
    return formatSubmitted(iso);
  }
}

function NotificationItem({
  user,
  amount,
  time,
  onClose,
}: {
  user: string;
  amount: string;
  time: string;
  onClose: () => void;
}) {
  return (
    <DropdownItem
      onItemClick={onClose}
      className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
        <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </span>
      <span className="block min-w-0 flex-1">
        <span className="mb-1.5 block text-theme-sm text-gray-700 dark:text-gray-300">
          <span className="font-medium text-gray-800 dark:text-white/90">New withdrawal request</span>
          <span className="text-gray-500 dark:text-gray-400"> from </span>
          <span className="font-medium text-gray-800 dark:text-white/90">{user}</span>
          <span className="text-gray-500 dark:text-gray-400"> — </span>
          <span className="font-medium text-gray-800 dark:text-white/90">{amount}</span>
        </span>
        <span className="block text-theme-xs text-gray-500 dark:text-gray-400">
          Alert sent to {NOTIFICATION_EMAIL}
        </span>
        <span className="mt-0.5 block text-theme-xs text-gray-400 dark:text-gray-500">{time}</span>
      </span>
    </DropdownItem>
  );
}

function PendingOfferNotificationItem({
  offer,
  onClose,
}: {
  offer: PendingOfferRow;
  onClose: () => void;
}) {
  const title = offer.offer_name_display?.trim() || offer.offer_name;
  const partner = displayAffiliatePartner(offer);
  const when = formatRelativeSubmitted(offer.submitted_at);
  return (
    <DropdownItem
      tag="a"
      href={`/offers/pending/${offer._id}`}
      onItemClick={onClose}
      className="flex gap-3 rounded-lg border-b border-gray-100 p-3 px-4.5 py-3 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/40">
        <svg className="h-5 w-5 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </span>
      <span className="block min-w-0 flex-1">
        <span className="mb-1.5 block text-theme-sm text-gray-700 dark:text-gray-300">
          <span className="font-medium text-gray-800 dark:text-white/90">New offer pending review</span>
          <span className="text-gray-500 dark:text-gray-400"> — </span>
          <span className="font-medium text-gray-800 dark:text-white/90">{title}</span>
        </span>
        <span className="block text-theme-xs text-gray-500 dark:text-gray-400">{partner}</span>
        <span className="mt-0.5 block text-theme-xs text-gray-400 dark:text-gray-500">{when}</span>
      </span>
    </DropdownItem>
  );
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifying, setNotifying] = useState(true);
  /** Match SSR; sync session pending queue after mount (same pattern as New offer panel). */
  const [pendingOffers, setPendingOffers] = useState<PendingOfferRow[]>([]);

  useEffect(() => {
    const load = () => setPendingOffers(getMockPendingOffers());
    queueMicrotask(load);
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, []);

  const hasPendingOffers = pendingOffers.length > 0;
  const hasWithdrawalAlerts = MOCK_WITHDRAWAL_NOTIFICATIONS.length > 0;
  const showDot = notifying && (hasWithdrawalAlerts || hasPendingOffers);

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  const handleClick = () => {
    setPendingOffers(getMockPendingOffers());
    toggleDropdown();
    setNotifying(false);
  };

  return (
    <div className="relative">
      <button
        className="relative dropdown-toggle flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={handleClick}
      >
        <span
          className={`absolute right-0 top-0.5 z-10 h-2 w-2 rounded-full bg-orange-400 ${
            !showDot ? "hidden" : "flex"
          }`}
        >
          <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
        </span>
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="absolute -right-[240px] mt-[17px] flex h-[480px] min-h-0 w-[350px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 pb-3 mb-3 dark:border-gray-700">
          <h5 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Notification
          </h5>
          <button
            onClick={toggleDropdown}
            className="text-gray-500 transition dropdown-toggle dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <svg
              className="fill-current"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <div className="mb-2 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <div className="shrink-0 space-y-2">
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-theme-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              Withdrawal management — new requests trigger an alert to{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">{NOTIFICATION_EMAIL}</span>
            </div>
            <div className="rounded-lg bg-gray-50 px-3 py-2 text-theme-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">
              New offers — merchant submissions waiting for review appear below. Alerts go to{" "}
              <span className="font-medium text-gray-800 dark:text-gray-200">{NOTIFICATION_EMAIL}</span>
            </div>
          </div>
          <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
            <p className="mb-1 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              Withdrawals
            </p>
            <ul className="flex flex-col">
              {MOCK_WITHDRAWAL_NOTIFICATIONS.map((n) => (
                <li key={n.id}>
                  <NotificationItem
                    user={n.user}
                    amount={n.amount}
                    time={n.time}
                    onClose={closeDropdown}
                  />
                </li>
              ))}
            </ul>
            {hasPendingOffers ? (
              <>
                <p className="mb-1 mt-3 px-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Pending offer review
                </p>
                <ul className="flex flex-col">
                  {pendingOffers.map((offer) => (
                    <li key={offer._id}>
                      <PendingOfferNotificationItem offer={offer} onClose={closeDropdown} />
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-3 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-center text-theme-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                No offers awaiting review.
              </p>
            )}
          </div>
        </div>
        <div className="mt-3 flex shrink-0 flex-col gap-2">
          <Link
            href="/withdraw"
            className="block rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            onClick={closeDropdown}
          >
            View Withdrawal Management
          </Link>
          <Link
            href="/offers?tab=new-offer"
            className="block rounded-lg border border-gray-300 bg-white px-4 py-2 text-center text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
            onClick={closeDropdown}
          >
            Open New offer queue
          </Link>
        </div>
      </Dropdown>
    </div>
  );
}
