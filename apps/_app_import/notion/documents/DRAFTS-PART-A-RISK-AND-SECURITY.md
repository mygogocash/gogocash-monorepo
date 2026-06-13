# Document Drafts — Risk & Security (GoGoCash)

**Artifact type:** Policy / procedure drafts for Notion import  
**Classification:** Internal  

Each section is one controlled document. Copy section to Notion `Documents` page.

---

## RISK-002 — Risk Assessment Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | Engineering Lead |
| Approver | CEO |
| Version | 0.1 |
| Review cycle | Annual |
| Related controls | RSK-001 |
| Standards | ISO 9001 6.1, ISO 27001 6.1.2–3, SOC 2 CC3 |

**Purpose:** Define how GoGoCash identifies, analyzes, and scores risks on a recurring basis.

**Scope:** All in-scope systems and processes per SCOPE-001.

**Procedure steps:**  

1. **Identify** threats from incidents, audits, vendor changes, new features.  
2. **Record** in Notion **Risks** DB with unique Risk ID.  
3. **Score** Likelihood 1–5 and Impact 1–5 (single Impact or max of dimensions per RISK-001).  
4. **Calculate** Inherent = L × I.  
5. **Assign** Risk Owner and Treatment.  
6. **Link** mitigating Controls (existing or new Tasks).  
7. **Residual** score after treatment; CEO approval if accepting residual > threshold.  
8. **Review** quarterly; update Review Date.

**Records produced:** Risk rows; MR notes; treatment evidence.

**Exceptions:** CEO approval only for scope changes.

---

## REG-RTP-001 — Risk Treatment Plan (Template)

| Field | Value |
| --- | --- |
| Type | Record / template |
| Owner | Engineering Lead |

**Purpose:** Track treatment actions per risk.

**Table columns (Notion or embedded):** Risk ID | Action | Owner | Due | Status | Residual target | Evidence link.

**Governance:** Open rows without due date are not allowed >30 days.

---

## EXC-001 — Exception Management Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | CEO |
| Standards | ISO 27001 6.1.3, SOC 2 CC3 |

**Purpose:** Time-bound risk acceptance for deviations from policy.

**Steps:**  

1. Request exception with Control ID, business justification, expiry date.  
2. CEO approves (or rejects).  
3. **Exceptions** DB row created.  
4. **No silent renewals** — review before expiry.  
5. Link to related Risk.

**Records:** Exception register rows; approval comment.

---

## SEC-002 — Access Control Policy

| Field | Value |
| --- | --- |
| Type | Policy |
| Owner | Engineering Lead |
| Approver | CEO |
| Standards | SOC 2 CC6, ISO 27001 A.5.15–18 |

**Policy statements:**  

1. **Least privilege** for production; no shared named accounts for humans.  
2. **MFA** required for GitHub org owners, GCP org admins, production consoles.  
3. **Quarterly** access review for privileged roles.  
4. **JML** same-day revoke on leave (business hours).  
5. **Break-glass** accounts documented with extra logging.

**Records:** IAM exports; review tickets; JML log.

---

## SEC-003 — Asset Management Standard

| Field | Value |
| --- | --- |
| Type | Standard |
| Owner | Engineering Lead |

**Requirements:**  

1. All production **Systems** registered in Notion **Systems** DB with owner.  
2. **Assets** (data stores, critical endpoints) linked to systems.  
3. **Ownership** transfer on org change within 30 days.

---

## SEC-004 — Data Classification and Handling Standard

| Field | Value |
| --- | --- |
| Type | Standard |
| Owner | Engineering Lead |

**Levels:** Public | Internal | Confidential | Restricted.  
**Handling:** Restricted: encryption at rest where supported; no copy to personal devices; ticket IDs only in Notion for customer issues.

---

## SDLC-001 — Secure SDLC Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | Engineering Lead |

**Steps:** Design review for sensitive features → threat notes in ticket → secure coding (no secrets in repo) → PR review → CI checks → deploy via REL-001.

**Records:** PR links; security tickets.

---

## CHG-001 — Change Management Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | Engineering Lead |

**Steps:** Create **Change** row → link ticket + PR → risk class → Eng Lead approves prod → **Releases** links → post-deploy validation → evidence item.

**Emergency:** Fix fast, **retro** Change/INC within 48h.

---

## REL-001 — Release Management Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | Engineering Lead |

**Steps:** Version tag → release notes → deploy → monitor 24h → link to Evidence.

---

## SEC-006 — Logging and Monitoring Standard

| Field | Value |
| --- | --- |
| Type | Standard |
| Owner | Engineering Lead |

**Requirements:**  

1. Auth events, admin actions, security errors logged to central store.  
2. **Retention** minimum per DOC-002 (align legal).  
3. **Alerts** on critical SLO breaches.

---

## VULN-001 — Vulnerability Management Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | Engineering Lead |

**SLA (example):** Critical 7d, High 30d, Medium 90d — tune in MR.  
**Records:** Scanner output; ticket links.

---

## VULN-002 — Patch Management Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | Engineering Lead |

**Steps:** OS image / dependency updates via CI; emergency patch via CHG-001.

---

## BCP-001 — Backup and Restore Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | Engineering Lead |

**Requirements:** Automated backups for DB/object stores; **monitor** failures; **quarterly** restore test to non-prod with log.

---

## IRP-001 — Incident Response Plan

| Field | Value |
| --- | --- |
| Type | Policy / plan |
| Owner | Engineering Lead |
| Approver | CEO |

**Phases:** Detect → Triage (severity) → Command (Eng Lead) → Comms (CS Ops if external) → Eradicate → Recover → Postmortem (P1/P2).  
**Comms templates:** Status page text + merchant email template (links in Notion).

---

## BCP-002 — Business Continuity / Disaster Recovery Runbook

| Field | Value |
| --- | --- |
| Type | Runbook |
| Owner | Engineering Lead |

**RTO/RPO:** Document targets per system (CEO approval).  
**DR:** Failover steps for GCP; **annual** tabletop.

---

## SEC-005 — Secrets Management Standard

| Field | Value |
| --- | --- |
| Type | Standard |
| Owner | Engineering Lead |

**Rules:** Secret Manager / CI secrets; rotation on compromise; secret scanning in CI.

---

## VND-001 — Supplier Security Review Procedure

| Field | Value |
| --- | --- |
| Type | Procedure |
| Owner | CEO |

**Steps:**  

1. Classify criticality (High/Critical).  
2. Questionnaire + SOC2 if available.  
3. Approve in **Vendors** DB.  
4. **Annual** review minimum for critical.

---

## Risk model — formulas (reference)

Inherent = L × I; Residual after treatment; bands Low/Medium/High per `notion/04-DATABASE-SCHEMAS.md`.

---

## Starting risks (link each to controls)

Use `compliance/07-registers/REG-RISK-001-risk-register.md` — includes: unauthorized admin access, privilege creep, incomplete offboarding, cashback miscalculation, merchant onboarding errors, undocumented emergency changes, missing logs, weak backup coverage, failed restore, exposed secrets, cloud misconfiguration, unreviewed vendor, recurring complaints, unresolved NC, missing audit evidence, poor change discipline, lack of training ack, unsupported dependency, missing severity classification, weak rollback, incomplete access reviews, lack of asset ownership, untracked policy review, unmanaged exceptions, incomplete evidence retention.

---

## Revision

| Ver | Date | Author |
| --- | --- | --- |
| 0.1 | 2026-03-31 | IMS package |
