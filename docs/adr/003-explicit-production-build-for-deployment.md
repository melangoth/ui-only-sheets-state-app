# ADR-003: Explicit Production Configuration in Deployment Build

**Status:** Accepted  
**Date:** 2026-04-19

---

## Context

The CI/CD deployment workflow builds the Angular app via the `build:pages` npm script, which was invoked as `ng build --base-href /ui-only-sheets-state-app/` without an explicit `--configuration` flag. While `angular.json` currently sets `defaultConfiguration: "production"`, relying on an implicit default in a deployment pipeline is fragile: any future change to that default (e.g. switching to `development` for local convenience) would silently ship an unoptimized, source-mapped build to production.

---

## Decision

Explicitly pass `--configuration production` in the `build:pages` script so the production Angular build configuration is always enforced at deployment time, regardless of what the `defaultConfiguration` is set to.

The `build:pages` script was changed from:

```
ng build --base-href /ui-only-sheets-state-app/
```

to:

```
ng build --configuration production --base-href /ui-only-sheets-state-app/
```

Alternatives considered and rejected:
- Leaving `defaultConfiguration: "production"` and relying on it — rejected because the intent is invisible to anyone reading the workflow or the script, and a misconfiguration would be silent.
- Adding `--configuration production` directly in `deploy.yml` — rejected in favour of keeping the flag in the npm script so any local invocation of `npm run build:pages` is also guaranteed to use production settings.

---

## Implementation

| File | Change |
|------|--------|
| `package.json` | Added `--configuration production` flag to the `build:pages` script |
| `docs/adr/003-explicit-production-build-for-deployment.md` | This ADR |

---

## Usage

```bash
# Deploy build (now always production):
npm run build:pages

# Local development build (unchanged):
npm run build
```

---

## Trade-offs

- Slightly more verbose script, but the intent is now unambiguous.
- No functional change today (the default was already `production`), but protects against accidental regressions in the future.
