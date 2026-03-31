# 9) Workflow Designs — Notion Operating Procedures

For each: **Trigger · Owner · Databases · Inputs · Outputs · SLA · Escalation · Evidence.**

---

## 1) Document workflow

| Field | Detail |
| --- | --- |
| **Flow** | Draft → In Review → Approval → Published → Train/Ack → Annual Review → Archived |
| **Trigger** | New law, incident, audit finding, annual clock |
| **Owner** | Document owner (property) |
| **Databases** | Documents, Training Records, Tasks |
| **Inputs** | Template, related controls |
| **Outputs** | Approved row + Effective Date; PDF optional in Drive |
| **SLA** | Review within **10 business days** once In Review |
| **Escalation** | Approver (CEO) unavailable >5d → deputy CEO or written email approval |
| **Evidence** | Status history, approver comment, ack log |

---

## 2) Risk workflow

| Field | Detail |
| --- | --- |
| **Flow** | Identify → Assess → Score → Owner → Treatment → Link controls → Residual → Monitor/Close |
| **Trigger** | New system, vendor, feature, incident, audit |
| **Owner** | Risk Owner |
| **Databases** | Risks, Controls, CAPAs, Evidence |
| **Outputs** | Risk row with treatment; linked CAPA if needed |
| **SLA** | New risk logged **within 5 days** of trigger |
| **Escalation** | Residual High after treatment → CEO acceptance record |
| **Evidence** | Review meeting notes monthly |

---

## 3) Incident workflow

| Field | Detail |
| --- | --- |
| **Flow** | Log → Triage → Severity → Investigation → Containment → Resolution → Postmortem → CAPA? → Closed |
| **Trigger** | Alert, customer report, staff finding |
| **Owner** | Incident Owner (Eng Lead tech; CS Ops comms if external) |
| **Databases** | Incidents, CAPAs, Evidence, Changes |
| **SLA** | P1: update every **2h**; P2: **8h** |
| **Escalation** | P1 → CEO notified within **1h** |
| **Evidence** | Timeline in page; log exports linked |

---

## 4) Change workflow

| Field | Detail |
| --- | --- |
| **Flow** | Request → Risk/impact → Approval → Implement → Validate → Close → Evidence |
| **Trigger** | Feature, fix, config |
| **Owner** | Requester + Approver (Eng Lead prod) |
| **Databases** | Changes, Releases, Evidence, Tasks |
| **SLA** | Standard: **2 business days** review; Emergency: retro within **48h** |
| **Escalation** | Disputed risk → CEO |
| **Evidence** | PR URL, ticket, post-deploy validation note |

---

## 5) Release workflow

| Field | Detail |
| --- | --- |
| **Flow** | Plan → Approve → Deploy → Validate → Monitor → Close |
| **Databases** | Releases, Changes, Evidence |
| **Evidence** | Tag in GitHub, monitoring screenshot 24h |

---

## 6) Complaint workflow

| Field | Detail |
| --- | --- |
| **Flow** | Capture → Categorize → Investigate → Respond → Resolve → Recurrence review → CAPA |
| **Owner** | CS & Ops Manager |
| **Databases** | Complaints, Nonconformities, CAPAs |
| **SLA** | First response **24h** business; resolution target **5 days** (adjust by severity) |
| **Escalation** | Regulatory tone → CEO + legal |
| **Evidence** | Ticket ID, redacted summary |

---

## 7) Nonconformity workflow

| Field | Detail |
| --- | --- |
| **Flow** | Detect → Log → Assess impact → Contain → Root cause → CAPA → Validate → Close |
| **Databases** | Nonconformities, CAPAs, Complaints |
| **Evidence** | NC record + CAPA closure |

---

## 8) Vendor workflow

| Field | Detail |
| --- | --- |
| **Flow** | Identify → Classify → Due diligence → Approve → Onboard → Periodic review → Reassess |
| **Owner** | CEO signs critical; Eng Lead technical |
| **Databases** | Vendors, Risks, Controls, Evidence |
| **SLA** | Critical vendor review **annual** minimum |
| **Evidence** | SOC2 PDF in Drive, link in Vendor row |

---

## 9) Audit workflow

| Field | Detail |
| --- | --- |
| **Flow** | Plan → Scope → Checklist → Fieldwork → Findings → Report → CAPA → Follow-up |
| **Databases** | Audits, Audit Findings, CAPAs, Controls |
| **SLA** | Critical findings remediation **30–90d** per plan |
| **Evidence** | Report PDF, finding rows |

---

## 10) Management review workflow

| Field | Detail |
| --- | --- |
| **Flow** | Prepare inputs → Review metrics/risks/incidents/findings/CAPAs/KPIs → Decisions → Actions → Follow-up |
| **Trigger** | Quarterly calendar |
| **Owner** | CEO chair |
| **Databases** | Management Reviews, KPIs, Tasks |
| **Outputs** | Minutes page + Tasks |
| **Evidence** | MR page export |

---

## 11) Evidence workflow

| Field | Detail |
| --- | --- |
| **Flow** | Identify need (from Control) → Assign owner → Collect → Review → Auditor Ready → Archive |
| **Databases** | Evidence Items, Controls |
| **SLA** | Monthly items by **day 15**; quarterly by end of quarter |
| **Escalation** | Rejected → back to owner with comment |
| **Evidence** | File/URL + status trail |

---

## Related

`04-DATABASE-SCHEMAS.md`, `13-MONTHLY-OPERATING-CADENCE.md`  
