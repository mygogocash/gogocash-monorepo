# SOC 2 Type II — Readiness Model (GoGoCash)

**Trust criteria in scope:** Security, Availability, Confidentiality, Processing Integrity  

---

## System description outline

1. **Company:** GoGoCash — Thailand-based cashback platform.  
2. **Services:** Web app, LINE Mini App, merchant admin, cashback engine.  
3. **Users:** Shoppers, merchants, internal admins.  
4. **Infrastructure:** GCP (assumed regions documented), GitHub, Notion (GRC), SaaS for support/analytics.  
5. **Data:** Account data, transaction/cashback data, merchant campaign data (classify per STD-Data).  
6. **Boundaries:** In-scope per `01-ASSUMPTIONS-AND-SCOPE.md`.  
7. **Subservice orgs:** GCP, GitHub — SOC reports collected; shared responsibility documented.  

**Notion page:** `SOC 2 Program` → embed this outline.

---

## Trust Services Criteria mapping

**Controls** database columns: `SOC 2 Mapping` — populate from `compliance/04-controls/INTEGRATED-CONTROL-MATRIX.md` and **SOC2-TSC** document in `notion/documents/`.

| CC family | Example GoGoCash control |
| --- | --- |
| CC1 | Charter, RACI |
| CC2 | Document control, evidence |
| CC3 | Risk register |
| CC4 | Internal audit |
| CC5 | MR |
| CC6 | Access, MFA |
| CC7 | Logging, IR, vuln |
| CC8 | Change/release |
| CC9 | Vendor |
| A1 | Uptime, DR |
| C1 | Data classification |
| PI1 | Cashback reconciliation |

---

## Control-to-evidence mapping

| Control | Recurring evidence | Owner |
| --- | --- | --- |
| CC6.1 | IAM export monthly | Eng |
| CC8.1 | Change samples | Eng |
| PI1.1 | Reconciliation report | Eng+CS |

**Notion:** Filter **Evidence Items** by Related Control.

---

## 12-month evidence plan

See `14-EVIDENCE-MODEL-AND-CHECKLIST.md` — month-by-month theme.

---

## Monthly evidence checklist

**Notion:** Duplicate rows in **Evidence Items** for each month; use template.

**File:** `compliance/14-soc2/MONTHLY_EVIDENCE_CHECKLIST.md`

---

## Sample auditor request list

In `14-EVIDENCE-MODEL-AND-CHECKLIST.md` §.

---

## Third-party dependency narrative

In `14-EVIDENCE-MODEL-AND-CHECKLIST.md` §.

---

## Subservice organization narrative

In `14-EVIDENCE-MODEL-AND-CHECKLIST.md` §.

---

## Operating effectiveness readiness checklist

| # | Check |
| --- | --- |
| 1 | Evidence exists for **each month** of audit period for key controls |
| 2 | Same **owner** consistently |
| 3 | **Exceptions** expired none without renewal |
| 4 | **Incidents** P1/P2 postmortems filed |
| 5 | **Access** review quarterly with evidence |

**Notion:** **Audit Readiness** dashboard checklist block (manual checkboxes).

---

## Related

`compliance/14-soc2/`, `06-INTEGRATED-CONTROL-FRAMEWORK.md`
