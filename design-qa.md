# Диктант · 2026-09-20

[Проверки UI и игровых сценариев](docs/design/dictation/README.md). [Архитектура и эксплуатация](docs/dictation/README.md).

---

# Создание урока из видео · 2026-09-19

Implementation and full-cycle verification completed. [Detailed evidence](docs/design/video-lessons/README.md). Supplied 18m48s film processed into 216 sentences / 761 word tokens in 1330.52 seconds; result saved as a production draft for editorial review. Existing universal player, desktop/mobile editor, private media, translation, correction, publication and export checked.

---

# Живая речь — frontend exercise · 2026-09-19

final result: passed

Source: `/home/user/Downloads/FalaRus Banner standalone (1).html`, captured as `docs/design/exercise/reference.png` at 1600×900, DPR 1. Implementation: `desktop-missing-video.png` at the same viewport, plus `mobile-highlight.png`, `mobile-speak.png` (390×844) and `mobile-320.png` (320×740), all DPR 1. Source and implementation images reviewed together. This is an adaptation of the banner’s exercise screen into a working full-screen web exercise, not a clone of the marketing banner or fake phone frame.

Fidelity surfaces: reused source Manrope WOFF2 fonts; white/navy/blue #1B5AF2 palette, rounded word blocks, compact speed chips and three mode tabs. Desktop intentionally places media and transcript side by side; mobile stacks them. Existing official brand mark replaces the reference’s illustrative speech-bubble mark. No generated illustrations or fake speaker image. Source reference contains a placeholder speaker image; missing media has a real recoverable file-selection state. All lesson-specific titles, text, translation, source and timings come from Lesson. Mode instructions are reusable UI copy.

Findings: no remaining actionable P0/P1/P2 visual issues. Controls remain reachable by scrolling at narrow widths; no horizontal overflow at 320px. The three modes remain available near the bottom on mobile. Focus and pressed states, reduced motion and descriptive control labels are present. Full-view and readable mobile detail captures cover word chips, media, controls and speaking state; no further crop was needed. No visual-fix iterations were needed.

Verified: actual HTMLMediaElement playback with an existing local silent clip, boundary/gap highlighting, all five playback rates, play/pause, seek by word, loop property, stopping and hiding video in Speak, self-completion, file selection, missing video, and no backend requests from the standalone screen. Browser runtime exceptions: zero in exercise journey. Timeline unit tests, TypeScript and complete production build passed. Games card navigation checked in the local production build using a browser-only mock profile; no test account or backend change.

Limitation: the requested `/test/video.mp4` is not supplied. Silent test media was selected temporarily in the QA browser, never placed at the lesson URL. End-to-end correspondence between the spoken phrase and supplied timestamps cannot be verified until that video is provided. This does not block the frontend prototype; it is not a content-complete lesson.

Architecture: independent `exercise.html` entry and local LessonRepository. No WhisperX, API, database, admin, recording or persistence. One new GamesPage card links to this entry. Published after local QA at https://falarus.uz/exercise.html. Only frontend sources/static build were deployed. Backup: `/home/ubuntu/backups/exercise-20260919-142531`. No backend, database, WhisperX, Nginx or PM2 changes.

---

# FalaRus kiosk quiz and discounts — 2026-09-19

final result: passed

Current task report: [docs/design/kiosk/design-qa.md](docs/design/kiosk/design-qa.md).
The original bundled reference and the implementation were compared at 1920×1080; mobile screens were checked at 390×844. The test-to-coupon-to-admin-redemption journey passed against an isolated local database. TypeScript, service tests, and production build pass. This feature has not been deployed to production.

---

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
