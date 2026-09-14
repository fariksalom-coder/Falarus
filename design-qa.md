# Falarus reference correction — 2026-09-09

final result: passed

Reference: `/home/user/Pictures/photo_2026-09-05_12-53-02.jpg`.
Local URL: http://127.0.0.1:5186/map-preview.html

User rejected the flat three-column day grid as visually unlike the supplied screenshot. Replaced that treatment with a dimensional winding gold/silver map background, ornamental cream plaque, flag and coin, chest, large blue current-day button and the white five-row task card. Background asset was generated against the actual supplied reference; all day numbers, task labels and buttons remain live UI. The illustration is a recreation, not a pixel-identical extraction.

Earlier instruction to remove the large blue hero and bottom nav remains in effect pending clarification. Falarus branding remains top left. The 182-day route continues below the reference composition, and choosing a day still opens an animated five-stop lesson map.

## Visual review

Reference and final 460px app capture opened in the same comparison input. Source includes mobile browser chrome and removed header/footer; these are explicitly outside the current target. Corrected P2 mismatch: flat diagram and simplified plaque replaced by reference-led dimensional artwork and task-card composition. Final 390px lesson view inspected separately after entry animation. No remaining P0/P1/P2 issues in the exercised states. Small illustration and texture differences are remaining P3 fidelity limits.

## Validation

TypeScript check passed. Browser tests passed at 390, 460 and 1440px: 182 day nodes, five reference-card actions, five animated lesson stops, active lesson button, local demonstration progression, future-day locking, return navigation, no document overflow and no runtime errors. Screenshots: `docs/design/reference-map/`.

The local preview uses sample progress and a labelled demonstration lesson dialog. Production component keeps existing lesson navigation and access rules. No production deployment or push was performed.

## Fixed viewport interaction correction

The document and map viewport no longer scroll. Wheel, pointer/touch drag, arrow keys, PageUp/PageDown and Home/End translate only the world inside a fixed screen. The logo header stays stationary, later days enter from the lower edge, and the current-day button returns to the active day. Bounds are clamped; dragging suppresses accidental button clicks; keyboard focus keeps targets in view. Browser checks at 390 and 1440px confirmed document and viewport scrollTop remain zero, touch drag works, day 182 is reachable and back/current navigation work. TypeScript passed. Post-pan screenshots inspected at `docs/design/reference-map/pan-390.png` and `pan-1440.png`.
