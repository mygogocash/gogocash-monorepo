# Risk Management Methodology

| Field | Value |
| --- | --- |
| **Document title** | Risk Management Methodology |
| **Document ID** | RISK-001 |
| **Version** | 0.1 |
| **Artifact type** | Procedure |
| **Owner** | Engineering Lead |
| **Approver** | CEO / Founder |
| **Effective date** | TBD |
| **Review date** | +12 months |
| **Classification** | Internal — Confidential |

---

## Purpose

Define a **simple, auditable** risk model for **ISO 27001** and **integrated** risk treatment supporting **SOC 2** and **ISO 9001** operational risks.

---

## Scope

All in-scope systems, processes, and vendors per `SCOPE-001`. Applies to **information security** and **material operational/service** risks.

---

## Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| CEO | Accepts residual risk above threshold; approves exceptions. |
| Engineering Lead | Maintains methodology, facilitates assessment, owns technical risks. |
| CS & Ops Manager | Owns merchant/support/operational risks. |

---

## Risk scoring model

### Likelihood (L): 1–5

| Score | Description |
| --- | --- |
| 1 | Rare in practice; strong controls |
| 2 | Unlikely in next 12 months |
| 3 | Possible within 12 months |
| 4 | Likely within 12 months |
| 5 | Almost expected without action |

### Impact (I): 1–5

| Score | Description |
| --- | --- |
| 1 | Negligible |
| 2 | Minor |
| 3 | Moderate (customer or ops pain) |
| 4 | Major (breach, major financial/regulatory) |
| 5 | Severe (existential, mass harm, shutdown) |

**Risk score = L × I** (range 1–25)

### Optional impact tags (for analysis)

`confidentiality` | `integrity` | `availability` | `legal/compliance` | `customer trust` | `financial/operational`

---

## Treatment options

| Option | When used |
| --- | --- |
| **Mitigate** | Default — implement controls |
| **Transfer** | Insurance, contract, vendor assumes part |
| **Accept** | Residual risk documented; CEO approval if score ≥ **12** (threshold — tune) |
| **Avoid** | Stop activity or exclude from scope |

**Executive decision:** Confirm **risk acceptance threshold** (e.g., no acceptance >15 without board/CEO + record).

---

## Procedure

1. **Identify** risks from threats, incidents, audits, new features.  
2. **Score** L and I; add tags.  
3. **Record** in `REG-RISK-001-risk-register.md`.  
4. **Treat** — link to control IDs from `INTEGRATED-CONTROL-MATRIX.md`.  
5. **Review** quarterly; **ad hoc** after incidents or major releases.  

---

## Records produced

- Risk register (master).  
- Risk treatment plan rows.  
- Exception register for accepted risks.  

---

## Related controls

RSK-001, RSK-002, RSK-003  

---

## Related standards mapping

| Standard | Clause |
| --- | --- |
| ISO 9001 | 6.1 |
| ISO 27001:2022 | 6.1.2, 6.1.3 |
| SOC 2 | CC3.1, CC3.2, CC3.3 |
