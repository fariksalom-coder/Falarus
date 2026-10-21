# Paywall pricing and playback controls · 2026-10-01

final result: passed

Scope: adapt the supplied blue/yellow pricing-card reference to the existing unpaid-course screen. The user explicitly requested preserving the current large video region and applying the same visual style to the bonus and all 1/3/6-month tariffs. Local changes only.

Source visual truth: `docs/design/paywall/reference.png` (397 × 634 pixels). Browser implementation evidence: `docs/design/paywall/mobile-bonus.png`, `mobile-tariffs.png` (397 × 950); `desktop-bonus.png`, `desktop-tariffs.png` (1280 × 950). Chrome CDP, deviceScaleFactor 1; all screenshots use CSS pixels with no density resampling. Narrow-width evidence: `mobile-bonus-320.png` from a 320 × 900 viewport. The existing authenticated layout, large video and dark page background are intentional retained product constraints.

Full-view comparison: source and mobile/desktop captures opened and reviewed together. The source's pricing panel and speed selector are the fidelity targets; existing branding, warnings, native video controls and app navigation are retained by scope. The bonus is shown after the final video-complete response, with 2.5× selected for the mobile view. Live deadline values differ naturally from the static source.

Focused comparison evidence: `comparison-bonus.png` places the source's 367 × 279 card next to the browser's 365 × 305 card at 1× density. `comparison-speed.png` places the source's 348 × 42 selector next to the browser's 365 × 48 selector. Additional detail captures: `mobile-tariff-cards.png`, `mobile-six-month-card.png`, and `mobile-speed.png`.

**Findings**

No actionable P0/P1/P2 issues remain in the requested scope.

- Fonts/typography: locally hosted Inter; matched bold white title, uppercase muted-blue eyebrow, large yellow price, smaller crossed-out reference prices, and bold yellow-button text. Prices remain readable without truncation at 320px.
- Spacing/layout: 28px card corners, 18px horizontal padding, 74px yellow badge, 16px inner panel/button corners. The bonus adds a short explanation of the actual 3-for-6 benefit, increasing card height by 26px. This preserves existing purchase meaning and is an intentional content adaptation. Speed selector uses four equal-width targets and a raised white active segment; its 48px height supports touch use. Mobile tariffs stack; desktop tariffs share a three-column grid.
- Colors/tokens: royal-blue card, yellow prices/badge/CTA, white headings, muted-blue comparison prices and dark-blue countdown row match the source's hierarchy. Yellow outline preserves the existing recommended three-month state.
- Image quality/assets: actual course videos and official logo retained. `public/paywall/offer-decoration.webp` is a generated raster decoration grounded in the source ring, inspected and optimized to 2.8KB. No placeholder video or fake brand asset. ArrowRight uses the established icon library.
- Copy/content: current prices remain 400,000 / 530,000 / 790,000 UZS and 3,000 / 4,000 / 6,000 RUB. Bonus remains 530,000 UZS / 4,000 RUB for six months. Crossed-out UZS baseline comes from the actual monthly catalog rather than copying the mock's outdated 2,385,000 value. Bonus discount is 78%, and normal three-/six-month discounts are 56%/67%.

**Comparison History**

1. Initial capture: an existing notification-permission modal appeared over the mobile bonus. This was a capture-state mismatch, not a paywall change. The QA browser exercised the existing deferred-notification state and captured the unobstructed screen again.
2. Final comparison: unobstructed source and implementation reviewed together in the full view and focused comparison images. Requested card hierarchy and active speed state match. Intentional retained layout and dynamic-content differences are listed above. No P0/P1/P2 styling fix was required.

**Implementation Checklist**

- [x] Shared card component for bonus and all three tariffs.
- [x] Existing video dimensions and sequence behavior retained.
- [x] Equal-width speed selector with active, focus and pressed states.
- [x] Bonus countdown rendered as separate minute/second cells.
- [x] Checked 320px, 397px and 1280px layouts; no horizontal overflow; final mobile tariff CTA reachable above navigation.
- [x] Checked all four purchase actions: month, three_month, six_month, and welcome_offer + three_month payloads.
- [x] Browser purchase transport replaced with test responses; no real invoice or payment created in this design check.
- [x] Browser runtime exceptions: zero. Pre-existing background API errors from the old local schema are outside this styling scope.
- [x] TypeScript and production build passed; git diff whitespace check passed.

**Follow-up Polish**

None required for this scoped change. Backend payment correctness was verified in the preceding task with the real local schema and mocked provider responses; live checkout was not repeated during this styling pass.

---

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


## Journey.dc.html Map Update (2026-10-01)

Source: /Users/kamronbekfaxriddinov/Downloads/182 kunlik sayohat-html/Journey.dc.html
Implementation: http://localhost:3002/kunlik-reja/xarita
Evidence: source and implementation screenshots displayed together in the final browser comparison in this task; captures were not exported to disk.
Source size: 390 x 844 CSS pixels. Implementation: 469 x 814 CSS pixels; responsive width differs, no pixel-exact equivalence claimed.
State: unpaid preview account, zero completed days.

Matched: blue rounded summary, two statistics, white tariff row with gold icon, blue trial node, light dotted winding road, white locked nodes and light navigation. Road repeated through day 182. Existing Telegram hand retained as requested. Real 0% progress is intentionally an empty ring instead of the mockup's full gold ring. Existing app navigation and lack of decorative header circle are minor reference differences.

Comparison history: initial hand overlapped START; shifted it left. Final screenshot confirms readable badge. Home navigation now selected on map and day routes. No visible text overlap or horizontal overflow in the inspected mobile state.

Checks: TypeScript passed; DOM has 182 paid-day nodes ending at 182-kun plus trial day. Trial button opens the five-stage day hub. Locked day opens subscription dialog. Tariff action opens course video. Preview DB only; no deployment. Paid/golden browser states and exact 390px matching remain additional verification gaps.

final result: passed


## Special Offer and Trial Completion (2026-10-01)

Source: Downloads/falarus-video-offer.html, special-offer section only.
Compared reference and implementation simultaneously in two 440px-wide iframes in the same browser screenshot. Final screenshot after normalizing line-height confirms matching 408px card width, 28px corners, 20px padding, badge, price hierarchy, countdown row and yellow action. Existing video controls/header intentionally remain unchanged. Letter spacing follows app policy (0); crossed-out UZS reference uses actual monthly price x 6 (2,400,000), not the mock's 2,385,000. Timer values differ because the app uses server expiry.

Browser checks: active offer hides all standard tariff radios; feedback has only Yes and accessible close control; Yes opens course video; close remains on map; a completed unpaid trial points the animated hand at locked day 1. Desktop layout also inspected. Live payment and microphone conversation not exercised.

final result: passed
