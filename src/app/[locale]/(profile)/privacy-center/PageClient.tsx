"use client";

import SubPage from "@/features/profile/layout/SubPage";
import PrivacyCenterContent from "@/components/pdpa/PrivacyCenterContent";

export default function PageClient() {
  return (
    <div className="gc-page-block h-full w-full">
      <SubPage title="pdpaPrivacyCenterTitle" contentOnly>
        <PrivacyCenterContent />
      </SubPage>
    </div>
  );
}
