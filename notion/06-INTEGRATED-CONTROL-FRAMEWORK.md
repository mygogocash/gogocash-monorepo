# 6) Integrated Control Framework — GoGoCash

**Artifact type:** Record (framework) + excerpt table  
**Canonical extended table:** `compliance/04-controls/INTEGRATED-CONTROL-MATRIX.md` (repo); **Notion:** import rows into **Controls** database.

---

## Design rules

- One **Control ID** per row; **SOC 2 + ISO 9001 + ISO 27001** columns filled where applicable.  
- **Startup-level** control statements (below) are the **minimum bar**; mature to full matrix.  
- **Evidence** is always a **Notion Evidence Item** or **linked artifact** (GitHub PR, GCP export).

---

## Starter controls (subset — full list in repo matrix)

| Control ID | Family | Control name | Objective | Type | Nature | Owner | Frequency | SOC2 | ISO9001 | ISO27001 clause | Annex A | Related risks | Related documents |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CTRL-GOV-001 | governance | IMS scope & charter | Boundaries clear | P | policy | CEO | annual | CC1.1 | 4.1, 5.2 | 4.2, 5.2 | — | RSK-STR-001 | CHARTER-001 |
| CTRL-DOC-001 | document_control | Document control | Approved docs only | P | procedure | Eng Lead | ongoing | CC2.1 | 7.5 | 7.5 | 5.31 | RSK-DOC-001 | PROC-Document-Control |
| CTRL-ACC-001 | access_control | Production access least privilege + MFA | Unauthorized access prevented | P | tech+ops | Eng Lead | quarterly | CC6.1 | 8.5 | 5.15–5.18 | 5.15–5.18 | RSK-ACC-001 | POL-Access |
| CTRL-CHG-001 | change_management | Change with approval & trace | Unauthorized change prevented | P | procedure | Eng Lead | per change | CC8.1 | 8.5 | 8.32 | 8.32 | RSK-CHG-001 | PROC-Change |
| CTRL-REL-001 | release_management | Release tagged & validated | Integrity of deploy | P | procedure | Eng Lead | per release | CC8.1, PI1.1 | 8.5 | 8.32 | 8.32 | RSK-REL-001 | PROC-Release |
| CTRL-SDLC-001 | secure_development | Secure SDLC + PR review | Defects reduced | P | procedure | Eng Lead | per PR | CC8.1 | 8.5 | 8.28 | 8.28 | RSK-SDLC-001 | PROC-SDLC |
| CTRL-LOG-001 | logging_monitoring | Security logging & alerts | Detection | D | tech | Eng Lead | continuous | CC7.2, A1.2 | 9.1 | 8.15–8.16 | 8.15–8.16 | RSK-LOG-001 | STD-Logging |
| CTRL-VUL-001 | vulnerability_management | Vuln SLA + remediation | Exploit risk reduced | P/C | procedure | Eng Lead | weekly | CC7.1 | 8.5 | 8.8 | 8.8 | RSK-VUL-001 | PROC-Vuln |
| CTRL-BKP-001 | backups_recovery | Backup + restore test | Restore confidence | P | ops | Eng Lead | daily + Qtr | A1.2 | 8.5 | 8.13–8.14 | 8.13–8.14 | RSK-BKP-001 | PROC-Backup |
| CTRL-IR-001 | incident_response | IR + postmortem | Impact contained | C | procedure | Eng Lead | per incident | CC7.4 | 8.7 | 5.24–5.28 | 5.24–5.28 | RSK-IR-001 | PROC-IR |
| CTRL-VND-001 | supplier_management | Critical vendor review | Third-party risk | P | procedure | CEO | annual | CC9.2 | 8.4 | 5.19–5.23 | 5.19–5.23 | RSK-VND-001 | PROC-Supplier |
| CTRL-TRN-001 | training | Training & acknowledgment | Competence | P | ops | CS Ops | annual | CC2.2 | 7.2 | 7.2 | 6.3 | RSK-TRN-001 | PROC-Training |
| CTRL-CX-001 | complaint_handling | Complaint handling | Customer satisfaction | P | procedure | CS Ops | ongoing | — | 8.2.1, 9.1 | 8.2 | 8.2 | RSK-CX-001 | PROC-Complaint |
| CTRL-NC-001 | nonconforming_outputs | NC control | Nonconformance managed | P | procedure | Eng Lead | per NC | PI1.2 | 8.7 | 8.2 | 8.2 | RSK-NC-001 | PROC-NC |
| CTRL-CAPA-001 | capa | CAPA process | Recurrence prevented | C | procedure | CEO | per CAPA | CC7.5 | 10.2 | 10.1 | 8.34 | RSK-CAPA-001 | PROC-CAPA |
| CTRL-AUD-001 | internal_audit | Internal audit | Conformance | D | procedure | CEO | semi-annual | CC4.2 | 9.2 | 9.2 | 5.35 | RSK-AUD-001 | PROC-IA |
| CTRL-MR-001 | management_review | Management review | Leadership direction | P | procedure | CEO | quarterly | CC5.1 | 9.3 | 9.3 | 9.3 | RSK-MR-001 | PROC-MR |
| CTRL-KPI-001 | kpi_review | KPI review | Objectives tracked | D | ops | CEO | monthly | 9.1 | 9.1 | 9.1 | 9.1 | RSK-KPI-001 | REG-KPI |
| CTRL-EVD-001 | evidence_management | Evidence management | Audit retrieval | P | ops | CS Ops | monthly | CC2.1 | 9.1 | 9.1 | 5.35 | RSK-EVD-001 | Evidence Tracker |
| CTRL-PI-001 | processing_integrity | Cashback reconciliation | Accurate rewards | P/D | ops | Eng+CS | weekly | PI1.1–PI1.3 | 8.5 | 8.2 | 8.2 | RSK-CB-001 | SOP-Cashback |

**Testing method / pass criteria / automation:** mirror columns in Notion **Controls** database; see `04-DATABASE-SCHEMAS.md`.

---

## Startup-level control statements (plain language)

1. **Production access** must be **approved**, **least-privileged**, **MFA-protected**, and **reviewed quarterly** (evidence: IAM export + review ticket).  
2. **Production changes** must link to a **request/task**, **peer-reviewed PR**, **approved** for production, **reversible** (rollback plan or feature flag where feasible).  
3. **Incidents** must be **logged**, **severity-rated**, **investigated**, **resolved**, **postmortemed** for P1/P2.  
4. **Complaints** must be **categorized**, **resolved**, **trended**; **repeat** themes → **CAPA**.  
5. **Critical vendors** (criticality = high/critical): **due diligence before onboarding**, **review at least annually** (SOC2/DPA on file).  
6. **Backups** must be **monitored**; **restore-tested** on schedule (staging).  

---

## Multi-standard satisfaction (examples)

| Artifact | Standards |
| --- | --- |
| Document Control Procedure | ISO 9001 7.5, ISO 27001 7.5, SOC 2 CC2.1 |
| Management Review | ISO 9001 9.3, ISO 27001 9.3, SOC 2 CC5.x |
| CAPA | ISO 9001 10.2, ISO 27001 10.1, SOC 2 remediation |

---

## Related

`compliance/04-controls/INTEGRATED-CONTROL-MATRIX.md`, `04-DATABASE-SCHEMAS.md`  
