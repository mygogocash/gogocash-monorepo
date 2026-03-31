# Jira-Ready Backlog — GoGoCash Compliance Program

**Artifact type:** Template / export  
**Version:** 0.1  
**Project:** GGC-COMP (suggested)  

Use **Epic** → **Story** → **Sub-task** structure below. Map to Jira fields: Summary, Description, Acceptance Criteria, Labels (`soc2`, `iso27001`, `iso9001`), Custom field `Control ID` if available.

---

## Epic: Governance and Scope

| Story key | Summary | Assignee role | Priority | Estimate | Dependencies | Linked documents | Linked controls | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GGV-1 | Approve charter and scope | CEO | Highest | 2h | — | CHARTER-001, SCOPE-001 | GOV-001 | Signed PDF, git tag |
| GGV-2 | Publish controlled document index | Eng Lead | High | 2h | GGV-1 | INDEX-COM-001 | GOV-003 | Approved index |
| GGV-3 | Define phase-1 exclusions list | CEO | Medium | 2h | GGV-1 | ASSUMPTIONS_AND_SCOPE | GOV-001 | Exception register |

**Subtasks (GGV-1):** Schedule CEO review; Export PDF; Archive signature.

---

## Epic: Risk and Controls

| Story key | Summary | Assignee role | Priority | Estimate | Dependencies | Linked documents | Linked controls | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RSK-1 | Populate risk register v1 | Eng Lead | High | 4h | RISK-001 | REG-RISK-001 | RSK-001 | Completed register |
| RSK-2 | Link risks to SoA rows | Eng Lead | High | 4h | RSK-1 | ISMS-001 | RSK-001 | SoA updated |
| RSK-3 | Quarterly risk review ritual | CEO | Medium | 2h | RSK-1 | — | RSK-001 | Meeting notes |

---

## Epic: Security Foundations

| Story key | Summary | Assignee role | Priority | Estimate | Dependencies | Linked documents | Linked controls | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SEC-1 | Enforce MFA GCP + GitHub | Eng Lead | Highest | 8h | — | SEC-001 | ACC-002 | MFA reports |
| SEC-2 | Quarterly access review | Eng Lead | High | 4h | SEC-1 | SEC-002 (planned) | ACC-001 | Review ticket |
| SEC-3 | Admin logging queries documented | Eng Lead | High | 4h | — | SEC-006 | LOG-001 | Saved queries |

---

## Epic: Secure Engineering

| Story key | Summary | Assignee role | Priority | Estimate | Dependencies | Linked documents | Linked controls | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SE-1 | Branch protection + required reviewers | Eng Lead | Highest | 4h | — | Backlog | SDLC-002 | GitHub settings |
| SE-2 | CI: dependency + secret scanning | Second Dev | High | 8h | — | VULN-001 | SDLC-003 | CI artifacts |
| SE-3 | Ticket-to-deploy traceability sample | Eng Lead | Medium | 4h | SE-1 | REL-001 | REL-001 | Sample chain |
| SE-4 | SAST pilot | Eng Lead | Medium | 16h | SE-2 | SDLC-001 | SDLC-001 | Tool report |

---

## Epic: Operations and Quality

| Story key | Summary | Assignee role | Priority | Estimate | Dependencies | Linked documents | Linked controls | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| OPS-1 | Complaint workflow in ticketing | CS Ops | High | 8h | — | OPS-003 | CX-001 | Workflow screenshot |
| OPS-2 | Merchant onboarding checklist live | CS Ops | High | 8h | — | OPS-001 | PI-002 | Completed samples |
| OPS-3 | KPI register first values | CEO | Medium | 4h | — | REG-KPI-001 | KPI-001 | Dashboard |

---

## Epic: Vendor Governance

| Story key | Summary | Assignee role | Priority | Estimate | Dependencies | Linked documents | Linked controls | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| VND-1 | Critical vendor list + SOC2 pull | CEO | High | 8h | — | REG-VND-001 | VND-001 | Files in drive |
| VND-2 | Vendor review calendar | CS Ops | Medium | 2h | VND-1 | VND-001 | VND-001 | Calendar invite |

---

## Epic: Evidence and Audit

| Story key | Summary | Assignee role | Priority | Estimate | Dependencies | Linked documents | Linked controls | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| EVD-1 | Monthly evidence checklist run #1 | CS Ops | High | 4h | — | MONTHLY_EVIDENCE_CHECKLIST | EVD-001 | Completed checklist |
| EVD-2 | Evidence index template per month | CS Ops | Medium | 2h | EVD-1 | audit/evidence-index | EVD-001 | Index files |

---

## Epic: Training and Change Management

| Story key | Summary | Assignee role | Priority | Estimate | Dependencies | Linked documents | Linked controls | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TRN-1 | Policy acknowledgment round | CS Ops | High | 4h | Policies merged | QMS-006 | TRN-001 | Ack log |
| CHG-1 | Change procedure adoption in team | Eng Lead | High | 4h | CHG-001 doc | CHG-001 | CHG-001 | Team attestation |

---

## Epic: ISO 27001 Readiness

| Story key | Summary | Assignee role | Priority | Estimate | Dependencies | Linked documents | Linked controls | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ISO27-1 | SoA review workshop | Eng Lead | High | 4h | ISMS-001 | ISMS-001 | Annex A | Workshop notes |
| ISO27-2 | Internal audit #1 | CEO | Medium | 8h | — | QMS-004 | AUD-001 | Audit report |

---

## Epic: ISO 9001 Readiness

| Story key | Summary | Assignee role | Priority | Estimate | Dependencies | Linked documents | Linked controls | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ISO9-1 | Process interaction map v1 | Eng Lead | Medium | 8h | — | QMS-007 (planned) | IMS | Diagram |
| ISO9-2 | Management review #1 | CEO | High | 4h | KPI draft | QMS-005 | MR-001 | Minutes |

---

## Epic: SOC 2 Type II Readiness

| Story key | Summary | Assignee role | Priority | Estimate | Dependencies | Linked documents | Linked controls | Expected evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SOC2-1 | System description outline draft | Eng Lead | High | 8h | — | SOC2-001 (planned) | CC | Outline doc |
| SOC2-2 | TSC mapping complete | Eng Lead | High | 8h | CTRL matrix | SOC2-002 (planned) | All CC | Spreadsheet |
| SOC2-3 | 12-month evidence calendar execution | CS Ops | Ongoing | — | EVD-1 | SOC2-003 | EVD-001 | Monthly proofs |

---

### Story template (copy into Jira description)

```text
Objective: <one line>
Business reason: <customer trust / audit>
Security/quality reason: <control>
Implementation notes: <steps>
Dependencies: <links>
Acceptance criteria:
- [ ] ...
- [ ] ...
Linked documents: <paths>
Linked controls: <IDs>
Expected evidence: <artifact>
```
