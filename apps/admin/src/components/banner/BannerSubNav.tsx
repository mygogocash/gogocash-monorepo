"use client";

import SectionSubNav, {
  type SectionSubNavItem,
} from "@/components/layout/SectionSubNav";

const NAV: SectionSubNavItem[] = [
  { href: "/banner", label: "Home Page Banner" },
  { href: "/banner/all-brand-page", label: "Specific Page Banner" },
  { href: "/banner/modal-popups", label: "Modal popups" },
  { href: "/banner/popup-history", label: "Popup history" },
];

export default function BannerSubNav() {
  return <SectionSubNav items={NAV} />;
}
