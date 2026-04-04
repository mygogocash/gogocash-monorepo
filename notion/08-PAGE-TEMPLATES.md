# 8) Page Templates — Notion (Copy-Ready)

Each template: **header · metadata · linked records · sections · checklist · approval · evidence · example.**

---

## Policy page

**Header block:** `📜 POLICY` | `{{Document ID}}` | Version `{{x.y}}`

**Metadata (database properties):** All Documents fields; Standard Mapping includes SOC2/ISO.

**Linked records:** Related Controls (min 3 placeholders); Related Risks.

**Sections:** Purpose → Scope → Roles → Policy statements (numbered) → Records → Exceptions → Related docs → Revision history.

**Checklist:**  

- [ ] Owner filled  
- [ ] Approver = CEO  
- [ ] Next Review Date = Effective + 12 months  
- [ ] Related Controls linked  

**Approval block:** Approver sign-off table (Name, Date, Method).

**Evidence block:** Link to PDF in Drive when Approved.

**Example entry:** `POL-001 Information Security Policy` — see `compliance/05-policies/SEC-001-information-security-policy.md`.

---

## Procedure page

**Header:** `📋 PROCEDURE` | `PROC-xxx`

**Linked records:** Related Controls; optional **Tasks** for rollout.

**Sections:** Purpose → Scope → Roles → **Steps** (numbered) → Records → Metrics → Related.

**Checklist:** Steps testable; evidence named per step.

**Example:** `PROC-010 Change Management` — steps: Request → Assess → Approve → Implement → Validate → Evidence.

---

## Standard page

**Header:** `📏 STANDARD` | `STD-xxx`

**Sections:** Purpose → Applicability → Requirements (must/shall) → Measurement → Exceptions.

**Example:** `STD-002 Data Classification` — levels Public / Internal / Confidential / Restricted.

---

## Risk record (full page template)

**Header:** `⚠️ RISK` | `{{Risk ID}}`

**Body:** Description → Inherent scoring → Treatment → Links to Controls/CAPA → Review dates.

**Linked:** Controls (many), CAPAs, Systems, Vendors.

**Example:** `RSK-014` Cashback miscalculation — Likelihood 3, Impact 5, mitigate via CTRL-PI-001.

---

## Incident record

**Header:** `🚨 INCIDENT` | `INC-2026-001`

**Sections:** Summary → Timeline → Impact → Containment → Root cause → Actions → Postmortem link.

**Linked:** CAPAs, Evidence (log exports), Systems.

**Checklist:** Severity set; comms done if customer-visible; postmortem for P1/P2.

**Example:** `INC-2026-004` LINE API timeout — Sev2, resolved &lt;4h, evidence: GCP log query link.

---

## Change request

**Header:** `🔧 CHANGE` | `CHG-xxx`

**Properties:** PR URL, Ticket URL, Emergency Y/N, Related Release.

**Example:** `CHG-102` — Emergency config rollback — linked IR `INC-2026-004`.

---

## Release record

**Header:** `🚀 RELEASE` | `REL-2026.03.2`

**Linked:** Changes (many); Evidence item “deploy tag screenshot.”

**Example:** Tag `v2026.03.2` + 3 PRs.

---

## Complaint case

**Header:** `💬 COMPLAINT` | `CMP-xxx`

**Sections:** Customer ref (no PII) → Category → Investigation → Resolution → Recurrence check.

**Linked:** NC, CAPA if repeat.

**Example:** `CMP-089` — Cashback not showing — category `cashback_amount` — resolved — Repeat Flag false.

---

## Nonconformity record

**Header:** `⛔ NONCONFORMITY` | `NC-xxx`

**Linked:** Complaint, CAPA, Control.

**Example:** `NC-012` — Reconciliation batch off by 0.1% — source monitoring.

---

## CAPA record

**Header:** `✅ CAPA` | `CAPA-xxx`

**Sections:** Source → Root cause → Actions → Due → Effectiveness review.

**Linked:** Findings, Incidents, NCs, Controls.

**Example:** `CAPA-003` — Repeat merchant fee errors — preventive — owner CS Ops.

---

## Vendor review

**Page section on Vendor DB or subpage:** Due diligence checklist, SOC2 link, DPA checkbox, decision.

**Example:** `VND-Cloudflare` — Criticality high — SOC2 reviewed — Next review +12mo.

---

## Audit plan

**Header:** `🔍 INTERNAL AUDIT PLAN` | `AUD-2026-Q1`

**Sections:** Scope → Criteria → Schedule → Team → Confidentiality.

---

## Audit report

Link **Audits** database row + attach PDF; summarize in page body.

---

## Audit finding

Use **Audit Findings** DB; template page mirrors properties + CAPA link.

**Example:** `FIND-007` — Medium — MFA not enforced on secondary tool — CAPA-004.

---

## Management review meeting

**Header:** `👔 MANAGEMENT REVIEW` | `MR-2026-Q1`

**Page body:** Inputs (embed linked views: KPIs, Risks, Open CAPAs, Findings) → Decisions → Action items (Tasks).

---

## Training session record

**Training Records** row: Person, Document version ack, date, checkbox.

**Example:** Security awareness 2026 — all 5 staff ack’d `POL-SEC-001` v1.1.

---

## Evidence item

**Header:** `📎 EVIDENCE` | `EVD-2026-03-001`

**Body:** What it proves → Period → Collection steps → Reviewer → Auditor ready.

**Example:** `EVD-2026-03-014` — GCP IAM export March — Control CTRL-ACC-001 — URL to Drive CSV.

---

## KPI objective

**KPIs** row: Name `Merchant onboarding SLA`, Target 95%, Current 92%, Status at_risk.

---

## Task / implementation item

**Tasks** row: Workstream `Secure_Engineering`, Acceptance criteria bullet, Evidence expected = “MFA report screenshot.”

**Example:** Task `TASK-044` — Enable org-level MFA enforcement GitHub — P0 — Done — link evidence.

---

## Related

`04-DATABASE-SCHEMAS.md`, `09-WORKFLOW-DESIGNS.md`  
