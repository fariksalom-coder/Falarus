# Video lesson creator verification

The existing FalaRus admin shell is reused. The editor is a separate admin route; the existing universal exercise renders every generated lesson via a data adapter. No lesson-specific frontend is generated.

## Completed checks

- TypeScript and complete production build pass.
- Five focused tests pass: asynchronous upload/process/edit/publish flow, admin protection, draft media privacy, HTTP ranges, revision conflicts, timestamp/text validation, translation retry preserving transcription, and exercise timeline boundaries.
- Real 124.233-second video passed the entire isolated browser flow: upload → CPU WhisperX → translation → editor correction/save → existing player preview → publication → public video range request.
- Initial recognition/alignment/translation took 253.42 seconds; 27 sentences and 136 words. All word intervals were positive and ordered.
- Translation prompt was improved after detecting transliterated Russian instructions. Retest produced `18-topshiriq.`, `5-yozma topshiriq.`, and `Anketani to‘ldiring.`. The bilingual source contains some unclear fragments; these are marked for manual review and blocked from publication.
- Browser checks cover desktop and 390px mobile, existing player's three modes, word highlighting from real video time, pause/hide video in speaking mode, next sentence and public media playback. No runtime exceptions during the completed short-video flow.
- Production health and public endpoints return 200; unauthenticated admin API returns 401; authenticated admin listing returns 200. No database migration, new npm dependency, Nginx or SSL change.

`full-cycle.json` records the short-video full-cycle run. Earlier screenshots capture the initial translation before its correction. `lesson1-*` captures concern the supplied Russian film; final review is recorded separately once processing completes.

## Deployment

Source backup: `/home/ubuntu/backups/video-lessons-20260919-145327/source-before.tar`.
Build installed with the project's existing atomic deployment script. PM2 app was restarted to activate the new API; PM2 configuration was not changed.

## Supplied Russian film — completed

`Мы_говорим_по_русски_Урок_1_Знакомство_1977.mp4`: 1127.933 s / 99.3 MiB. Processing took 1330.52 s on CPU. Output: 216 sentences, 761 word tokens; no missing, zero-length, reversed or out-of-order intervals; no schema/publication validation issues. Uzbek Latin translation generated for every sentence.

Actual browser QA passed all five playback rates, three modes, currentTime highlighting, speaking-mode pause/hide, next sentence and seek on return to listening. Isolated publication passed (200), public media range 206, and returning to draft restored public 404. Mobile editor/player have no horizontal overflow at 390px. Final screenshots: `lesson1-editor-desktop.png`, `lesson1-editor-mobile.png`, `lesson1-player.png`, `lesson1-speak.png`.

The complete result was copied to production as **draft**, ID `065b91d7-53cb-448b-a37f-9744b11c4781`, title “Урок 1 · Знакомство”. Authenticated production GET/export return 200, private media range 206, unauthenticated public lesson 404. Russian ASR still contains content mistakes (e.g. “На каком кусе…”); automatic timing validation is not editorial approval. The original machine transcript is retained for correction, not silently rewritten.

Local artifacts: `docs/video-lessons/lesson-001.json` and `lesson-001-transcript.txt`. Evidence: `lesson1-browser.json`, `lesson1-publication.json`, `lesson1-validation.json`.

## Compact player revision

Per user request, the player now has exactly three fixed viewport regions: video at the top, an independently scrollable numbered sentence list, and playback/speed controls at the bottom. Header, lesson title, intro, hints, mode tabs, counters and footer were removed. Uzbek translations increased to 17px on mobile / 18px desktop. Existing lesson data and server processing remain unchanged.

Verified locally with the complete supplied film at 390×844, 320×640, 1440×900 and 844×390: no page overflow, video/control bounds unchanged when the sentence list scrolls, 216 sentences rendered, currentTime word highlighting, previous/next, repeat playback and all five rates. TypeScript, exercise build and timeline test pass. Screenshots: `compact-mobile.png`, `compact-small.png`, `compact-desktop.png`, `compact-landscape.png`.

## Three-pass practice and lead-in — 2026-09-20

Word selection, sentence navigation and restart now seek two media seconds before the requested timestamp (clamped to zero). The selected sentence is tracked separately from the video clock so preparatory footage cannot switch selection to the previous sentence. Word timestamps themselves remain unchanged.

Every sentence runs three passes: Tinglang (audio), Takrorlang (audio), Gapiring (muted). A fixed-size Uzbek stage badge sits at the bottom of the video, leaving the speaker's face visible. After the third pass, the next sentence starts with audio restored. The final sentence stops after its third pass; optional lesson looping restarts the first sentence. Pause/resume retains the current pass. Clicking a word or navigation/restart begins a fresh cycle; later passes replay the whole sentence. Two seconds refers to media time and therefore scales with playback rate.

Real-video browser checks passed: sentence and mid-sentence word lead-in, all three passes at real playback speed, mute restoration, fixed badge position, pause/resume, next/previous, all five speeds, final-sentence completion, restart and full-lesson looping. TypeScript, exercise build and timeline tests checked. Screenshots: cycle-repeat.png and cycle-speak.png.

Follow-up: preparation lead-in reduced from 2 to **1.5 media seconds** at the user's request. This shared offset applies to word selection, sentence navigation and all three passes; starts remain clamped to zero.
