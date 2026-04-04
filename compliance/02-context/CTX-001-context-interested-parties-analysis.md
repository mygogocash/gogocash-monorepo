# Context and Interested Parties Analysis

| Field | Value |
| --- | --- |
| **Document title** | Context and Interested Parties Analysis |
| **Document ID** | CTX-001 |
| **Version** | 0.1 |
| **Artifact type** | Record |
| **Owner** | CEO / Founder |
| **Approver** | CEO / Founder |
| **Effective date** | TBD |
| **Review date** | +12 months |
| **Classification** | Internal — Confidential |

---

## Purpose

Meet **ISO 9001 4.1 / 4.2** and **ISO 27001 4.1 / 4.2** by documenting organizational context and **interested parties** with their **needs and expectations** relevant to the IMS.

---

## Scope

GoGoCash digital cashback platform operating in **Thailand**, small team, cloud-first.

---

## Roles and responsibilities

| Role | Responsibility |
| --- | --- |
| CEO | Approves context analysis and interested party list. |
| CS & Ops Manager | Maintains customer/merchant/regulator inputs. |
| Engineering Lead | Maintains technical and dependency context. |

---

## Organizational context (internal)

| Factor | Description |
| --- | --- |
| Mission | Grow a trusted cashback/rewards platform for Thai shoppers and merchants. |
| Capabilities | Small engineering team; heavy reliance on **GCP**, **GitHub**, SaaS for support/analytics. |
| Culture | Lean; async documentation; high trust with verification via logs and PRs. |

---

## External context

| Factor | Description |
| --- | --- |
| Market | Competitive ecommerce rewards; LINE as key channel. |
| Legal / regulatory | **Thailand PDPA** and consumer protection expectations (**legal to detail**). |
| Technology | Cloud-native; dependency on global SaaS and open-source. |
| Cyber threat | Account takeover, fraud, misconfiguration, supply-chain. |

---

## Interested parties

| Party | Needs and expectations | How addressed |
| --- | --- | --- |
| **Customers (shoppers)** | Accurate cashback, privacy, responsive support | PI controls, PDPA, OPS-003 |
| **Merchants** | Fair campaigns, timely onboarding, reporting | OPS-001, merchant comms |
| **CEO / Board** | Growth, risk visibility, audit readiness | MR, KPI, risk register |
| **Employees** | Clear roles, safe tools, training | ORG-001, TRN-001 |
| **Cloud / SaaS vendors** | Contractual security, availability | VND-001, vendor register |
| **Regulators (as applicable)** | Lawful processing, breach notification | IRP-001, legal counsel |
| **Payment / banking partners (if any)** | Integration security, reconciliation | Vendor reviews, technical controls |

---

## Procedure / analysis statements

1. **Annual review** minimum; **ad hoc** update when launching new data processing or new market.  
2. **Interested party changes** (e.g., new regulator) trigger **risk register** and **SoA** update.  

---

## Records produced

- This document (version controlled).  
- Updates logged in management review.  

---

## Related controls

GOV-001, RSK-001, MR-001  

---

## Related standards mapping

| Standard | Clause |
| --- | --- |
| ISO 9001 | 4.1, 4.2 |
| ISO 27001:2022 | 4.1, 4.2 |
| SOC 2 | CC2.1 (context for commitments) |

---

## Executive decisions required

- [ ] Legal sign-off on **PDPA** processing activities list.  
