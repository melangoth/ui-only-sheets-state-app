# ADR-20260520-0836: Interactable Gym POIs and Shared Edit Panel

**Status:** Accepted  
**Date:** 2026-05-20

---

## Context

Gym markers on the map were rendered as non-interactive (`interactive: false`) circle markers. This meant users had no way to edit an existing gym's name or defender status from the map view. The gym edit form only existed inline within the Defenders page list. Making it reusable was a prerequisite for enabling map-based gym editing.

---

## Decision

1. **Shared `GymEditPanelComponent`** — Extracted the gym edit form (name, defended status, defender Pokémon) into a standalone Angular component at `shared/components/gym-edit-panel/`. The component accepts a `@Input() gym: GymEntry`, calls `GymRepository.updateGym()` internally, and emits `saved` (with the updated entry) and `cancelled` events.

2. **Interactive gym markers on the map** — Changed Leaflet `circleMarker` option from `interactive: false` to `interactive: true`. Each marker now carries a click handler that calls `openGymEdit(gym)`, which sets the `editingGym` signal and displays the shared edit panel as a floating card overlay (reusing the existing `.save-panel` CSS class).

3. **Defenders page refactored to use the shared component** — Replaced the inline edit form and its associated signals (`editingGymId`, `editName`, `editDefended`, `editDefenderPokemon`, `editSaving`, `editError`) with a single `editingGym: signal<GymEntry | null>`.

| What | Chose | Rejected |
|------|-------|----------|
| Edit UI placement on map | Floating panel (same CSS as save panel) | Leaflet popup — adds complex Angular/DOM bridging |
| Edit state ownership | Panel component owns form state; parent owns list/map state | Parent owns all state — duplicates logic |
| Marker interactivity signal | Stored `{ marker, gym }` pairs | Separate lookup map — same complexity, less idiomatic |

---

## Implementation

### New files

| File | Description |
|------|-------------|
| `shared/components/gym-edit-panel/gym-edit-panel.component.ts` | Standalone edit panel component with save/cancel logic |
| `shared/components/gym-edit-panel/gym-edit-panel.component.html` | Edit form template (name, defended, defender Pokémon) |

### Modified files

| File | Change |
|------|--------|
| `features/gym-map/gym-map.component.ts` | Markers set to `interactive: true`; store `{ marker, gym }` pairs; `editingGym` signal; `openGymEdit`, `onGymEditSaved`, `onGymEditCancelled` methods; imports `GymEditPanelComponent` |
| `features/gym-map/gym-map.component.html` | Added edit panel overlay controlled by `editingGym()` |
| `features/defenders-page/defenders-page.component.ts` | Replaced six inline-edit signals with `editingGym`; `startEdit`, `cancelEdit`, `onGymSaved` simplified; imports `GymEditPanelComponent` |
| `features/defenders-page/defenders-page.component.html` | Inline edit form replaced by `<app-gym-edit-panel>` |

---

## Usage

**Map**: Tap/click any gym circle marker → floating "Edit Gym" panel appears at the bottom-right. Edit name/defender and save. The panel closes and markers reload.

**Defenders list**: Tap ✏️ on a gym row → inline edit form replaced by the shared panel. Save/cancel behaves identically to before.

---

## Trade-offs

- The map edit panel overlaps the "Save Gym" floating button — they are mutually exclusive (opening one closes the other).
- Full marker re-render (`loadAndRenderGyms`) is triggered after a map edit. For the expected small gym count this is negligible; a targeted marker update can be added later.
- The shared panel uses `ngOnChanges` to reset form state; this is standard Angular but means the form resets if the parent re-passes the same gym reference.
