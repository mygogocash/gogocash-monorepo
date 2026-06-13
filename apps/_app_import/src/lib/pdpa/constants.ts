/**
 * PDPA (Thailand) — purpose codes and shared enums.
 * Consent records are append-only; never update in place.
 */

export const PDPA_CONSENT_VERSION = "2026-03-31-v1";

export const CONSENT_REFRESH_DAYS = 365;

export const DATA_SUBJECT_SLA_DAYS = 30;

export const HUMAN_REVIEW_SLA_BUSINESS_DAYS = 15;

export const BREACH_PDPC_HOURS = 72;

export type PurposeCode =
  | "CASHBACK_TRACKING"
  | "AI_CREDIT_SCORING"
  | "PERSONALIZED_RECOMMENDATIONS"
  | "MARKETING_COMMUNICATIONS"
  | "B2B_DATA_AGGREGATION"
  | "ANALYTICS_TRACKING"
  | "THIRD_PARTY_SHARING"
  | "FRAUD_DETECTION"
  | "TAX_REPORTING";

export const PURPOSE_CODES: readonly PurposeCode[] = [
  "CASHBACK_TRACKING",
  "AI_CREDIT_SCORING",
  "PERSONALIZED_RECOMMENDATIONS",
  "MARKETING_COMMUNICATIONS",
  "B2B_DATA_AGGREGATION",
  "ANALYTICS_TRACKING",
  "THIRD_PARTY_SHARING",
  "FRAUD_DETECTION",
  "TAX_REPORTING",
] as const;

export type ConsentMethod =
  | "IN_APP_ONBOARDING"
  | "SETTINGS_UPDATE"
  | "EMAIL_LINK"
  | "GUARDIAN_CONSENT"
  | "LEGACY_MIGRATION";

export type DataSubjectRequestType =
  | "ACCESS"
  | "PORTABILITY"
  | "OBJECTION"
  | "ERASURE"
  | "RESTRICTION"
  | "RECTIFICATION"
  | "WITHDRAW_CONSENT"
  | "HUMAN_REVIEW";

export type DataSubjectRequestStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "REJECTED"
  | "APPEALED";

export type BreachSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type BreachStatus =
  | "DETECTED"
  | "CONTAINED"
  | "NOTIFIED_PDPC"
  | "NOTIFIED_USERS"
  | "RESOLVED"
  | "CLOSED";

export type TransferMechanism =
  | "STANDARD_CONTRACTUAL_CLAUSES"
  | "BINDING_CORPORATE_RULES"
  | "PDPC_APPROVED_MECHANISM"
  | "USER_EXPLICIT_CONSENT";

export type ProcessingActivityStatus = "ACTIVE" | "DISCONTINUED" | "UNDER_REVIEW";

export type DataAccessAction = "READ" | "CREATE" | "UPDATE" | "DELETE" | "EXPORT" | "SHARE";
