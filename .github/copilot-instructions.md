# Copilot Coding Agent Instructions

These instructions apply to all AI coding agents (GitHub Copilot, Copilot Workspace, etc.) working in this repository.

---

## Documentation requirement

**Every PR that introduces a non-trivial feature, architectural change, or new pattern must include a markdown document in `docs/adr/`.**

### PR and ADR ID convention (mandatory)

- Every PR must use a time-based ID in the title: `YYYYMMDD-HHmm`.
- Every ADR created for that PR must use the exact same ID.
- The branch created for that PR must start with the exact same ID.
- Timezone is mandatory: `Europe/Budapest` (Central European time, including DST).
- Generate the ID once per PR and reuse it consistently.
- PR title format: `[YYYYMMDD-HHmm] <short title>`.
- Branch format: `YYYYMMDD-HHmm-short-kebab-title`.
- ADR filename format: `YYYYMMDD-HHmm-short-kebab-title.md`.

Example shared ID: `20260424-1730`

### What qualifies

- New services, abstractions, or modules
- Changes to authentication, storage, or security behavior
- New environment flags or configuration options
- Changes to the build or deployment pipeline
- Any decision that future contributors would need to understand

### What does not need an ADR

- Bug fixes with no design decisions
- Dependency version bumps
- Pure style/formatting changes

---

## ADR format

Name the file `YYYYMMDD-HHmm-short-kebab-title.md` using the same `YYYYMMDD-HHmm` ID as the PR title (timezone: `Europe/Budapest`).

Use the following sections. Keep each section concise — the goal is clarity, not length.

```markdown
# ADR-YYYYMMDD-HHmm: Title

**Status:** Accepted | Superseded by ADR-YYYYMMDD-HHmm | Deprecated
**Date:** YYYY-MM-DD

---

## Context

One paragraph: what problem does this solve and why was action needed?

---

## Decision

What was decided and why. Include a table of new flags/APIs/files if applicable.
State key design choices explicitly (what was chosen *and* what was deliberately rejected).

---

## Implementation

Tables listing new and modified files with a one-line description of each change.

---

## Usage

Short, copy-pasteable examples showing how to use or configure the feature.

---

## Trade-offs

Honest notes on limitations, risks, or deferred decisions.
```

---

## General coding conventions

### Frontend (`projects/frontend/`)

- The frontend is a **browser-only Angular app**. Do not introduce server-side dependencies inside `projects/frontend/`.
- Use Angular **standalone components** (no NgModules).
- Use Angular **signals** (`signal`, `computed`) for reactive state.
- Tokens and secrets must **never** be written to browser storage. Only non-sensitive metadata may be persisted.
- Prefer `sessionStorage` over `localStorage`. Only use `localStorage` when explicitly required and documented.
- Follow the existing `AuthStorageService` pattern for any new browser storage needs.
- Run `npm run build` and `npm test` before submitting a PR.

### Backend (`projects/backend/`)

> **Exception to the browser-only rule:** The `projects/backend/` directory contains a Spring Boot microservice. This is the only place where server-side code lives. See ADR-20260501-2209 for the rationale.

- Use **Java 21** and **Spring Boot 3.x**.
- Use **Maven** as the build tool (`pom.xml` at `projects/backend/`).
- Use **Spring Boot Actuator** (`/actuator/health`) as the Cloud Run liveness/readiness probe endpoint.
- Secrets (Google client credentials, JWT signing keys) must come from **environment variables** or **Google Secret Manager** — never hardcoded or committed.
- The backend is deployed as a **stateless container on Google Cloud Run**. Keep the service horizontally scalable: avoid in-process state that cannot be reconstructed from a cold start.
- Configure CORS explicitly to allow only the known frontend origin(s). Do not use `allowedOrigins("*")` in production.
- Every new endpoint must require authentication by default. Explicitly opt out only for health checks and public paths.
- Run `./mvnw verify` before submitting a PR that touches backend code.
