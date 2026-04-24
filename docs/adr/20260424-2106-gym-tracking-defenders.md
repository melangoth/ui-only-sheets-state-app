# ADR-20260424-2106: Gym Tracking, Defenders Screen, and App-Level Auth/Geolocation

**Status:** Accepted
**Date:** 2026-04-24

---

## Context

The app needed to extend beyond color-button state management to support Pokémon GO gym tracking.
Key requirements were:
- Save gyms at the user's current GPS location to a Google Sheet.
- Show a Defenders screen listing gyms being defended, with edit and delete functionality.
- Show a marker for the current user location only (no saved-gym markers yet).
- `defendedSince` stored as ISO-8601 UTC for future elapsed-time calculations.
- Sign-in, spreadsheet resolution, and geolocation watch lifted to the app shell — not per-screen.

---

## Decision

| Concern | Decision | Rejected alternative |
|---|---|---|
| Auth & spreadsheet scope | App shell resolves spreadsheet once via `effect()` on `isSignedIn()`; `spreadsheetReady` signal exposed on `StorageFileService` | Each screen resolves independently (causes race conditions + redundant network calls) |
| Geolocation | `watchLocation()` called in `App.ngAfterViewInit()`; cleanup in `ngOnDestroy()` | Per-screen `requestLocation()` (loses position on tab switch) |
| `defendedSince` format | ISO-8601 UTC (`new Date().toISOString()`) — machine-friendly, easy to diff | Human-readable string (not suitable for arithmetic) |
| Gym sheet | Created on-demand via `ensureGymsSheet()` in `GymRepository`; cached per session with `_gymsSheetReady` flag | Create at spreadsheet creation time (breaks existing sheets) |
| Delete implementation | `batchUpdate → deleteDimension` (physically removes the row) | Overwrite with empty values and skip on load (leaves orphan rows) |
| Map markers | Show only the current-location marker; do not render saved-gym markers | No markers at all |
| Auth gating | `router-outlet` gated on `auth.canAccessApp()` in app shell | Per-screen `*ngIf="auth.isSignedIn()"` (inconsistent; each screen must repeat it) |

---

## Implementation

### New files

| File | Purpose |
|---|---|
| `src/app/shared/models/gym.model.ts` | `GymEntry` interface |
| `src/app/shared/utils/distance.ts` | `haversineDistanceMeters()` — Haversine formula, no deps |
| `src/app/core/storage/gym.repository.ts` | `loadGyms`, `saveGym`, `updateGym`, `deleteGym` |
| `src/app/features/defenders-page/defenders-page.component.{ts,html,css}` | Defenders list with filter, edit, delete |
| `docs/adr/20260424-2106-gym-tracking-defenders.md` | This document |

### Modified files

| File | Change |
|---|---|
| `src/app/shared/config/app-config.ts` | Added `gymsSheetName`, `gymsRange`, `gymsHeaderRange` |
| `src/app/core/storage/storage-file.service.ts` | Added `spreadsheetReady` signal, early-return shortcut, `ensureGymsSheet()` |
| `src/app/app.ts` | Lifts geolocation watch + spreadsheet resolution; offcanvas nav state |
| `src/app/app.html` | Hamburger offcanvas nav (Buttons / Map / Defenders); app-level auth gate on router-outlet |
| `src/app/app.routes.ts` | Added `/defenders` lazy route |
| `src/app/features/button-board/button-board.component.ts` | Removed `resolving-file` status; `resolveSpreadsheet()` is now a no-op if app shell already resolved it |
| `src/app/features/buttons-page/buttons-page.component.{ts,html}` | Removed per-screen auth gate |
| `src/app/features/gym-map/gym-map.component.{ts,html,css}` | Removed location lifecycle (now app-level); added current-location marker; added Save Gym panel |

---

## Usage

### Save a gym (Map screen)
1. Navigate to 🗺️ Map.
2. Once location is acquired and the spreadsheet is ready, a **💾 Save Gym** button appears.
3. Fill in the gym name, optionally mark as defended and enter the defender Pokémon.
4. Tap **Save** — the gym is appended to the `gyms` sheet.

### View/edit/delete defenders (Defenders screen)
1. Navigate to 🏆 Defenders.
2. Use the **Defending** tab for actively defended gyms, or **Nearby** for gyms within 500 m.
3. Tap ✏️ to edit a gym in-place, or 🗑️ to delete (with confirmation).

### `GymEntry` sheet schema
Row 1 header: `id | name | lat | lng | defended | defendedSince | defenderPokemon`

`defendedSince` is an ISO-8601 UTC string (e.g. `"2026-04-24T19:06:05.302Z"`).

---

## Trade-offs

- `ButtonBoardComponent` still calls `requestAccessToken()` directly to surface the OAuth popup to the user with a visible status message. The app-shell call happens in parallel but is effectively a no-op when the token is already present.
- `ensureGymsSheet()` makes a metadata API call on first gym operation per session. It is cached with `_gymsSheetReady` so only one call is made.
- `deleteGym` makes two API calls (find row + delete) because the Sheets API does not support delete-by-cell-value natively.
- Elapsed-time display from `defendedSince` is deferred to a future iteration.
