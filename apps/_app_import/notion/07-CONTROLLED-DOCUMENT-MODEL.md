# 7) Controlled Document Model — Notion + Git

**Artifact type:** Procedure  

---

## Principles

1. **Notion** = daily-readable policy/procedure body + metadata in **Documents** database.  
2. **GitHub** `compliance/` = optional **authoritative markdown mirror** for engineering review and long-term diff (`Source of Truth URL`).  
3. **Effective** policy = row **Status = Approved** + **Effective Date** set.  
4. **Training** = new **Training Record** when policy version changes materially.

---

## Documents database row (metadata) — required

| Field | Use |
| --- | --- |
| Document ID | `POL-xxx`, `PROC-xxx`, `STD-xxx`, `TMP-xxx` |
| Title | Full name |
| Document Type | Policy, Procedure, Standard, Template, Record |
| Status | Workflow |
| Owner / Approver | People |
| Version | Semver or `1.0` |
| Effective Date / Next Review Date | Compliance |
| Classification | — |
| Standard Mapping | Multi-select |
| Related Controls / Risks / Evidence | Relations |

---

## Page body template (every controlled doc page)

```markdown
## Purpose
## Scope
## Roles and Responsibilities
## Policy Statements OR Procedure Steps
## Records Produced
## Metrics / Monitoring (if any)
## Exceptions (approval required)
## Related Documents
## Revision History
```

---

## Naming conventions

| Pattern | Example |
| --- | --- |
| POL-xxx | POL-001 Information Security Policy |
| PROC-xxx | PROC-001 Document Control Procedure |
| STD-xxx | STD-002 Data Classification Standard |
| REG-xxx | REG-001 Risk Register *(database, not always a page)* |
| TMP-xxx | TMP-001 Incident Report Template |
| CTRL-xxx | CTRL-ACC-001 *(in Controls DB)* |

---

## Controlled document index (domains)

| Domain | Examples | Notion location |
| --- | --- | --- |
| Governance | Charter, Scope, RACI, Document Control | Policies + Procedures |
| Risk & control | Risk methodology, SoA, Exception mgmt | Procedures + linked Controls |
| Security | IS policy, Access, SDLC, IR | Policies |
| Quality & ops | Quality policy, SOPs merchant/cashback/support | Policies + Procedures |
| Audit & evidence | IA procedure, Evidence calendar | Procedures |
| SOC 2 | System description, TSC mapping, readiness checklist | Documents + SOC2 Program page |
| ISO 27001 | SoA | Documents + ISO27 Program |
| ISO 9001 | Context summary, process map | ISO 9001 Program |

**Full index table:** `notion/documents/00-DOCUMENT-INDEX-NOTION.md`

---

## Workflow tie-in

| Stage | System action |
| --- | --- |
| Draft | Status = Draft; page editable |
| Review | Status = In Review; comment in Notion |
| Approved | Status = Approved; Effective Date; PDF to Drive optional |
| Published | Status = Published; notify via Training |
| Annual Review | Next Review Date triggers Task |
| Archive | Archive Flag; Status = Archived |

---

## Multi-standard mapping (property)

Use **Standard Mapping** multi-select: `SOC2`, `ISO9001`, `ISO27001`, `IMS` — filter in **Policies Library** gallery.

---

## Related

`09-WORKFLOW-DESIGNS.md`, `notion/documents/00-DOCUMENT-INDEX-NOTION.md`  
