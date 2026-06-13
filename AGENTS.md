# Repository Agent Instructions

These instructions apply to AI coding agents working in this repository.

## Shared Skill Discovery

Before starting work, inspect `docs/agent-skills/` for any skill whose `SKILL.md` frontmatter description matches the task. Use matching skills even if the current AI platform has its own skill or instruction mechanism.

Canonical shared skills live in:

```text
docs/agent-skills/<skill-name>/SKILL.md
```

Platform-specific folders such as `.codex/skills/` are adapters for tool discovery only. They must point back to the canonical skill in `docs/agent-skills/` rather than duplicating long-lived guidance.

Current shared skills:

| Skill | Use when |
|---|---|
| `docs/agent-skills/gcp-onboarding/SKILL.md` | Changes touch GCP, OAuth, Cloud Run, Secret Manager, GitHub Pages deployment, backend environment variables, or frontend environment flags. |
| `docs/agent-skills/stitch-ux-design/SKILL.md` | Changes touch frontend UI, navigation, layouts, screens, components, CSS, visual states, responsive behavior, or user-facing workflows. |

## Documentation

Every non-trivial feature, architectural change, or new pattern needs an ADR in `docs/adr/`.

Use the Europe/Budapest time-based ID convention:

- PR title: `[YYYYMMDD-HHmm] <short title>`
- Branch: `YYYYMMDD-HHmm-short-kebab-title`
- ADR: `docs/adr/YYYYMMDD-HHmm-short-kebab-title.md`

When setup or onboarding changes, update the relevant docs under `docs/guidelines/`.

## Frontend

- Frontend code lives in `projects/frontend/`.
- Use Angular standalone components.
- Use Angular Signals for UI-facing reactive state.
- Keep browser tokens and secrets out of persistent storage.
- Follow existing auth, storage, and repository boundaries.
- Run `npm run build` and `npm test` when practical for frontend changes.

## Backend

- Backend code lives in `projects/backend/`.
- Use Java 21, Spring Boot 3.x, and Gradle.
- Keep secrets in environment variables or Google Secret Manager, never source code.
- New endpoints require authentication by default, except explicit public health or callback paths.
- Run `./gradlew build` when practical for backend changes.
