/** Line-art empty state (wallet, note, coins) — matches GoGoCash 1.1 withdraw-methods empty frame. */
export default function WithdrawMethodsEmptyIllustration({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="190"
      height="127"
      viewBox="0 0 190 127"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M38 44h88v48a10 10 0 0010 10H48a20 20 0 01-20-20V44z"
        stroke="#B8B8B8"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M32 38h72a6 6 0 016 6v34a6 6 0 01-6 6H32a6 6 0 01-6-6V44a6 6 0 016-6z"
        fill="#F0F0F0"
        stroke="#B8B8B8"
        strokeWidth="2"
      />
      <path d="M38 52h56M38 60h40" stroke="#CFCFCF" strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="78" cy="112" rx="16" ry="5" stroke="#B8B8B8" strokeWidth="1.8" />
      <ellipse cx="78" cy="106" rx="16" ry="5" stroke="#B8B8B8" strokeWidth="1.8" />
      <ellipse cx="78" cy="100" rx="16" ry="5" stroke="#B8B8B8" strokeWidth="1.8" fill="#F5F5F5" />
      <ellipse cx="118" cy="114" rx="12" ry="4" stroke="#B8B8B8" strokeWidth="1.6" />
      <ellipse cx="118" cy="109" rx="12" ry="4" stroke="#B8B8B8" strokeWidth="1.6" fill="#F5F5F5" />
      <ellipse cx="142" cy="116" rx="10" ry="3.5" stroke="#B8B8B8" strokeWidth="1.5" />
      <ellipse
        cx="142"
        cy="112"
        rx="10"
        ry="3.5"
        stroke="#B8B8B8"
        strokeWidth="1.5"
        fill="#F5F5F5"
      />
      <circle cx="24" cy="58" r="3" stroke="#B8B8B8" strokeWidth="1.5" />
      <circle cx="168" cy="36" r="2.5" fill="#D0D0D0" />
      <circle cx="156" cy="28" r="2" fill="#D8D8D8" />
      <path d="M8 72v10M3 77h10" stroke="#B8B8B8" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M176 88v8M172 92h8" stroke="#B8B8B8" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
