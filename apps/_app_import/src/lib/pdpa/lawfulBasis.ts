import type { PurposeCode } from "./constants";

export type LawfulBasisBasis =
  | "CONTRACT_PERFORMANCE"
  | "EXPLICIT_CONSENT"
  | "LEGITIMATE_INTERESTS"
  | "LEGAL_OBLIGATION"
  | "VITAL_INTERESTS"
  | "PUBLIC_TASK";

export interface LawfulBasisEntry {
  basis: LawfulBasisBasis;
  section: string;
  description: string;
  requiresConsent: boolean;
  requiresBalancingTest?: boolean;
  balancingTestFile?: string;
  requiresDPIA?: boolean;
  optOutMethod?: string;
  note?: string;
}

/** Central register — มาตรา 24 mapping for audit and UI. */
export const LAWFUL_BASIS_REGISTER: Record<PurposeCode, LawfulBasisEntry> = {
  CASHBACK_TRACKING: {
    basis: "CONTRACT_PERFORMANCE",
    section: "24(3)",
    description: "Necessary for fulfilling cashback rewards agreement",
    requiresConsent: false,
    requiresBalancingTest: false,
  },
  AI_CREDIT_SCORING: {
    basis: "EXPLICIT_CONSENT",
    section: "19",
    description: "Profiling for credit eligibility assessment",
    requiresConsent: true,
    requiresBalancingTest: false,
    requiresDPIA: true,
  },
  PERSONALIZED_RECOMMENDATIONS: {
    basis: "LEGITIMATE_INTERESTS",
    section: "24(5)",
    description: "Personalized cashback recommendations",
    requiresConsent: false,
    requiresBalancingTest: true,
  },
  MARKETING_COMMUNICATIONS: {
    basis: "EXPLICIT_CONSENT",
    section: "19",
    description: "Promotional emails and in-app notifications",
    requiresConsent: true,
    requiresBalancingTest: false,
    optOutMethod: "UNSUBSCRIBE_LINK_AND_APP_SETTINGS",
  },
  B2B_DATA_AGGREGATION: {
    basis: "EXPLICIT_CONSENT",
    section: "19,21",
    description: "Anonymized behavioral insights for merchant partners",
    requiresConsent: true,
    requiresBalancingTest: false,
    requiresDPIA: true,
    note: "Different purpose from cashback — separate consent required.",
  },
  ANALYTICS_TRACKING: {
    basis: "LEGITIMATE_INTERESTS",
    section: "24(5)",
    description: "Product analytics",
    requiresConsent: false,
    requiresBalancingTest: true,
    optOutMethod: "ANALYTICS_OPT_OUT_IN_SETTINGS",
  },
  THIRD_PARTY_SHARING: {
    basis: "EXPLICIT_CONSENT",
    section: "19",
    description: "Sharing with designated third parties as disclosed",
    requiresConsent: true,
    requiresBalancingTest: false,
  },
  FRAUD_DETECTION: {
    basis: "LEGITIMATE_INTERESTS",
    section: "24(5)",
    description: "Prevention of fraudulent cashback claims",
    requiresConsent: false,
    requiresBalancingTest: true,
    balancingTestFile: "docs/lit-fraud-detection-balancing-test.md",
  },
  TAX_REPORTING: {
    basis: "LEGAL_OBLIGATION",
    section: "24(6)",
    description: "Revenue Department reporting requirements",
    requiresConsent: false,
    requiresBalancingTest: false,
  },
};

export function getLawfulBasisLabel(purpose: PurposeCode): LawfulBasisEntry {
  return LAWFUL_BASIS_REGISTER[purpose];
}
