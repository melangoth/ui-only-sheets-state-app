# ui-only-sheets-state-app — Monorepo

This repository is a monorepo that contains the frontend Angular application and a placeholder for a future Spring Boot backend.

## Repository layout

```
/
├── projects/
│   ├── frontend/          Angular SPA (Color Toggle App — Google Sheets State)
│   └── backend/           Spring Boot backend (placeholder — not yet implemented)
├── docs/
│   ├── adr/               Architecture Decision Records
│   └── guidelines/        Shared development guidelines
├── .github/
│   └── workflows/         CI/CD pipelines
├── .editorconfig          Shared editor configuration
└── .prettierrc            Shared code-formatting configuration
```

## Subprojects

### `projects/frontend`

An Angular 21 SPA that authenticates with Google Identity Services and persists button toggle states to a Google Sheet in the user's own Google Drive.

→ See [`projects/frontend/README.md`](projects/frontend/README.md) for setup, development server, build, and test instructions.

**Quick start**

```bash
cd projects/frontend
npm install
npm start          # dev server at http://localhost:4200
npm run build      # production build
npm test           # unit tests
```

### `projects/backend`

A Spring Boot REST backend — **not yet implemented**.

→ See [`projects/backend/README.md`](projects/backend/README.md) for the intended scope and planned setup.

## Shared resources

| Path | Purpose |
|------|---------|
| `docs/adr/` | Architecture Decision Records (time-stamped, `YYYYMMDD-HHmm` IDs, Europe/Budapest timezone) |
| `docs/guidelines/` | Shared development guidelines |
| `.editorconfig` | Consistent editor settings across all subprojects |
| `.prettierrc` | Shared Prettier formatting config (used by the frontend) |

## CI / CD

The GitHub Actions workflow (`.github/workflows/deploy.yml`) builds the Angular frontend and deploys it to **GitHub Pages** on every push to `main`.

