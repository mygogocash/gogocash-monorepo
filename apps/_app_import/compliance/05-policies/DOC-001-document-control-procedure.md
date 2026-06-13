# Document Control Procedure

| Field | Value |
| --- | --- |
| **Document title** | Document Control Procedure |
| **Document ID** | DOC-001 |
| **Version** | 0.1 |
| **Artifact type** | Procedure |
| **Owner** | Engineering Lead |
| **Approver** | CEO / Founder |
| **Effective date** | TBD |
| **Review date** | +12 months |
| **Classification** | Internal — Confidential |

---

## Purpose

Ensure **approved**, **current** policies, procedures, and standards are used for the IMS and that **obsolete** documents are not relied upon for operations or audits.

---

## Scope

All **controlled documents** under `compliance/` and security/ops **controlled** references listed in `CONTROLLED_DOCUMENT_INDEX.md` (when published).

---

## Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| **Document owner** | Content accuracy, version bump, review date. |
| **Approver (CEO)** | Approval for policies and org-wide procedures. |
| **Engineering Lead** | Git workflow for markdown, PR review for doc changes. |

---

## Procedure

### 1. Document identification

Each controlled document includes:

- Document ID, version, owner, approver, effective date, review date, classification.  
- **Artifact type** tag: policy | procedure | record | template | technical control | evidence.

### 2. Approval

1. Owner opens PR changing markdown in `compliance/`.  
2. **CEO** approves (comment + merge, or explicit message in ticket).  
3. Tag release optional: `compliance-docs-vX.Y` for audit snapshots.

### 3. Distribution

- **Primary:** Git repository (main branch).  
- **Snapshots for auditors:** PDF export or tagged commit hash **recorded** in `audit/evidence-index/`.

### 4. Review cycle

- **Annual** minimum for policies; **on change** for procedures when process changes.  
- Owner updates **Review date** field when completed.

### 5. Obsolete documents

- Superseded versions remain in **git history**; current version is only file with ID without `-superseded` suffix.  
- If retired, move to `compliance/_archive/` with `STATUS-retired.md` note (**do not delete** audit history).

---

## Records produced

- PR history, merge commits, approval comments.  
- `CONTROLLED_DOCUMENT_INDEX.md` (master list).  

---

## Related controls

GOV-003, EVD-001  

---

## Related standards mapping

| Standard | Clause |
| --- | --- |
| ISO 9001 | 7.5 |
| ISO 27001:2022 | 7.5 |
| SOC 2 | CC2.1 |
