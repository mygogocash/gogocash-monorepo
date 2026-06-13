# 14) Evidence Model and Checklist — Notion-First

---

## Evidence model

| Layer | What | Where |
| --- | --- | --- |
| **Metadata** | ID, period, control, owner, status | **Evidence Items** database |
| **Artifact** | PDF, CSV, screenshot, ticket URL | **Drive / GitHub / GCP console** — linked via URL |
| **Narrative** | How collected, scope | Evidence Item page body |
| **Approval** | Reviewed → Auditor Ready | Status + Approver person (optional property) |

**Rule:** Notion stores **pointers**, not large PII exports.

---

## Evidence types by source

| Source system | Typical evidence | Linked in Notion |
| --- | --- | --- |
| GitHub | PR list, branch settings, Actions run | URL + screenshot |
| GCP | IAM policy export, log query, backup job | Exported CSV in Drive + link |
| Notion | Training ack, MR minutes | Page link |
| Support tool | Ticket stats (redacted) | Export PDF |

---

## Monthly evidence checklist (Notion implementation)

Copy to **Evidence Tracker** page as checklist; each line = pre-created **Evidence Item** recurring template.

### Identity & access

| Evidence | Control | Owner |
| --- | --- | --- |
| GCP IAM export | CTRL-ACC-001 | Eng Lead |
| GitHub 2FA/members | CTRL-ACC-002 | Eng Lead |
| JML changes closed | CTRL-ACC-003 | CS Ops |
| Privileged review note | CTRL-ACC-004 | Eng Lead |

### Change & SDLC

| Evidence | Control | Owner |
| --- | --- | --- |
| Prod deploy sample (PR+ticket+tag) | CTRL-CHG-001 / REL-001 | Eng Lead |
| Branch protection | CTRL-SDLC-002 | Eng Lead |
| CI scan summary | CTRL-VUL-001 / SDLC-003 | Second Dev |

### Ops

| Evidence | Control | Owner |
| --- | --- | --- |
| Backup job success | CTRL-BKP-001 | Eng Lead |
| Uptime/alert sample | CTRL-MON / AVL | Eng Lead |
| Complaint summary | CTRL-CX-001 | CS Ops |
| Cashback reconciliation sign-off | CTRL-PI-001 | Eng+CS |

### Governance

| Evidence | Control | Owner |
| --- | --- | --- |
| Risk review occurred | RSK-001 | Eng Lead |
| Training completion | TRN-001 | CS Ops |

---

## 12-month evidence plan (outline)

| Month | Theme | Extra evidence |
| --- | --- | --- |
| M1–M3 | Baseline IAM, CI, backups | Establish samples |
| M4 | Vendor SOC reviews | Critical vendors |
| M5 | DR tabletop | BCP evidence |
| M6 | Mid-year internal audit | Findings or clean report |
| M7–M9 | Repeat monthly + penetration test optional | PT report |
| M10–M12 | SOC readiness dry run | Mock auditor request list |

---

## Auditor request list (sample)

1. List of production systems and owners.  
2. IAM export dated within 90d.  
3. Sample of 25 changes: ticket + PR + deploy.  
4. Incident log last 12 months with postmortems for P1/P2.  
5. Backup reports + last restore test.  
6. Policy ack training log.  
7. Vendor SOC2 for top 5.  

---

## Third-party dependency narrative (short)

GoGoCash relies on **Google Cloud** for compute/storage, **GitHub** for code and CI, **Notion** for IMS records, **[Support SaaS]** for tickets, **[Analytics]** for product metrics. Each is assessed in **Vendors** DB; subprocessors for customer PII are listed in data inventory (**executive decision:** finalize list).

---

## Subservice organization note (short)

Controls at GoGoCash **complement** security commitments of **GCP** and **GitHub**; SOC reports obtained where available; shared responsibility model documented in **System Description**.

---

## Operating effectiveness readiness

| Check | Pass |
| --- | --- |
| 12 months of monthly evidence for core controls | Continuous collection |
| Same control owner for ≥2 cycles | Stability |
| Exceptions time-bound | Exception register |

---

## Related files

`compliance/14-soc2/MONTHLY_EVIDENCE_CHECKLIST.md`, `04-DATABASE-SCHEMAS.md` (Evidence Items)
