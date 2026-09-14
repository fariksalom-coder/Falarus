# Live lesson dialogue correction — 2026-09-08

The section 5 live AI teacher had contradictory instructions: give a model
answer when the learner does not know, do not give the answer on failure,
wait for the learner, and never remain silent. These were replaced by one
policy in `server/services/liveLessonPrompt.ts`, including matching grading
tool descriptions in `ustozLive.service.ts`.

The policy asks one question and waits. An unknown or incorrect answer gets
a Russian model answer and an explicit request to repeat it. A successful
repetition completes the question, recording assistance in the explanation.
After two unsuccessful repetition attempts, the teacher moves on gently.
Silence is not an answer. Explicit skip requests are accepted.

Session-local progress makes grading idempotent. Delayed or omitted tool
events must not rewind the spoken lesson; unreported answers remain ungraded
in history. Tool responses and audio in the same provider message are both
processed. Early farewell corrections preserve the repetition phase.

Validation:

- Local and server `npm run lint` passed.
- `node --import tsx --test tests/liveQuestionProgress.test.ts` passed:
  duplicate, malformed, premature extra, missing and delayed grading events.
- Synthetic audio conversation against the configured Gemini Live model and
  Leda voice passed. Five 16 kHz PCM learner answers produced six teacher
  turns. The teacher supplied `яблоко`, waited, accepted the repetition and
  moved to `книга`; after two failed repetitions it moved to the water question.
  Final run graded question 1 true with assistance and question 2 false.
- The final run returned 125 PCM packets at 24 kHz, 26.40 seconds of teacher
  audio. Transcript and tool events: `live-dialogue-probe.json`.

The audio harness needed an explicit audio-stream-end event after each
synthetic recording; initial attempts stalled and closed with provider code
1008. This harness adjustment was not applied to production's continuously
streamed microphone. The probe bypassed application authentication and
database writes and used synthetic inputs only. It validates observed AI
behavior, not a deterministic guarantee for every utterance or device.

Deployment: the two backend modules were uploaded to `/home/ubuntu/Falarus`
on `82.115.50.100`; PM2 `app` was restarted. Source checksums matched.
Backup: `/home/ubuntu/backups/live-dialogue-before-20260908.tar.gz`.
No UI, model, microphone, playback or service-worker change was made.
New sessions load the corrected instructions.
