# Notion Register Specifications — Logs & Inventories

Each register = **database** OR **filtered view** of a parent DB. Columns map to Notion properties.

**Standard columns (all registers):** Unique ID (Title), Date, Owner (Person), Status, Priority/Severity, Related Process/System, Related Control ID (Relation), Related Standard(s) (Multi-select), Due Date, Evidence link (URL), Reviewer (Person), Notes (Text).

---

## Asset register

**Implementation:** **Assets** DB — no separate DB.  
**Unique ID:** `AST-xxx`  
**Extra:** Asset Type, Classification, Location.

---

## System inventory

**Implementation:** **Systems** DB.  
**Unique ID:** `SYS-xxx`  
**Extra:** Environment, Criticality.

---

## Data inventory

**Implementation:** New DB **Data Elements** OR Text table page until mature.

| Property | Type |
| --- | --- |
| Data ID | Title |
| Dataset name | Text |
| Classification | Select |
| System | Relation → Systems |
| Legal basis | Text |
| Retention | Text |
| Owner | Person |

---

## Vendor register

**Implementation:** **Vendors** DB.

---

## Access matrix

**Implementation:** **Page** with embedded table OR **Access Grants** DB (Person, System, Role, Last Reviewed).

| Property | Type |
| --- | --- |
| Access ID | Title |
| Person | Person |
| System | Relation |
| Role | Select |
| MFA required | Checkbox |
| Last reviewed | Date |

---

## Joiner / mover / leaver log

**Implementation:** **JML Events** DB.

| Property | Type |
| --- | --- |
| JML ID | Title |
| Event type | Select: join, move, leave |
| Effective date | Date |
| Person | Person |
| Systems affected | Relation → Systems |
| Ticket URL | URL |
| Completed | Checkbox |

---

## Change log

**Implementation:** **Changes** DB.

---

## Release log

**Implementation:** **Releases** DB.

---

## Incident log

**Implementation:** **Incidents** DB.

---

## Security event review log

**Implementation:** **Security Reviews** DB or monthly page with checklist.

| Property | Type |
| --- | --- |
| Review ID | Title |
| Period | Date range |
| Owner | Person |
| Findings | Text |
| Linked Evidence | Relation |

---

## Backup log

**Implementation:** **Backup Runs** DB (optional) OR rows in **Evidence Items** type = report.

---

## Restore test log

**Implementation:** **Restore Tests** DB.

| Property | Type |
| --- | --- |
| Test ID | Title |
| Date | Date |
| System | Relation |
| Result | Select pass/fail |
| Evidence | URL |

---

## Risk register

**Implementation:** **Risks** DB — `compliance/07-registers/REG-RISK-001-risk-register.md` is source seed.

---

## Exception register

**Implementation:** **Exceptions** DB.

| Property | Type |
| --- | --- |
| Exception ID | Title |
| Control | Relation |
| Risk accepted | Relation |
| Expiry date | Date |
| Approver | Person |

---

## Complaint / NC / CAPA / Audit findings logs

**Implementation:** Complaints, Nonconformities, CAPAs, Audit Findings DBs respectively.

---

## Training / Policy acknowledgment / MR action / KPI / Evidence

**Training Records**, **Training** linked to **Documents**, **Tasks** from MR, **KPIs**, **Evidence Items** DBs.

---

## Governance rule

**One person** owns register hygiene (CS Ops for ops registers; Eng for technical).

---

## Related

`04-DATABASE-SCHEMAS.md`
