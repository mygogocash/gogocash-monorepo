"use client";

import { useLocale } from "next-intl";
import SubPage from "../profile/layout/SubPage";
import MissingOrdersFaqSection from "./components/MissingOrdersFaqSection";
import MissingOrdersFormBody from "./components/MissingOrdersFormBody";
import MissingOrdersQuickCards from "./components/MissingOrdersQuickCards";
import { missingOrdersStaticT } from "./missingOrdersStaticT";

/**
 * Help Center / Missing Orders — GoGoCash 1.1 Figma node 9621:207632.
 * @see https://www.figma.com/design/jFDx8MnbCtlCaTQxlhpJIp/GoGoCash-1.1?node-id=9621-207632
 */
const MissingOrdersPage = () => {
  const locale = useLocale();
  const resolvedTitle = missingOrdersStaticT(locale, "missingOrdersPageTitle");

  return (
    <SubPage title="missingOrdersPageTitle" resolvedTitle={resolvedTitle} showSubMenu>
      <div className="flex w-full flex-col gap-5 md:gap-8">
        <div className="min-w-0 w-full">
          <MissingOrdersFormBody />
        </div>
        <MissingOrdersQuickCards />
      </div>

      <MissingOrdersFaqSection />
    </SubPage>
  );
};

export default MissingOrdersPage;
