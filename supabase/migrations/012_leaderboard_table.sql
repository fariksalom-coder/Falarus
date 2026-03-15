-- Cached leaderboard: precomputed total_points and rank for fast reads

CREATE TABLE IF NOT EXISTS leaderboard (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_points BIGINT NOT NULL DEFAULT 0,
  rank INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard(rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard(user_id);

-- Backfill: one row per user with current total_points; rank set by recalculate job
INSERT INTO leaderboard (user_id, total_points, rank, updated_at)
SELECT id, COALESCE(total_points, 0)::BIGINT, 0, NOW()
FROM users
ON CONFLICT (user_id) DO UPDATE SET
  total_points = EXCLUDED.total_points,
  updated_at = EXCLUDED.updated_at;

-- Initial rank calculation (RANK() OVER ORDER BY total_points DESC)
WITH ranked AS (
  SELECT user_id, RANK() OVER (ORDER BY total_points DESC) AS new_rank
  FROM leaderboard
)
UPDATE leaderboard l
SET rank = ranked.new_rank::INT
FROM ranked
WHERE l.user_id = ranked.user_id;
