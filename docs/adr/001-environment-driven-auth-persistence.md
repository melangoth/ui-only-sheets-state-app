# ADR-001: Environment-Driven Auth Persistence and Credential Reset

**Status:** Accepted  
**Date:** 2026-04-19

---

## Context

The app is a browser-only Angular application backed by Google Sheets. Before this change, all auth and Google authorization state was held in memory and lost on every page reload, forcing users to sign in and re-authorize on every visit.

The goals were:
- reduce repeated sign-in friction for developers and users
- keep production defaults safe (no browser storage by default)
- support a one-click way to clear all stored credentials
- remain fully browser-only (no backend)

---

## Decision

Introduce four feature flags in Angular environment files that control auth/session behavior at build time.

| Flag | Type | Dev default | Prod default |
|---|---|---|---|
| `requireAppLogin` | `boolean` | `true` | `true` |
| `persistGoogleAuthorization` | `boolean` | `true` | `false` |
| `authStorageStrategy` | `'memory' \| 'session' \| 'local'` | `'session'` | `'memory'` |
| `enableClearCredentialsButton` | `boolean` | `true` | `false` |

Key design choices:

- **Only non-sensitive profile data is persisted** (name, email, picture from the decoded ID token). Access tokens are never written to any browser storage.
- **`sessionStorage` is the dev default**, not `localStorage`, so state does not survive browser restarts unless `local` is explicitly chosen.
- **`AuthStorageService`** is the single point for all storage reads/writes, routing operations through the configured strategy. This keeps storage concerns out of domain services.
- **`canAccessApp` computed signal** in `AuthService` replaces direct `isSignedIn()` checks in the template, so `requireAppLogin: false` can bypass the login gate cleanly.
- **`clearCredentials()`** removes keys from *every* storage tier (session + local) regardless of the current strategy, ensuring a complete reset even if the strategy was changed between runs.

---

## Implementation

### New files

| File | Purpose |
|---|---|
| `src/environments/environment.model.ts` | `AppEnvironment` interface + `AuthStorageStrategy` type |
| `src/app/core/auth/auth-storage.service.ts` | Storage abstraction; routes ops through configured strategy |
| `docs/adr/001-environment-driven-auth-persistence.md` | This document |

### Modified files

| File | Change |
|---|---|
| `src/environments/environment.ts` | Added four flags (dev defaults) |
| `src/environments/environment.prod.ts` | Added four flags (prod defaults) |
| `src/app/core/auth/auth.service.ts` | Profile restore on init, `clearCredentials()`, `canAccessApp` signal |
| `src/app/core/storage/storage-file.service.ts` | Uses `AuthStorageService` instead of direct `sessionStorage` |
| `src/app/app.ts` | Exposes env flags; adds `clearCredentials()` handler |
| `src/app/app.html` | Clear Credentials button; gates on `canAccessApp()` / `requireAppLogin` |

---

## Usage

### Changing the storage strategy

Edit `src/environments/environment.ts`:

```ts
authStorageStrategy: 'local',  // survives browser restart; dev/testing only
```

### Disabling the login gate (demo/kiosk mode)

```ts
requireAppLogin: false,
// The board is shown immediately without a sign-in step.
// Google authorization (OAuth token) is still requested when the board loads.
```

### Clear Credentials button

When `enableClearCredentialsButton: true`, a **Clear Credentials** button appears in the navbar. Clicking it:
1. Revokes the Google Sign-In session
2. Removes all `cta_*` keys from `sessionStorage` and `localStorage`
3. Removes the legacy spreadsheet ID key (`colorToggleAppSpreadsheetId`)
4. Clears in-memory tokens and user profile
5. Returns the app to an unauthenticated state

### Storage key reference

All keys written by `AuthStorageService` use the `cta_` prefix:

| Key | Content |
|---|---|
| `cta_user_profile` | JSON-serialized `UserProfile` (name, email, picture) |
| `cta_spreadsheet_id` | Google Sheets file ID |
| `cta_auth_hint` | Reserved for future use |

---

## Trade-offs

- **Profile restoration is not re-validated** against Google on reload (no server-side check possible in a browser-only app). The stored profile is treated as a display hint; actual Google API access still requires a fresh OAuth token each time the board loads.
- Using `localStorage` (`authStorageStrategy: 'local'`) persists state across browser restarts. This is useful for development but should not be enabled in production without explicit acceptance of the risk.
