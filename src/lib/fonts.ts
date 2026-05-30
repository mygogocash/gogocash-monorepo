import { Anuphan, DM_Sans } from "next/font/google";

/** Figma `typography/font-family/en` */
export const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

/** Figma `typography/font-family/th` — Thai + Latin fallback */
export const anuphan = Anuphan({
  variable: "--font-anuphan",
  subsets: ["latin", "thai"],
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});
