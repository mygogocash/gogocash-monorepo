"use client";

import PageTransition from "@/components/PageTransition";

export default function FullWidthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageTransition variant="fade" className="min-h-full">
      {children}
    </PageTransition>
  );
}
