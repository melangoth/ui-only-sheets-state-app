# ADR-004: Asynchronous POI Fetching via Overpass API

**Status:** Accepted  
**Date:** 2026-04-19

---

## Context

Phase 1 of the map feature added a Leaflet map centred on the user's GPS location. There is no official Pokémon GO API for public use, but Niantic generates game entities (PokéStops, Gyms) from OpenStreetMap (OSM) data. The Overpass API allows programmatic querying of OSM nodes by tag, making it the most viable approach to populate the map with candidate POI markers without requiring a backend server.

---

## Decision

Use the **Overpass API** (`https://overpass-api.de/api/interpreter`) to fetch OSM nodes within a 500 m radius of the user's current coordinates, filtered by a set of tags known to correlate with Pokémon GO game entities.

| Aspect | Choice | Rationale |
|--------|--------|-----------|
| Data source | Overpass API (OSM) | Free, no API key, community-maintained, covers global POIs |
| Query method | HTTP POST with `application/x-www-form-urlencoded` | Avoids URL length limits for multi-tag queries |
| Radius | 500 m | Wide enough to be useful; keeps response size manageable |
| Re-fetch guard | Haversine distance ≥ 200 m from last fetch coordinates | Prevents excessive API calls on GPS jitter |
| HTTP layer | Angular `HttpClient` (already provided) | No new dependencies; consistent with Angular conventions |
| State management | Angular `signal` (`PoiState` discriminated union) | Reactive, consistent with the rest of the app |
| Marker tracking | `Map<number, L.Marker>` keyed by OSM node id | O(1) add/remove; prevents duplicate markers |

**OSM tags queried** (candidate PokéStop/Gym tags):

```
amenity=place_of_worship   amenity=library          amenity=community_centre
historic=memorial          historic=monument        historic=statue
tourism=artwork            tourism=attraction       tourism=museum
leisure=park               leisure=sports_centre    man_made=lighthouse
```

**Deliberately rejected alternatives:**

- *Google Places API* — requires API key, per-request cost, ToS restrictions.
- *Foursquare / HERE* — commercial, require keys.
- *Static POI dataset bundled in the app* — stale, large, non-queryable by location.

---

## Implementation

### New files

| File | Description |
|------|-------------|
| `src/app/core/overpass/overpass.model.ts` | `OverpassElement`, `OverpassResponse`, `Poi`, `PoiState` types |
| `src/app/core/overpass/overpass.service.ts` | Fetch logic, bounding-box guard, Haversine helper, signal state |
| `src/app/shared/config/overpass-config.ts` | All tunable constants (URL, radius, threshold, tag list) |
| `docs/adr/004-overpass-poi-fetching.md` | This document |

### Modified files

| File | Change |
|------|--------|
| `src/app/app.config.ts` | Added `provideHttpClient()` |
| `src/app/features/gym-map/gym-map.component.ts` | Inject `OverpassService`; add POI marker sync `effect()`; `syncPoiMarkers()` / `clearPoiMarkers()` methods |
| `src/app/features/gym-map/gym-map.component.html` | POI loading spinner badge + POI count badge |
| `src/app/features/gym-map/gym-map.component.css` | `.poi-status-badge` and `.poi-marker` styles |

---

## Usage

### Example Overpass QL query generated at runtime

```
[out:json][timeout:25];
(
  node[amenity=place_of_worship](around:500,51.5074,-0.1278);
  node[amenity=library](around:500,51.5074,-0.1278);
  node[historic=memorial](around:500,51.5074,-0.1278);
  ...
);
out body;
```

This is POSTed to `https://overpass-api.de/api/interpreter` as:

```
data=<URL-encoded query>
```

### Changing the search radius or re-fetch threshold

Edit `src/app/shared/config/overpass-config.ts`:

```ts
export const SEARCH_RADIUS_METERS = 500; // metres
export const MIN_MOVE_METERS = 200;      // metres
```

---

## Trade-offs

| Concern | Notes |
|---------|-------|
| Public endpoint rate limits | `overpass-api.de` is a shared public server. Heavy usage may be throttled. For production, host a private Overpass instance or use a proxy. |
| OSM ≠ real game data | Not all fetched nodes are in-game; some in-game entities may not appear in OSM. The app does not claim accuracy. |
| No real-time game status | This feature only surfaces candidate POIs, not live gym or raid data. |
| No offline support | POI fetch requires network access; failures are surfaced via the `error` state. |
| No marker clustering | At very high POI density the map can become cluttered. Marker clustering (e.g., `leaflet.markercluster`) is deferred to a future phase. |
