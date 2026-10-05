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
