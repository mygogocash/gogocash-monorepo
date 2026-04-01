"use client";

import { useTheme } from "@/context/ThemeContext";
import { useEffect } from "react";

/** PWA / mobile browser UI chrome; updates when user toggles light/dark. */
const THEME_COLOR_LIGHT = "#ffffff";
const THEME_COLOR_DARK = "#111827";

export default function ThemeColorMeta() {
  const { theme } = useTheme();

  useEffect(() => {
    const content = theme === "dark" ? THEME_COLOR_DARK : THEME_COLOR_LIGHT;
    let el = document.querySelector('meta[name="theme-color"]');
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute("name", "theme-color");
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }, [theme]);

  return null;
}
