# Живая речь — frontend prototype

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
- Speak pauses/hides video and clears timed highlighting. Self-completion is not speech recognition.
- Repeat supports speaking with playback; loop repeats the full video (explicit control label).
- Local file URLs are revoked when replaced/unmounted. Reload restores the configured source.

Checks: `npm run lint`, `node --import tsx --test tests/exerciseTimeline.test.ts`, `npm run build`.
Browser evidence in `docs/design/exercise/`. Existing silent clip used only to verify playback mechanics,
not to claim the example phrase is spoken. The missing-video state is intentionally visible until
matching media is provided.
