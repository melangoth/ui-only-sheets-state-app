# ADR-001 — Geolocation & Leaflet Map Feature

**Status:** Accepted  
**Date:** 2026-04-19  
**Scope:** Feature — Geolocation + map view (Phase 1 of 2; POI/Overpass fetching is Phase 2)

---

## Objective

Add a **Map tab** to the application that:

1. Requests the user's current high-accuracy GPS location via the browser's Web Geolocation API.
2. Renders an interactive map (Leaflet.js + OpenStreetMap tiles) centred on that location.
3. Places a "you are here" marker and provides a foundation for future gym/POI markers (Phase 2).

---

## Context

The application is an Angular 21 standalone-components app (signals, no NgModules) using Bootstrap 5 for layout. Currently it has a single `ButtonBoard` feature. The new Map feature needs to coexist alongside it, requiring basic client-side routing and a geolocation abstraction that other future features (Nearby list, POI fetching) can also consume.

---

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Leaflet.js** over Google Maps or MapLibre GL JS | Open-source, zero per-request cost, small bundle (~42 KB), raster tiles are sufficient for this use case, minimal setup complexity. |
| 2 | **OpenStreetMap tiles** (via `https://{s}.tile.openstreetmap.org/`) | Free for moderate traffic, no API key required, community-maintained data quality is acceptable. For production scale a CDN-backed provider (Stadia Maps, Maptiler) can be swapped in by changing one config constant. |
| 3 | **Angular Router** added to `app.config.ts` | Enables clean URL-based navigation (`/map`, `/buttons`) without a full page reload, consistent with Angular conventions. |
| 4 | **`GeolocationService`** as a core Angular service | Encapsulates browser API details and error handling behind a stable interface; exposes state via Angular signals so components react automatically. |
| 5 | **Lazy-loaded `GymMapComponent`** route | Keeps the Leaflet bundle out of the initial JS chunk; map code is only loaded when the user navigates to `/map`. |
| 6 | **Tile provider URL is a shared config constant** | Single place to swap the tile provider in future without touching component code. |

---

## Plan Summary (Agentic Implementation Checklist)

### Phase 1 — Prerequisites & Routing

- [ ] **P1-1** Install npm packages: `leaflet` and `@types/leaflet` (dev).
- [ ] **P1-2** Add Leaflet CSS to `angular.json` `styles` array: `node_modules/leaflet/dist/leaflet.css`.
- [ ] **P1-3** Provide Angular Router in `src/app/app.config.ts` using `provideRouter(routes)`.
- [ ] **P1-4** Create `src/app/app.routes.ts` with two routes:
  - `''` → redirect to `'buttons'`
  - `'buttons'` → `ButtonBoardComponent` (existing, wrapped in a thin route-host component or directly as a lazy component)
  - `'map'` → lazy `() => import('./features/gym-map/gym-map.component').then(m => m.GymMapComponent)`
- [ ] **P1-5** Replace the static `<app-button-board>` usage in `app.html` with `<router-outlet>` and add a Bootstrap nav-tabs bar for **Buttons** / **Map**.

### Phase 2 — Geolocation Service

- [ ] **P2-1** Create `src/app/core/geolocation/geolocation.service.ts`.
  - Exposes a `readonly locationState` signal of type `GeolocationState` (see models below).
  - Method `requestLocation()`: calls `navigator.geolocation.getCurrentPosition` with `enableHighAccuracy: true`, updates signal to `{ status: 'located', lat, lng }` on success, `{ status: 'error', message }` on failure, `{ status: 'requesting' }` while pending.
  - Method `watchLocation()`: uses `watchPosition` for continuous updates; returns an unsubscribe handle (to be called in `ngOnDestroy`).
- [ ] **P2-2** Create `src/app/core/geolocation/geolocation.model.ts` with the `GeolocationState` discriminated union:
  ```ts
  type GeolocationState =
    | { status: 'idle' }
    | { status: 'requesting' }
    | { status: 'located'; lat: number; lng: number }
    | { status: 'error'; message: string };
  ```

### Phase 3 — Gym Map Component

- [ ] **P3-1** Create `src/app/features/gym-map/` folder.
- [ ] **P3-2** Create `gym-map.component.ts`:
  - Standalone, imports `CommonModule`.
  - Injects `GeolocationService`.
  - Holds a `@ViewChild('mapContainer') mapEl: ElementRef`.
  - In `ngAfterViewInit`: calls `geolocationService.requestLocation()`, then in an `effect()` watches `locationState` — when `status === 'located'`, initialise the Leaflet map (or pan to new coords if already initialised).
  - Calls `map.remove()` in `ngOnDestroy` to clean up the Leaflet instance.
- [ ] **P3-3** Create `gym-map.component.html`:
  - Full-height container div (`#mapContainer`).
  - Conditional overlay panels for `requesting` and `error` states (Bootstrap alert).
- [ ] **P3-4** Create `gym-map.component.css`:
  - `#mapContainer` height: `calc(100vh - 120px)` (accounts for navbar + tab bar).
  - Ensure the Leaflet attribution is visible (not obscured by Bootstrap resets).
- [ ] **P3-5** Add a shared config constant for the tile provider URL and attribution string in `src/app/shared/config/map-config.ts`.

### Phase 4 — Integration & Polish

- [ ] **P4-1** Update `app.html` nav-tabs: active class driven by Angular Router's `routerLinkActive`.
- [ ] **P4-2** Guard the `<app-button-board>` render behind `auth.isSignedIn()` on the buttons route (preserve existing auth gate behaviour).
- [ ] **P4-3** The Map route must be accessible regardless of sign-in state (geolocation is browser-level, not Google-authenticated).
- [ ] **P4-4** Verify Leaflet map renders correctly at multiple viewport sizes (Bootstrap responsive check).
- [ ] **P4-5** Run `npm run build` and confirm no TypeScript or bundle errors.

---

## Feature Documentation

### User-Facing Behaviour

| Scenario | Behaviour |
|----------|-----------|
| User opens Map tab for the first time | Browser permission prompt appears. |
| Permission granted | Map centres on user's location with a blue "you are here" circle marker. |
| Permission denied / unavailable | Error banner shown inside the map area with a retry button. |
| User navigates away and back | Map re-initialises; location is re-requested. |
| No internet (tile fetch fails) | Leaflet shows empty tiles; "you are here" marker still renders if location was granted. |

### Architecture

```
src/app/
├── app.routes.ts               ← Route definitions
├── app.config.ts               ← provideRouter added here
├── app.html                    ← router-outlet + nav tabs
├── core/
│   └── geolocation/
│       ├── geolocation.service.ts
│       └── geolocation.model.ts
├── features/
│   ├── button-board/           ← unchanged
│   └── gym-map/
│       ├── gym-map.component.ts
│       ├── gym-map.component.html
│       └── gym-map.component.css
└── shared/
    └── config/
        └── map-config.ts       ← tile URL + attribution constant
```

### Key Dependencies Added

| Package | Version | Purpose |
|---------|---------|---------|
| `leaflet` | `^1.9.x` | Map rendering library |
| `@types/leaflet` | `^1.9.x` | TypeScript type definitions (dev) |

### Out of Scope (Phase 2)

- Overpass API / POI fetching for nearby gyms.
- "Nearby" list component.
- Gym marker clustering.
- Caching or offline tile support.

---

## Alternatives Considered

| Option | Rejected Because |
|--------|-----------------|
| Google Maps JS API | Cost at scale, vendor lock-in, ToS restrictions on data use. |
| MapLibre GL JS | Vector tile complexity and ~250 KB bundle overhead not justified for this phase. |
| Mapbox GL JS | Commercial licence required for GL JS v2+. |
| Static image map (no library) | Cannot support interactive pan/zoom needed for POI phase. |
