/**
 * Shared base classes for every status badge. Color classes (bg/text) are
 * applied separately, so all status badges share one shape and size and are
 * distinguished only by color:
 *
 *   className={`${STATUS_BADGE_BASE} ${colorClassesForStatus}`}
 */
export const STATUS_BADGE_BASE =
  "rounded px-2 py-0.5 text-xs font-medium capitalize whitespace-nowrap";
