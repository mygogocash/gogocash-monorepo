# Integrated Compliance Charter

| Field | Value |
| --- | --- |
| **Document title** | Integrated Compliance Charter |
| **Document ID** | CHARTER-001 |
| **Version** | 0.1 |
| **Artifact type** | Policy |
| **Owner** | CEO / Founder |
| **Approver** | CEO / Founder |
| **Effective date** | TBD |
| **Review date** | +12 months |
| **Classification** | Internal — Confidential |

---

## Purpose

Establish **mandate, principles, and governance** for GoGoCash’s integrated management system (IMS) so that **one** program simultaneously supports **SOC 2 Type II** (Security, Availability, Confidentiality, Processing Integrity), **ISO 9001**, and **ISO 27001:2022**, without duplicating bureaucracy.

---

## Scope

Applies to all **in-scope** people, processes, systems, and vendors described in `SCOPE-001-scope-statement.md` and `compliance/ASSUMPTIONS_AND_SCOPE.md`. Excludes items explicitly listed as **phase 1 out of scope** until reclassified by written decision.

---

## Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| **CEO / Founder** | Approves charter, scope, exceptions, and resource allocation for compliance. |
| **Engineering Lead** | Owns technical controls, access, change/release, security tooling, evidence for engineering domains. |
| **Second Developer** | Executes controls (PR reviews, scans, runbooks) per assignments. |
| **CS & Ops Manager** | Owns customer/merchant operational procedures, complaints, vendor operational contacts, evidence cadence. |
| **Product Designer** | Supports secure UX and documentation of user-facing flows; participates in management review as needed. |

---

## Policy statements

1. **Single IMS:** GoGoCash maintains **one** set of policies, procedures, registers, and risk treatments mapped in `INTEGRATED-CONTROL-MATRIX.md`.  
2. **Evidence-driven:** Controls must produce **recurring, retrievable** evidence (tickets, logs, exports, signed records).  
3. **Lean operation:** Cadences (weekly/monthly/quarterly) are sized for a **~5-person** team; escalation replaces heavy committees.  
4. **No silent risk:** Material risks, incidents, and regulatory exposure are **escalated to CEO** without delay.  
5. **Continuous improvement:** Findings from audits, incidents, and metrics feed **CAPA** per `QMS-003-capa-procedure.md`.  

---

## Records produced

- Signed/approved charter (PDF or DocuSign equivalent stored in controlled repository).  
- Version history of this document in git.  

---

## Related controls

GOV-001, GOV-002, MR-001, AUD-001  

---

## Related standards mapping

| Standard | Clause / area |
| --- | --- |
| SOC 2 | CC1.1, CC1.2, CC2.1 |
| ISO 9001 | 4.1, 4.2, 5.2, 5.3 |
| ISO 27001:2022 | 4.1, 4.2, 5.2, 5.3 |

---

## Assumptions

- GoGoCash will use **English** for internal GRC docs; Thai translations for customer-facing legal text where required (**legal to confirm**).

---

## Executive decisions required

- [ ] Formal approval of this charter version.  
- [ ] Named deputy when CEO is unavailable for security incidents (48h).  
