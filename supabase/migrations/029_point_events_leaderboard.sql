-- Exact point event ledger for daily/weekly leaderboard.
-- New awards are written as `award` events.
-- Existing current-day / current-week counters are backfilled once as snapshots
-- so the leaderboard does not go empty immediately after deploy.

ALTER TABLE users ADD COLUMN IF NOT EXISTS points_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_points_week_start DATE;

CREATE TABLE IF NOT EXISTS point_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL CHECK (points >= 0),
  event_type TEXT NOT NULL DEFAULT 'award'
    CHECK (event_type IN ('award', 'daily_snapshot', 'weekly_snapshot')),
  source TEXT NOT NULL DEFAULT 'unknown',
  source_ref TEXT,
  event_key TEXT UNIQUE,
  activity_date DATE,
  activity_week_start DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT point_events_activity_requirements CHECK (
    (event_type = 'award' AND activity_date IS NOT NULL AND activity_week_start IS NOT NULL)
    OR (event_type = 'daily_snapshot' AND activity_date IS NOT NULL)
    OR (event_type = 'weekly_snapshot' AND activity_week_start IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_point_events_activity_date
  ON point_events(activity_date, event_type, points DESC);
CREATE INDEX IF NOT EXISTS idx_point_events_activity_week
  ON point_events(activity_week_start, event_type, points DESC);
CREATE INDEX IF NOT EXISTS idx_point_events_user_date
  ON point_events(user_id, activity_date DESC);
CREATE INDEX IF NOT EXISTS idx_point_events_user_week
  ON point_events(user_id, activity_week_start DESC);

COMMENT ON TABLE point_events IS 'Immutable-ish ledger of awarded points used for exact daily/weekly leaderboards';
COMMENT ON COLUMN point_events.event_type IS 'award = real event, *_snapshot = one-time migration backfill';
COMMENT ON COLUMN point_events.event_key IS 'Optional idempotency key to prevent duplicate point awards';

INSERT INTO point_events (
  user_id,
  points,
  event_type,
  source,
  event_key,
  activity_date,
  activity_week_start
)
SELECT
  u.id,
  u.points,
  'daily_snapshot',
  'backfill_daily_points',
  'backfill_daily_' || u.id || '_' || u.points_date::text,
  u.points_date,
  (u.points_date - ((EXTRACT(ISODOW FROM u.points_date)::int) - 1))::date
FROM users u
WHERE COALESCE(u.points, 0) > 0
  AND u.points_date IS NOT NULL
ON CONFLICT (event_key) DO NOTHING;

INSERT INTO point_events (
  user_id,
  points,
  event_type,
  source,
  event_key,
  activity_week_start
)
SELECT
  u.id,
  u.weekly_points,
  'weekly_snapshot',
  'backfill_weekly_points',
  'backfill_weekly_' || u.id || '_' || u.weekly_points_week_start::text,
  u.weekly_points_week_start
FROM users u
WHERE COALESCE(u.weekly_points, 0) > 0
  AND u.weekly_points_week_start IS NOT NULL
ON CONFLICT (event_key) DO NOTHING;

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
    WHERE m.points > 0
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
    WHERE m.points > 0
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
  WHERE u.id = requested_user_id;
$$;

GRANT EXECUTE ON FUNCTION get_period_leaderboard(TEXT, DATE, INTEGER) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_period_user_rank(TEXT, DATE, BIGINT) TO anon, authenticated, service_role;
