# Живая речь — frontend exercise · 2026-09-19

final result: passed

Source: `/home/user/Downloads/FalaRus Banner standalone (1).html`, captured as `docs/design/exercise/reference.png` at 1600×900, DPR 1. Implementation: `desktop-missing-video.png` at the same viewport, plus `mobile-highlight.png`, `mobile-speak.png` (390×844) and `mobile-320.png` (320×740), all DPR 1. Source and implementation images reviewed together. This is an adaptation of the banner’s exercise screen into a working full-screen web exercise, not a clone of the marketing banner or fake phone frame.

Fidelity surfaces: reused source Manrope WOFF2 fonts; white/navy/blue #1B5AF2 palette, rounded word blocks, compact speed chips and three mode tabs. Desktop intentionally places media and transcript side by side; mobile stacks them. Existing official brand mark replaces the reference’s illustrative speech-bubble mark. No generated illustrations or fake speaker image. Source reference contains a placeholder speaker image; missing media has a real recoverable file-selection state. All lesson-specific titles, text, translation, source and timings come from Lesson. Mode instructions are reusable UI copy.

Findings: no remaining actionable P0/P1/P2 visual issues. Controls remain reachable by scrolling at narrow widths; no horizontal overflow at 320px. The three modes remain available near the bottom on mobile. Focus and pressed states, reduced motion and descriptive control labels are present. Full-view and readable mobile detail captures cover word chips, media, controls and speaking state; no further crop was needed. No visual-fix iterations were needed.

Verified: actual HTMLMediaElement playback with an existing local silent clip, boundary/gap highlighting, all five playback rates, play/pause, seek by word, loop property, stopping and hiding video in Speak, self-completion, file selection, missing video, and no backend requests from the standalone screen. Browser runtime exceptions: zero in exercise journey. Timeline unit tests, TypeScript and complete production build passed. Games card navigation checked in the local production build using a browser-only mock profile; no test account or backend change.

Limitation: the requested `/test/video.mp4` is not supplied. Silent test media was selected temporarily in the QA browser, never placed at the lesson URL. End-to-end correspondence between the spoken phrase and supplied timestamps cannot be verified until that video is provided. This does not block the frontend prototype; it is not a content-complete lesson.

Architecture: independent `exercise.html` entry and local LessonRepository. No WhisperX, API, database, admin, recording or persistence. One new GamesPage card links to this entry. Published after local QA at https://falarus.uz/exercise.html. Only frontend sources/static build were deployed. Backup: `/home/ubuntu/backups/exercise-20260919-142531`. No backend, database, WhisperX, Nginx or PM2 changes.
