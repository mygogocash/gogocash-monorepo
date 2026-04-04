"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import MyCashbackSignInReferenceScreen from "@/features/auth/component/MyCashbackSignInReferenceScreen";

export default function PageClient() {
  return (
    <AuthGuard>
      <MyCashbackSignInReferenceScreen />
    </AuthGuard>
  );
}
