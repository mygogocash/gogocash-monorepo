/**
 * Shared “segmented” tab strip used under profile / wallet surfaces and mobile GoGoQuest tabs.
 * Keeps `WalletTransaction`, `ReferralInvitationPanel`, and `TabTitle` (quest) visually aligned.
 */

export const PROFILE_TAB_STRIP_LIST_CLASS =
  "flex w-full items-stretch gap-2 border-b border-[#e4e4e4] sm:gap-2.5 md:gap-4";

const PROFILE_TAB_BUTTON_BASE =
  "relative flex min-h-[44px] min-w-0 flex-1 items-center justify-center px-3 py-3 text-center text-xs font-semibold leading-snug transition-colors sm:min-h-[48px] sm:px-4 sm:text-sm md:px-6 md:py-3.5";

const PROFILE_TAB_FOCUS_RING =
  "outline-none focus-visible:ring-2 focus-visible:ring-[#00cc99] focus-visible:ring-offset-2";

const PROFILE_TAB_SELECTED =
  "rounded-t-2xl bg-white text-[#00b89d] after:absolute after:bottom-0 after:left-4 after:right-4 after:h-0.5 after:rounded-full after:bg-[#00cc99] sm:after:left-5 sm:after:right-5 md:after:left-6 md:after:right-6";

const PROFILE_TAB_IDLE = "rounded-t-2xl bg-[#f0f0f0] text-[#7f7f7f] hover:bg-[#eaeaea]";

export type ProfileTabButtonClassOptions = {
  /** Default true — omit for pixel-parity with legacy wallet buttons. */
  focusRing?: boolean;
};

export function profileTabButtonClassName(
  selected: boolean,
  options?: ProfileTabButtonClassOptions
): string {
  const focus = options?.focusRing === false ? "" : ` ${PROFILE_TAB_FOCUS_RING}`;
  const state = selected ? PROFILE_TAB_SELECTED : PROFILE_TAB_IDLE;
  return `${PROFILE_TAB_BUTTON_BASE}${focus} ${state}`;
}
