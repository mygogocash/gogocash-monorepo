/** Retention policy matrix — มาตรา 22; align with legal before production enforcement. */

export type RetentionAction = "HARD_DELETE" | "ANONYMIZE" | "DELETE_VIA_API" | "RETAIN_PERMANENTLY";

export interface RetentionRule {
  retentionDays: number | null;
  trigger: string;
  action: RetentionAction;
  note?: string;
}

export const RETENTION_POLICY: Record<string, RetentionRule> = {
  userProfile: {
    retentionDays: 365 * 3,
    trigger: "ACCOUNT_CLOSED",
    action: "HARD_DELETE",
  },
  transactions: {
    retentionDays: 365 * 5,
    trigger: "TRANSACTION_DATE",
    action: "ANONYMIZE",
  },
  cashbackRecords: {
    retentionDays: 365 * 5,
    trigger: "TRANSACTION_DATE",
    action: "ANONYMIZE",
  },
  creditScoringInputs: {
    retentionDays: 365 * 2,
    trigger: "SCORING_DATE",
    action: "HARD_DELETE",
  },
  mixpanelEvents: {
    retentionDays: 395,
    trigger: "EVENT_DATE",
    action: "DELETE_VIA_API",
  },
  intercomConversations: {
    retentionDays: 365 * 3,
    trigger: "CONVERSATION_CLOSE_DATE",
    action: "HARD_DELETE",
  },
  consentRecords: {
    retentionDays: null,
    trigger: "N/A",
    action: "RETAIN_PERMANENTLY",
    note: "Evidence of lawful processing",
  },
};
