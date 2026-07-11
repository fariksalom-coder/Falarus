-- 130_user_achievements.sql
-- Per-user achievement unlocks (streak medals + words-learned medals).
-- Read-heavy: users open Statistika often. Write-light: 1 insert per unlock.
-- Achievement definitions live in shared/achievements.ts; the DB stores only
-- the key string so we can add/remove medals without a migration.
--
-- Idempotent: safe to run multiple times.

CREATE TABLE IF NOT EXISTS user_achievements (
  user_id          integer     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_key  text        NOT NULL,
  unlocked_at      timestamptz NOT NULL DEFAULT now(),
  -- Notified: has the client already seen the celebration modal for this
  -- unlock? We ack via POST /api/achievements/ack so the modal only fires
  -- once even if the user reloads.
  notified         boolean     NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, achievement_key)
);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user
  ON user_achievements (user_id);

-- Newly-unlocked-but-not-yet-shown lookup (hot path — every heartbeat).
CREATE INDEX IF NOT EXISTS idx_user_achievements_pending
  ON user_achievements (user_id) WHERE notified = false;
