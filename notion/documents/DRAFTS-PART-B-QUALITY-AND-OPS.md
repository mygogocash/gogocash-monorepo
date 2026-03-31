# Document Drafts — Quality & Operations (GoGoCash)

**Artifact type:** Policy / procedure drafts for Notion import  

---

## QMS-001 — Quality Policy

| Field | Value |
| --- | --- |
| Type | Policy |
| Owner | CEO |
| Approver | CEO |
| Standards | ISO 9001 5.2 |

**Policy:** GoGoCash delivers **reliable cashback experiences**, **secure handling of user and merchant data**, and **continuous improvement** through measurable objectives, responsive support, and disciplined change management.  
**Satisfies also:** IMS alignment with SOC 2 service commitments (integrity/availability aspects of customer experience).

**Records:** Signed policy; acknowledgment in Training Records.

---

## QMS-007 — Process Interaction Map

| Field | Value |
| --- | --- |
| Type | Record |
| Owner | CEO |

**Digital process map:**  
**Acquire user** → **Shop** (web/LINE) → **Earn** (cashback engine) → **Support** (tickets) → **Improve** (CAPA + releases).  
**Merchant:** **Onboard** → **Campaign** → **Reporting**.  
**Enablement:** **Change/Release** → **Monitor** → **Incident**.

**Owners:** CS Ops (merchant/service), Eng Lead (platform), Designer (UX).

---

## OPS-001 — Merchant Onboarding SOP

| Field | Value |
| --- | --- |
| Type | SOP |
| Owner | CS & Ops Manager |

**Steps:**  

1. Create merchant record in admin (ticket ID).  
2. Verify business details per checklist (registration docs **— legal**).  
3. Configure campaign rules in staging → validate.  
4. Approver (CS Ops Lead or CEO) signs off **Go-live**.  
5. Notify merchant; monitor first 7 days.

**Records:** Onboarding checklist; approval comment; evidence in Notion **Complaints** if issues.

---

## OPS-002 — Cashback Rule Change SOP

| Field | Value |
| --- | --- |
| Type | SOP |
| Owner | Engineering Lead |

**Steps:**  

1. **Change** request with business rule diff.  
2. Peer review + **test cases** (amount, edge cases, caps).  
3. Deploy to staging → QA sign-off.  
4. Prod deploy via **Release** with **rollback** plan.  
5. **Reconciliation** post-deploy for sample window.

**Records:** Change row; PR; recon export (Evidence).

---

## OPS-003 — Support and Complaint Handling Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | CS & Ops Manager |

**SLA:** First response 24h business; priority by severity.  
**Steps:** Log in **Complaints** DB → categorize → investigate → respond → close → **monthly** trend review → CAPA if repeat.  
**PII:** Use ticket ID; no full PII in Notion body.

---

## QMS-002 — Nonconforming Output Control Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | Engineering Lead |

**Nonconformity:** Incorrect cashback, wrong content shown, defective release.  
**Steps:** Log **NC** → assess customer impact → contain (fix/hotfix) → root cause → CAPA if systemic.

---

## QMS-003 — Corrective Action / CAPA Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | CEO |

**Sources:** Audit findings, incidents, NC, recurring complaints, management review.  
**Steps:** CAPA row → root cause (5-why) → actions → due date → **effectiveness review** date → closure evidence.  
**Multi-standard:** ISO 9001 10.2, ISO 27001 10.1, SOC 2 remediation.

---

## QMS-004 — Internal Audit Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | CEO |

**Lean:** Plan 3–5 days before → sample controls → evidence check → **Findings** rows → close.  
**Independence:** Auditor not sole executor of same control for same period.

---

## QMS-005 — Management Review Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | CEO |

**Inputs:** KPIs, open risks, incidents summary, complaints, CAPA, findings, audit results, vendor status.  
**Outputs:** Decisions, **Tasks**, resource needs.  
**Cadence:** Quarterly.

---

## QMS-006 — Training and Awareness Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | CS & Ops Manager |

**On hire:** Security basics + policy ack.  
**On policy change:** Ack for affected roles.  
**Records:** **Training Records** DB.

---

## REG-KPI-001 — KPI and Quality Objectives Register

| Field | Value |
| --- | --- |
| Type | Register |
| Owner | CEO |

**Example KPIs:**  

| KPI | Target | Owner |
| --- | --- | --- |
| Cashback dispute rate | &lt;0.5% | Eng Lead |
| Merchant onboarding SLA | 95% | CS Ops |
| P1 MTTR | &lt;4h | Eng Lead |
| Evidence on-time % | 90% | CS Ops |

**Notion:** **KPIs** database; monthly update.

---

## ISO 9001 QMS narrative (software)

**Context:** Digital platform serving Thai shoppers and merchants.  
**Improvement:** CAPA + KPI + MR + deployment metrics.  
**Customer:** Complaints as primary feedback loop.

---

## Revision

| Ver | Date |
| --- | --- |
| 0.1 | 2026-03-31 |
