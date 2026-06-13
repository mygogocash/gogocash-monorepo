"use client";

import React from "react";
import { usePathname } from "next/navigation";

type PageTransitionProps = {
  children: React.ReactNode;
  /** "slide" = fade + slight slide up (default), "fade" = opacity only */
  variant?: "slide" | "fade";
  className?: string;
};

export default function PageTransition({
  children,
  variant = "slide",
  className = "",
}: PageTransitionProps) {
  const pathname = usePathname();
  const animationClass =
    variant === "fade" ? "page-transition-enter-fade" : "page-transition-enter";

  return (
    <div
      key={pathname}
      className={`${animationClass} ${className}`.trim()}
      style={{ minHeight: "inherit" }}
    >
      {children}
    </div>
  );
}
