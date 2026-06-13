"use client";

import { useEffect, useRef, useState, ReactNode } from "react";
import { usePrefersReducedMotionAfterMount } from "@/hooks/use-prefers-reduced-motion";

interface AnimateOnScrollProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  animation?: "fade-up" | "fade-in-left" | "fade-in-right" | "scale-in";
}

export default function AnimateOnScroll({
  children,
  className = "",
  delay = 0,
  animation = "fade-up",
}: AnimateOnScrollProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = usePrefersReducedMotionAfterMount();

  useEffect(() => {
    if (reduceMotion || typeof IntersectionObserver === "undefined") {
      const frame = window.requestAnimationFrame(() => setIsVisible(true));
      return () => window.cancelAnimationFrame(frame);
    }

    const timeoutIds: number[] = [];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const timeoutId = window.setTimeout(() => setIsVisible(true), delay);
            timeoutIds.push(timeoutId);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
      observer.disconnect();
    };
  }, [delay, reduceMotion]);

  const animClass = animation !== "fade-up" ? animation : "";

  return (
    <div
      ref={ref}
      className={`animate-on-scroll ${animClass} ${isVisible ? "visible" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
