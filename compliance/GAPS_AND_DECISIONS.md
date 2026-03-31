# Open Gaps and Decisions Requiring Human Approval

**Artifact type:** Record  
**Document ID:** GAP-001  
**Version:** 0.1  
**Owner:** CEO / Founder  
**Classification:** Internal — Confidential  

---

## Executive / legal decisions

| ID | Topic | Why it matters | Options | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| D-001 | Registered legal entity name on certificates | Auditor and contracts need exact name | Confirm with registration | CEO | Open |
| D-002 | PDPA processing activities & cross-border transfers | Lawful basis and transfers | Legal memo + RoPA | CEO + Legal | Open |
| D-003 | BYOD vs company devices for prod access | Affects ISO 27001 A.8.1 | Mandate MDM or restrict access | CEO | Open |
| D-004 | SOC 2 audit period start | Type II needs defined months | Pick start month | CEO | Open |
| D-005 | ISO 9001 / 27001 certification in Year 1 vs Year 2 | Cost and readiness | Prioritize one | CEO | Open |

---

## Security / engineering gaps

| ID | Gap | Risk | Mitigation path | Target | Owner |
| --- | --- | --- | --- | --- | --- |
| G-001 | MFA not enforced everywhere | R-001 | SEC epic stories | 90d | Eng Lead |
| G-002 | SAST not deployed | R-014 | SE-4 story | 180d | Eng Lead |
| G-003 | Central security SIEM vs GCP only | R-007 | Phase logging standard | 90d | Eng Lead |
| G-004 | Formal AUP document missing | R-026 | Policy draft | 90d | CEO |

---

## Operations / quality gaps

| ID | Gap | Risk | Mitigation | Target | Owner |
| --- | --- | --- | --- | --- | --- |
| G-010 | Complaint categorization not standardized | R-013 | Ticketing fields | 60d | CS Ops |
| G-011 | KPI not baselined | MR-001 | First KPI entry | 30d | CEO |

---

## Vendor / third party

| ID | Gap | Risk | Mitigation | Target | Owner |
| --- | --- | --- | --- | --- | --- |
| G-020 | Not all vendors have DPAs | R-012 | DPA sweep | 180d | CEO |

---

## Evidence / audit

| ID | Gap | Risk | Mitigation | Target | Owner |
| --- | --- | --- | --- | --- | --- |
| G-030 | Evidence index not populated for 12 months | R-015 | Monthly checklist discipline | Ongoing | CS Ops |

---

## How to close

1. Record decision in **management review** or **risk register**.  
2. If policy change — update controlled doc + version.  
3. Link **evidence** in `audit/evidence-index/`.  

---

## Related

`REG-RISK-001`, `ROADMAP-COM-001`, `MONTHLY_EVIDENCE_CHECKLIST.md`
