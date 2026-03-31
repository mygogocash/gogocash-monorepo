# GoGoCash — Notion-First Integrated Management System (Package)

This folder is the **implementation design** for running **SOC 2 Type II**, **ISO 9001**, and **ISO 27001:2022** with **Notion** as the command center, plus **GitHub**, **GCP**, and **Shared Drive** for evidence artifacts.

## Start here

1. Read `INDEX.md` for the deliverable map.  
2. **Assumptions:** `01-ASSUMPTIONS-AND-SCOPE.md`  
3. **Build Notion:** `04-DATABASE-SCHEMAS.md` → create 19 databases → `05-RELATIONS-AND-ROLLUPS.md`  
4. **Seed data:** `16-SAMPLE-DATA.md`  
5. **Policies:** `documents/00-DOCUMENT-INDEX-NOTION.md` + draft bundles A/B/C  

## Repo integration

- `compliance/` — markdown mirror of policies and **Integrated Control Matrix**  
- `compliance/07-registers/REG-RISK-001-risk-register.md` — import seeds into **Risks**  
- `compliance/15-iso27001/ISMS-001-statement-of-applicability-2022.md` — SoA reference  

## Operating model

| System | Role |
| --- | --- |
| Notion | Registers, workflows, dashboards, evidence tracking |
| GitHub | Code, PRs, CI evidence |
| GCP | Infra, logs, backups |
| Drive | PDFs, exports, auditor packages |
