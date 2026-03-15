-- Optimize leaderboard reads with a single RPC and ensure indexes exist.

-- Indexes (idempotent) for faster filters and ordering
CREATE INDEX IF NOT EXISTS idx_users_total_points ON users(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Single RPC: leaderboard top 100 with user names and points (one round-trip)
CREATE OR REPLACE FUNCTION get_leaderboard(lim int DEFAULT 100)
RETURNS TABLE (
  user_id bigint,
  first_name text,
  last_name text,
  avatar_url text,
  total_points bigint,
  rank int
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    l.user_id,
    u.first_name,
    u.last_name,
    u.avatar_url,
    l.total_points,
    l.rank
  FROM leaderboard l
  JOIN users u ON u.id = l.user_id
  ORDER BY l.rank ASC
  LIMIT lim;
$$;
