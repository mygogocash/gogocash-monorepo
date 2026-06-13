import type {
  BreachSeverity,
  BreachStatus,
  ConsentMethod,
  DataAccessAction,
  DataSubjectRequestStatus,
  DataSubjectRequestType,
  ProcessingActivityStatus,
  PurposeCode,
  TransferMechanism,
} from "./constants";

export interface PurposeConsent {
  purposeCode: PurposeCode;
  granted: boolean;
  timestamp: string;
  method: ConsentMethod;
  ipAddressHashed: string;
  deviceFingerprintHashed: string;
  consentText: string;
}

export interface GuardianConsent {
  guardianId: string;
  guardianName: string;
  verificationMethod: "EMAIL_OTP" | "SMS_OTP";
  verifiedAt: string;
}

/** Append-only consent event */
export interface ConsentRecord {
  id: string;
  userId: string;
  consentVersion: string;
  purposes: PurposeConsent[];
  legalBasis: string;
  withdrawnAt: string | null;
  withdrawalMethod: string | null;
  guardianConsent: GuardianConsent | null;
  isMinor: boolean;
  ageAtConsent: number | null;
  createdAt: string;
}

export interface DataSubjectRequest {
  requestId: string;
  userId: string;
  requestType: DataSubjectRequestType;
  status: DataSubjectRequestStatus;
  submittedAt: string;
  acknowledgedAt: string | null;
  dueDate: string;
  completedAt: string | null;
  handledBy: string;
  rejectionReason: string | null;
  evidenceLog: { action: string; timestamp: string; performedBy: string }[];
  channel: "IN_APP" | "EMAIL" | "INTERCOM_TICKET";
  /** Extra payload e.g. rectification text, decision id for HUMAN_REVIEW */
  payload?: Record<string, unknown>;
}

export interface DataBreachLog {
  breachId: string;
  detectedAt: string;
  reportedToPDPC: boolean;
  pdpcNotificationDeadline: string;
  pdpcNotifiedAt: string | null;
  severity: BreachSeverity;
  affectedUsers: number;
  dataCategories: string[];
  description: string;
  rootCause: string;
  containmentActions: { action: string; timestamp: string; performedBy: string }[];
  userNotificationRequired: boolean;
  usersNotifiedAt: string | null;
  status: BreachStatus;
  timeline: { event: string; timestamp: string }[];
}

export interface ProcessingActivity {
  activityId: string;
  activityName: string;
  controller: { name: string; address: string; dpoContact: string };
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  dataSubjectCategories: string[];
  recipients: { name: string; role: "PROCESSOR" | "CONTROLLER"; country: string }[];
  retentionPeriod: string;
  retentionJustification: string;
  crossBorderTransfers: boolean;
  transferSafeguards: string | null;
  securityMeasures: string[];
  dpiaRequired: boolean;
  dpiaReference: string | null;
  lastReviewed: string;
  reviewedBy: string;
  status: ProcessingActivityStatus;
}

export type TransferAgreementStatus = "PENDING" | "ACTIVE" | "EXPIRED" | "REQUIRES_RENEWAL";

export interface DataTransferAgreement {
  id: string;
  provider: string;
  serviceType: string;
  dataCategories: string[];
  country: string;
  transferMechanism: TransferMechanism;
  sccSignedDate: string | null;
  sccVersion: string | null;
  dpaSignedDate: string | null;
  reviewDue: string;
  status: TransferAgreementStatus;
}

export interface DataAccessLog {
  id: string;
  timestamp: string;
  userId: string;
  accessedBy: string;
  action: DataAccessAction;
  dataCategories: string[];
  purpose: string;
  ipAddressHashed: string;
  userAgent: string;
  endpoint: string;
  responseStatus: number;
  authorized: boolean;
  authorizationBasis: string;
}

export interface PurgeAuditLog {
  id: string;
  timestamp: string;
  category: string;
  userId?: string;
  action: string;
  detail: string;
}

/** Root JSON document for file store */
export interface PdpaStoreDocument {
  consentRecords: ConsentRecord[];
  dataSubjectRequests: DataSubjectRequest[];
  dataBreachLogs: DataBreachLog[];
  processingActivities: ProcessingActivity[];
  dataTransferAgreements: DataTransferAgreement[];
  dataAccessLogs: DataAccessLog[];
  purgeAuditLogs: PurgeAuditLog[];
  /** User flags */
  userRestriction: Record<string, { restricted: boolean; since: string }>;
  userProfiles: Record<
    string,
    {
      isMinor?: boolean;
      dateOfBirth?: string;
      maritalStatus?: string;
      guardianConsentToken?: string;
      guardianConsentVerified?: boolean;
    }
  >;
}
