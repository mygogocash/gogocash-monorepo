"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";
import AuthGuard from "@/components/auth/AuthGuard";
import PageTransition from "@/components/PageTransition";
import React, { use } from "react";

type RouteParams = Record<string, string | string[] | undefined>;

export default function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<RouteParams>;
}) {
  use(params);
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  // Dynamic class for main content margin based on sidebar state
  const mainContentMargin = isMobileOpen
    ? "ml-0"
    : isExpanded || isHovered
      ? "lg:ml-[290px]"
      : "lg:ml-[90px]";

  return (
    <AuthGuard>
      <div className="min-h-screen xl:flex">
        {/* Sidebar and Backdrop */}
        <AppSidebar />
        <Backdrop />
        {/* Main Content Area */}
        <div
          className={`relative z-10 min-w-0 flex-1 transition-all duration-300 ease-in-out ${mainContentMargin}`}
        >
          {/* Header: must stay outside overflow-x-hidden so sticky positioning works */}
          <AppHeader />
          {/* Page Content — clip horizontal overflow here only */}
          <div className="mx-auto min-w-0 w-full max-w-screen-2xl overflow-x-hidden px-3 py-4 sm:px-4 md:px-6 md:py-6">
            <PageTransition>{children}</PageTransition>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
