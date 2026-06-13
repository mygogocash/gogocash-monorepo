# Roles and Responsibilities Matrix (RACI)

| Field | Value |
| --- | --- |
| **Document title** | Roles and Responsibilities Matrix |
| **Document ID** | ORG-001 |
| **Version** | 0.1 |
| **Artifact type** | Policy / record |
| **Owner** | CEO / Founder |
| **Approver** | CEO / Founder |
| **Effective date** | TBD |
| **Review date** | +12 months |
| **Classification** | Internal — Confidential |

---

## Purpose

Define **accountability** for IMS and security activities. **R** = Responsible, **A** = Accountable, **C** = Consulted, **I** = Informed.

---

## Scope

All in-scope roles at GoGoCash (~5 FTE). If headcount changes, update this matrix within **30 days**.

---

## Roles and responsibilities (summary)

| Activity / output | CEO | Eng Lead | Developer 2 | CS & Ops | Designer |
| --- | --- | --- | --- | --- | --- |
| **Strategic scope & charter** | A/R | C | I | C | I |
| **Policy approval (security/QMS)** | A | R | I | C | I |
| **Risk register & treatment** | A | R | C | C | I |
| **SOC 2 / ISO evidence ownership** | A | R | C | R | I |
| **GCP production access / IAM** | I | A/R | C | I | — |
| **GitHub org / branch protection** | I | A/R | R | I | — |
| **Change & release (prod)** | I | A/R | R | I | C |
| **Incident commander (technical)** | I | A/R | R | R | I |
| **Customer comms (incident)** | A | C | I | R | C |
| **Merchant onboarding SOP** | I | C | I | A/R | C |
| **Support & complaints** | I | C | I | A/R | C |
| **Vendor primary contact** | A | C | I | R | I |
| **Internal audit (lean)** | A | R | C | R | C |
| **Management review** | A/R | R | I | R | C |
| **Training & acknowledgments** | A | R | R | R | R |

---

## Named substitutes

| Primary | Substitute (if unavailable) |
| --- | --- |
| Eng Lead | Second Developer (technical), CEO (approval) |
| CS & Ops | CEO (customer-facing escalations) |

**Executive decision:** Document **deputy incident commander** for CEO unavailability.

---

## Procedure statements

1. **RACI is not optional:** If an activity has no owner, CEO assigns within **1 week** of identification.  
2. **Segregation:** Where possible, **developer who deploys** is not sole **approver** for production change (use second reviewer or CEO for high risk).  

---

## Records produced

- Approved matrix.  
- Org chart link (if maintained externally).  

---

## Related controls

GOV-002, ACC-001, CHG-001, IR-001  

---

## Related standards mapping

| Standard | Clause |
| --- | --- |
| ISO 9001 | 5.3 |
| ISO 27001:2022 | 5.3, 5.2 |
| SOC 2 | CC1.2, CC1.3 |
