# 12) Implementation Backlog — Notion + Workstreams

---

## Workstream summary

| Workstream | Objective | Owner role | Dependencies | Success criteria | Sequence |
| --- | --- | --- | --- | --- | --- |
| Governance and Scope | Boundaries + approvals | CEO | — | Charter/scope approved | 1 |
| Notion Workspace Buildout | 19 DBs, relations, dashboards | Eng Lead | Notion access | All staff can log tasks | 1 |
| Document Control | Policies live + review dates | Eng Lead | Buildout | 100% core POL in Approved | 2 |
| Risk and Controls | Register + matrix in Notion | Eng Lead | Buildout | Risks linked to controls | 2 |
| Security Foundations | MFA, IAM, logging | Eng Lead | GCP/GitHub | Evidence items green | 3 |
| Secure Engineering | CI, PR, traceability | Eng Lead | GitHub | Sample trace packs | 3 |
| Vendor Governance | Critical vendors reviewed | CEO | Vendor DB | Top 5 done | 3–4 |
| Quality Operations | Complaints + NC + KPI | CS Ops | DBs | Weekly triage live | 3 |
| Incident and CAPA | IR + CAPA discipline | Eng+CEO | Templates | P1 runbook used | 3 |
| Audit Readiness | Evidence index + % | CS Ops | Evidence workflow | Monthly checklist | 4 |
| Training and Awareness | Ack + security training | CS Ops | Approved policies | Log 100% | 4 |

---

## Engineering tasks (detailed)

| Title | Business reason | Security/quality reason | Implementation notes | Dependencies | Acceptance criteria | Evidence produced | Controls | Standards |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Centralized authentication strategy | Reduce account risk | ISO A.5.17, SOC CC6.1 | Document IdP + app flow in Notion | — | Architecture page approved | Doc + diagram | CTRL-ACC | 27001 5.17 |
| MFA enforcement (GCP, GitHub) | Stop account takeover | CC6.1 | Org policies; break-glass doc | Admin access | MFA 100% admins | Export/screenshot | CTRL-ACC-001 | SOC2 CC6.1 |
| RBAC / least privilege | Limit blast radius | CC6.1 | Role matrix in Systems/Access | IAM inventory | No shared prod users | IAM export | CTRL-ACC-001 | 27001 5.15–18 |
| Privileged access handling | Audit admin acts | CC6.2 | PAM or named admin + logging | Logging | Admin actions in logs | Log query | CTRL-ACC-004 | CC6.2 |
| Branch protection | Stop direct to main | CC8.1 | Rulesets, required reviewers | GitHub | Main protected | Settings JSON/export | CTRL-SDLC-002 | CC8.1 |
| PR review rules | Code quality + security | CC8.1 | CODEOWNERS | Branch protection | 2 eyes on hot paths | PR sample | CTRL-SDLC-001 | 8.28 |
| Ticket-to-deploy traceability | Audit trail | PI1 | Link ticket in PR template | Issue tracker | 5 samples chained | Links archive | CTRL-CHG-001 | PI1 |
| Change approval flow | Governance | CC8.1 | Notion Changes DB | — | 100% prod via Change row | Change IDs | CTRL-CHG-001 | CC8.1 |
| Emergency change flow | Still controlled | CC8.1 | Retro template | IR | Retro within 48h | Post-incident doc | CTRL-CHG-002 | CC8.1 |
| Dependency scanning | Supply chain | CC7.1 | Dependabot/Snyk | CI | On default branch | Report | CTRL-VUL-001 | 8.8 |
| SAST | Code vulns | CC7.1 | CodeQL or equivalent | CI | High findings triaged | Report | CTRL-SDLC-001 | 8.28 |
| Secret scanning | Leak prevention | CC6.1 | GitHub secret scan | repos | Zero critical secrets | Scan output | CTRL-SEC-001 | 8.3 |
| Centralized audit logging | Forensics | CC7.2 | Cloud Logging sinks | GCP | Retention met | Export | CTRL-LOG-001 | 8.15 |
| Admin activity logging | Attribution | CC6.2 | App-level admin audit | feature | Sample events | CSV | CTRL-LOG-001 | 8.15 |
| Backup automation | RPO | A1.2 | Scheduled jobs | BCP doc | Success alerts | Job log | CTRL-BKP-001 | 8.13 |
| Restore testing | Prove recovery | A1.2 | Quarterly to staging | backups | Test record | Restore log | CTRL-BKP-002 | 8.14 |
| Monitoring and alerting | Detect issues | A1.2 | Uptime + SLO | Oncall | Alert runbook | Incident samples | CTRL-MON | 8.16 |
| Vulnerability remediation SLA | Close gaps | CC7.1 | SLA table by severity | triage | Dashboard | SLA report | CTRL-VUL-001 | 8.8 |
| Evidence export automation | Efficiency | CC2.1 | Script monthly IAM/GCP | APIs | Artifact in Drive | Script output | CTRL-EVD-001 | CC2.1 |

---

## Operations and leadership tasks

| Title | Owner role | Objective | Deliverables | Acceptance criteria | Evidence | Controls | Standards |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Scope approval | CEO | Clear IMS boundary | Signed scope page | Exclusions listed | PDF | GOV-001 | 4.3 |
| Policy approval | CEO | Effective policies | Approved POL rows | All core POL Approved | Notion history | DOC-001 | 7.5 |
| Document version control | Eng Lead | No drift | Version field + git | Match Notion↔git | PR | DOC-001 | 7.5 |
| Risk review cadence | Eng Lead | Living risks | Monthly meeting | Notes page | MR input | RSK-001 | 6.1 |
| Training rollout | CS Ops | Competence | Training DB full | 100% ack | Training Records | TRN-001 | 7.2 |
| Complaint workflow rollout | CS Ops | ISO 8.2 | Fields + SLA | All complaints in DB | Complaints rows | CX-001 | 8.2 |
| Vendor review process | CEO | Third-party risk | Review calendar | Critical annual | Vendor rows | VND-001 | 8.4 |
| Onboarding/offboarding JML | CS Ops | Access hygiene | JML register | Same-day offboard test | JML log | ACC-003 | 5.16 |
| Internal audit schedule | CEO | Assurance | Audit plan page | 2× year scheduled | Audits DB | AUD-001 | 9.2 |
| Management review meetings | CEO | Leadership | Quarterly MR | Minutes + tasks | MR DB | MR-001 | 9.3 |
| KPI review routine | CEO | Objectives | Monthly KPI update | KPI current | KPI DB | KPI-001 | 9.1 |
| CAPA governance | CEO | Fix root causes | Weekly CAPA review | Aging managed | CAPA DB | CAPA-001 | 10.2 |
| Evidence ownership assignment | CS Ops | Audit readiness | Owner on each Evidence | No blank owners | Evidence DB | EVD-001 | 9.1 |

---

## Notion-specific build tasks (Tasks DB)

| Task ID | Title | Priority | Due phase | Related control |
| --- | --- | --- | --- | --- |
| NB-01 | Create 19 databases with properties | P0 | Week 1 | CTRL-EVD |
| NB-02 | Wire two-way relations Documents↔Controls | P0 | Week 1 | CTRL-DOC |
| NB-03 | Import Controls CSV | P0 | Week 2 | All |
| NB-04 | Build CEO dashboard page | P1 | Week 3 | MR-001 |
| NB-05 | Build Audit readiness dashboard | P1 | Week 3 | EVD-001 |
| NB-06 | Template gallery for Policy/Procedure | P2 | Week 4 | DOC-001 |

---

## Related

`compliance/JIRA_BACKLOG.md`, `16-SAMPLE-DATA.md`  
