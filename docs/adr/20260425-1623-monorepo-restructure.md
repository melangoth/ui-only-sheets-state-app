# ADR-20260425-1623: Convert repository to monorepo

**Status:** Accepted
**Date:** 2026-04-25

---

## Context

The repository started as a single Angular SPA. A Spring Boot backend is planned for a future iteration. Keeping both in the same repository while maintaining independent build/test/deploy lifecycles requires a clear monorepo structure. A flat layout (everything at the repo root) would become unmanageable once the backend project is added.

---

## Decision

Convert the repository to a monorepo with a `projects/` top-level folder for subprojects:

| Path | Role |
|------|------|
| `projects/frontend/` | Existing Angular SPA — moved from the repo root |
| `projects/backend/` | Placeholder for the future Spring Boot backend |

Shared, cross-cutting resources (docs, ADRs, guidelines, editor config, CI workflows) stay at the repository root.

**Explicitly rejected alternatives:**
- *npm workspaces at the root:* The backend will be Java/Maven, not a Node project. Hoisting `node_modules` to the root would add complexity without benefit.
- *Separate repositories:* Rejected because the team prefers a single repo for atomic cross-cutting changes and unified ADR history.

---

## Implementation

### New files

| File | Description |
|------|-------------|
| `projects/backend/README.md` | Spring Boot placeholder documentation |
| `projects/frontend/README.md` | Frontend-specific setup and development guide |
| `docs/guidelines/README.md` | Shared development guidelines placeholder |
| `docs/adr/20260425-1623-monorepo-restructure.md` | This ADR |

### Modified files

| File | Change |
|------|--------|
| `README.md` | Replaced with monorepo overview explaining layout and quick-start per subproject |
| `.github/workflows/deploy.yml` | Added `working-directory: projects/frontend` and updated artifact upload path |
| `.gitignore` | Changed root-anchored paths (`/dist`) to unanchored (`dist/`) so they match inside subproject directories; added Java/Maven/Gradle patterns for the future backend |

### Moved files (git history preserved)

All Angular app files that were at the repository root have been moved to `projects/frontend/`:
`src/`, `public/`, `angular.json`, `package.json`, `package-lock.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.spec.json`, `angular-google-sheets-toggle-app-brief-1.md`.

---

## Usage

### Working with the frontend

```bash
cd projects/frontend
npm install
npm start          # dev server → http://localhost:4200
npm run build      # production build
npm test           # unit tests (Vitest)
```

### Working with the backend (future)

```bash
cd projects/backend
# See projects/backend/README.md once the project is scaffolded
```

---

## Trade-offs

- Each subproject manages its own `node_modules` / Maven local repository; there is no dependency hoisting. This keeps subprojects independent but means no automatic deduplication of Node packages (acceptable given only one Node subproject exists).
- The CI workflow only deploys the Angular frontend; a backend CI job will need to be added when `projects/backend/` is implemented.
