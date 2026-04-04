# Document Drafts — SOC 2 (GoGoCash)

**Artifact type:** Records / checklists for Notion import  

---

## SOC2-001 — System Description Outline

| Field | Value |
| --- | --- |
| Type | Record |
| Owner | Engineering Lead |
| Standards | SOC 2 |

**Outline sections:**

1. **Organization:** GoGoCash — cashback rewards platform, Thailand.  
2. **Services provided:** Web, LINE Mini App, merchant admin, cashback engine.  
3. **Users and responsibilities:** Customer, merchant, internal admin.  
4. **Infrastructure:** GCP (compute, storage, networking), GitHub, Notion (GRC), support/analytics SaaS.  
5. **Data flows:** User auth → browse → purchase attribution → cashback ledger → **support** (ticket ref).  
6. **Security commitments:** Access control, change management, logging, IR, vendor management.  
7. **Availability:** Uptime targets; monitoring; backup/restore.  
8. **Confidentiality:** Classification; encryption in transit; secrets management.  
9. **Processing integrity:** Reconciliation rules; change control for financial logic.  
10. **Subservice organizations:** GCP, GitHub — SOC reports; shared responsibility.  
11. **Complementary user entity controls:** User device security (policy acknowledgment).  

**Records:** This document + annual refresh.

---

## SOC2-002 — Trust Services Criteria Mapping

| Field | Value |
| --- | --- |
| Type | Record |
| Owner | Engineering Lead |

**Method:** Map each **Control** ID to **SOC 2** criteria in `SOC 2 Mapping` column.  
**Source:** `compliance/04-controls/INTEGRATED-CONTROL-MATRIX.md`.  
**Notion:** **Controls** table filtered SOC 2 Mapping not empty; export for audit.

**Sample rows:**

| Control ID | SOC 2 |
| --- | --- |
| CTRL-ACC-001 | CC6.1 |
| CTRL-CHG-001 | CC8.1 |
| CTRL-PI-001 | PI1.1–PI1.3 |
| CTRL-LOG-001 | CC7.2 |

---

## SOC2-003 — Evidence Collection Calendar

| Field | Value |
| --- | --- |
| Type | Record |
| Owner | CS & Ops Manager |

**12-month rolling plan:**  

| Month | Focus | Evidence examples |
| --- | --- | --- |
| Q1 | Baseline IAM, CI, backups | IAM, branch protection, backup logs |
| Q2 | Vendor SOC, DR test | Vendor files, restore test |
| Q3 | Mid-year IA | Audit report |
| Q4 | Readiness dry run | Mock PBC list |

**Notion:** Recurring **Evidence Items** with Due Date per month.

---

## SOC2-004 — Control Testing Readiness Checklist

| Field | Value |
| --- | --- |
| Type | Checklist |
| Owner | CEO |

**Design effectiveness:**  

- [ ] Control documented in **Controls** DB  
- [ ] Owner assigned  
- [ ] Policy/procedure linked  

**Operating effectiveness (Type II):**  

- [ ] Evidence for **≥6 months** for key controls (adjust to audit period)  
- [ ] Samples show **consistent** execution  
- [ ] Exceptions tracked and current  

**Notion:** Checkbox page block on **Audit Readiness Dashboard**.

---

## Auditor request list (sample)

1. Org chart and RACI.  
2. List of systems and environments.  
3. Network diagram or high-level architecture (link).  
4. IAM policies export (dated).  
5. 25 sample changes with PR + ticket.  
6. Incident log with postmortems.  
7. Backup and restore evidence.  
8. Vendor SOC2 for critical vendors.  
9. Training and policy acknowledgments.  
10. Last 4 management reviews.

---

## Third-party dependency narrative

GoGoCash depends on **GCP** for hosting and data services, **GitHub** for source and CI, **Notion** for IMS records (non-customer-PII), and **support/analytics** vendors. Security reviews are maintained in **Vendors** DB; subprocessors disclosed per privacy policy (**legal**).

---

## Subservice organization narrative

GoGoCash implements **application-level** controls; **GCP** and **GitHub** provide **infrastructure** controls described in their SOC reports. **Customer** entity responsibilities include endpoint security and credential hygiene.

---

## Operating effectiveness readiness

See `notion/SOC2-READINESS-MODEL.md` and `notion/14-EVIDENCE-MODEL-AND-CHECKLIST.md`.

---

## Revision

| Ver | Date |
| --- | --- |
| 0.1 | 2026-03-31 |
