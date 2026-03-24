-- Hide specific accounts from all leaderboard views/ranks permanently.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS hide_from_leaderboard BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_hide_from_leaderboard
  ON users (hide_from_leaderboard);

UPDATE users
SET hide_from_leaderboard = TRUE
WHERE lower(email) = 'fariksalom@gmail.com';

CREATE OR REPLACE FUNCTION get_period_leaderboard(
  period_kind TEXT,
  period_value DATE,
  lim INTEGER DEFAULT 100
)
RETURNS TABLE (
  id BIGINT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  points INTEGER,
  rank BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH snapshot_scores AS (
    SELECT pe.user_id, MAX(pe.points)::INTEGER AS points
    , MAX(pe.created_at) AS snapshot_created_at
    FROM point_events pe
    WHERE
      (period_kind = 'daily' AND pe.event_type = 'daily_snapshot' AND pe.activity_date = period_value)
      OR (period_kind = 'weekly' AND pe.event_type = 'weekly_snapshot' AND pe.activity_week_start = period_value)
    GROUP BY pe.user_id
  ),
  award_scores AS (
    SELECT pe.user_id, SUM(pe.points)::INTEGER AS points
    FROM point_events pe
    LEFT JOIN snapshot_scores ss ON ss.user_id = pe.user_id
    WHERE pe.event_type = 'award'
      AND (
        (period_kind = 'daily' AND pe.activity_date = period_value)
        OR (period_kind = 'weekly' AND pe.activity_week_start = period_value)
      )
      AND (ss.snapshot_created_at IS NULL OR pe.created_at > ss.snapshot_created_at)
    GROUP BY pe.user_id
  ),
  merged AS (
    SELECT
      COALESCE(a.user_id, s.user_id) AS user_id,
      (COALESCE(s.points, 0) + COALESCE(a.points, 0))::INTEGER AS points
    FROM award_scores a
    FULL OUTER JOIN snapshot_scores s ON s.user_id = a.user_id
  ),
  ranked AS (
    SELECT
      m.user_id,
      m.points,
      RANK() OVER (ORDER BY m.points DESC) AS rank
    FROM merged m
    JOIN users u ON u.id = m.user_id
    WHERE m.points > 0
      AND COALESCE(u.hide_from_leaderboard, FALSE) = FALSE
  )
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.avatar_url,
    r.points,
    r.rank
  FROM ranked r
  JOIN users u ON u.id = r.user_id
  ORDER BY r.rank ASC, u.id ASC
  LIMIT GREATEST(COALESCE(lim, 100), 1);
$$;

CREATE OR REPLACE FUNCTION get_period_user_rank(
  period_kind TEXT,
  period_value DATE,
  requested_user_id BIGINT
)
RETURNS TABLE (
  id BIGINT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  points INTEGER,
  rank BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH snapshot_scores AS (
    SELECT pe.user_id, MAX(pe.points)::INTEGER AS points
    , MAX(pe.created_at) AS snapshot_created_at
    FROM point_events pe
    WHERE
      (period_kind = 'daily' AND pe.event_type = 'daily_snapshot' AND pe.activity_date = period_value)
      OR (period_kind = 'weekly' AND pe.event_type = 'weekly_snapshot' AND pe.activity_week_start = period_value)
    GROUP BY pe.user_id
  ),
  award_scores AS (
    SELECT pe.user_id, SUM(pe.points)::INTEGER AS points
    FROM point_events pe
    LEFT JOIN snapshot_scores ss ON ss.user_id = pe.user_id
    WHERE pe.event_type = 'award'
      AND (
        (period_kind = 'daily' AND pe.activity_date = period_value)
        OR (period_kind = 'weekly' AND pe.activity_week_start = period_value)
      )
      AND (ss.snapshot_created_at IS NULL OR pe.created_at > ss.snapshot_created_at)
    GROUP BY pe.user_id
  ),
  merged AS (
    SELECT
      COALESCE(a.user_id, s.user_id) AS user_id,
      (COALESCE(s.points, 0) + COALESCE(a.points, 0))::INTEGER AS points
    FROM award_scores a
    FULL OUTER JOIN snapshot_scores s ON s.user_id = a.user_id
  ),
  ranked AS (
    SELECT
      m.user_id,
      m.points,
      RANK() OVER (ORDER BY m.points DESC) AS rank
    FROM merged m
    JOIN users u ON u.id = m.user_id
    WHERE m.points > 0
      AND COALESCE(u.hide_from_leaderboard, FALSE) = FALSE
  )
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.avatar_url,
    COALESCE(r.points, 0)::INTEGER AS points,
    COALESCE(
      r.rank,
      (SELECT COUNT(*)::BIGINT FROM ranked) + 1
    ) AS rank
  FROM users u
  LEFT JOIN ranked r ON r.user_id = u.id
  WHERE u.id = requested_user_id
    AND COALESCE(u.hide_from_leaderboard, FALSE) = FALSE;
$$;

GRANT EXECUTE ON FUNCTION get_period_leaderboard(TEXT, DATE, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_period_user_rank(TEXT, DATE, BIGINT) TO anon, authenticated, service_role;
