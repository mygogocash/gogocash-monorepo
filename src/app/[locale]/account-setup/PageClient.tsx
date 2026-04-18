"use client";

import AuthGuard from "@/components/auth/AuthGuard";
import AccountSetupScreen from "@/features/onboarding/component/AccountSetupScreen";

export default function PageClient() {
  return (
    <AuthGuard>
      <AccountSetupScreen />
    </AuthGuard>
  );
}
