# ADR-20260425-0001: Stop map from auto-recentering on every location update

**Status:** Accepted  
**Date:** 2026-04-25

---

## Context

The `GymMapComponent` registered an Angular `effect()` that called `centerMapOnCurrentLocation()` on every `locationState` signal change. Because `GeolocationService.watchLocation()` can fire many times per minute, the map viewport was reset continuously, making it impossible for the user to freely pan and explore the map.

---

## Decision

Introduce a `hasInitialCentered` boolean flag on `GymMapComponent`.  
`centerMapOnCurrentLocation()` now:
- Always updates the current-location marker's position (new or existing).
- Calls `map.setView()` **only** when `hasInitialCentered` is `false` (i.e., on the very first successful GPS fix), then sets the flag to `true`.

Subsequent location updates move the marker without touching the viewport. The existing 📍 **Recenter** button (`centerToCurrentLocation()`) remains fully functional for manual recentering.

| Considered option | Outcome |
|---|---|
| Debounce / throttle `setView` calls | Rejected — still steals focus periodically |
| Remove auto-center entirely | Rejected — bad UX on cold start |
| One-shot auto-center (chosen) | Accepted — good cold-start UX, free panning after |

---

## Implementation

| File | Change |
|---|---|
| `src/app/features/gym-map/gym-map.component.ts` | Added `private hasInitialCentered = false` flag; guarded `setView` call behind it |

---

## Usage

No configuration needed. On first GPS fix the map centers automatically. After that, use the 📍 button to recenter.

---

## Trade-offs

- If the user denies location and later grants it, the first successful fix will still auto-center once — this is the desired behavior.
- The flag is instance-scoped; navigating away and back resets it, giving a fresh auto-center on component re-initialization.
