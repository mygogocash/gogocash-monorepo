# 15) Open Assumptions and Decisions — GoGoCash IMS

**Artifact type:** Record  

---

## Assumptions (validate)

| ID | Assumption | Implication if wrong |
| --- | --- | --- |
| A-01 | Notion Business/Enterprise available for permissions | Need alternate IMS tool |
| A-02 | CEO can approve policies within 10 business days | Delays effective dates |
| A-03 | GitHub + GCP remain production platforms | SoA and controls must change |
| A-04 | Thailand PDPA applies; no EU GDPR primary | Privacy doc scope differs |
| A-05 | Team stays ~5 FTE | Cadence must shrink further if smaller |

---

## Decisions requiring human approval

| ID | Decision | Options | Recommended owner | Status |
| --- | --- | --- | --- | --- |
| D-01 | Legal entity name on certificates | As registered | CEO | Open |
| D-02 | BYOD allowed for prod access | Yes / No / MDM required | CEO | Open |
| D-03 | Notion as official record for incidents vs Jira | Notion+ticket link / Jira canonical | CEO+Eng | Open |
| D-04 | SOC 2 audit period start month | Month X Year Y | CEO | Open |
| D-05 | ISO certification vs self-assessment Year 1 | Cert / defer | CEO | Open |
| D-06 | Risk acceptance threshold (residual score) | e.g. ≤12 only | CEO | Open |
| D-07 | Critical vendor definition | Top N by spend vs data | CEO | Open |
| D-08 | Customer PII in Notion | Forbidden vs minimal fields | CEO+Legal | **Forbidden recommended** |

---

## Open gaps (operational)

| Gap | Mitigation | Owner |
| --- | --- | --- |
| SAST not deployed | Task in backlog | Eng Lead |
| MDM absent | BYOD decision | CEO |
| Data inventory incomplete | REG-DATA build | CS Ops |

---

## Related

`compliance/GAPS_AND_DECISIONS.md`
