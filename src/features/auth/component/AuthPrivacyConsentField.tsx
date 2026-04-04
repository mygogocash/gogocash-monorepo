"use client";

import { Checkbox } from "@mui/material";
import { cn } from "@/lib/utils";

export type AuthPrivacyConsentFieldProps = {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Text before the privacy link (e.g. `authPrivacyLead` or link-mycashback consent line). */
  leadText: string;
  policyLabel: string;
  policyHref?: string;
};

/**
 * Bordered privacy checkbox + link — same layout/styling as the sign-in phone form
 * (`LoginComponent`). Reused on link-mycashback method step for visual parity.
 */
export function AuthPrivacyConsentField({
  id,
  checked,
  onCheckedChange,
  leadText,
  policyLabel,
  policyHref = "https://gogocash.co/privacy-policy",
}: AuthPrivacyConsentFieldProps) {
  const needsSpaceBeforeLink = leadText.length > 0 && !/\s$/.test(leadText);

  return (
    <label
      htmlFor={id}
      className={cn(
        "m-0 flex w-full min-h-[52px] cursor-pointer select-none items-center justify-center gap-3 rounded-[16px] border px-4 py-3.5 shadow-[0_1px_2px_rgba(16,34,23,0.06)] transition-[border-color,background-color,box-shadow,ring,transform] duration-200",
        "max-md:touch-manipulation hover:border-[#00cc99]/40 hover:shadow-[0_2px_14px_rgba(0,204,153,0.08)] active:scale-[0.995]",
        "focus-within:ring-2 focus-within:ring-[#00cc99]/25 focus-within:ring-offset-2 focus-within:ring-offset-white",
        "lg:min-h-10 lg:gap-2.5 lg:px-5 lg:py-2",
        checked
          ? "border-[#00cc99]/45 bg-linear-to-br from-[#f0fdf9] to-white"
          : "border-[#e8e8e8] bg-white"
      )}
    >
      <Checkbox
        id={id}
        checked={checked}
        onChange={(e) => onCheckedChange(e.target.checked)}
        size="small"
        disableRipple
        sx={{
          color: "#b0b0b0",
          p: 0.5,
          flexShrink: 0,
          alignSelf: "center",
          "& .MuiSvgIcon-root": {
            fontSize: 22,
            "@media (max-width: 1023px)": { fontSize: 24 },
          },
          "&.Mui-checked": {
            color: "#00cc99",
          },
          "&:hover": {
            bgcolor: "rgba(0, 204, 153, 0.07)",
          },
        }}
      />
      <span className="min-w-0 max-w-full text-center text-[15px] leading-snug text-[#3b3b3b] lg:text-[13px]">
        {leadText}
        {needsSpaceBeforeLink ? " " : null}
        <a
          href={policyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#00aa80] underline decoration-[#00cc99]/35 underline-offset-[3px] transition-colors hover:text-[#007b5c] hover:decoration-[#007b5c]/50 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00aa80]"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {policyLabel}
        </a>
      </span>
    </label>
  );
}
