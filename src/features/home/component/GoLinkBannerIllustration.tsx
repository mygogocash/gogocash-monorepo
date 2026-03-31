/**
 * Inline art matching Figma GoLink Banner (9669:184464) — phone, link tap, GO badge.
 * Figma MCP raster assets are session-scoped; SVG keeps the promo self-contained.
 */
export function GoLinkBannerIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 420 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {/* Soft panel behind illustration */}
      <defs>
        <linearGradient
          id="golink-art-fade"
          x1="0"
          y1="120"
          x2="420"
          y2="120"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="rgba(0,204,153,0.12)" />
          <stop offset="1" stopColor="rgba(0,100,214,0.06)" />
        </linearGradient>
        <filter id="golink-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodOpacity="0.2" />
        </filter>
      </defs>
      <rect width="420" height="260" rx="24" fill="url(#golink-art-fade)" />

      {/* Link circle (left) */}
      <circle cx="72" cy="118" r="44" fill="white" stroke="#3B3B3B" strokeWidth="3" />
      <path
        d="M58 118c0-6 5-11 11-11h6m24 0h6c6 0 11 5 11 11v0c0 6-5 11-11 11h-6m-24 0h-6c-6 0-11-5-11-11v0"
        stroke="#9E9E9E"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Hand (simplified) */}
      <path
        d="M12 168c8-28 32-48 52-52 6-1 12 2 14 8l8 24c2 6-1 12-7 14l-4 1"
        fill="#F5D4C4"
        stroke="#C4A896"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <ellipse cx="48" cy="152" rx="10" ry="14" fill="#F5D4C4" stroke="#C4A896" strokeWidth="1.2" />
      <path d="M44 138l6-18" stroke="#C4A896" strokeWidth="1.5" strokeLinecap="round" />

      {/* Phone */}
      <rect x="168" y="36" width="132" height="216" rx="18" fill="#3B3B3B" />
      <rect x="176" y="52" width="116" height="184" rx="12" fill="white" />
      {/* notch */}
      <rect x="220" y="56" width="28" height="5" rx="2.5" fill="#E4E4E4" />

      {/* Screen content */}
      <rect
        x="188"
        y="78"
        width="44"
        height="44"
        rx="8"
        fill="white"
        stroke="#E4E4E4"
        strokeWidth="2"
      />
      <circle cx="210" cy="100" r="14" fill="#FF9A3E" />
      <path d="M202 100h16M210 92v16" stroke="#5C3D2E" strokeWidth="2" strokeLinecap="round" />
      <rect x="242" y="84" width="42" height="6" rx="2" fill="#E4E4E4" />
      <rect x="242" y="96" width="32" height="6" rx="2" fill="#E4E4E4" />
      <rect x="188" y="136" width="92" height="8" rx="2" fill="#E4E4E4" />
      <rect x="196" y="176" width="76" height="28" rx="14" fill="#00CC99" />

      {/* GO badge */}
      <circle cx="338" cy="132" r="42" fill="#00CC99" filter="url(#golink-shadow)" />
      <text
        x="338"
        y="142"
        textAnchor="middle"
        fill="white"
        fontSize="28"
        fontWeight="700"
        fontStyle="italic"
        fontFamily="system-ui, sans-serif"
      >
        GO
      </text>

      {/* Small GoGo mark near badge */}
      <circle cx="382" cy="188" r="22" fill="white" stroke="#E0E0E0" strokeWidth="1" />
      <circle cx="382" cy="188" r="12" fill="#00CC99" opacity="0.35" />
    </svg>
  );
}
