#!/usr/bin/env node
/**
 * PDPA consent migration outline for legacy users.
 * Wire to production DB / API — this script only documents phases.
 */
const MIGRATION_PHASES = [
  {
    phase: 1,
    description: "High-value users (>5 transactions): priority consent refresh",
    method: "IN_APP_MODAL_ON_NEXT_LOGIN",
    deadline: 30,
  },
  {
    phase: 2,
    description: "Mid-tier users (1-4 transactions)",
    method: "EMAIL_CAMPAIGN + IN_APP_BANNER",
    deadline: 60,
  },
  {
    phase: 3,
    description: "Dormant users (0 transactions in 6 months)",
    method: "EMAIL_ONLY",
    deadline: 90,
  },
];

console.log("PDPA migration phases (template):");
console.log(JSON.stringify(MIGRATION_PHASES, null, 2));
console.log(
  "\nImplement: query users without granular ConsentRecord → POST LEGACY_MIGRATION rows → queue refresh campaign."
);
