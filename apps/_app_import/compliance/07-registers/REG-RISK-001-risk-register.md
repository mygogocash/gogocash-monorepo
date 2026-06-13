# Risk Register — GoGoCash

**Artifact type:** Record (register)  
**Document ID:** REG-RISK-001  
**Version:** 0.1  
**Owner:** Engineering Lead  
**Classification:** Internal — Confidential  
**Review cadence:** Quarterly  

## Column key

| Column | Description |
| --- | --- |
| Risk ID | Unique ID |
| Date | Identified / last update |
| Owner | Named owner |
| Status | Open / Treating / Accepted / Closed |
| L | Likelihood 1–5 |
| I | Impact 1–5 |
| Score | L × I |
| Tags | confidentiality, integrity, availability, legal/compliance, customer trust, financial/operational |
| Treatment | mitigate / accept / transfer / avoid |
| Related controls | CTRL IDs |
| Due | Target treatment date |
| Evidence link | Ticket, doc, or export |
| Reviewer | Who validated |

---

| Risk ID | Description | Owner | Status | L | I | Score | Tags | Treatment | Related controls | Due | Evidence link | Reviewer | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | Unauthorized admin access to production | Eng Lead | Open | 3 | 5 | 15 | conf, integ, avail, trust | mitigate | ACC-001, ACC-002, ACC-004 | TBD | GCP IAM export | CEO | MFA rollout |
| R-002 | Privilege creep (stale broad roles) | Eng Lead | Open | 4 | 3 | 12 | conf, integ | mitigate | ACC-001, ACC-003 | TBD | Quarterly review ticket | CEO | — |
| R-003 | Incomplete offboarding (ex-employee access) | CS Ops | Open | 3 | 4 | 12 | conf, trust | mitigate | ACC-003 | TBD | JML log | Eng Lead | — |
| R-004 | Cashback miscalculation / double credit | Eng Lead | Open | 3 | 5 | 15 | integ, fin, trust | mitigate | PI-001, REL-001 | TBD | Recon report | CEO | — |
| R-005 | Merchant onboarding errors (wrong rates/terms) | CS Ops | Open | 3 | 4 | 12 | integ, trust, legal | mitigate | PI-002, OPS-001 | TBD | Onboarding checklist | CEO | — |
| R-006 | Undocumented emergency changes | Eng Lead | Open | 4 | 3 | 12 | integ, avail | mitigate | CHG-002 | TBD | Incident + change link | CS Ops | — |
| R-007 | Missing or incomplete audit logs | Eng Lead | Open | 3 | 4 | 12 | integ, legal | mitigate | LOG-001 | TBD | Log sample | Eng Lead | — |
| R-008 | Weak backup coverage (wrong resource) | Eng Lead | Open | 2 | 5 | 10 | avail, fin | mitigate | BKP-001 | TBD | Backup scope doc | Eng Lead | — |
| R-009 | Failed restore / untested recovery | Eng Lead | Open | 2 | 5 | 10 | avail | mitigate | BKP-002 | TBD | Restore test log | CEO | — |
| R-010 | Exposed secrets in repo or CI | Eng Lead | Open | 3 | 5 | 15 | conf, trust | mitigate | SEC-001, SDLC-003 | TBD | Secret scan reports | Eng Lead | — |
| R-011 | Cloud misconfiguration (public bucket, open SG) | Eng Lead | Open | 3 | 5 | 15 | conf, avail | mitigate | SDLC-001, MON-001 | TBD | Config audit | Eng Lead | — |
| R-012 | Unreviewed third-party vendor | CEO | Open | 3 | 4 | 12 | conf, legal, trust | mitigate | VND-001 | TBD | Vendor file | Eng Lead | — |
| R-013 | Repeated customer complaints on cashback | CS Ops | Open | 3 | 3 | 9 | trust, fin | mitigate | CX-001, CAP-001 | TBD | Complaint trend | CEO | — |
| R-014 | Unresolved nonconforming outputs (bad releases) | Eng Lead | Open | 3 | 4 | 12 | integ, trust | mitigate | NC-001 | TBD | NC log | CEO | — |
| R-015 | Missing evidence for audits | CS Ops | Open | 3 | 4 | 12 | legal, trust | mitigate | EVD-001 | TBD | Evidence tracker | CEO | — |
| R-016 | Poor change approval discipline | Eng Lead | Open | 4 | 3 | 12 | integ | mitigate | CHG-001 | TBD | PR/ticket samples | Eng Lead | — |
| R-017 | Lack of training / policy acknowledgment | CS Ops | Open | 3 | 3 | 9 | legal, trust | mitigate | TRN-001 | TBD | Ack log | CEO | — |
| R-018 | Unsupported or vulnerable OSS dependency | Eng Lead | Open | 4 | 3 | 12 | integ, avail | mitigate | VUL-001, SDLC-003 | TBD | Dep scan | Eng Lead | — |
| R-019 | Account takeover (user or merchant) | Eng Lead | Open | 3 | 4 | 12 | conf, trust | mitigate | ACC-002, LOG-001 | TBD | Auth metrics | Eng Lead | — |
| R-020 | Insider abuse of support tools | CS Ops | Open | 2 | 4 | 8 | conf, trust | mitigate | ACC-001, LOG-001 | TBD | Support audit sample | CEO | — |
| R-021 | Data residency / cross-border transfer breach | CEO | Open | 2 | 5 | 10 | legal, trust | mitigate | CNF-001 | TBD | Legal memo | Legal | **Executive decision** |
| R-022 | LINE Mini App platform dependency outage | Eng Lead | Open | 3 | 3 | 9 | avail, trust | mitigate | AVL-001 | TBD | SLO report | CS Ops | — |
| R-023 | Reconciliation delay causing user disputes | CS Ops | Open | 3 | 3 | 9 | fin, trust | mitigate | PI-001 | TBD | Recon SLA | CEO | — |
| R-024 | Fraud / abuse of referral or reward rules | Eng Lead | Open | 3 | 4 | 12 | fin, trust | mitigate | PI-001, MON-001 | TBD | Fraud metrics | CEO | — |
| R-025 | Penetration test or bug bounty finding unpatched | Eng Lead | Open | 2 | 4 | 8 | conf, trust | mitigate | VUL-001 | TBD | PT report tracking | CEO | Optional PT |
| R-026 | Email / phishing leading to credential loss | CS Ops | Open | 3 | 3 | 9 | conf | mitigate | TRN-001, SEC-001 | TBD | Training record | CEO | — |
| R-027 | Contractor access not in JML process | CS Ops | Open | 3 | 3 | 9 | conf | mitigate | ACC-003 | TBD | Contractor list | Eng Lead | — |

---

## Treatment summary

| Priority | Count (approx.) | Action |
| --- | --- | --- |
| Score ≥ 15 | 5 | Mitigation plans within 90 days |
| Score 12–14 | Many | Quarterly review; owners update due dates |

---

## Related documents

`RISK-001-risk-management-methodology.md`, `INTEGRATED-CONTROL-MATRIX.md`
