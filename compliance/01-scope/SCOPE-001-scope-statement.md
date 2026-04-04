# Scope Statement — Integrated Management System

| Field | Value |
| --- | --- |
| **Document title** | Scope Statement |
| **Document ID** | SCOPE-001 |
| **Version** | 0.1 |
| **Artifact type** | Policy |
| **Owner** | CEO / Founder |
| **Approver** | CEO / Founder |
| **Effective date** | TBD |
| **Review date** | +12 months or on material change |
| **Classification** | Internal — Confidential |

---

## Purpose

Define the **boundaries** of GoGoCash’s IMS for **ISO 9001**, **ISO 27001:2022**, and **SOC 2 Type II** evidence collection.

---

## Scope — products and services

**In scope:** Design, development, operation, and support of the GoGoCash **cashback / rewards** platform, including:

- Customer web application  
- LINE Mini App  
- Internal admin and merchant operations interfaces  
- Cashback calculation, tracking, and reconciliation processes  
- Merchant onboarding and campaign configuration (as operated by GoGoCash)  

**Geography:** Thailand-centric operations; **cross-border** processing **flag for legal review**.

---

## Scope — physical and logical boundaries

| Boundary | In scope |
| --- | --- |
| GoGoCash-controlled GCP projects (prod, staging as documented) | Yes |
| GitHub org/repos for production systems | Yes |
| Design files and product docs in company workspace | Yes |
| Employee devices used to access production or sensitive data | Yes (assumption: company-managed or approved BYOD **— executive decision**) |
| Founder personal projects | **Out of scope** (phase 1) |

---

## Scope — management system standards

| Standard | Applicability |
| --- | --- |
| **ISO 9001:2015** | Full QMS for software and digital service delivery (excluding manufacturing). |
| **ISO/IEC 27001:2022** | ISMS for information assets supporting in-scope services; Annex A via SoA. |
| **SOC 2 Type II** | Trust Services Criteria: **Security**, **Availability**, **Confidentiality**, **Processing Integrity** for the in-scope system over an audit period. |

---

## Exclusions (phase 1)

Documented exclusions must be listed in `compliance/07-registers/REG-EXC-001-exception-register.md` or a dedicated **exclusion register** once approved. Default exclusions:

- Non-production sandboxes with **no** sensitive data and **no** production credentials.  
- Experimental apps not connected to production data stores.  

**Changing exclusions** requires CEO approval.

---

## Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| CEO | Approves scope and exclusions. |
| Engineering Lead | Maintains technical scope (systems inventory alignment). |
| CS & Ops Manager | Aligns operational scope (support tools, merchant SOPs). |

---

## Records produced

- Approved PDF/version of this scope statement.  
- System inventory (`REG-SYS-001`) aligned to this scope.  

---

## Related controls

GOV-001, GOV-002, RSK-001  

---

## Related standards mapping

| Standard | Clause |
| --- | --- |
| ISO 9001 | 4.3 |
| ISO 27001:2022 | 4.3 |
| SOC 2 | System description boundary |

---

## Executive decisions required

- [ ] Confirm **legal entity** name and registered address for certificates and contracts.  
- [ ] Approve **BYOD** rules or mandate company devices for prod access.  
