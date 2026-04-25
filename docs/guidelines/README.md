# Development Guidelines

This directory contains shared development guidelines that apply across all subprojects in this monorepo.

## Contents

| File | Topic |
|------|-------|
| *(add guideline docs here)* | |

## Suggested topics

- **Coding standards** — language-specific style guides per subproject
- **Git workflow** — branching strategy, commit message conventions, PR process
- **ADR process** — how and when to write Architecture Decision Records (see `../adr/`)
- **Testing policy** — expected test coverage, test naming conventions
- **Security policy** — credential handling, secrets management, vulnerability disclosure
- **CI/CD** — pipeline overview, environment configuration, deployment process

## ADR conventions (summary)

Every non-trivial feature or architectural change must be accompanied by an ADR in `docs/adr/`.

- **Filename format:** `YYYYMMDD-HHmm-short-kebab-title.md`
- **Timezone:** Europe/Budapest (CET/CEST)
- **PR title format:** `[YYYYMMDD-HHmm] Short title`
- **Branch format:** `YYYYMMDD-HHmm-short-kebab-title`

See `.github/copilot-instructions.md` for the full ADR template and rules.
