# Integrated Control Matrix — GoGoCash

**Artifact type:** Record (master control register)  
**Document ID:** CTRL-IMS-001  
**Version:** 0.1  
**Owner:** Engineering Lead  
**Backup owner:** CS & Ops Manager  
**Classification:** Internal — Confidential  
**Effective date:** TBD  
**Review date:** Quarterly  

**Purpose:** Single master mapping for SOC 2 (CC), ISO 9001, ISO 27001:2022 (clauses + Annex A), with evidence and test hooks.

**Legend — Type:** P = preventive, D = detective, C = corrective  
**Nature:** Pol = policy, Proc = procedure, Tech = technical, Ops = operational, Evid = evidence  

---

| Control ID | Family | Control name | Objective | Description | Type | Nature | Owner | Backup | Frequency | In-scope system/process | Evidence produced | Testing method | Pass/fail criteria | Automation possible | SOC 2 CC mapping | ISO 9001 | ISO 27001 clause | Annex A | Related risks | Related documents |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GOV-001 | governance | Compliance charter & scope | IMS boundaries understood | Charter and scope approved; exclusions documented | P | Pol | CEO | Eng Lead | Annual + on change | All | Signed scope, exclusion list | Review doc + interview | Scope matches prod reality | Partial | CC1.1, CC2.1 | 4.1, 4.2, 5.2 | 4.2, 4.3, 5.2 | — | R-ORG-001 | CHARTER-001, SCOPE-001 |
| GOV-002 | governance | Roles & responsibilities | Accountability clear | RACI for security, quality, ops | P | Pol | CEO | Eng Lead | Annual | All | Approved RACI | Interview | Each critical area has owner | No | CC1.2, CC1.3 | 5.3 | 5.2, 5.3 | 5.2 | R-ORG-002 | ORG-001 |
| GOV-003 | document control | Controlled documents | Current approved docs used | Doc ID, version, approval, storage | P | Proc | Eng Lead | CEO | Ongoing | All | Version history, approvals | Sample 5 docs | No obsolete in use | Partial | CC2.1 | 7.5 | 7.5 | 5.31 | R-DOC-001 | DOC-001 |
| GOV-004 | record retention | Records lifecycle | Legal/audit retention met | Retention schedule + disposal | P | Pol | CS Ops Mgr | CEO | Annual | All | Retention log, disposal evidence | Review | Matches standard | Partial | CC2.1 | 7.5 | 7.5 | 5.33 | R-RET-001 | DOC-002 |
| RSK-001 | risk management | Risk methodology | Consistent scoring | L×I model; treatment tracked | P | Proc | Eng Lead | CEO | Quarterly | ISMS/QMS | Risk register updates | Inspect register | All risks scored + owner | Yes (sheet) | CC3.1, CC3.2 | 6.1 | 6.1.2, 6.1.3 | 5.3 | R-RSK-001 | RISK-001, REG-RISK |
| RSK-002 | risk management | Risk treatment | Reduction/acceptance explicit | Treatment plan with dates | P/C | Proc | Eng Lead | CEO | Monthly | High risks | Treatment plan rows | Inspect | Open gaps have target date | Partial | CC3.2 | 6.1 | 6.1.3, 8.2 | 5.3 | R-RSK-002 | REG-RISK-002 |
| RSK-003 | risk management | Exception management | Risk acceptance governed | Exceptions time-bound, approved | P | Proc | CEO | Eng Lead | Per exception | All | Exception register | Full population test | Expired reviewed | Partial | CC3.4 | 8.5 | 6.1.3 | 5.36 | R-EXC-001 | EXC-001 |
| ACC-001 | access control | Logical access policy | Least privilege | Policy + roles for prod | P | Pol | Eng Lead | Dev2 | Annual | GCP, GitHub, Admin | Access policy ack | Interview + config sample | No shared prod creds | Partial | CC6.1, CC6.2 | 8.5 | 5.15–5.18 | 5.15–5.18 | R-ACC-001 | SEC-002 |
| ACC-002 | access control | MFA & IdP | Strengthened login | MFA for cloud + GitHub org | P | Tech | Eng Lead | Dev2 | Continuous | IdP, GCP, GitHub | MFA reports, SSO logs | Config export | MFA enforced for admins | Yes | CC6.1 | 8.5 | 5.17 | 5.17 | R-ACC-002 | SEC-002, backlog |
| ACC-003 | user lifecycle management | Joiner/mover/leaver | Timely access changes | JML log + checklist | P | Ops | CS Ops Mgr | Eng Lead | Per event | HR, systems | JML log entries | Sample 3 months | Offboarding revokes access | Partial | CC6.1 | 7.1.2 | 5.16 | 5.16 | R-JML-001 | REG-HR-001 |
| ACC-004 | access control | Privileged access | Admin actions controlled | Break-glass + logging for prod admin | P/D | Tech+Ops | Eng Lead | CEO | Quarterly | Admin, GCP | PAM/break-glass log | Review admin actions | Privileged sessions attributable | Partial | CC6.1, CC6.2 | 8.5 | 5.18 | 5.18 | R-PRIV-001 | SEC-002, IRP-001 |
| CHG-001 | change management | Change approval | Unauthorized changes prevented | Tickets + approval for prod changes | P | Proc | Eng Lead | Dev2 | Per change | CI/CD, infra | PR, ticket ID, approvers | Trace sample changes | Prod change has ticket+PR | Partial | CC8.1 | 8.5 | 8.32 | 8.32 | R-CHG-001 | CHG-001 |
| CHG-002 | change management | Emergency change | Controlled urgency | Post-incident doc + retro | C | Proc | Eng Lead | CS Ops Mgr | Per event | Incidents | Emergency change record | Review incidents | Retro within SLA | No | CC8.1 | 8.5 | 8.32 | 8.32 | R-EMG-001 | CHG-001 |
| REL-001 | release management | Release process | Integrity of deploys | Release checklist, tagged deploys | P | Proc | Eng Lead | Dev2 | Per release | Pipeline | Release log, tag | Compare tag to prod | Deploy matches approved build | Yes | CC8.1, PI1.1 | 8.5, 8.6 | 8.32 | 8.32 | R-REL-001 | REL-001 |
| SDLC-001 | secure development | Secure SDLC | Security in SDLC | Threat basics, review, deps | P | Proc | Eng Lead | Designer | Per feature | GitHub | Design notes, PR template | PR sample | Security checklist used | Partial | CC7.1, CC8.1 | 8.1 | 8.25–8.28 | 8.25–8.28 | R-SDLC-001 | SDLC-001 |
| SDLC-002 | secure development | Code review | Defects caught pre-prod | Required reviewers, branch protection | P | Tech | Eng Lead | Dev2 | Per PR | GitHub | PR approvals | GitHub settings audit | Main protected | Yes | CC8.1 | 8.5 | 8.28 | 8.28 | R-PR-001 | Backlog |
| SDLC-003 | secure development | Dependency & secret scan | Vulnerable code/secrets blocked | CI scans on default branch | D | Tech | Dev2 | Eng Lead | Per build | CI | Scan reports | Last 10 builds | High vulns triaged | Yes | CC7.1 | 8.5 | 8.8, 8.31 | 8.8, 8.31 | R-DEP-001 | VULN-001 |
| LOG-001 | logging and monitoring | Security logging | Events detect issues | Centralized logs for auth, admin | D | Tech | Eng Lead | Dev2 | Continuous | App, GCP | Log exports, queries | Sample queries | Admin actions in logs | Partial | CC7.2, CC7.3 | 9.1 | 8.15 | 8.15 | R-LOG-001 | SEC-006 |
| MON-001 | logging and monitoring | Alerting | Timely detection | Alerts on errors, SLO breach | D | Tech | Eng Lead | Dev2 | Continuous | Monitoring | Alert history, on-call | Incident tie-in | Critical alerts acknowledged | Yes | A1.2, CC7.4 | 9.1 | 8.16 | 8.16 | R-MON-001 | Ops runbooks |
| VUL-001 | vulnerability management | Vuln intake & SLA | Vulns remediated | Severity SLA + tickets | P/C | Proc | Eng Lead | Dev2 | Weekly | Dependencies, images | Ticket links, SLA report | Open vuln review | SLA met or exception | Partial | CC7.1 | 8.5 | 8.8 | 8.8 | R-VUL-001 | VULN-001 |
| BKP-001 | backups and recovery | Backup jobs | Data recoverable | Automated backups per RPO | P | Tech | Eng Lead | Dev2 | Daily | DB, critical storage | Backup job logs | Console/API export | Success rate target met | Yes | A1.2 | 8.5 | 8.13 | 8.13 | R-BKP-001 | BCP-001 |
| BKP-002 | backups and recovery | Restore test | Restore works | Periodic restore drill | D | Ops | Eng Lead | CS Ops Mgr | Quarterly | Staging | Restore test log | Review log | Successful restore evidence | Partial | A1.2 | 9.1 | 8.14 | 8.14 | R-RST-001 | REG-BKP-002 |
| IR-001 | incident response | IR plan & comms | Incidents contained | IR roles, comms templates, timeline | C | Proc | Eng Lead | CS Ops Mgr | Per incident | All | Incident log, postmortem | Tabletop + real | IR steps followed | Partial | CC7.4, CC7.5 | 8.7 | 5.24–5.28 | 5.24–5.28 | R-INC-001 | IRP-001 |
| VND-001 | supplier management | Vendor assessment | Third-party risk known | Security review before use + annual | P | Proc | CEO | Eng Lead | Per vendor | SaaS, cloud | Vendor register, DPA/SOC | Sample vendors | Critical vendors reviewed | Partial | CC9.2 | 8.4 | 5.19–5.23 | 5.19–5.23 | R-VND-001 | VND-001 |
| TRN-001 | training | Security awareness | Staff knows duties | Annual training + ack | P | Ops | CS Ops Mgr | CEO | Annual | All staff | Training log, quiz results | Attendance ≥ target | Policies acknowledged | Partial | CC2.2 | 7.2 | 7.2 | 6.3 | R-TRN-001 | QMS-006 |
| CX-001 | complaint handling | Complaints recorded | Customer feedback handled | Ticket + root cause for trends | P/C | Proc | CS Ops Mgr | CEO | Ongoing | Support | Complaint log | Monthly sample | SLA met | Partial | — | 8.2.1, 9.1 | 8.2 | 8.2 | R-CX-001 | OPS-003 |
| NC-001 | nonconforming outputs | NC control | Bad outputs identified | Identify, segregate, fix | C | Proc | Eng Lead | CS Ops Mgr | Per NC | Product, data | NC log | NC review | Disposition recorded | Partial | PI1.2, PI1.3 | 8.7 | 8.2 | 8.2 | R-NC-001 | QMS-002 |
| CAP-001 | CAPA | Corrective action | Recurrence prevented | Root cause, action, verify | C | Proc | CEO | Eng Lead | Per CAPA | QMS | CAPA log | Closed CAPAs | Effectiveness check | Partial | CC7.5 | 10.2 | 10.1 | 8.34 | R-CAP-001 | QMS-003 |
| AUD-001 | internal audit | Internal audit program | IMS conformance | Annual audit plan + reports | D | Proc | CEO | Eng Lead | Semiannual | IMS | Audit report, findings | Read audit | Findings tracked | Partial | CC4.1, CC4.2 | 9.2 | 9.2 | 5.35 | R-AUD-001 | QMS-004 |
| MR-001 | management review | Management review | Leadership direction | MR minutes + actions | P | Proc | CEO | All | Quarterly | IMS | MR minutes, actions | Meeting record | Actions closed or dated | Partial | CC5.1 | 9.3 | 9.3 | 9.3 | R-MR-001 | QMS-005 |
| KPI-001 | KPI review | Quality objectives | Measurable improvement | KPI register reviewed | D | Ops | CEO | Eng Lead | Monthly | QMS | KPI dashboard | Trend review | Objectives on track or CAPA | Partial | 9.1 | 9.1 | 9.1 | 9.1 | R-KPI-001 | REG-KPI-001 |
| EVD-001 | evidence management | Evidence index | Audit retrieval | Monthly evidence checklist + index | P | Ops | CS Ops Mgr | Eng Lead | Monthly | All controls | Evidence tracker | Spot-check 5 controls | Links valid | Partial | CC2.1, CC4.2 | 9.1 | 9.1 | 5.35 | R-EVD-001 | REG-EVD-001 |
| PI-001 | processing integrity | Cashback calculation | Accurate rewards | Reconciliation, rule tests | P/D | Ops+Tech | Eng Lead | CS Ops Mgr | Weekly | Cashback engine | Recon reports, test cases | Sample period | Within tolerance | Partial | PI1.1–PI1.3 | 8.5 | 8.2 | 8.2 | R-CB-001 | OPS-002 |
| PI-002 | processing integrity | Merchant onboarding data | Correct merchant setup | Validation checks, approvals | P | Ops | CS Ops Mgr | CEO | Per merchant | Onboarding | Checklist complete | Sample files | No incomplete go-live | Partial | PI1.2 | 8.2 | 8.2 | 8.2 | R-MER-001 | OPS-001 |
| AVL-001 | availability | Uptime & DR | Service available | SLO, DR runbook, comms | P | Ops+Tech | Eng Lead | CEO | Quarterly | Platform | Uptime report, DR test | Review SLO | DR test executed | Partial | A1.1, A1.2 | 8.5 | 8.6 | 8.6 | R-AVL-001 | BCP-002 |
| CNF-001 | confidentiality | Data classification | Appropriate handling | Labels + handling rules | P | Pol | Eng Lead | CS Ops Mgr | Annual | All data stores | Classification doc | Data inventory sample | Sensitive data mapped | Partial | C1.1, C1.2 | 8.5 | 5.10–5.14 | 5.10–5.14 | R-CLS-001 | SEC-004 |
| SEC-001 | secure development | Secrets management | Secrets not in repos | Secret manager, rotation | P | Tech | Eng Lead | Dev2 | Continuous | CI, apps | Secret scan zero critical | Repo scan | No plaintext secrets | Yes | CC6.1 | 8.5 | 8.3 | 8.3 | R-SEC-001 | SEC-005 |

---

## Notes

1. **CC** = AICPA Trust Services Criteria (2017); map to your auditor’s exact taxonomy for SOC 2.  
2. **ISO 9001** clauses shown as shorthand (e.g. 7.5 = documented information).  
3. **Annex A** references are illustrative; full SoA in `compliance/15-iso27001/ISMS-001-statement-of-applicability-2022.md`.  
4. **R-*** risk IDs align with `compliance/03-risk/REG-RISK-001-risk-register.md`.  
5. Add rows for **merchant-specific** and **LINE** integrations as inventories mature.

---

## Records produced

This matrix itself; change history in git; approval record in management review or charter appendix.

---

## Related standards mapping

| This document | SOC 2 | ISO 9001 | ISO 27001 |
| --- | --- | --- | --- |
| CTRL-IMS-001 | CC1–CC9, A1, C1, PI1 | 4–10 (control evidence) | 4–10, Annex A (via SoA) |
