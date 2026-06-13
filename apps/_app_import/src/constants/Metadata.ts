import type { Metadata } from "next";

export const METADATA = {
  banner: "/home/banner.webp",
  title: "GoGoCash – Save Cash  on Every Spend",
  description:
    "GoGoCash is a cashback platform that rewards users instantly for online shopping. Shop, save, and earn in real-time with seamless integration across top e-commerce and telco providers in Southeast Asia.",
} as const;

/** Favicon / PWA icons served from `public/` (favicon.io export). */
export const SITE_ICONS: Metadata["icons"] = {
  icon: [
    { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    { url: "/favicon.ico", sizes: "any" },
  ],
  apple: "/apple-touch-icon.png",
};
