import type { SVGProps } from "react";

/**
 * Go Unlimited / membership — card with tier lines + star (plan & perks).
 * Stroke-based to match `ProfilePopperMissingOrdersIcon` in `SubProfile` nav rows.
 */
const MembershipNavIcon = ({
  stroke = "#00AA80",
  width = 24,
  height = 24,
  ...props
}: SVGProps<SVGSVGElement>) => (
  <svg
    width={width}
    height={height}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
    {...props}
  >
    <rect x="4.75" y="5.25" width="14.5" height="14.5" rx="2.5" stroke={stroke} strokeWidth="1.5" />
    <path
      d="M12 7.25l.72 1.46h1.61l-1.3.95.5 1.62L12 11.1l-1.53 1.18.5-1.62-1.3-.95h1.61L12 7.25z"
      stroke={stroke}
      strokeWidth="1.15"
      strokeLinejoin="round"
    />
    <path d="M8.5 14.25h7M8.5 17h5" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default MembershipNavIcon;
