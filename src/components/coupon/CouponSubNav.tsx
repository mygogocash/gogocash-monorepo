"use client";

import SectionSubNav, {
  type SectionSubNavItem,
} from "@/components/layout/SectionSubNav";

const NAV: SectionSubNavItem[] = [
  { href: "/coupon", label: "Coupon" },
  { href: "/coupon/history", label: "Coupon History" },
];

export default function CouponSubNav() {
  return <SectionSubNav items={NAV} />;
}
