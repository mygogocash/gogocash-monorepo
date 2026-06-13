"use client";

import SubPage from "@/features/profile/layout/SubPage";
import PrivacyCenterContent from "@/components/pdpa/PrivacyCenterContent";

export default function PageClient() {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
      <SubPage title="pdpaPrivacyCenterTitle" showSubMenu>
        <PrivacyCenterContent />
      </SubPage>
    </div>
  );
}
