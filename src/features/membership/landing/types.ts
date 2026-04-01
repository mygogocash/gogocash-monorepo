export type MembershipLandingI18n = {
  streakZero: string;
  streakFmt: (done: number, ptsTotal: number) => string;
  questFmt: (done: number, ptsTotal: number) => string;
};
