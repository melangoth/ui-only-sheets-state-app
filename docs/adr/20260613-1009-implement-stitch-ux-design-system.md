# ADR-20260613-1009: Implement Stitch UX Design System

**Status:** Accepted  
**Date:** 2026-06-13

---

## Context

The current Angular UI is functional but mostly default Bootstrap: a dark app background, primary-blue navbar, offcanvas navigation, simple button grid, Leaflet map overlays, and compact defender cards. A Google Stitch export now exists at `docs/guidelines/stitch_color_toggle_gym_tracker.zip` with full UX design artifacts for the app:

| Artifact | Purpose |
|---|---|
| `sign_in_color_toggle_app/` | Signed-out Google sign-in view |
| `your_color_buttons/` | Desktop Buttons screen |
| `buttons_mobile_view/` | Mobile Buttons screen |
| `gym_map/` | Desktop Gym Map screen |
| `gym_map_mobile_view/` | Mobile Gym Map screen |
| `defenders_management/` | Desktop Defenders screen |
| `defenders_mobile_view/` | Mobile Defenders screen |
| `indigo_utility/DESIGN.md` | Design tokens and UX guidelines |

The export defines the **Indigo Utility** design language: Inter typography, deep indigo primary navigation and actions, light slate surfaces, compact utility spacing, subtle elevation, mobile-first layouts, and reserved utility colors for color states and gym status.

The app already has working behavior that must be preserved:

- Google sign-in and Drive / Sheets authorization flows.
- Spreadsheet resolution and pessimistic persistence for color button state.
- Routes for Buttons, Map, and Defenders.
- Leaflet map, location watching, centered crosshair, gym save/edit flows, and marker rendering.
- Defenders filtering, nearby calculation, quick defend, inline edit, delete confirmation, empty states, and refresh.

---

## Decision

Adopt the Stitch export as the frontend UX source of truth and migrate the existing Angular UI incrementally to the **Indigo Utility** design system.

We will **change the existing components rather than rebuild from scratch**.

The exported HTML is a design reference, not application source. Implementation should translate the Stitch design into Angular templates, component CSS, and shared style tokens while preserving the existing app architecture and runtime behavior.

| Item | Decision |
|---|---|
| Implementation approach | Incremental migration of existing Angular components |
| Design source of truth | `docs/guidelines/stitch_color_toggle_gym_tracker.zip` |
| Design language | Indigo Utility |
| Behavior source of truth | Existing Angular services, components, repositories, Signals, and routes |
| Exported HTML usage | Reference only; do not copy wholesale as static app code |
| Skill support | Add platform-neutral `docs/agent-skills/stitch-ux-design` for future UI work, with `.codex/skills/stitch-ux-design` as a thin Codex adapter |

Key implementation rules:

1. Preserve behavior first. UI changes must not regress auth, storage, map, or defenders workflows.
2. Introduce shared design tokens/classes before broad screen rewrites.
3. Migrate screen by screen: shell/sign-in, Buttons, Map, then Defenders.
4. Use the matching desktop and mobile Stitch artifacts for each screen.
5. Keep all current loading, saving, refreshing, empty, validation, and error states.
6. Verify responsive behavior at mobile and desktop viewports after each substantial screen migration.

Alternatives considered:

| Alternative | Reason rejected |
|---|---|
| Rebuild from the Stitch HTML export | Would risk losing Angular bindings, Signals state, auth/storage workflows, Leaflet lifecycle handling, accessibility attributes, and edge-state behavior. |
| Keep current Bootstrap UI and only adjust colors | Would not deliver the exported UX, layout, elevation, mobile treatment, or interaction polish. |
| Introduce a new component framework | Adds dependency and migration risk without solving the core translation work from Stitch to Angular. |
| Create a separate design prototype app | Splits implementation from production behavior and makes drift more likely. |

---

## Implementation

Expected implementation sequence:

| Phase | Expected changes |
|---|---|
| 1. Design foundation | Add shared CSS variables/tokens for Indigo Utility colors, Inter typography, radii, shadows, spacing, and semantic state colors. |
| 2. App shell and sign-in | Replace the default Bootstrap-feeling shell with the Stitch header, drawer, signed-in identity area, global alerts, and sign-in layout. |
| 3. Buttons screen | Redesign the color tiles, state badges, refresh/status feedback, and responsive grid while preserving pessimistic saves. |
| 4. Map screen | Restyle the full-height map overlays, floating save/current-location actions, crosshair treatment, save/edit panels, markers, and success/error feedback. |
| 5. Defenders screen | Restyle tabs, list cards, status colors, quick actions, inline edit form, delete confirmation, empty states, and refresh action. |
| 6. Verification | Run frontend build/tests where practical and visually inspect desktop/mobile layouts against the Stitch export. |

Files likely to change:

| Area | Files |
|---|---|
| Global design tokens | `projects/frontend/src/styles.css` |
| App shell | `projects/frontend/src/app/app.html`, `projects/frontend/src/app/app.css`, `projects/frontend/src/app/app.ts` if minor state support is needed |
| Buttons | `features/buttons-page/*`, `features/button-board/*` |
| Map | `features/gym-map/*`, possibly `shared/components/gym-edit-panel/*` |
| Defenders | `features/defenders-page/*`, `shared/components/gym-edit-panel/*` |

Repo-global skill added for future agents:

| Skill | Purpose |
|---|---|
| `docs/agent-skills/stitch-ux-design/SKILL.md` | Canonical shared skill for future frontend UI/layout/component changes |
| `docs/guidelines/stitch-ux-design.md` | Compact reference of design tokens, screens, and implementation guardrails |
| `.codex/skills/stitch-ux-design/SKILL.md` | Thin Codex discovery adapter that points to the canonical shared skill |

---

## Usage

When changing frontend UI, agents should inspect `docs/agent-skills/` and use `docs/agent-skills/stitch-ux-design/SKILL.md`. Codex may also discover the thin `$stitch-ux-design` adapter automatically. The shared skill requires reading its compact guidelines and, when screen-specific work is needed, inspecting the matching HTML and screenshot artifacts from the Stitch zip.

The implementation should compare against both desktop and mobile Stitch screens:

```text
Sign-in changes -> sign_in_color_toggle_app
Buttons changes -> your_color_buttons + buttons_mobile_view
Map changes -> gym_map + gym_map_mobile_view
Defenders changes -> defenders_management + defenders_mobile_view
```

---

## Trade-offs

- Incremental migration takes more discipline than pasting exported HTML, but it protects working product behavior.
- Keeping Bootstrap as a foundation may require overriding default Bootstrap visual opinions so Indigo Utility remains consistent.
- The Stitch export is static; implementation must still design and verify dynamic states such as loading, saving, authorization errors, delete confirmation, and empty results.
- The zip remains the full design artifact, while `docs/guidelines/stitch-ux-design.md` is intentionally compact. Future agents may need to extract and inspect the zip for precise screen details.
- Adding a repo-global skill creates a small maintenance obligation: if the Stitch design changes, update `docs/guidelines/stitch-ux-design.md`, `docs/agent-skills/stitch-ux-design/SKILL.md`, and this ADR if the implementation approach changes.
