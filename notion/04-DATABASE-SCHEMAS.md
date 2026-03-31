# 4) Notion Database Schemas — GoGoCash (19 databases)

**Notion property types:** Title, Text, Number, Select, Multi-select, Status, Person, Date, Checkbox, URL, Email, Phone, Relation, Rollup, Formula, Files & media.

**Status models** — see § Standard status options at end.

---

## 1) Documents

**Purpose:** Controlled policies, procedures, standards, templates; single library for approvals and review dates.  
**Why it exists:** ISO 9001/27001 documented information + SOC 2 CC2.1 + audit traceability.

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| Document ID | **Title** | Yes | e.g. `POL-001` |
| Display Title | Text | Yes | If Title is ID-only |
| Document Type | Select | Yes | Policy, Procedure, Standard, Template, Record, Charter |
| Standard Mapping | Multi-select | Yes | SOC2, ISO9001, ISO27001, IMS |
| Owner | Person | Yes | — |
| Approver | Person | Yes | Usually CEO for policies |
| Status | Status | Yes | Draft / In Review / Approved / Published / Archived |
| Version | Text | Yes | e.g. `1.2` |
| Effective Date | Date | If Approved | — |
| Next Review Date | Date | Yes | Triggers review tasks |
| Classification | Select | Yes | Public, Internal, Confidential, Restricted |
| Related Controls | Relation → Controls | No | Many |
| Related Risks | Relation → Risks | No | Many |
| Related Processes | Text or Relation → Systems | No | Or multi-select process names |
| Related Evidence | Relation → Evidence Items | No | Many |
| Related Audit Findings | Relation → Audit Findings | No | Many |
| Source of Truth URL | URL | No | GitHub raw or repo link |
| Archive Flag | Checkbox | No | True = superseded |
| Body | Page content | — | Purpose, scope, roles, statements, records |

**Rollups:** (from Controls) count linked controls.  
**Formulas:** `Overdue Review` = `dateBetween(now(), prop("Next Review Date"), "days") > 0` (if Approved) — *Notion: use `format`/`date` carefully; simpler: checkbox manual “Review overdue” or filter.*  
**Recommended:** Formula `Days to Review` = `dateBetween(prop("Next Review Date"), now(), "days")` — alert if < 30.

**Views:** Table (all); Gallery (by Type); **Review due** (Next Review < 30d, Status = Approved); **Archived** (Archive Flag = true).

**Filters:** Status = Approved for auditor-facing.

**Sort:** Next Review Date ascending.

**Governance:** Only Admin approves move to Approved; version bump on any material change.

---

## 2) Controls

**Purpose:** Integrated control framework row per control.  
**Why:** One row → many standards.

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| Control ID | Title | Yes | — |
| Control Name | Text | Yes | — |
| Control Family | Select | Yes | governance, document_control, risk_management, access_control, user_lifecycle, change_management, release_management, secure_development, logging_monitoring, vulnerability_management, backups_recovery, incident_response, supplier_management, training, complaint_handling, nonconforming_outputs, capa, internal_audit, management_review, kpi_review, evidence_management |
| Objective | Text | Yes | — |
| Description | Text | Yes | — |
| Control Type | Select | Yes | preventive, detective, corrective |
| Nature | Select | Yes | policy, procedure, technical, operational, evidence |
| Frequency | Select | Yes | continuous, daily, weekly, monthly, quarterly, annual, per_event |
| Owner | Person | Yes | — |
| Backup Owner | Person | No | — |
| Related Standards | Multi-select | Yes | SOC2, ISO9001, ISO27001 |
| SOC 2 Mapping | Text | No | e.g. `CC6.1`, `CC8.1` |
| ISO 9001 Mapping | Text | No | e.g. `8.5` |
| ISO 27001 Clause Mapping | Text | No | e.g. `8.32` |
| ISO 27001 Annex A Mapping | Text | No | e.g. `8.5` |
| Related Risks | Relation → Risks | Many | — |
| Related Documents | Relation → Documents | Many | — |
| Related Evidence | Relation → Evidence Items | Many | — |
| Related Assets | Relation → Assets | Many | — |
| Related Systems | Relation → Systems | Many | — |
| Test Method | Text | No | — |
| Pass Criteria | Text | No | — |
| Status | Status | Yes | Planned, Implemented, Partial, Gap, Retired |
| Last Review Date | Date | No | — |
| Next Review Date | Date | No | — |
| Automation Potential | Select | No | none, partial, full |

**Rollups:** Count Evidence where Status = Auditor Ready; Count Risks open.  
**Formulas:** `Evidence Freshness %` = rollup count collected last period / required — *often easier as manual number updated monthly.*  
**Views:** By family; **Gaps** (Status = Gap or Partial); **SOC2 only** (SOC 2 Mapping not empty).

---

## 3) Risks

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| Risk ID | Title | Yes | — |
| Risk Title | Text | Yes | — |
| Description | Text | Yes | — |
| Category | Select | Yes | security, operational, financial, legal, strategic, reputational |
| Related Process | Text or Relation | No | — |
| Related System | Relation → Systems | No | — |
| Related Asset | Relation → Assets | No | — |
| Confidentiality Impact | Number 1–5 | No | — |
| Integrity Impact | Number 1–5 | No | — |
| Availability Impact | Number 1–5 | No | — |
| Compliance Impact | Number 1–5 | No | — |
| Customer Trust Impact | Number 1–5 | No | — |
| Financial Impact | Number 1–5 | No | — |
| Likelihood | Number 1–5 | Yes | — |
| **Overall Inherent Score** | Formula | Auto | see formulas § |
| Treatment | Select | Yes | mitigate, accept, transfer, avoid |
| Risk Owner | Person | Yes | — |
| Treatment Plan | Text | No | — |
| Related Controls | Relation → Controls | Many | — |
| Related CAPAs | Relation → CAPAs | Many | — |
| Related Evidence | Relation → Evidence Items | Many | — |
| Status | Status | Yes | Identified / Assessed / Treatment Planned / Mitigating / Accepted / Monitoring / Closed |
| Review Date | Date | Yes | — |
| **Residual Risk Score** | Number or Formula | Yes | — |
| Related Vendors | Relation → Vendors | No | — |

**Formulas (Notion):**

- `Max Impact` = `max(prop("Confidentiality Impact"), prop("Integrity Impact"), prop("Availability Impact"), prop("Compliance Impact"), prop("Customer Trust Impact"), prop("Financial Impact"))`  
  *Note:* Notion `max` may need nested: `max(max(a,b),max(c,d))` — test in workspace.

- `Inherent Score` = `prop("Likelihood") * prop("Max Impact")` (if single impact dimension preferred, use one Impact number instead).

**Simpler startup pattern:** Use **Impact (1–5)** single field + Likelihood → `Inherent Score` = `multiply(prop("Likelihood"), prop("Impact"))`.

- `Residual Band` = `if(prop("Residual Risk Score") <= 6, "Low", if(prop("Residual Risk Score") <= 12, "Medium", "High"))`

- `Overdue Review` = `now() > prop("Review Date")` → Formula returns checkbox: `dateBetween(now(), prop("Review Date"), "days") > 0`

- `High Risk Flag` = `or(prop("Inherent Score") > 15, prop("Residual Risk Score") > 12)`

**Views:** Board by Status; **High risk**; Review overdue.

---

## 4) Assets

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| Asset ID | Title | Yes | — |
| Asset Type | Select | Yes | endpoint, serverless, database, secret, data_store, laptop, other |
| Description | Text | Yes | — |
| Owner | Person | Yes | — |
| Classification | Select | Yes | Public, Internal, Confidential, Restricted |
| Related System | Relation → Systems | No | — |
| Related Risks | Relation → Risks | No | — |
| Related Controls | Relation → Controls | No | — |
| Location | Select | No | GCP, GitHub, Notion, Office, SaaS name |
| Status | Select | Yes | Active, Retired |

**Views:** By type; Unowned (Owner empty) — **governance gap**.

---

## 5) Systems

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| System ID | Title | Yes | — |
| System Name | Text | Yes | — |
| Environment | Select | Yes | production, staging, development |
| Description | Text | No | — |
| Owner | Person | Yes | — |
| Related Assets | Relation → Assets | Many | inverse |
| Related Risks | Relation → Risks | Many | — |
| Related Evidence | Relation → Evidence Items | Many | — |
| Related Vendors | Relation → Vendors | Many | — |
| Criticality | Select | Yes | low, medium, high, critical |
| Status | Select | Yes | Active, Deprecated |

**Rollups:** Count open risks linked.

---

## 6) Vendors

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| Vendor ID | Title | Yes | — |
| Legal Name | Text | Yes | — |
| Criticality | Select | Yes | low, medium, high, critical |
| Service Provided | Text | Yes | — |
| DPA Signed | Checkbox | No | — |
| SOC2 Type II Available | Checkbox | No | — |
| Last Security Review | Date | No | — |
| Next Review Date | Date | Yes | — |
| Related Risks | Relation → Risks | Many | — |
| Related Controls | Relation → Controls | Many | — |
| Related Systems | Relation → Systems | Many | — |
| Evidence Link | URL | No | Drive folder |
| Status | Select | Yes | Evaluating, Active, Offboarding, Retired |

**Views:** Critical + review due 90d.

---

## 7) Incidents

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| Incident ID | Title | Yes | — |
| Title | Text | Yes | — |
| Severity | Select | Yes | P1–P4 or Sev1–4 |
| Status | Status | Yes | New / Triage / Investigating / Contained / Resolved / Postmortem / Closed |
| Detected Date | Date | Yes | — |
| Resolved Date | Date | No | — |
| Owner | Person | Yes | — |
| Description | Text | Yes | — |
| Related System | Relation → Systems | No | — |
| Related CAPAs | Relation → CAPAs | Many | — |
| Related Evidence | Relation → Evidence Items | Many | — |
| Postmortem URL | URL | No | Notion page or Doc |
| Customer Visible | Checkbox | No | — |

**Views:** Open; P1; This quarter.

---

## 8) Changes

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| Change ID | Title | Yes | — |
| Title | Text | Yes | — |
| Type | Select | Yes | standard, emergency, config, data |
| Status | Status | Yes | Requested / Assessed / Approved / Implemented / Validated / Closed |
| Requested By | Person | Yes | — |
| Approved By | Person | No | — |
| Request Date | Date | Yes | — |
| Related Release | Relation → Releases | No | — |
| Related Evidence | Relation → Evidence Items | Many | — |
| PR URL | URL | Yes | — |
| Ticket URL | URL | No | Jira/Linear |
| Production | Checkbox | Yes | — |
| Rollback Plan | Text | No | — |

**Views:** Prod changes last 30d; Emergency.

---

## 9) Releases

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| Release ID | Title | Yes | — |
| Version Tag | Text | Yes | — |
| Deploy Date | Date | Yes | — |
| Related Changes | Relation → Changes | Many | — |
| Related Evidence | Relation → Evidence Items | Many | — |
| Owner | Person | Yes | — |
| Status | Select | Yes | Planned, Deployed, Rolled Back |

---

## 10) Complaints

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| Complaint ID | Title | Yes | — |
| Source | Select | Yes | customer, merchant, internal, regulator |
| Category | Select | Yes | cashback_amount, delay, account, merchant, other |
| Status | Status | Yes | Captured / Investigating / Responded / Resolved / Escalated |
| Opened Date | Date | Yes | — |
| Closed Date | Date | No | — |
| Owner | Person | Yes | — |
| Summary | Text | Yes | — |
| Related Nonconformity | Relation → Nonconformities | No | — |
| Related CAPA | Relation → CAPAs | No | — |
| Repeat Flag | Checkbox | No | — |

**Views:** Open; Repeat = true.

---

## 11) Nonconformities

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| NC ID | Title | Yes | — |
| Title | Text | Yes | — |
| Source | Select | Yes | audit, complaint, incident, test, monitoring |
| Status | Status | Yes | Open / Contained / Root Cause / CAPA Linked / Closed |
| Detected Date | Date | Yes | — |
| Owner | Person | Yes | — |
| Related Complaint | Relation → Complaints | No | — |
| Related CAPA | Relation → CAPAs | No | — |
| Related Control | Relation → Controls | No | — |

---

## 12) CAPAs

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| CAPA ID | Title | Yes | — |
| Title | Text | Yes | — |
| Source | Select | Yes | audit_finding, incident, nc, risk, management_review |
| Source Record | Text | No | Link or ID |
| Root Cause | Text | No | — |
| Action Type | Select | Yes | corrective, preventive |
| Owner | Person | Yes | — |
| Due Date | Date | Yes | — |
| Status | Status | Yes | Open / In Progress / Pending Validation / Closed / Overdue |
| Effectiveness Review Date | Date | No | — |
| Closure Evidence | Files & media or URL | No | — |
| Related Controls | Relation → Controls | Many | — |
| Related Risks | Relation → Risks | Many | — |
| Related Audit Findings | Relation → Audit Findings | Many | — |
| Related Nonconformities | Relation → Nonconformities | Many | — |
| Related Incidents | Relation → Incidents | Many | — |

**Formula:** `Is Overdue` = `and(prop("Status") != "Closed", now() > prop("Due Date"))`

**Views:** Overdue; Pending validation.

---

## 13) Audits

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| Audit ID | Title | Yes | — |
| Audit Type | Select | Yes | internal, soc2_readiness, iso27001, iso9001, external |
| Scope | Text | Yes | — |
| Auditor | Text | No | — |
| Start Date | Date | Yes | — |
| End Date | Date | No | — |
| Status | Status | Yes | Planned / In Progress / Report Issued / Closed |
| Related Standards | Multi-select | No | — |
| Related Controls | Relation → Controls | Many | — |
| Findings Count | Rollup | Auto | from Findings |
| Open Findings Count | Rollup | Auto | findings where not closed |
| Audit Report | Files & media or URL | No | — |
| Follow-up Date | Date | No | — |

---

## 14) Audit Findings

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| Finding ID | Title | Yes | — |
| Title | Text | Yes | — |
| Severity | Select | Yes | low, medium, high, critical |
| Source Audit | Relation → Audits | Yes | — |
| Description | Text | Yes | — |
| Criteria | Text | No | — |
| Cause | Text | No | — |
| Impact | Text | No | — |
| Action Required | Text | Yes | — |
| Owner | Person | Yes | — |
| Due Date | Date | Yes | — |
| Status | Status | Yes | Open / Remediation Planned / In Remediation / Pending Validation / Closed |
| Related CAPA | Relation → CAPAs | No | — |
| Related Control | Relation → Controls | No | — |
| Evidence Link | URL | No | — |

---

## 15) Management Reviews

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| MR ID | Title | Yes | — |
| Meeting Date | Date | Yes | — |
| Chair | Person | Yes | — |
| Attendees | People | Yes | — |
| Status | Select | Yes | Scheduled, Completed |
| Decisions | Text | No | — |
| Related KPIs | Relation → KPIs | Many | — |
| Related Risks Summary | Text | No | Or link to view |
| Action Items | Relation → Tasks | Many | — |
| Minutes | Page content | Yes | — |

---

## 16) Training Records

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| Record ID | Title | Yes | — |
| Person | Person | Yes | — |
| Training Type | Select | Yes | policy_ack, security_awareness, role_specific |
| Related Document | Relation → Documents | No | — |
| Completed Date | Date | No | — |
| Acknowledged | Checkbox | Yes | — |
| Evidence | Files & media | No | — |

---

## 17) Evidence Items

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| Evidence ID | Title | Yes | — |
| Title | Text | Yes | — |
| Evidence Type | Select | Yes | screenshot, export, log_sample, attestation, ticket, report |
| Source System | Select | Yes | GitHub, GCP, Notion, Drive, Support tool |
| Related Control | Relation → Controls | Yes | — |
| Related Standard | Multi-select | Yes | — |
| Owner | Person | Yes | — |
| Collection Frequency | Select | Yes | monthly, quarterly, annual, per_release, ad_hoc |
| Evidence Period Start | Date | No | — |
| Evidence Period End | Date | No | — |
| Due Date | Date | Yes | — |
| Status | Status | Yes | Not Started / Requested / Collected / Reviewed / Auditor Ready / Rejected |
| Auditor Ready | Checkbox | No | — |
| File / URL | URL or Files | Yes | — |
| Notes | Text | No | — |
| Last Collected Date | Date | No | — |
| Next Collection Date | Date | No | — |

**Formula:** `Evidence Freshness` = `dateBetween(now(), prop("Last Collected Date"), "days")` — flag if > 45 for monthly.

**Views:** Due this month; Not auditor ready; By control family (via control rollup).

---

## 18) Tasks (Implementation Backlog)

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| Task ID | Title | Yes | — |
| Workstream | Select | Yes | Governance, Notion_Build, Doc_Control, Risk_Controls, Security, Secure_Engineering, Vendor, Quality_Ops, Incident_CAPA, Audit_Readiness, Training |
| Type | Select | Yes | epic, story, task, chore |
| Priority | Select | Yes | P0–P3 |
| Owner | Person | Yes | — |
| Collaborators | People | No | — |
| Status | Status | Yes | Backlog / Ready / In Progress / Blocked / Review / Done |
| Start Date | Date | No | — |
| Due Date | Date | No | — |
| Dependency | Relation → Tasks | No | self-relation |
| Related Standard | Multi-select | No | — |
| Related Control | Relation → Controls | No | — |
| Related Document | Relation → Documents | No | — |
| Related Risk | Relation → Risks | No | — |
| Acceptance Criteria | Text | Yes | — |
| Evidence Expected | Text | No | — |

**Views:** Board by Status; By workstream; **My tasks**.

---

## 19) KPIs / Objectives

| Property | Type | Required | Notes |
| --- | --- | --- | --- |
| KPI ID | Title | Yes | — |
| Name | Text | Yes | — |
| Description | Text | No | — |
| Target Value | Number | No | — |
| Unit | Text | No | %, THB, count, hours |
| Current Value | Number | No | — |
| Period | Select | Yes | monthly, quarterly, annual |
| Owner | Person | Yes | — |
| Status | Select | Yes | on_track, at_risk, off_track |
| Related Management Reviews | Relation → Management Reviews | Many | — |
| Last Updated | Date | No | — |

**Formula:** `Variance %` = `(prop("Current Value") - prop("Target Value")) / prop("Target Value")` *if targets non-zero.*

---

## Standard status options (reference)

| Database | Status / options |
| --- | --- |
| Documents | Draft, In Review, Approved, Published, Archived |
| Risks | Identified, Assessed, Treatment Planned, Mitigating, Accepted, Monitoring, Closed |
| Evidence Items | Not Started, Requested, Collected, Reviewed, Auditor Ready, Rejected |
| CAPAs | Open, In Progress, Pending Validation, Closed, Overdue *(or use formula for overdue)* |
| Tasks | Backlog, Ready, In Progress, Blocked, Review, Done |
| Incidents | New, Triage, Investigating, Contained, Resolved, Postmortem, Closed |
| Audit Findings | Open, Remediation Planned, In Remediation, Pending Validation, Closed |

---

## Usage rules

1. **Create relations from the “many” side** where possible (e.g., Evidence → Control).  
2. **No orphan evidence:** Every Evidence Item links to ≥1 Control.  
3. **IDs:** Human-readable; never reuse IDs after retire (suffix `-v2`).  

---

## Governance rules

- **Controls** rows: delete = never; use Status = Retired.  
- **Documents:** Archive Flag + new version row optional (or version in same row per `07-CONTROLLED-DOCUMENT-MODEL.md`).  

---

**Next:** `05-RELATIONS-AND-ROLLUPS.md`, `16-SAMPLE-DATA.md`  
