export type MembershipLandingI18n = {
  streakZero: string;
  streakFmt: (done: number, ptsTotal: number) => string;
  questFmt: (done: number, ptsTotal: number) => string;
  /** Shown when the quest countdown hits zero (must match `membership.countdownEnded` in messages). */
  countdownEnded: string;
};
