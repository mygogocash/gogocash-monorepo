"use client";
import SubPage from "../layout/SubPage";
import LockIcon from "@/components/icons/LockIcon";
import ProfileIcon from "@/components/icons/ProfileIcon";
import CartIcon from "@/components/icons/CartIcon";
import WalletIcon from "@/components/icons/WalletIcon";
import { useCrossmintLoginContext } from "@/providers/CrossmintLoginContext";
import { Link } from "@/i18n/navigation";
import DocumentIcon from "@/components/icons/DocumentIcon";
import CountryIcon from "@/components/icons/CountryIcon";
import LanguageIcon from "@/components/icons/LanguageIcon";
import BoardProfile from "./BoardProfile";
import { useTranslations } from "next-intl";
import { profileMenuItems } from "@/constants/navigation";

const ProfileMenu = () => {
  const { signOutAuth } = useCrossmintLoginContext();
  const t = useTranslations();
  const resolveIcon = (icon?: string) => {
    switch (icon) {
      case "wallet":
        return WalletIcon;
      case "withdraw":
        return CountryIcon;
      case "method":
        return DocumentIcon;
      case "language":
        return LanguageIcon;
      case "favorite":
      case "referral":
        return CartIcon;
      case "profile":
      default:
        return ProfileIcon;
    }
  };

  return (
    <SubPage title="Profile">
      <BoardProfile />
      <div className="flex w-full flex-col gap-2">
        {profileMenuItems.map((item) => {
          const Icon = resolveIcon(item.icon);

          return (
            <Link key={item.label} href={item.href}>
              <div className="gc-soft-panel flex h-14 w-full items-center gap-4 rounded-[20px] px-4 transition duration-200 hover:-translate-y-0.5">
                <Icon width={24} height={24} fill="#004A21" />
                <p className="text-[16px] font-semibold text-[#102217]">{t(item.label)}</p>
              </div>
            </Link>
          );
        })}
        <div
          onClick={signOutAuth}
          className="gc-soft-panel flex h-14 w-full cursor-pointer items-center gap-4 rounded-[20px] px-4 transition duration-200 hover:-translate-y-0.5"
        >
          <LockIcon width={24} height={24} fill="#004A21" />
          <p className="text-[16px] font-semibold text-[#102217]">{t("Logout")}</p>
        </div>
      </div>
    </SubPage>
  );
};

export default ProfileMenu;
