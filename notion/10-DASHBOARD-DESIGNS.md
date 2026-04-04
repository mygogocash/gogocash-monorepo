# 10) Dashboard Designs — Notion Layouts

**Artifact type:** UI specification  

For each dashboard: **layout · linked views · filters · sort · group · formulas · alerts · weekly usage.**

---

## CEO / Executive dashboard

### Page layout (top → bottom)

1. **Callout / Alert:** Rollup: Open CAPAs overdue (red); Open P1 incidents.  
2. **Columns 2:**  
   - Left: **Linked view** Risks — filter `High Risk Flag` = true OR Residual Band = High (table).  
   - Right: **Linked view** Audit Findings — Status ≠ Closed (table).  
3. **Full width:** **Linked view** KPIs — Status = at_risk OR off_track (gallery).  
4. **Full width:** **Linked view** Management Reviews — next 90d (calendar or list).  
5. **Embed:** Complaints trend (last 90d) — group by Category if using board.  
6. **Decisions needed:** Linked view Tasks — filter Priority = P0, Status ≠ Done.

**Filters:** Time = open items only.  
**Sort:** Due dates ascending on CAPAs and Findings.  
**Grouped views:** CAPAs by Status (board).  
**Formulas:** Pull from **Summary** database row: `Open CAPA count`, `Open finding count` — updated monthly if formula heavy.  
**Alert blocks:** Synced block from Evidence “Due in 7 days.”  
**Weekly usage:** 15 min Monday — scan alerts + KPI at_risk.

---

## Compliance manager dashboard (CS & Ops / delegated)

1. **Documents due review:** Documents — `Next Review Date` within 45d, Status = Approved.  
2. **Evidence this month:** Evidence Items — `Due Date` this month, Status ≠ Auditor Ready.  
3. **Findings:** Audit Findings — open.  
4. **CAPA aging:** CAPAs — board by Status; sort Due Date.  
5. **Control gaps:** Controls — Status = Gap or Partial.  
6. **Training:** Training Records — Acknowledged = false.  
7. **Audits upcoming:** Audits — Status = Planned, Start Date next 60d.

**Weekly usage:** Friday — close evidence items; nudge owners.

---

## Engineering / security dashboard

1. **Incidents:** Open; Severity P1/P2.  
2. **Tasks:** Workstream = Security OR Secure_Engineering; Status ≠ Done.  
3. **Changes (prod):** Last 14d — filter Production = true.  
4. **Evidence requests:** Evidence Items — Owner = Eng Lead or empty.  
5. **Systems critical:** Systems — Criticality = critical (table with rollup open risks).  
6. **Remediation:** Tasks linked Control Status = Gap.

**Weekly usage:** Weekly triage meeting 30 min — incident + vuln + access.

---

## CS / Ops dashboard

1. **Complaints:** Status ≠ Resolved.  
2. **Repeat complaints:** Repeat Flag = true (last 90d).  
3. **Nonconformities:** Open.  
4. **Merchant onboarding issues:** Complaints category merchant OR linked NC.  
5. **CAPAs:** Owner = CS Ops.  
6. **Procedures due:** Documents — Owner = CS Ops, Next Review &lt; 60d.

**Weekly usage:** Complaint triage + merchant SLA check.

---

## Audit readiness dashboard

### Sections

1. **Score row (manual table):**

| Metric | Value | Target |
| --- | --- | --- |
| Control implemented % | manual | 95% |
| Evidence auditor-ready % | rollup / manual | 90% |
| Open critical findings | rollup | 0 |
| High risks without treatment plan | filter count | 0 |

1. **Linked view:** Controls — Status ≠ Implemented.  
2. **Linked view:** Documents — Status ≠ Approved for required list.  
3. **Linked view:** Evidence — Status ≠ Auditor Ready, Due &lt; 30d.  
4. **Framework summary:** Gallery of pages SOC2 / ISO9001 / ISO27001 with status emoji.

**Formulas:** Prefer **monthly** update of % in a **Readiness Summary** single row database.

**Weekly usage:** Compliance + Eng 15 min — burn down gaps.

---

## Related

`03-TOP-LEVEL-PAGES.md`, `05-RELATIONS-AND-ROLLUPS.md`  
