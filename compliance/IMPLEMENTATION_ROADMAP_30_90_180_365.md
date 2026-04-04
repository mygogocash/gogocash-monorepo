# Implementation Roadmap — 30 / 90 / 180 / 365 Days

**Artifact type:** Record (plan)  
**Document ID:** ROADMAP-DET-001  
**Version:** 0.1  
**Owner:** CEO / Founder  
**Classification:** Internal — Confidential  

---

## 0–30 days

| Activity | Owner | Dependencies | Deliverable | Acceptance criteria | Output evidence |
| --- | --- | --- | --- | --- | --- |
| Approve charter & scope | CEO | — | Signed CHARTER-001, SCOPE-001 | CEO sign-off | PDF + git tag |
| Assign control owners in matrix | Eng Lead | Matrix draft | Owner column complete | No orphan controls | Updated `INTEGRATED-CONTROL-MATRIX.md` |
| System & data inventory v1 | Eng Lead + CS Ops | Access to consoles | REG-SYS-001, REG-DATA-001 started | All prod systems listed | Registers |
| Vendor list v1 | CS Ops | Contracts | REG-VND-001 | Top 15 vendors captured | Register |
| Risk methodology adopted | Eng Lead | RISK-001 | Scoring used consistently | Workshop notes | Risk register |
| Policy pack v0.1 in repo | Eng Lead | PR process | Core policies merged | PR approvals | Git history |
| Evidence index skeleton | CS Ops | Folder structure | `audit/evidence-index/` | Template filled | Index file |

---

## 31–90 days

| Activity | Owner | Dependencies | Deliverable | Acceptance criteria | Output evidence |
| --- | --- | --- | --- | --- | --- |
| MFA on GCP + GitHub org | Eng Lead | IdP decision | MFA enforced for admins | Console report | Screenshots / export |
| Branch protection + required reviews | Eng Lead | GitHub settings | Main protected | Audit of settings | GitHub config |
| Central logging & admin audit | Eng Lead | GCP setup | Query saved for admin actions | Sample query works | Log export |
| Backup jobs + monitoring | Eng Lead | BCP-001 | Daily success evidence | Alert on failure | Job logs |
| IR tabletop | Eng Lead + CS Ops | IRP-001 | Tabletop notes | Action items in tickets | Minutes |
| Vendor security review (top 5) | CEO + Eng Lead | VND-001 | Questionnaires/SOC2 | Files stored | Vendor folder |
| Training round 1 + ack | CS Ops | Policy pack | TRN log 100% current team | Signed/clicked ack | `REG-HR-002` |
| First internal audit | CEO (lead) | QMS-004 plan | Audit report | Findings in log | AUD record |
| First management review | CEO | KPI draft | MR minutes | Actions assigned | `REG-MR-001` |

---

## 91–180 days

| Activity | Owner | Dependencies | Deliverable | Acceptance criteria | Output evidence |
| --- | --- | --- | --- | --- | --- |
| Quarterly access review | Eng Lead | Access matrix | Review sign-off | Privileged users justified | Ticket + register |
| Restore test to staging | Eng Lead | Backup | Restore test log entry | Successful restore | `REG-BKP-002` |
| KPI dashboard operational | CEO | REG-KPI-001 | Monthly review | Trends visible | Dashboard link |
| CAPA closure rate | CEO | CAPA log | ≥1 CAPA cycle demo | Root cause + verify | CAPA records |
| Second internal audit | CEO / delegate | First audit closed | Audit report v2 | Prior findings closed or waived | Report |
| Dependency SLA metrics | Eng Lead | VULN-001 | SLA dashboard | Critical within SLA % | Export |

---

## 181–365 days (6–12 months)

| Activity | Owner | Dependencies | Deliverable | Acceptance criteria | Output evidence |
| --- | --- | --- | --- | --- | --- |
| Quarterly MR + KPI | CEO | Prior MR | 4× MR in year | Consistent cadence | Minutes |
| Supplier annual review | CEO | Vendor register | All critical reviewed | Notes on file | Register |
| SOC 2 evidence completeness | CS Ops + Eng | Monthly checklist | 12 months rolling evidence | Spot-check pass | Evidence tracker |
| SOC 2 Type II window readiness | CEO | Auditor selected | Readiness review | `SOC2-008` checklist green | Readiness memo |
| ISO 9001 / 27001 readiness decision | CEO | Gaps list | Go/no-go | Documented rationale | MR decision |

---

## Related documents

`ROADMAP-COM-001-compliance-roadmap.md`, `INTEGRATED-CONTROL-MATRIX.md`
