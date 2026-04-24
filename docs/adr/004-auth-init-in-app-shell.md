# ADR-004: Auth Initialization and Sign-In Prompt Moved to App Shell

**Status:** Accepted  
**Date:** 2026-04-24

---

## Context

The sign-in prompt (heading, description, auth error, and the Google Sign-In button) lived inside `ButtonsPageComponent`. `ngOnInit` of that component called `auth.initializeSignIn()` on every activation of the Buttons route.

This caused two problems:
1. **Auth state reset on tab navigation.** Navigating away from Buttons and back destroyed and recreated the component, triggering `initializeSignIn` again. That method unconditionally called `_status.set('idle')` when `persistGoogleAuthorization` was `false`, wiping the signed-in state on every round-trip.
2. **Double-row navigation bar.** The app shell had two separate containers — a `<nav>` for branding/auth controls and a `<div>` below it for tab links — which stacked vertically.

---

## Decision

1. **Move the sign-in prompt to the app shell (`app.html`).** The `#google-sign-in-button` element is now rendered by the persistent `App` component behind `*ngIf="!auth.isSignedIn()"`, so it always exists (when needed) regardless of which route is active.

2. **Initialize auth once from the app shell.** `App.ngAfterViewInit` calls `auth.initializeSignIn('google-sign-in-button')` (deferred with `setTimeout(0)` so the conditional DOM node is present). `ButtonsPageComponent` no longer calls it.

3. **Merge the navbar and tab bar into a single Bootstrap `<nav>`.** Tab links become a `<ul class="navbar-nav flex-row">` inline inside the existing navbar, with auth controls aligned to the right via `ms-auto`. Result: one row instead of two.

Key design choices explicitly considered:
- **`ngAfterViewInit` over `ngOnInit`** — the sign-in button is behind a `*ngIf`, so the DOM node does not exist in `ngOnInit`. Using `ngAfterViewInit` with a `setTimeout(0)` defers GIS attachment until after Angular's first render pass.
- **`ButtonsPageComponent` retains `auth.isSignedIn()` guard** — the component still hides its board when not signed in, preventing the board from attempting API calls. The app shell's sign-in prompt is additive, not a replacement for the component-level guard.
- **Route-level auth guards were not introduced** — consistent with the existing approach; auth is handled reactively via signals rather than imperative guards.

---

## Implementation

### Modified files

| File | Change |
|---|---|
| `src/app/app.html` | Merged `<nav>` and tab `<div>` into one navbar row; added sign-in prompt block above `<router-outlet>` |
| `src/app/app.ts` | Replaced `ngOnInit` with `ngAfterViewInit`; removed unused `ButtonBoardComponent` import |
| `src/app/features/buttons-page/buttons-page.component.html` | Removed the not-signed-in block (now in the app shell) |
| `src/app/features/buttons-page/buttons-page.component.ts` | Removed `OnInit` interface and `ngOnInit` lifecycle hook |

### New files

| File | Purpose |
|---|---|
| `docs/adr/004-auth-init-in-app-shell.md` | This document |

---

## Usage

The sign-in button is now rendered by the app shell. No changes are required for adding new routes — any new routed component that needs auth state can inject `AuthService` directly.

To re-initialize auth after a credential reset, `clearCredentials()` in `App` continues to use `setTimeout(() => auth.initializeSignIn('google-sign-in-button'), 0)` for the same reason as `ngAfterViewInit`.

---

## Trade-offs

- When the user is not signed in and navigates to the `/map` route, the sign-in prompt will be visible above the map. This is a minor UX change; the map itself does not require authentication and continues to render normally.
- `initializeSignIn` is called once at app startup. If the app is ever restructured to support multiple independent sign-in surfaces, this will need revisiting.
