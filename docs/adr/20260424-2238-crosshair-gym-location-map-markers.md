# ADR-20260424-2238: Crosshair-based Gym Location and Saved-Gym Map Markers

**Status:** Accepted
**Date:** 2026-04-24

---

## Context

Previously, saving a gym always used the device's GPS coordinates. Users wanted to pin a gym at an arbitrary map location (e.g. when GPS is inaccurate or the gym is nearby but not at the exact current position). Additionally, no saved gyms were rendered on the map, making it impossible to see at a glance which areas are already tracked.

---

## Decision

| Concern | Decision | Rejected alternative |
|---|---|---|
| Location for new gym | Map-center coordinates captured via `moveend` → `mapCenter` signal | Stick to GPS-only (not flexible enough) |
| Crosshair UX | Fixed `div.crosshair` overlay (CSS `position: absolute`, `pointer-events: none`) centered at 50%/50% of the map wrapper | SVG icon or Leaflet custom marker (more complex, harder to keep truly centered) |
| `mapCenter` initialisation | Set from `setView` inside `centerMapOnCurrentLocation()` and on every `moveend` event | Only on `moveend` (misses the initial GPS-centered view) |
| Save button gate | Show when `mapCenter() !== null && spreadsheetReady()` | Require GPS `located` status (too restrictive once crosshair is the source of truth) |
| Saved-gym markers | `L.circleMarker` with `interactive: false`; green (`#16a34a`) = defended, blue (`#2563eb`) = not defended | Standard pin markers (visually heavier); interactive markers (not required yet) |
| Marker load trigger | `effect()` on `spreadsheetReady()` in constructor; reload after every successful save | Load once on component init (misses saves made in the current session) |
| Load error handling | Silent catch — markers are best-effort display, not critical data | Surface load error to user (adds UI noise for a non-blocking feature) |

---

## Implementation

### Modified files

| File | Change |
|---|---|
| `src/app/features/gym-map/gym-map.component.ts` | Added `mapCenter` signal; `gymMarkers` array; `moveend` listener; `loadAndRenderGyms()`; `spreadsheetReady` effect; updated `saveGym()` to use map center; `ngOnDestroy` cleans up gym markers |
| `src/app/features/gym-map/gym-map.component.html` | Added `.crosshair` div; updated Save button visibility condition; updated save panel title |
| `src/app/features/gym-map/gym-map.component.css` | Added `.crosshair`, `.crosshair-h`, `.crosshair-v` styles |

### New files

| File | Purpose |
|---|---|
| `docs/adr/20260424-2238-crosshair-gym-location-map-markers.md` | This document |

---

## Usage

### Save a gym at a custom location
1. Navigate to 🗺️ Map.
2. Pan the map so the crosshair (white `+`) is over the desired gym location.
3. Tap **💾 Save Gym** (appears once the map has been centered and the spreadsheet is ready).
4. Fill in gym name and optional defender info, then tap **Save**.
5. The gym is stored with the map-center coordinates; its marker appears on the map immediately.

### Reading gym markers
- **Blue circle**: gym tracked, no active defender.
- **Green circle**: gym with an active defender.
- **Purple circle**: your current GPS position.
- Markers are non-interactive (no popup/tooltip) in this iteration.

---

## Trade-offs

- The crosshair is always visible even while the map is loading tiles or while location is still being acquired. This is intentional — the user can pan freely regardless of GPS state.
- `loadAndRenderGyms()` replaces all markers on every reload (full re-render). For the expected small number of gyms this is negligible; a diff-based update can be added later.
- `moveend` does not fire on programmatic `setView` calls in all Leaflet versions; `mapCenter` is therefore also set explicitly inside `centerMapOnCurrentLocation()` after each `setView`.
