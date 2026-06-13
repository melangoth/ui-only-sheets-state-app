# Stitch UX Design Guidelines

Source artifacts live in `docs/guidelines/stitch_color_toggle_gym_tracker.zip`, exported from Google Stitch. Treat them as the product design source of truth for frontend UI work.

## Product Screens

- Signed-out Google sign-in screen.
- Signed-in app shell with header, hamburger drawer, user email, sign-out, optional clear credentials, authorization retry, and global auth/storage alerts.
- Buttons screen with six color tiles and Passive/Active persisted state.
- Gym Map screen with full-height Leaflet map, centered crosshair, current location, saved gym markers, save panel, edit panel, overlays, and toast feedback.
- Defenders screen with Defending/Nearby tabs, gym list, quick defend, inline edit, delete confirmation, empty states, and refresh.

## Design System

Name: Indigo Utility.

Personality: professional, systematic, unobtrusive, high-utility, "Bootstrap-plus". Favor clear hierarchy, compact density, scanning speed, and touch accuracy.

Core colors:

- Background/surface: `#f7f9fb`
- White card surface: `#ffffff`
- Surface containers: `#f2f4f6`, `#eceef0`, `#e6e8ea`, `#e0e3e5`
- Text: `#191c1e`
- Muted text: `#464554`
- Outline: `#777586`
- Outline variant: `#c7c4d7`
- Primary indigo: `#2a14b4`
- Primary container: `#4338ca`
- Inverse primary: `#c3c0ff`
- Secondary slate: `#505f76`
- Error: `#ba1a1a`

Functional colors:

- Keep app color toggles distinct: red, blue, green, yellow, purple, orange.
- Active state uses green-tinted feedback.
- Passive state uses muted slate/gray feedback.
- Defended gyms use green.
- Undefended gyms use blue.

Typography:

- Use Inter.
- Page display: 36px, 700, 1.2 line height.
- Desktop large headline: 28px, 600.
- Medium headline: 20px, 600.
- Body large: 16px, 400.
- Body medium: 14px, 400.
- Labels: 14px, 600 or 12px, 500.
- Mobile large headline: 24px, 600.

Spacing and layout:

- Use a 4px baseline.
- Mobile: single column, 16px side margins.
- Desktop/tablet: use responsive grids, usually 3-up or 2-up depending on content complexity.
- Use 8px between related controls and 24px between distinct sections.
- Primary mobile actions need at least 44px height; prefer 48px.

Shape and elevation:

- Buttons and inputs: 8px radius.
- Larger cards/modals: 16px radius.
- Selection tiles: 12px radius.
- Badges/chips: full pill radius.
- Cards use white surfaces, subtle borders, and soft low-opacity shadows.
- Drawers use clean surfaces and borders, not heavy shadows.
- Floating map actions use stronger shadows to separate from map content.

## Implementation Notes

- Build from existing Angular components, not from raw exported HTML.
- Translate Stitch HTML/CSS into Angular templates, component CSS, and shared tokens.
- Keep semantic Angular bindings and ARIA labels from the current app.
- Use lucide or existing icon libraries only if introduced intentionally; otherwise use clear text/icon affordances without adding a broad dependency.
- Validate against both desktop and mobile exported screenshots for the affected screen.
- Avoid one-off CSS values when a shared token/class should exist.
