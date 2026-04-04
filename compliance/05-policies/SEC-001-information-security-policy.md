# Information Security Policy

| Field | Value |
| --- | --- |
| **Document title** | Information Security Policy |
| **Document ID** | SEC-001 |
| **Version** | 0.1 |
| **Artifact type** | Policy |
| **Owner** | Engineering Lead |
| **Approver** | CEO / Founder |
| **Effective date** | TBD |
| **Review date** | +12 months |
| **Classification** | Internal — Confidential |

---

## Purpose

Establish management direction for **protecting** GoGoCash information assets across **web**, **LINE Mini App**, **admin**, **GCP**, **GitHub**, and **critical SaaS**.

---

## Scope

All employees, contractors with access, and **company-controlled** systems processing GoGoCash data. **Vendor** security expectations are referenced in vendor procedure.

---

## Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| CEO | Approves policy; resource allocation for security. |
| Engineering Lead | Implements and operates security controls. |
| All staff | Comply; report incidents; protect credentials. |

---

## Policy statements

### Asset and data protection

1. **Classification** — Data is classified per `SEC-004-data-classification-handling-standard.md` (to be published); **minimum** handling for PII and financial/cashback data.  
2. **Least privilege** — Access granted only for role; reviewed **quarterly** for privileged users.  
3. **Secrets** — No production secrets in git; use **secret manager** / CI secrets (**SEC-005**).  

### Secure development and operations

1. **Change control** — Production changes via **approved** change path (ticket + PR + deploy traceability).  
2. **Vulnerability management** — Dependencies and images scanned; **SLA** by severity (**VULN-001**).  
3. **Logging & monitoring** — Security-relevant events logged; **admin** actions attributable.  

### Incident and continuity

1. **Incidents** — Report without delay; **IRP-001** followed.  
2. **Backups** — Defined RPO/RTO; **restore tests** on cadence.  

### Legal and compliance

1. **PDPA** — Personal data processed lawfully; subprocessors documented.  
2. **Third parties** — Security assessed before onboarding critical vendors.  

---

## Records produced

- Policy acknowledgment log.  
- Annual review note in management review.  

---

## Related controls

ACC-001, CHG-001, SDLC-001, LOG-001, IR-001, VND-001, CNF-001  

---

## Related standards mapping

| Standard | Clause / criteria |
| --- | --- |
| ISO 27001:2022 | 5.2, Annex A themes A.5–A.8 |
| ISO 9001 | 8.5 (where security affects quality of service) |
| SOC 2 | CC6.x, CC7.x, CC8.1 |

---

## Executive decisions required

- [ ] Approved **cryptography** standards for data at rest/in transit (align with GCP defaults + app TLS).  
