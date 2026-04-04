"use client";

import SubProfile from "@/components/layouts/SubProfile";
import { LAYOUT_CONTENT_SHELL_CLASS } from "@/constants/layout-shell";
import { isIntegratedProfileShellPath } from "@/lib/navigation/profileIntegratedShell";
import { usePathname } from "@/i18n/navigation";

export default function ProfileLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const integrated = isIntegratedProfileShellPath(pathname);

  return (
    <div
      className={`${LAYOUT_CONTENT_SHELL_CLASS} flex min-h-0 flex-1 items-stretch gap-6 bg-[#f6f6f6] md:gap-10`}
    >
      {!integrated ? <SubProfile /> : null}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col self-stretch">{children}</div>
    </div>
  );
}
