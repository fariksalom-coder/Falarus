# Фильм с субтитрами — video with synchronized transcript

Published: https://falarus.uz/exercise.html. Available from Games → Живая речь (Новая игра).

Local: `npm run dev:exercise`, open http://localhost:5178/exercise.html.
Build alone: `npm run build:exercise`. The main build also includes `exercise.html`.
Production entry is a separate HTML/React root, linked from GamesPage as «Новая игра».
No app auth providers, backend calls, database, admin, WhisperX or speech recording.

- `src/exercise/lesson.ts`: serializable Lesson contract, local mock, repository adapter, timeline helpers.
- `src/exercise/LessonScreen.tsx`: reusable screen receiving only `lesson`.
- `src/exercise/main.tsx`: loading boundary; replace repository with an API adapter later.
- Actual requested media belongs at `public/test/video.mp4`. It was not supplied.
- Browser file picker accepts a local video without uploading it; timestamps remain from lesson.
- All highlight timing samples `video.currentTime`; requestAnimationFrame only samples, never simulates time.
- Word intervals are start-inclusive/end-exclusive. Gaps have no active word. Clicking a word seeks.
- Video plays continuously once from start to finish, including gaps between sentences and the video ending.
- No listen/repeat/speak stages, stage announcement audio, automatic sentence rewinds, muting, or automatic loop.
- The current sentence and word follow media time; translations remain below the matching sentences. Silent gaps clear highlighting.
- Play/pause, full-video restart, previous/next sentence, exact timeline/word seeking and speed remain manual controls.
- Local file URLs are revoked when replaced/unmounted. Reload restores the configured source.

Checks: `npm run lint`, `node --import tsx --test tests/exerciseTimeline.test.ts`, `npm run build`.
Browser evidence in `docs/design/exercise/`. Existing silent clip used only to verify playback mechanics,
not to claim the example phrase is spoken. The missing-video state is intentionally visible until
matching media is provided.

2026-10-19: replaced the three-pass sentence cycle with one continuous video. Chrome mobile verification uses a synthetic five-second clip with two timed sentences and checks monotonic playback through boundaries, synchronized text, normal ending, restart, and no runtime errors. This checks player behavior; it does not validate editorial alignment in uploaded videos.

2026-10-19: Games opens the published video/film catalog at `/exercise.html`; selecting a card opens `?lesson=<id>`, and the player returns to the catalog. «Капернаум (2018)» is one of the published entries. Long transcripts render a moving window around the current line; the video clock and exact seeking remain authoritative. Subtitle import uses resumable five-minute Whisper batches with overlap ownership and cached Uzbek translations. Imported films support timestamps up to three hours; the browser upload limit remains 100 MiB. Generated subtitles require editorial review for recognition and translation accuracy.

Catalog: only published records appear, with kind, duration and an optional JPEG cover served through the publication-gated poster endpoint. Missing, empty and failed catalog states stay on the selection screen; no automatic first-video selection. `?demo=1` explicitly opens the local mock without a backend. Film media, runtime subtitles and generated poster files live in the private server store and are not committed to Git.
