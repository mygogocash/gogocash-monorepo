# Statement of Applicability (SoA) — ISO/IEC 27001:2022

**Artifact type:** Record  
**Document ID:** ISMS-001-SoA  
**Version:** 0.1  
**Owner:** Engineering Lead  
**Approver:** CEO / Founder  
**Classification:** Internal — Confidential  

**Legend:** A = Applicable, N = Not applicable, P = Partially implemented  

---

## Organizational controls (5.1–5.37 excerpt — startup-practical)

| Annex A ref | Title | A/N/P | Justification | Linked risks | Implementation | Owner | Gap / target date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 5.1 | Policies for information security | A | IMS requires policy set | R-017 | SEC-001, DOC-001 | Eng Lead | PDPA detail TBD |
| 5.2 | Information security roles | A | RACI defined | R-002 | ORG-001 | CEO | — |
| 5.3 | Segregation of duties | P | Small team — compensating (PR review) | R-016 | ORG-001, CHG-001 | Eng Lead | Document compensating controls by Q2 |
| 5.10 | Acceptable use | A | Expected for endpoints | R-026 | Acceptable use (add doc) | CEO | Draft AUP by +90d |
| 5.15 | Access control | A | Core | R-001–R-003 | SEC-002 (planned) | Eng Lead | MFA enforcement |
| 5.16 | Identity management | A | JML | R-003 | REG-HR-001 | CS Ops | Automate where possible |
| 5.17 | Authentication information | A | MFA, passwords | R-019 | ACC-002 | Eng Lead | — |
| 5.23 | Information security for ICT supply chain | A | SaaS vendors | R-012 | VND-001 | CEO | SOC2 for top 5 |
| 5.24 | Incident management planning | A | IRP | R-006 | IRP-001 | Eng Lead | Tabletop Q2 |
| 5.25 | Assessment and decision on info security events | A | Triage | R-007 | IRP-001, LOG-001 | Eng Lead | Runbook refinement |
| 5.28 | Collection of evidence | A | Audits | R-015 | EVD-001 | CS Ops | Monthly checklist |
| 5.31 | Legal, statutory, regulatory | P | PDPA | R-021 | Legal review | CEO | **Legal sign-off** |
| 5.33 | Records of processing (PDPA alignment) | P | Data inventory | R-021 | REG-DATA-001 | CS Ops | Complete inventory |

## People controls (6.1–6.8 excerpt)

| Annex A ref | Title | A/N/P | Justification | Risks | Implementation | Owner | Gap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6.1 | Screening | P | Small hiring | R-020 | HR process | CEO | Formalize if hiring |
| 6.3 | Training | A | Awareness | R-017 | QMS-006 | CS Ops | Annual |

## Physical (7.1–7.5)

| Annex A ref | Title | A/N/P | Justification |
| --- | --- | --- | --- |
| 7.1 | Physical security perimeters | P | Mostly cloud; office optional |
| 7.4 | Physical security monitoring | N | No owned DC |

## Technological (8.1–8.34 excerpt)

| Annex A ref | Title | A/N/P | Risks | Implementation | Owner | Gap |
| --- | --- | --- | --- | --- | --- | --- |
| 8.1 | User endpoint devices | A | R-026 | MDM TBD | CEO | **BYOD decision** |
| 8.2 | Privileged access | A | R-001 | IAM, break-glass | Eng Lead | Logging proof |
| 8.3 | Restriction of software | P | R-018 | Lockfiles, reviews | Eng Lead | Allowlist optional |
| 8.5 | Secure authentication | A | R-019 | MFA | Eng Lead | — |
| 8.8 | Management of technical vulnerabilities | A | R-018 | VULN-001 | Eng Lead | SLA dashboard |
| 8.9 | Configuration management | A | R-011 | IaC, reviews | Eng Lead | — |
| 8.11 | Data masking | P | Non-prod | Staging data rules | Eng Lead | Anonymize copies |
| 8.12 | Data leakage prevention | N/P | Email DLP optional | — | — | Low priority |
| 8.15 | Logging | A | R-007 | SEC-006 | Eng Lead | — |
| 8.16 | Monitoring | A | R-011 | MON-001 | Eng Lead | — |
| 8.23 | Web filtering | N | Not primary control for cloud team | — | — | — |
| 8.24 | Use of cryptography | A | R-010 | TLS, KMS | Eng Lead | Document choices |
| 8.26 | Secure development life cycle | A | R-014 | SDLC-001 | Eng Lead | — |
| 8.28 | Secure coding | A | R-014 | PR reviews | Eng Lead | — |
| 8.31 | Separation of dev/test/prod | A | R-014 | Env isolation | Eng Lead | — |
| 8.32 | Change management | A | R-006 | CHG-001 | Eng Lead | — |

---

**Note:** Full Annex A row-by-row can be exported from this table; add N/A rows with justification for auditor. **Not applicable** must still be justified (e.g., no physical DC).

---

## Related controls

See `INTEGRATED-CONTROL-MATRIX.md`; risk links in `REG-RISK-001`.
