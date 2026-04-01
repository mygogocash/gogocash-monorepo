"use client";

import PageTransition from "@/components/PageTransition";
import { use } from "react";

type RouteParams = Record<string, string | string[] | undefined>;

export default function FullWidthPageLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<RouteParams>;
}) {
  use(params);
  return (
    <PageTransition variant="fade" className="min-h-full">
      {children}
    </PageTransition>
  );
}
