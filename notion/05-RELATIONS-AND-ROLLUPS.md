# 5) Relations and Rollups Map — GoGoCash Notion

**Artifact type:** Technical specification  

---

## Relation map (minimum set)

| # | Relation | Direction | Owner DB (suggested) | Why it exists |
| --- | --- | --- | --- | --- |
| 1 | Documents ↔ Controls | Many-to-many | **Documents** → Controls + inverse | Policies map to controls; controls cite documents. |
| 2 | Controls ↔ Risks | Many-to-many | **Risks** → Controls | Treatment reduces risk. |
| 3 | Controls ↔ Evidence Items | One-to-many | **Evidence Items** → Control (required) | Proof of operation. |
| 4 | Risks ↔ CAPAs | Many-to-many | **CAPAs** → Risks | Residual risk reduction. |
| 5 | Incidents ↔ CAPAs | Many-to-many | **CAPAs** → Incidents | Post-incident corrective action. |
| 6 | Incidents ↔ Evidence | Many-to-many | **Evidence Items** → Incidents (optional) | Incident log exports as evidence. |
| 7 | Audits ↔ Audit Findings | One-to-many | **Findings** → Audit (required) | Report structure. |
| 8 | Audit Findings ↔ CAPAs | Many-to-one | **Findings** → CAPA | Remediation. |
| 9 | Vendors ↔ Risks | Many-to-many | **Risks** → Vendors | Third-party risk. |
| 10 | Vendors ↔ Controls | Many-to-many | **Vendors** → Controls | Vendor-specific controls. |
| 11 | Systems ↔ Assets | Many-to-many | **Assets** → Systems | Composition. |
| 12 | Systems ↔ Risks | Many-to-many | **Risks** → Systems | Scoped risk. |
| 13 | Systems ↔ Evidence | many-to-many | **Evidence Items** → Systems | Env-specific proof. |
| 14 | KPIs ↔ Management Reviews | Many-to-many | **MR** → KPIs | Review inputs. |
| 15 | Documents ↔ Audits | Many-to-many | **Audits** → Documents | Policies in scope. |
| 16 | Tasks ↔ Controls | Many-to-many | **Tasks** → Controls | Implementation work. |
| 17 | Tasks ↔ Documents | Many-to-many | **Tasks** → Documents | Policy rollout tasks. |
| 18 | Complaints ↔ Nonconformities | one-to-one optional | **NC** → Complaint | Escalation. |
| 19 | Complaints ↔ CAPAs | many-to-one | **CAPA** → Complaints | Recurrence. |
| 20 | Changes ↔ Releases | many-to-many | **Changes** → Release | Deploy bundle. |
| 21 | Changes ↔ Evidence | many-to-many | **Evidence** → Changes | PR/deploy proof. |

**Implementation:** In Notion, add **both relations** (two-way) for Documents↔Controls, Controls↔Risks for easier editing from either page.

---

## Rollups (suggested)

| Parent | Rollup on | Property | Aggregation |
| --- | --- | --- | --- |
| Controls | Evidence Items | Status | Count per status / Count “Auditor Ready” |
| Controls | Risks | Residual risk | Max (numeric) — optional |
| Audits | Findings | Severity | Count critical |
| Systems | Risks | Status | Count open |
| Vendors | Risks | High Risk Flag | Count |
| Management Reviews | Action Items (Tasks) | Status | Count open |

---

## Formulas (workspace-level patterns)

| Name | Formula intent | Use in dashboard |
| --- | --- | --- |
| `Overdue Review` | Document/Control Next Review < today | Red **Documents** view |
| `Due in 30 days` | Between 0 and 30 days | Amber list |
| `Open CAPA count` | Rollup on CAPAs where Status ≠ Closed | CEO dashboard |
| `Open finding count` | Findings not Closed | Audit readiness |
| `Evidence freshness` | Days since Last Collected vs Frequency | Evidence health |
| `High risk label` | Inherent or residual over threshold | Risk heat |
| `Control coverage %` | Count Implemented / Total active controls | Readiness |
| `Audit readiness %` | Weighted: docs + evidence + open findings | Single number |

**Practical:** Notion formulas are limited; **compute readiness %** monthly in a **Summary** database row or **Synced block** updated by owner.

---

## Sample audit use

- **Auditor asks “show access control”:** Filter **Controls** Family = access_control → open each → linked **Evidence Items** → open **Files/URL**.  
- **Trace CAPA:** Finding → CAPA → linked Controls → Evidence closure.

---

## Sample dashboard use

- **Compliance manager:** Linked view **Evidence Items** filter `Due Date` this month + Status ≠ Auditor Ready.  
- **Engineering:** `Tasks` where Workstream = `Secure_Engineering` + Status ≠ Done.

---

## Related

`04-DATABASE-SCHEMAS.md`, `10-DASHBOARD-DESIGNS.md`  
