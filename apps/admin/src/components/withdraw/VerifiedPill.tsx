/**
 * Quick-look verification chip for contact fields (email / phone), shared by the
 * read-only user info cards and the contact editor so both render identically.
 * Renders nothing when the flag is unknown (null/undefined). `label` is used for
 * the tooltip only (e.g. "Email verified").
 */
export function VerifiedPill({
  verified,
  label,
}: {
  verified?: boolean | null;
  label: string;
}) {
  if (verified == null) return null;
  return (
    <span
      title={verified ? `${label} verified` : `${label} not verified`}
      className={
        verified
          ? "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
          : "inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
      }
    >
      {verified ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-3.5 w-3.5"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.5 7.6a1 1 0 0 1-1.42.006l-3.5-3.5a1 1 0 1 1 1.414-1.414l2.79 2.79 6.796-6.89a1 1 0 0 1 1.414-.006Z"
              clipRule="evenodd"
            />
          </svg>
          Verified
        </>
      ) : (
        "Unverified"
      )}
    </span>
  );
}
