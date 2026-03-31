# 3) Top-Level Pages — GoGoCash Notion

Each block: **purpose · owner · audience · linked databases · sections · linked views · actions**.

---

## Home / Compliance Command Center

| Field | Detail |
| --- | --- |
| **Purpose** | Daily entry: what needs attention for IMS, evidence, and audit readiness. |
| **Owner** | CS & Ops Manager (content); CEO (priorities). |
| **Audience** | CEO, Eng Lead, CS & Ops. |
| **Key linked databases** | Tasks (filtered: This week), Evidence Items (Due this month), CAPAs (Open), Audit Findings (Open). |
| **Recommended sections** | (1) Alert / this week (2) Framework health rollups (3) Quick links (4) Cadence calendar embed. |
| **Linked views** | `Tasks`: Board by Status; `Evidence`: Gallery due in 14 days; `CAPAs`: Table overdue. |
| **Actions** | Triage tasks; assign evidence owners; escalate red KPIs. |

---

## Integrated Management System Overview

| Field | Detail |
| --- | --- |
| **Purpose** | One-page explainer: how SOC2/9001/27001 fit together; links to charter and scope. |
| **Owner** | CEO. |
| **Audience** | All staff, auditors (sanitized export). |
| **Key linked databases** | Documents (filter: Type = Policy, Status = Approved); Controls (sample). |
| **Sections** | Mission → Scope → Process map (embed) → Roles → Review cadence. |
| **Linked views** | Documents: gallery by Standard Mapping. |
| **Actions** | New hire reads once; annual refresh link in Training. |

---

## SOC 2 Program

| Field | Detail |
| --- | --- |
| **Purpose** | TSC focus, system description link, period plan, subservice org narrative. |
| **Owner** | Eng Lead. |
| **Audience** | CEO, auditors. |
| **Databases** | Controls (filter SOC 2 Mapping not empty); Evidence Items; Documents (SOC2-*). |
| **Sections** | Criteria in scope → System boundaries → Related vendors → Evidence calendar embed. |
| **Views** | Controls table: by CC family; Evidence: by month. |
| **Actions** | Monthly evidence checklist completion; link trust services mapping doc. |

---

## ISO 27001 Program

| Field | Detail |
| --- | --- |
| **Purpose** | ISMS scope, SoA link, risk treatment summary. |
| **Owner** | Eng Lead. |
| **Audience** | CEO, Eng, auditors. |
| **Databases** | Risks; Controls (ISO 27001 columns); Documents (ISMS/SoA). |
| **Sections** | Scope → SoA status → Risk heat → Annex A gaps. |
| **Views** | Risks: board by Residual band; Controls: filter Annex A not empty. |
| **Actions** | Quarterly risk review from this page. |

---

## ISO 9001 Program

| Field | Detail |
| --- | --- |
| **Purpose** | QMS context, quality policy, process map, customer satisfaction inputs. |
| **Owner** | CEO (policy); CS & Ops (operations). |
| **Audience** | All staff. |
| **Databases** | Documents (POL/QMS); Complaints; KPIs; Nonconformities. |
| **Sections** | Context → Policy → Processes → Complaints trend → MR outcomes. |
| **Views** | Complaints: by category last 90d; KPIs: dashboard chart. |
| **Actions** | Feed MR; trigger CAPA on recurrence. |

---

## Policies Library

| Field | Detail |
| --- | --- |
| **Purpose** | All policies with approval metadata; **not** a duplicate of git — either sync or “Notion canonical”. |
| **Owner** | CEO (approval); Eng Lead (maintenance). |
| **Database** | Documents (Document Type = Policy). |
| **Sections** | By domain: Security, Quality, Governance. |
| **Views** | Gallery Approved; Table **Next Review** ascending (overdue red via formula property elsewhere). |
| **Actions** | Request review; publish after Approved. |

---

## Procedures Library

| Field | Detail |
| --- | --- |
| **Purpose** | SOPs and procedures; step links to Changes/Incidents where relevant. |
| **Owner** | Process owners per procedure. |
| **Database** | Documents (Type = Procedure / SOP). |
| **Views** | Board by domain; filter Owner = me. |
| **Actions** | Execute procedure; log evidence item when proof needed. |

---

## Controls Library

| Field | Detail |
| --- | --- |
| **Purpose** | Master control framework; audit tests live here. |
| **Owner** | Eng Lead. |
| **Database** | Controls (full). |
| **Views** | By Control Family; **Gaps**: Status ≠ Implemented; Rollup open evidence count. |
| **Actions** | Link new evidence; assign remediation tasks. |

---

## Risk Management

| Field | Detail |
| --- | --- |
| **Purpose** | Identify, assess, treat, review risks. |
| **Owner** | Eng Lead (security); CEO (acceptance). |
| **Database** | Risks. |
| **Views** | Heat matrix (group by band); High risk filter; Review overdue. |
| **Actions** | Monthly review; create CAPA from accepted high residual. |

---

## Assets and Systems

| Field | Detail |
| --- | --- |
| **Purpose** | Asset register + system inventory linkage. |
| **Owner** | Eng Lead. |
| **Databases** | Assets; Systems (relation Assets ↔ Systems). |
| **Views** | Systems: production only; Assets: laptops vs cloud. |
| **Actions** | Onboard system → link vendor → link risks. |

---

## Vendors and Third Parties

| Field | Detail |
| --- | --- |
| **Purpose** | Criticality, DPA/SOC, review dates. |
| **Owner** | CEO / CS & Ops. |
| **Database** | Vendors. |
| **Views** | Review due in 60d; Criticality = Critical. |
| **Actions** | Annual review; attach SOC report link in Drive. |

---

## Security Operations

| Field | Detail |
| --- | --- |
| **Purpose** | Run vuln SLAs, access reviews, logging evidence tasks. |
| **Owner** | Eng Lead. |
| **Databases** | Incidents; Evidence Items (type = Technical); Tasks (workstream Security). |
| **Views** | Tasks security backlog; Incidents open. |
| **Actions** | Weekly triage; close evidence loop. |

---

## Quality Operations

| Field | Detail |
| --- | --- |
| **Purpose** | Complaints, NC, service quality metrics. |
| **Owner** | CS & Ops Manager. |
| **Databases** | Complaints; Nonconformities; KPIs. |
| **Views** | Complaints by root theme; NC open. |
| **Actions** | Weekly complaint review; trend to CAPA. |

---

## Incidents

| Field | Detail |
| --- | --- |
| **Purpose** | Single incident pipeline security + availability. |
| **Owner** | Eng Lead (tech); CS & Ops (comms). |
| **Database** | Incidents. |
| **Views** | Board by status; Severity P1. |
| **Actions** | Log every prod incident; postmortem → CAPA optional. |

---

## Changes and Releases

| Field | Detail |
| --- | --- |
| **Purpose** | Change + release traceability to evidence. |
| **Owner** | Eng Lead. |
| **Databases** | Changes; Releases (relation). |
| **Views** | Changes this sprint; Releases last 30d. |
| **Actions** | Link PR URL; attach evidence item for prod deploy. |

---

## Complaints and Nonconformities

| Field | Detail |
| --- | --- |
| **Purpose** | Customer issues + internal NC. |
| **Owner** | CS & Ops. |
| **Databases** | Complaints; Nonconformities. |
| **Views** | Complaints linked NC; repeat customer filter. |
| **Actions** | Convert to CAPA if repeat. |

---

## CAPA Tracker

| Field | Detail |
| --- | --- |
| **Purpose** | One remediation pipeline for audit/incident/NC. |
| **Owner** | CEO (escalation); owners per CAPA. |
| **Database** | CAPAs. |
| **Views** | Overdue; Pending validation. |
| **Actions** | Effectiveness review on date. |

---

## Internal Audits

| Field | Detail |
| --- | --- |
| **Purpose** | Plan + execute lean internal audits. |
| **Owner** | CEO (independent) or rotated lead. |
| **Database** | Audits; Audit Findings. |
| **Views** | Annual plan; findings open. |
| **Actions** | Create findings → CAPA. |

---

## Management Reviews

| Field | Detail |
| --- | --- |
| **Purpose** | Quarterly leadership review IMS. |
| **Owner** | CEO. |
| **Database** | Management Reviews. |
| **Views** | Next scheduled; actions open. |
| **Actions** | Capture decisions; spawn tasks. |

---

## Training and Acknowledgments

| Field | Detail |
| --- | --- |
| **Purpose** | Policy ack, security awareness. |
| **Owner** | CS & Ops Manager. |
| **Database** | Training Records. |
| **Views** | Incomplete acks; by policy version. |
| **Actions** | On policy publish → assign training. |

---

## Evidence Tracker

| Field | Detail |
| --- | --- |
| **Purpose** | Recurring proof for SOC2/ISO; links to Drive/GitHub. |
| **Owner** | CS & Ops (coordination); Eng (technical). |
| **Database** | Evidence Items. |
| **Views** | Due this month; Auditor Ready = false; by Control. |
| **Actions** | Mark Reviewed → Auditor Ready. |

---

## KPI and Objectives

| Field | Detail |
| --- | --- |
| **Purpose** | Quality objectives + service KPIs. |
| **Owner** | CEO. |
| **Database** | KPIs / Objectives. |
| **Views** | By quarter; at risk. |
| **Actions** | MR input; adjust targets. |

---

## Implementation Backlog

| Field | Detail |
| --- | --- |
| **Purpose** | IMS buildout + engineering controls. |
| **Owner** | Eng Lead (tech); CEO (priorities). |
| **Database** | Tasks. |
| **Views** | Board by workstream; Roadmap timeline. |
| **Actions** | Pull from Ready → Done with evidence expected filled. |

---

## Audit Readiness Dashboard

| Field | Detail |
| --- | --- |
| **Purpose** | Single readiness scorecard + gaps. |
| **Owner** | CEO + Eng Lead. |
| **Databases** | Rollups: Controls, Evidence, Documents, Findings. |
| **Sections** | Coverage % formulas; red list; next audit date. |
| **Actions** | Weekly 15 min review in compliance triage. |

---

## Related

`04-DATABASE-SCHEMAS.md`, `10-DASHBOARD-DESIGNS.md`  
