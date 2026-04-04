# 2) Notion Workspace Architecture — GoGoCash

**Artifact type:** Design specification  
**Version:** 1.0  

---

## Workspace identity

| Field | Value |
| --- | --- |
| **Workspace name** | `GoGoCash` or `GoGoCash — IMS` |
| **Home culture** | Single **Home / Compliance Command Center** as default landing for compliance owners; Engineering uses **Engineering dashboard** as secondary home. |

---

## Information architecture (sidebar order)

Top to bottom — matches mental model: **run the business → control risk → prove it**.

1. **Home / Compliance Command Center** (pinned)  
2. **Integrated Management System Overview**  
3. **Programs** (toggle or section header)  
   - SOC 2 Program  
   - ISO 27001 Program  
   - ISO 9001 Program  
4. **Libraries**  
   - Policies Library  
   - Procedures Library  
   - Controls Library  
5. **Core registers**  
   - Risk Management  
   - Assets and Systems  
   - Vendors and Third Parties  
6. **Operations**  
   - Security Operations  
   - Quality Operations  
   - Incidents  
   - Changes and Releases  
7. **Improvement & assurance**  
   - Complaints and Nonconformities  
   - CAPA Tracker  
   - Internal Audits  
   - Management Reviews  
   - Training and Acknowledgments  
8. **Measurement & delivery**  
   - KPI and Objectives  
   - Evidence Tracker  
   - Implementation Backlog  
9. **Audit**  
   - Audit Readiness Dashboard  

---

## Permission model (startup-practical)

| Group | Access |
| --- | --- |
| **Admin** (CEO + Eng Lead) | Full workspace; lock production control definitions. |
| **Contributors** | Create/edit in assigned databases; cannot delete Controls/Risk framework rows without Admin. |
| **Viewer** (optional contractor) | Read specific pages only. |

**Notion limitation:** Use **private pages** for unreleased policies until Approved.

---

## Naming conventions

| Item | Pattern | Example |
| --- | --- | --- |
| Policy | `POL-xxx Title` | `POL-001 Information Security Policy` |
| Procedure | `PROC-xxx Title` | `PROC-010 Change Management Procedure` |
| Standard | `STD-xxx Title` | `STD-002 Data Classification Standard` |
| Control | `CTRL-xxx` | `CTRL-ACC-001` |
| Risk | `RSK-xxx` | `RSK-014` |
| Evidence | `EVD-YYYY-MM-xxx` | `EVD-2026-03-001` |

Database names: **plural English** — `Documents`, `Controls`, `Risks`, `Evidence Items`.

---

## Integration touchpoints

| System | What Notion stores | What external system stores |
| --- | --- | --- |
| GitHub | PR URL, commit SHA, release tag (URL properties) | Code, workflows, Actions logs |
| GCP | Link to export/screenshot in Drive | IAM, Cloud Logging, backup jobs |
| Drive | Link to PDF/SOC2 report | Signed contracts, auditor packs |
| LINE / app | Ticket ID for support | PII — minimize in Notion; use ticket reference |

---

## Data residency / privacy

- **Do not** paste full customer PII in Notion free-text; use **ticket ID**, **internal user ref**, or hashed ID.  
- **Merchant** commercial data: minimum necessary.  

**Human approval:** PDPA categories for Notion as processor vs controller for employee data.

---

## Backup strategy for Notion

| Cadence | Action | Owner |
| --- | --- | --- |
| Monthly | Export **key databases** to CSV + HTML where needed | CS & Ops Manager |
| Quarterly | PDF export of **Approved** policies to Drive | Eng Lead |
| On change | Policy `Source of Truth URL` points to git + Drive copy | Document owner |

---

## Single source of truth rule

| Content | Canonical |
| --- | --- |
| Operational records (open CAPA, incidents) | **Notion** |
| Policy text (versioned) | **Notion page body** + optional **GitHub markdown mirror** in `compliance/` |
| Evidence artifacts | **Drive / GitHub / GCP** — Notion holds **links + metadata** |

---

## Related

- `03-TOP-LEVEL-PAGES.md`  
- `04-DATABASE-SCHEMAS.md`  
