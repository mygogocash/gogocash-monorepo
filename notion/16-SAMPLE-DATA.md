# 16) Sample Data — Notion Databases (3–5 each major DB)

**Use:** Seed import or manual entry for testing views. **Fictional** but realistic for GoGoCash.

---

## Documents (5)

| Document ID | Title | Type | Status | Version | Owner | Standard Mapping |
| --- | --- | --- | --- | --- | --- | --- |
| POL-SEC-001 | Information Security Policy | Policy | Approved | 1.0 | Eng Lead | ISO27001, SOC2 |
| POL-QMS-001 | Quality Policy | Policy | Approved | 1.0 | CEO | ISO9001 |
| PROC-DOC-001 | Document Control Procedure | Procedure | Approved | 1.0 | Eng Lead | IMS |
| PROC-CHG-001 | Change Management Procedure | Procedure | In Review | 0.9 | Eng Lead | SOC2, ISO27001 |
| POL-PDPA-001 | Data Protection & Privacy Policy | Policy | Draft | 0.1 | CEO | ISO27001, Legal |

---

## Controls (5)

| Control ID | Name | Family | Status | Owner | SOC2 |
| --- | --- | --- | --- | --- | --- |
| CTRL-ACC-001 | Production access MFA + least privilege | access_control | Implemented | Eng Lead | CC6.1 |
| CTRL-CHG-001 | Change with ticket + PR | change_management | Partial | Eng Lead | CC8.1 |
| CTRL-PI-001 | Weekly cashback reconciliation | processing_integrity | Implemented | Eng Lead | PI1.1 |
| CTRL-CX-001 | Complaint handling SLA | complaint_handling | Implemented | CS Ops | — |
| CTRL-EVD-001 | Monthly evidence collection | evidence_management | Implemented | CS Ops | CC2.1 |

---

## Risks (5)

| Risk ID | Title | L | I | Score | Treatment | Status | Owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| RSK-014 | Cashback calculation error | 3 | 5 | 15 | mitigate | Mitigating | Eng Lead |
| RSK-022 | LINE platform outage | 3 | 3 | 9 | mitigate | Monitoring | Eng Lead |
| RSK-010 | Secret in repository | 3 | 5 | 15 | mitigate | Mitigating | Eng Lead |
| RSK-012 | Critical vendor without SOC2 | 3 | 4 | 12 | mitigate | Treatment Planned | CEO |
| RSK-007 | Incomplete audit logs | 3 | 4 | 12 | mitigate | Mitigating | Eng Lead |

*Full 25+ risks:* `compliance/07-registers/REG-RISK-001-risk-register.md`

---

## Evidence Items (5)

| Evidence ID | Title | Type | Source | Status | Related Control | Period |
| --- | --- | --- | --- | --- | --- | --- |
| EVD-2026-03-001 | GCP IAM export March | export | GCP | Reviewed | CTRL-ACC-001 | 2026-03-01–31 |
| EVD-2026-03-002 | GitHub org 2FA report | screenshot | GitHub | Auditor Ready | CTRL-ACC-002 | 2026-03 |
| EVD-2026-03-003 | Prod deploy sample #102 | ticket | GitHub+Jira | Collected | CTRL-CHG-001 | 2026-03-15 |
| EVD-2026-03-004 | Backup job success March | export | GCP | Reviewed | CTRL-BKP-001 | 2026-03 |
| EVD-2026-03-005 | Complaint summary Q1 | report | Zendesk | Reviewed | CTRL-CX-001 | Q1 |

---

## Incidents (3)

| Incident ID | Title | Severity | Status | Owner |
| --- | --- | --- | --- | --- |
| INC-2026-001 | Cashback batch delayed 6h | P2 | Closed | Eng Lead |
| INC-2026-002 | Admin panel login spike | P3 | Resolved | Eng Lead |
| INC-2026-003 | Merchant report export timeout | P4 | Closed | Eng Lead |

---

## Complaints (3)

| ID | Category | Status | Summary |
| --- | --- | --- | --- |
| CMP-120 | cashback_amount | Resolved | “Pending 3 days” — wallet sync |
| CMP-121 | merchant | Resolved | Wrong campaign dates shown |
| CMP-122 | account | Investigating | Cannot unlink LINE |

---

## Nonconformities (2)

| NC ID | Source | Status | Title |
| --- | --- | --- | --- |
| NC-004 | monitoring | Open | Reconciliation variance &gt; threshold |
| NC-005 | audit | Closed | MFA gap on legacy tool |

---

## CAPAs (3)

| CAPA ID | Source | Status | Title | Due |
| --- | --- | --- | --- | --- |
| CAPA-006 | finding | In Progress | Enforce MFA legacy admin | 2026-04-30 |
| CAPA-007 | complaint | Open | Improve wallet sync messaging | 2026-05-15 |
| CAPA-008 | risk | Closed | Vendor SOC2 for payment partner | 2026-03-01 |

---

## Audit Findings (3)

| Finding ID | Severity | Status | Title |
| --- | --- | --- | --- |
| FIND-009 | medium | In Remediation | Access review not quarterly |
| FIND-010 | low | Closed | Evidence naming inconsistency |
| FIND-011 | high | Remediation Planned | Staging has copy PII without mask |

---

## Tasks (5)

| Task ID | Workstream | Priority | Status | Title |
| --- | --- | --- | --- | --- |
| TASK-501 | Notion_Build | P0 | Done | Create Evidence Items DB |
| TASK-502 | Secure_Engineering | P0 | In Progress | Org MFA GitHub |
| TASK-503 | Security | P1 | Ready | Quarterly IAM export ritual |
| TASK-504 | Audit_Readiness | P1 | Backlog | Populate 12-mo evidence plan |
| TASK-505 | Quality_Ops | P2 | Done | Complaint categories in form |

---

## KPIs (5)

| KPI ID | Name | Target | Current | Status |
| --- | --- | --- | --- | --- |
| KPI-001 | Cashback dispute rate | &lt;0.5% | 0.4% | on_track |
| KPI-002 | Merchant onboarding SLA | 95% | 93% | at_risk |
| KPI-003 | P1 MTTR | &lt;4h | 3h | on_track |
| KPI-004 | Policy ack completion | 100% | 100% | on_track |
| KPI-005 | Evidence on-time % | 90% | 78% | at_risk |

---

## Assets / Systems / Vendors / Audits / MR / Training — samples

**Systems:** `SYS-PROD-WEB`, `SYS-LINE-MINI`, `SYS-ADMIN`, `SYS-CASHBACK-API`  
**Vendors:** `VND-GCP`, `VND-GITHUB`, `VND-NOTION`, `VND-ZENDESK`  
**Audits:** `AUD-2026-IA-Q1` internal, Planned  
**MR:** `MR-2026-Q1` Completed  
**Training:** `TRN-2026-SEC` — all staff ack POL-SEC-001 v1.0  

---

## Related

`04-DATABASE-SCHEMAS.md`
