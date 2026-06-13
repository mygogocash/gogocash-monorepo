# GoGoCash — Repository structure (compliance & GRC)

**Artifact type:** Index / structural record  
**Version:** 0.1

This file lists the **full folder tree** and **suggested filenames** for the integrated compliance package. Paths are relative to the repository root.

---

## Full tree

```text
compliance/
├── README.md
├── ASSUMPTIONS_AND_SCOPE.md
├── 00-charter/
│   ├── CHARTER-001-integrated-compliance-charter.md
│   └── README.md
├── 01-scope/
│   ├── SCOPE-001-scope-statement.md
│   ├── IMS-001-integrated-management-system-overview.md
│   ├── ROADMAP-COM-001-compliance-roadmap.md
│   └── README.md
├── 02-context/
│   ├── CTX-001-context-interested-parties-analysis.md
│   ├── ORG-001-roles-responsibilities-matrix.md
│   └── README.md
├── 03-risk/
│   ├── RISK-001-risk-management-methodology.md
│   ├── RISK-002-risk-assessment-procedure.md
│   ├── REG-RISK-001-risk-register.md
│   ├── REG-RISK-002-risk-treatment-plan.md
│   └── README.md
├── 04-controls/
│   ├── INTEGRATED-CONTROL-MATRIX.md
│   ├── EXC-001-exception-management-procedure.md
│   └── README.md
├── 05-policies/
│   ├── DOC-001-document-control-procedure.md
│   ├── DOC-002-record-retention-standard.md
│   ├── SEC-001-information-security-policy.md
│   ├── SEC-002-access-control-policy.md
│   ├── SEC-003-asset-management-standard.md
│   ├── SEC-004-data-classification-handling-standard.md
│   ├── SEC-005-secrets-management-standard.md
│   ├── SEC-006-logging-monitoring-standard.md
│   ├── QMS-001-quality-policy.md
│   └── README.md
├── 06-procedures/
│   ├── SDLC-001-secure-sdlc-procedure.md
│   ├── CHG-001-change-management-procedure.md
│   ├── REL-001-release-management-procedure.md
│   ├── VULN-001-vulnerability-management-procedure.md
│   ├── VULN-002-patch-management-procedure.md
│   ├── BCP-001-backup-restore-procedure.md
│   ├── IRP-001-incident-response-plan.md
│   ├── BCP-002-business-continuity-disaster-recovery-runbook.md
│   ├── VND-001-supplier-security-review-procedure.md
│   ├── OPS-001-merchant-onboarding-sop.md
│   ├── OPS-002-cashback-rule-change-sop.md
│   ├── OPS-003-support-complaint-handling-procedure.md
│   ├── QMS-002-nonconforming-output-control-procedure.md
│   ├── QMS-003-capa-procedure.md
│   ├── QMS-004-internal-audit-procedure.md
│   ├── QMS-005-management-review-procedure.md
│   ├── QMS-006-training-awareness-procedure.md
│   ├── QMS-007-process-interaction-map.md
│   └── README.md
├── 07-registers/
│   ├── REG-ASSET-001-asset-register.md
│   ├── REG-SYS-001-system-inventory.md
│   ├── REG-DATA-001-data-inventory.md
│   ├── REG-VND-001-vendor-register.md
│   ├── REG-ACC-001-access-matrix.md
│   ├── REG-HR-001-joiner-mover-leaver-log.md
│   ├── REG-CHG-001-change-log.md
│   ├── REG-REL-001-release-log.md
│   ├── REG-INC-001-incident-log.md
│   ├── REG-SEC-001-security-event-review-log.md
│   ├── REG-BKP-001-backup-log.md
│   ├── REG-BKP-002-restore-test-log.md
│   ├── REG-RISK-001-risk-register.md
│   ├── REG-EXC-001-exception-register.md
│   ├── REG-CX-001-complaint-log.md
│   ├── REG-QMS-001-nonconformity-log.md
│   ├── REG-QMS-002-capa-log.md
│   ├── REG-AUD-001-audit-findings-log.md
│   ├── REG-HR-002-training-attendance-log.md
│   ├── REG-POL-001-policy-acknowledgment-log.md
│   ├── REG-MR-001-management-review-action-log.md
│   ├── REG-KPI-001-kpi-quality-objectives-register.md
│   ├── REG-EVD-001-evidence-tracker.md
│   └── README.md
├── 08-training/
│   ├── TRN-001-training-plan-outline.md
│   └── README.md
├── 09-audit/
│   ├── AUD-001-internal-audit-plan-template.md
│   └── README.md
├── 10-management-review/
│   ├── MR-001-management-review-agenda-template.md
│   └── README.md
├── 11-capa/
│   └── README.md
├── 12-vendors/
│   └── README.md
├── 13-quality/
│   ├── QMS-008-kpi-dashboard-template.md
│   └── README.md
├── 14-soc2/
│   ├── SOC2-001-system-description-outline.md
│   ├── SOC2-002-trust-services-criteria-mapping.md
│   ├── SOC2-003-evidence-collection-calendar.md
│   ├── SOC2-004-control-testing-readiness-checklist.md
│   ├── SOC2-005-sample-auditor-request-list.md
│   ├── SOC2-006-third-party-dependency-narrative.md
│   ├── SOC2-007-subservice-organization-note.md
│   ├── SOC2-008-operating-effectiveness-readiness-checklist.md
│   └── README.md
├── 15-iso27001/
│   ├── ISMS-001-statement-of-applicability-2022.md
│   └── README.md
└── 16-iso9001/
    ├── QMS-009-context-quality-manual-summary.md
    └── README.md

security/
├── README.md
├── access/
│   └── README.md
├── logging/
│   └── README.md
├── vulnerability-management/
│   └── README.md
├── secure-sdlc/
│   └── README.md
├── backups/
│   └── README.md
├── incident-response/
│   └── README.md
└── architecture/
    ├── ARCH-001-high-level-data-flow-outline.md
    └── README.md

ops/
├── README.md
├── processes/
│   └── README.md
├── runbooks/
│   └── README.md
├── releases/
│   └── README.md
├── incidents/
│   └── README.md
├── reviews/
│   └── README.md
└── checklists/
    └── README.md

audit/
├── README.md
├── evidence-index/
│   └── EVIDENCE-INDEX-README.md
├── internal-audits/
│   └── README.md
├── readiness/
│   └── README.md
└── test-plans/
    └── README.md

templates/
├── README.md
├── policies/
│   └── POLICY-TEMPLATE.md
├── procedures/
│   └── PROCEDURE-TEMPLATE.md
├── registers/
│   └── REGISTER-TABLE-TEMPLATE.md
├── checklists/
│   └── CHECKLIST-TEMPLATE.md
└── forms/
    └── FORM-TEMPLATE.md
```

---

## Root-level indexes (optional)

| File                           | Purpose                                                   |
| ------------------------------ | --------------------------------------------------------- |
| `CONTROLLED_DOCUMENT_INDEX.md` | Master list of approved documents and versions            |
| `IMPLEMENTATION_PACKAGE.md`    | Links all deliverables (roadmap, Jira export, checklists) |

---

## Notes

- **Canonical** controlled documents live under `compliance/**` with IDs in filenames.
- **Security / ops** folders hold **technical references**, runbook copies, or links — not a second policy library unless explicitly migrated.
- **Evidence** for audits: store under `audit/evidence-index/` as **pointers** (URLs, ticket IDs, export locations); avoid secrets in git.
