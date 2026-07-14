# Security Policy

## Supported scope

Security fixes are maintained for the current default branch, currently
deployed GoGoCash services, and current mobile releases. Obsolete branches,
historical builds, local experiments, and generated dependency copies are not
patched directly; an issue in a generated dependency is handled through the
owning package and its pinned version.

Reports about staging and development are welcome when the same weakness could
affect production, user data, credentials, money movement, or deployment
infrastructure.

## Report a vulnerability privately

Use GitHub's [private vulnerability reporting form](https://github.com/mygogocash/gogocash-monorepo/security/advisories/new).
Do not open a public issue for an undisclosed vulnerability, and do not include
live credentials, personal data, or access tokens in a report.

Include, when available:

- the affected service, app, route, and commit or build;
- the security impact and required attacker access;
- minimal, safe reproduction steps;
- whether staging or production is affected; and
- any suggested mitigation or relevant upstream advisory.

The maintainers will triage the report in GitHub, request clarification there
if needed, and coordinate disclosure after a fix or mitigation is ready.

## Engineering guidance

Repository-specific controls, security invariants, and the historical risk
register are maintained in [`SECURITY_HARDENING.md`](SECURITY_HARDENING.md).
