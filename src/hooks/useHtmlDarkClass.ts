"use client";

import { useEffect, useState } from "react";

/** True when `document.documentElement` has the `dark` class (Tailwind dark mode). */
export function useHtmlDarkClass(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains("dark"));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  return dark;
}
