"use client";

import SectionSubNav, {
  type SectionSubNavItem,
} from "@/components/layout/SectionSubNav";

const NAV: SectionSubNavItem[] = [
  { href: "/quest", label: "Quest" },
  { href: "/reward", label: "Create Reward" },
];

export default function QuestSubNav() {
  return <SectionSubNav items={NAV} />;
}
