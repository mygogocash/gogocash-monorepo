import { ReactNode } from "react";

interface SectionBadgeProps {
  icon?: ReactNode;
  label: string;
}

export default function SectionBadge({ icon, label }: SectionBadgeProps) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white px-4 py-2 text-sm font-medium text-primary">
      {icon && <span className="text-primary">{icon}</span>}
      {label}
    </div>
  );
}
