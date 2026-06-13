"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { usePrefersReducedMotionAfterMount } from "@/hooks/use-prefers-reduced-motion";

/** Aligns with tailwind `ease-standard` / `--motion-ease-standard` */
const easeStandard = [0.4, 0, 0.2, 1] as const;

export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = usePrefersReducedMotionAfterMount();

  const duration = reduceMotion ? 0 : 0.3;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname}
        className="min-h-[100dvh] min-w-0 overflow-x-clip"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
        transition={{
          duration,
          ease: easeStandard,
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
