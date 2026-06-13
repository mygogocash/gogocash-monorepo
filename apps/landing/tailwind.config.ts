import type { Config } from "tailwindcss";
import defaultTailwindConfig from "tailwindcss/stubs/config.full.js";

const config: Config = {
  presets: [defaultTailwindConfig],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#10b981",
        "primary-dark": "#059669",
        "primary-deep": "#047857",
        accent: "#f97066",
        "accent-soft": "#fef2f2",
        cream: "#FFFBF7",
        mint: "#F0FDF4",
        "surface-green": "rgba(16, 185, 129, 0.08)",
        "surface-green-medium": "rgba(16, 185, 129, 0.15)",
      },
      fontFamily: {
        sans: ["Poppins", "Inter", "sans-serif"],
        display: ["Instrument Sans", "Poppins", "sans-serif"],
      },
      maxWidth: {
        site: "1200px",
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "4xl": "32px",
      },
      transitionDuration: {
        micro: "150ms",
        button: "220ms",
        section: "380ms",
      },
      transitionTimingFunction: {
        standard: "cubic-bezier(0.4, 0, 0.2, 1)",
        emphasized: "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      animation: {
        marquee: "marquee 20s linear infinite",
        "marquee-reverse": "marquee-reverse 20s linear infinite",
        /** Header shell: first paint */
        "header-enter":
          "header-enter 360ms cubic-bezier(0.22, 1, 0.36, 1) both",
        /** Mobile nav panel under header */
        "header-mobile-drawer":
          "header-mobile-drawer 280ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "marquee-reverse": {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
        "header-enter": {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "header-mobile-drawer": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
