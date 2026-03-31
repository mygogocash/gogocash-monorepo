# Record Retention Standard

| Field | Value |
| --- | --- |
| **Document title** | Record Retention Standard |
| **Document ID** | DOC-002 |
| **Version** | 0.1 |
| **Artifact type** | Policy / standard |
| **Owner** | CS & Ops Manager |
| **Approver** | CEO / Founder |
| **Effective date** | TBD |
| **Review date** | +12 months |
| **Classification** | Internal — Confidential |

---

## Purpose

Define **minimum retention** and **disposal** rules for records supporting **quality**, **security**, and **audit** (SOC 2 / ISO), aligned with **Thailand PDPA** and business needs (**legal to finalize**).

---

## Scope

Records in **GitHub**, **GCP** (logs, backups), **support tools**, **email**, **HR files**, and **this compliance repository**.

---

## Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| CS & Ops Manager | Customer/merchant/support retention; evidence calendar. |
| Engineering Lead | Technical logs, backups, CI artifacts. |
| CEO | Approval of disposal of legal-sensitive records. |

---

## Policy statements

1. **Retain longer** if litigation hold or regulator request — pause disposal.  
2. **Personal data:** minimize retention per **PDPA** purposes (**DPA record** in data inventory).  
3. **Destruction:** secure delete for digital; shred for paper (rare).  

---

## Retention schedule (baseline — adjust after legal review)

| Record type | Minimum retention | Storage | Owner |
| --- | --- | --- | --- |
| **Policies & procedures (controlled)** | Life of company + 7 years (archive) | Git + PDF snapshot | Eng Lead |
| **Access / JML logs** | 3 years | Ticket system / sheet | CS Ops / Eng |
| **Change / release records** | 3 years | Git + release log | Eng Lead |
| **Incident records** | 5 years | Incident log + postmortems | Eng Lead |
| **Audit findings & CAPA** | 7 years | Register + tickets | CEO |
| **Customer complaints** | 3 years after closure | Complaint log + tickets | CS Ops |
| **Training acknowledgments** | 3 years | Log / HR tool | CS Ops |
| **Vendor assessments** | Life of contract + 3 years | Vendor register | CEO / Eng |
| **Application logs (security)** | 1 year minimum (tune to cost) | GCP logging | Eng Lead |
| **Backups** | Per backup policy; not indefinite | GCP | Eng Lead |

**Executive decision:** Align all rows with **legal** after PDPA mapping.

---

## Records produced

- Retention schedule (this document).  
- Disposal log (optional spreadsheet) for sensitive batches.  

---

## Related controls

GOV-004, CNF-001, EVD-001  

---

## Related standards mapping

| Standard | Clause |
| --- | --- |
| ISO 9001 | 7.5 |
| ISO 27001:2022 | 7.5, A.5.33 |
| SOC 2 | CC2.1, C1.1 |
