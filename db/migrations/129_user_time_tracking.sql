-- 129_user_time_tracking.sql
-- Adds per-user time-in-app tracking so we can:
--   1. Show a real "vaqt" metric in Statistika instead of an estimate.
--   2. Award a small XP bonus for time spent on the platform.
-- Idempotent: safe to run multiple times.

-- Total time (in seconds) accumulated by the user across all sessions.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS total_time_seconds bigint NOT NULL DEFAULT 0;

-- Cached "longest streak ever" so we don't rescan the full history each request.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS best_streak_days integer NOT NULL DEFAULT 0;

-- Per-day time bucket, one row per (user, calendar day in app TZ).
-- Updated by the heartbeat endpoint (+60s per beat, deduplicated by day).
CREATE TABLE IF NOT EXISTS user_daily_time (
  user_id       integer     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date date        NOT NULL,
  seconds       integer     NOT NULL DEFAULT 0,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_user_daily_time_user_date
  ON user_daily_time (user_id, activity_date DESC);

CREATE INDEX IF NOT EXISTS idx_user_daily_time_date
  ON user_daily_time (activity_date);

-- Optional: cap absurd values (e.g. runaway heartbeats). 24h * 3600s = 86400.
ALTER TABLE user_daily_time
  ADD CONSTRAINT user_daily_time_seconds_sane CHECK (seconds >= 0 AND seconds <= 86400);
