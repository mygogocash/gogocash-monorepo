"use client";

import AgeVerificationFlow from "@/components/pdpa/AgeVerificationFlow";
import SubPage from "@/features/profile/layout/SubPage";

export default function PageClient() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <SubPage title="pdpaAgeVerifyTitle" showSubMenu>
        <AgeVerificationFlow />
      </SubPage>
    </div>
  );
}
