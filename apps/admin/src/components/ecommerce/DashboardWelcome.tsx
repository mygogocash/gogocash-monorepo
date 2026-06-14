"use client";

import React from "react";
import { useSession } from "next-auth/react";

function displayName(session: { user?: { name?: string | null; email?: string | null } } | null): string {
  const raw = session?.user?.name?.trim();
  if (raw) {
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }
  const email = session?.user?.email;
  if (email) {
    const local = email.split("@")[0]?.replace(/\./g, " ") ?? "";
    if (local) {
      return local.charAt(0).toUpperCase() + local.slice(1);
    }
  }
  return "Admin";
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardWelcome() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div
        className="rounded-2xl border border-gray-200 bg-white px-5 py-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:py-6"
        aria-hidden
      >
        <div className="h-7 w-56 max-w-full animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />
        <div className="mt-3 h-4 w-full max-w-2xl animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
        <div className="mt-2 h-4 w-[85%] max-w-xl animate-pulse rounded-md bg-gray-100 dark:bg-gray-800" />
      </div>
    );
  }

  const name = displayName(session);
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-5 transition-shadow duration-300 ease-out dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:py-6">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {todayLabel}
      </p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
        {timeGreeting()}, {name}
      </h1>
      <p className="mt-3 max-w-3xl text-theme-sm leading-relaxed text-gray-600 dark:text-gray-400">
        Today&apos;s overview: start with the KPIs below, then check Performance for trends, Withdrawals for
        payouts, and Recent activity for the latest events.
      </p>
    </div>
  );
}
