"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import LinkMyCashbackScreen from "@/features/auth/component/LinkMyCashbackScreen";

export default function PageClient() {
  return (
    <AuthGuard>
      <LinkMyCashbackScreen />
    </AuthGuard>
  );
}
