# Dialogue game

Route: `/games/dialogue`. Authenticated API: `/api/games/dialogue`.

The supplied catalog lists 20 topics. The 11 complete JSON packs contain 88
situations and 1,034 turns. Topics without authored dialogues are omitted;
the four-topic frontend demo is a visual reference, not production curriculum.
Illustrations and CSS come from the supplied package. The available illustrations
are reused for additional topics; topic and situation names identify their content.

## Implementation and data protection

- Migration 203 adds four isolated `dialogue_*` tables. User IDs reference the
  existing integer `users.id`; no Supabase `auth.users` or RLS functions are used.
- `node --import tsx server/scripts/seedSituations.ts` validates every supplied
  dialogue before import and upserts content in one transaction. It never deletes
  situations, sessions, progress, or any existing game data. Do not execute the
  original SQL seeds: they delete turns and depend on the original Supabase schema.
- Each active session snapshots its content so a later content import cannot
  change the question while the learner is answering it.
- Correct-answer flags are stored on the server. The catalog exposes metadata
  and counts; a session exposes only the current options and completed messages.
- Session starts and answers use request UUIDs. Starts resume unfinished situations.
  Answer replays do not change mistakes, attempts, or stars. The same wrong option
  is counted once per turn. Two distinct wrong choices count as two mistakes.
- Progress retains the best stars (3/2/1 for 0/1/2+ mistakes) and the fewest mistakes.
  Total stars sum best results; repeated completion earns only the improvement.
- The existing premium navigation rule remains in force. Server starts also enforce
  the shared three-game free quota: a new dialogue situation consumes one play;
  resuming it consumes none. Existing game starts use the same user transaction lock
  to prevent simultaneous opens from exceeding the aggregate quota.
- Expired premium cannot answer or resume a premium-created session without renewal.
  Auth middleware preserves operator debt freezes; user access freezes are checked
  again inside mutations. Session and progress queries always scope by user.

## Verification and deployment

Run `npm run lint`, `node --import tsx --test tests/situations.test.ts`, and
`npm run build`. Tests exercise an actual PostgreSQL engine (PGlite): migration
reruns, all imported data, server grading, request replays, resume, owner isolation,
quota, expiry, best stars and import preserving progress.

Before deploying, create a full server database/code/media backup. Apply only
migration 203, then run the transactional seed. Deploy the feature files, build
atomically and restart the app. Verify authenticated catalog/session/answer APIs,
active compiled assets, static illustrations and external health.

For rollback, restore the previous feature code and `dist.rollback`, restart the
app, and retain the additive database tables so newly recorded progress survives.
Do not restore an entire database backup over payments or other new production data.

Browser visual verification is pending: this session exposes no browser tool.
Inspect the topic grid, long situation names, scrolling chat, wrong-answer state,
translation toggle, completion sheet and resume at mobile widths and short heights.

## Automatic Russian speech

Screen progression follows actual audio completion: the partner message appears
and plays in the female voice, then three choices become visible. After the
server accepts a correct answer, its message appears and plays in the male voice.
Only after that audio ends does the next partner message appear and start playing.
The result sheet also waits for the last learner answer to finish. A turn with
multiple audio chunks unlocks choices only after the last chunk. There is no
fixed 800 ms timer. Muting or a speech failure releases the flow; blocked mobile
autoplay waits for a user gesture. Historical replay hides choices while playing.
`tests/dialogueTurnPlayback.test.ts` verifies this complete order and cancellation.

Partner lines use the female `nova` voice (`dialogue-female`); accepted learner
replies use the male `onyx` voice (`dialogue-male`). Replaying a message preserves
its speaker. Both client and server caches separate the voice profiles, including
when the two speakers say exactly the same phrase. Other TTS profiles retain
their existing voices.

The game uses the existing authenticated `/api/tts` service, its native Russian
pronunciation instructions and server audio cache, at speed 1. Incoming partner
lines and server-accepted learner replies play through a sequential queue.
Wrong answers are never spoken. Resuming a session reads its current question,
not the entire history. Long messages are split into chunks of at most 200 characters.

Each message has a replay button; the header has a sound toggle. Leaving the
chat, switching situations, muting, or replaying cancels the previous queue and
ignores delayed callbacks. A mobile autoplay prompt asks the learner to touch the
screen when required. Server failures show a retry notice; device speech synthesis
is disabled for this game so the pronunciation voice stays consistent.

`tests/dialogueSpeech.test.ts` checks the server character limit, playback order,
errors and cancellation. `scripts/smoke-situations.mjs` requests a partner line
and a correct reply from the deployed TTS API and verifies their audio codecs
with ffprobe in addition to the existing game checks.
