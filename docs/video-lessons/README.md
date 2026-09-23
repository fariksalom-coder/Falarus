# Создание урока из видео

Admin: `/secure-admin-a9k7x4p2/video-lessons` (or configured admin base).
Player: `/exercise.html?lesson=<uuid>`. Saved draft preview: `/exercise.html?draft=<uuid>` with existing admin session.
No per-lesson frontend is generated. `lessonFromDocument` adapts stored JSON to the existing `LessonScreen`.
Opening `/exercise.html` selects the latest published lesson, falling back to the local mock when none exists.

## Storage and processing

- Private root: `VIDEO_LESSONS_DIR`, default `<project>/var/video-lessons` (not under public/uploads).
- `<uuid>/video.mp4`: original uploaded video; extension is an internal stable filename.
- `<uuid>/lesson.json`: envelope containing lesson, draft/published status, revision, processing phase and source metadata.
- `<uuid>/recognition.json`: raw WhisperX alignment; `<uuid>/last-error.txt`: diagnostic on failure.
- JSON writes are atomic. A short filesystem lock and revision number prevent concurrent edits.
- Saving a published lesson makes it a draft again; publish to restore public access. There is no revision history yet.
- Published media is streamed with HTTP Range support. Draft media requires admin Authorization; preview fetches it as a browser Blob, without putting credentials in URLs.
- Limits: one active processing request per service, CPU alignment guarded by OS flock, 100 MiB uploads, 30-minute videos, two CPU threads, nice 10, 90-minute Python timeout. No batch processing.
- `server/videoLessons/prepare_lesson.py` runs via `/home/ubuntu/whisperx/.venv/bin/python` (override `WHISPERX_PYTHON`). Uses existing cached small/int8 ASR, Russian forced alignment and Silero VAD. No diarization or Hugging Face token.
- Existing OpenAI JSON service translates sentence batches into Uzbek Latin; Gemini is selected only when OpenAI is not configured. The Russian transcript, not the video, is sent to the configured translation provider.
- Failed translation keeps transcription available. Retry translation alone. Process owner metadata allows interrupted jobs to become retryable after server restart.

## Admin API (existing admin middleware required)

- `GET /api/admin/video-lessons` — list metadata.
- `POST /api/admin/video-lessons/upload` — multipart `video`.
- `GET /api/admin/video-lessons/:id` — editor state and validation issues.
- `GET /api/admin/video-lessons/:id/video` — private video.
- `PUT /api/admin/video-lessons/:id` — `{revision, lesson}`; saves draft.
- `POST /api/admin/video-lessons/:id/process` — `{revision, kind: "recognize" | "align" | "translate"}`; returns 202, poll GET.
- `POST /api/admin/video-lessons/:id/publish` — `{revision}`; validates and publishes.
- `GET /api/admin/video-lessons/:id/export` — universal lesson JSON download.

Public: `GET /api/video-lessons`, `GET /api/video-lessons/:id`, `GET /api/video-lessons/:id/video`. Draft IDs return 404.

## Editing

Edit sentence text and translation directly. Word controls edit text/times, add/remove or move words. Changing a word updates sentence text. Changing the sentence text intentionally does not pretend old word times are valid: use “Обновить слова из текста” then supply missing times, or save and run “Перепривязать исправленный текст”. Re-alignment also regenerates translations (confirmation shown). Review translations before publication.

Publication checks nonempty Russian text, a Latin-script translation, complete positive timestamps, bounds within the video, ordered words/segments and matching Russian/word text. Forced alignment estimates acoustic boundaries; validation does not certify recognition or translation correctness. The editor remains the quality checkpoint. Empty/invalid word times are preserved for repair, never silently invented by application code.

## Checks

`npm run lint`
`node --import tsx --test tests/videoLessons.test.ts tests/exerciseTimeline.test.ts`
`npm run build`

`scripts/dev/videoLessonPreview.ts` is a loopback-only QA harness with a separate root and ephemeral admin token. It is never mounted in production. Set `VIDEO_LESSONS_TEST_DIR` explicitly. Real media and model processing are exercised through the same routes/service.
