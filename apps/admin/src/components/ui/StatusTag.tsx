import { type ReactNode } from "react";
import { STATUS_BADGE_BASE } from "@/lib/statusBadge";

/**
 * Status tag — a small rounded-rect badge sharing the status-badge shape/size
 * (text-xs, capitalize, no-wrap) from STATUS_BADGE_BASE. Pass the per-status
 * color classes via `className` so every status tag looks consistent:
 *
 *   <StatusTag className="bg-emerald-100 text-emerald-800 …">active</StatusTag>
 */
export default function StatusTag({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`${STATUS_BADGE_BASE} ${className}`}>{children}</span>
  );
}
