# Monthly Evidence Checklist — SOC 2 & IMS

**Artifact type:** Template / record  
**Document ID:** SOC2-EVD-MONTH-001  
**Version:** 0.1  
**Owner:** CS & Ops Manager  
**Classification:** Internal — Confidential  

**Instruction:** Complete each month; store pointers in `audit/evidence-index/YYYY-MM.md` (create monthly file).

---

## Identity & access

| # | Evidence | Control IDs | Owner | Collected Y/N | Link / location |
| --- | --- | --- | --- | --- | --- |
| 1 | GCP IAM role export (prod) | ACC-001 | Eng Lead | — | — |
| 2 | GitHub org members + 2FA report | ACC-002 | Eng Lead | — | — |
| 3 | JML tickets closed in month | ACC-003 | CS Ops | — | — |
| 4 | Privileged access review note | ACC-004 | Eng Lead | — | — |

## Change & development

| # | Evidence | Control IDs | Owner | Collected Y/N | Link / location |
| --- | --- | --- | --- | --- | --- |
| 5 | Sample prod deploys: ticket + PR + tag | CHG-001, REL-001 | Eng Lead | — | — |
| 6 | Branch protection screenshot (dated) | SDLC-002 | Eng Lead | — | — |
| 7 | CI: dependency/secret scan summary | SDLC-003 | Eng Lead | — | — |

## Logging & monitoring

| # | Evidence | Control IDs | Owner | Collected Y/N | Link / location |
| --- | --- | --- | --- | --- | --- |
| 8 | Admin action log sample query | LOG-001 | Eng Lead | — | — |
| 9 | Uptime / error budget / alert list | MON-001, AVL-001 | Eng Lead | — | — |

## Vulnerability & backup

| # | Evidence | Control IDs | Owner | Collected Y/N | Link / location |
| --- | --- | --- | --- | --- | --- |
| 10 | Open vulns report + SLA | VUL-001 | Eng Lead | — | — |
| 11 | Backup success report | BKP-001 | Eng Lead | — | — |

## Operations & quality

| # | Evidence | Control IDs | Owner | Collected Y/N | Link / location |
| --- | --- | --- | --- | --- | --- |
| 12 | Complaint summary (count, themes) | CX-001 | CS Ops | — | — |
| 13 | Cashback reconciliation sign-off | PI-001 | Eng/CS | — | — |
| 14 | Vendor touchpoint (if annual month) | VND-001 | CEO | — | — |

## Governance

| # | Evidence | Control IDs | Owner | Collected Y/N | Link / location |
| --- | --- | --- | --- | --- | --- |
| 15 | Training/ack completion status | TRN-001 | CS Ops | — | — |
| 16 | Risk register touched (review note) | RSK-001 | Eng Lead | — | — |

---

## Sign-off

| Role | Name | Date |
| --- | --- | --- |
| Evidence owner | — | — |
| Reviewer (Eng Lead or CEO) | — | — |

---

## Standards satisfied (recurring evidence)

| Standard | Areas |
| --- | --- |
| SOC 2 CC | CC6–CC8, CC2.1, A1, PI1 (as applicable) |
| ISO 27001 | 8.x operational evidence |
| ISO 9001 | 9.1 performance evidence |
