import { type ComponentType } from "react";

import {
  BadgeCheck as BadgeCheckIcon,
  CircleHelp as HelpIcon,
  FileQuestion as MissingOrdersIcon,
  FileText as FileTextIcon,
  Globe2 as GlobeIcon,
  Heart as HeartIcon,
  ShieldCheck as ShieldCheckIcon,
  Star as GoGoPassIcon,
  Trophy as QuestIcon,
  UserPlus as InviteIcon,
  UserRound as ProfileIcon,
  WalletCards as WalletIcon,
} from "@mobile/theme/icons";

export type ProfileMenuIcon = ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;

// Single source of truth for profile-menu row icons, shared by the desktop account
// rail (AccountPageShell) and the header dropdown (CustomerProfileMenu) so both match
// the web sidebar (SubProfile)/popover (ProfileHeaderPopperContent). Keyed by the
// canonical English label from profileHubMenuItems.
const PROFILE_MENU_ICONS: Record<string, ProfileMenuIcon> = {
  "Age Verification": BadgeCheckIcon,
  "Connect with GoGoCash": GlobeIcon,
  "Consent Preferences": ShieldCheckIcon,
  "Favorite Brands": HeartIcon,
  "GoGoQuest History": QuestIcon,
  "Help Center": HelpIcon,
  GoGoPass: GoGoPassIcon,
  "Invite your Friends": InviteIcon,
  "Missing Orders": MissingOrdersIcon,
  "My Wallet": WalletIcon,
  Profile: ProfileIcon,
  "Privacy Policy": ShieldCheckIcon,
  "Terms of Service": FileTextIcon,
  "Terms of Use": FileTextIcon,
};

export function getProfileMenuIcon(label: string): ProfileMenuIcon {
  return PROFILE_MENU_ICONS[label] ?? FileTextIcon;
}
