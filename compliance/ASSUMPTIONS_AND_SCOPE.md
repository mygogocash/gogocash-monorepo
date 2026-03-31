# GoGoCash — Assumptions and Scope

**Artifact type:** Record (baseline) + scope definition  
**Document ID:** COM-BASE-001  
**Version:** 0.1  
**Owner:** CEO / Founder (delegable to Engineering Lead for maintenance)  
**Classification:** Internal — Confidential  
**Effective date:** TBD (requires executive approval)  
**Review date:** +12 months or on material change  

---

## 1. Purpose

This document states the implementation baseline assumptions and the scope of GoGoCash’s integrated management system (IMS) covering **SOC 2 Type II** (Security, Availability, Confidentiality, Processing Integrity), **ISO 9001**, and **ISO 27001:2022**, in a **lean, startup-operable** form.

---

## 2. Organizational context (assumptions)

| Item | Assumption |
| --- | --- |
| Legal entity | GoGoCash operates as a Thailand-based legal entity (exact name on registration: **to be confirmed by legal/finance**). |
| Business | Cashback / shopping-to-earn / ecommerce rewards platform. |
| Geography | Primary operations and customers: **Thailand**; cloud and vendors may be global. |
| Team size | ~5 FTE: CEO/Founder, Engineering Lead, Second Developer, CS & Ops Manager, Product Designer. |
| Source of truth for code | **GitHub** repositories designated as production-related. |
| Infrastructure | **Google Cloud** (GCP) for production and primary workloads unless documented exception. |
| Collaboration | Google Workspace or equivalent, Slack/Chat, project tool (**Jira assumed** for backlog items in this package). |

**Executive decision required:** Confirm registered legal name, PDPA/Thai law applicability matrix, and whether any processing occurs outside Thailand (cross-border transfers).

---

## 3. Product footprint (in scope)

| Surface | In scope |
| --- | --- |
| Customer-facing web platform | Yes |
| LINE Mini App | Yes |
| Internal admin / operations panel | Yes |
| Cashback / reward processing logic | Yes |
| Merchant onboarding and campaign operations | Yes |
| Customer support workflows | Yes |
| CI/CD, build pipelines, IaC tied to production | Yes |

---

## 4. Systems and data in scope (assumptions)

- **Production** environments for the above surfaces.  
- **Staging / pre-prod** used for release validation: in scope when they hold **realistic** or **copy** customer/merchant data (treat as sensitive).  
- **GitHub**: org, repos, branch protection, secrets scanning — in scope.  
- **Critical SaaS**: support desk, email, analytics, monitoring, error tracking, document storage — in scope as **subservice organizations** / vendors (see vendor register).  
- **Endpoints** that can access production or sensitive data: company-managed devices assumed; **BYOD** policy **executive decision required**.

---

## 5. Processes in scope

User onboarding and account support; merchant onboarding; campaign and cashback rule changes; tracking and reconciliation; support and complaints; incidents; changes and releases; access provisioning/deprovisioning; backups and restore tests; vendor onboarding/review; risk review; internal audit; management review; training and acknowledgments; CAPA.

---

## 6. Out of scope (phase 1)

Per agreed boundary:

- Personal founder side projects.  
- Unrelated experimental prototypes with **no** production data and **no** shared credentials.  
- Low-risk sandboxes with **no** sensitive data and **no** connectivity to production secrets.  
- Non-critical non-production tools **only if** listed in an explicit exclusion register with owner sign-off (template: `compliance/07-registers/REG-EXCLUSIONS.md` — to be added with governance approval).

---

## 7. Compliance objectives

| Objective | Target |
| --- | --- |
| Single IMS | One document set, one risk model, unified controls — minimal duplication. |
| Evidence | Recurring, retrievable evidence (tickets, logs, screenshots, exports) mapped to controls. |
| Operability | Weekly/monthly cadences a 5-person team can run. |
| Audit readiness | Clear ownership, SoA, control matrix, and evidence index for SOC 2 / ISO work. |

---

## 8. Integrated standards — scope statement (summary)

| Standard | Scope |
| --- | --- |
| **SOC 2 Type II** | Controls supporting **Security, Availability, Confidentiality, Processing Integrity** for the in-scope system over a defined period (audit period TBD). |
| **ISO 9001** | QMS for design, delivery, and improvement of the digital platform and related operations (not manufacturing). |
| **ISO 27001:2022** | ISMS for protection of information assets supporting the in-scope services, including Annex A as reflected in the Statement of Applicability. |

---

## 9. Interfaces and dependencies (assumptions)

- **Customers** and **merchants** interact via web/LINE; contracts and SLAs **where applicable** are maintained by Ops/Leadership.  
- **Payment / banking partners** (if any): treated as vendors; integration security reviewed per vendor procedure.  
- **Subservice organizations** (e.g., cloud, GitHub, support SaaS): SOC reports / questionnaires collected where available.

---

## 10. Version history

| Version | Date | Author | Changes |
| --- | --- | --- | --- |
| 0.1 | 2026-03-31 | Compliance package (draft) | Initial baseline |

---

## Related artifacts

- `compliance/01-scope/SCOPE-001-scope-statement.md` — formal scope statement (controlled).  
- `compliance/02-context/CTX-001-context-interested-parties.md` — context analysis.  
- `compliance/04-controls/INTEGRATED-CONTROL-MATRIX.md` — control mapping.  
