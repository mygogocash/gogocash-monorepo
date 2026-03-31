# 1) Assumptions and Scope — GoGoCash Notion IMS

**Artifact type:** Record  
**Version:** 1.0  
**Classification:** Internal  

---

## Operating model (binding)

| Layer | Role |
| --- | --- |
| **Notion** | **Source of operational truth:** governance, policies/procedures (mirrored), registers, workflows, reviews, dashboards, evidence *tracking*, audit coordination, tasks. |
| **GitHub** | Source control, PRs, branch protection, CI/CD, technical evidence, deploy traceability. |
| **Google Cloud** | Runtime, IAM, logging, backups, monitoring evidence. |
| **Shared Drive / secure storage** | Exported PDFs, screenshots, SOC reports, signed approvals, audit packages (Notion links *to* these files). |

**Rule:** If it is a **recurring operational record** (incident, change, CAPA, evidence item), it lives in **Notion databases**. Git commits are **referenced by URL/ID** from Notion, not duplicated as prose.

---

## Company context

| Field | Value |
| --- | --- |
| Company | GoGoCash |
| Model | Cashback / shopping-to-earn / ecommerce rewards |
| Geography | Thailand (PDPA applies — legal to finalize RoPA) |
| Team | ~5: Founder/CEO, Eng Lead, Developer, CS & Ops Manager, Product Designer |
| Surfaces | Web, LINE Mini App, admin, merchant onboarding, cashback ops, support |

---

## In scope — systems

Production web app; LINE Mini App; admin panel; cashback/reward logic; merchant onboarding; support tools; GitHub repos; CI/CD; GCP; logging/monitoring; evidence storage; critical SaaS; endpoints with prod/sensitive access.

## In scope — processes

Account support; merchant onboarding; campaign/rule changes; tracking/reconciliation; support; complaints; incidents; access JML; change/release; backup/restore; vendor review; risk review; internal audit; management review; training/ack; CAPA; KPI review.

## Out of scope — phase 1

Founder side projects; prototypes with no prod data; low-risk sandboxes; **non-critical** vendors (tracked in optional tier — **executive decision** on definition).

---

## Standards in scope

| Standard | Scope |
| --- | --- |
| **SOC 2 Type II** | Security, Availability, Confidentiality, Processing Integrity — design + operating effectiveness over period. |
| **ISO 9001** | Lightweight QMS for digital platform (not manufacturing). |
| **ISO 27001:2022** | ISMS + SoA + risk treatment. |

---

## Integrated design rule

One **Controls** database row maps to **SOC 2 + ISO 9001 + ISO 27001** columns. One **Management Review** satisfies ISO 9001 9.3, ISO 27001 9.3, SOC 2 governance oversight. **CAPA** links findings (audit/NC/incident) once.

---

## Assumptions requiring validation

1. Notion **Business** or **Enterprise** (or equivalent) for permissions and audit log — **confirm subscription**.  
2. **Backup of Notion** = export + off-Notion document store for critical policies (**quarterly** PDF export minimum).  
3. **Thai/English:** Internal IMS English; customer-facing/legal Thai where required.  

---

## Scope statement (one paragraph)

The GoGoCash Integrated Management System covers the **design, delivery, operation, and improvement** of the in-scope digital services and supporting information assets, implemented primarily in **Notion** with evidence in **GitHub, GCP, and Shared Drive**, for the purpose of **SOC 2 Type II readiness**, **ISO 9001 QMS**, and **ISO 27001:2022 ISMS**, excluding phase-1 exclusions above.

---

## Related files

- `compliance/ASSUMPTIONS_AND_SCOPE.md` (repo baseline)  
- `07-CONTROLLED-DOCUMENT-MODEL.md`  
- `04-DATABASE-SCHEMAS.md`  
