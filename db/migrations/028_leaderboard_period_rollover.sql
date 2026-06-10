-- Period-aware leaderboard counters.
-- `points` is used as current daily points and `weekly_points` as current weekly points.
-- These companion date columns let us roll the counters forward lazily without global reset jobs.

ALTER TABLE users ADD COLUMN IF NOT EXISTS points_date DATE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_points_week_start DATE;

CREATE INDEX IF NOT EXISTS idx_users_points_date ON users(points_date);
CREATE INDEX IF NOT EXISTS idx_users_weekly_points_week_start ON users(weekly_points_week_start);
CREATE INDEX IF NOT EXISTS idx_users_points_date_points ON users(points_date, points DESC);
CREATE INDEX IF NOT EXISTS idx_users_weekly_points_active
  ON users(weekly_points_week_start, weekly_points DESC);

COMMENT ON COLUMN users.points IS 'Current day leaderboard points (period-aware with points_date)';
COMMENT ON COLUMN users.points_date IS 'App-local calendar date when users.points was last accumulated';
COMMENT ON COLUMN users.weekly_points IS 'Current week leaderboard points (period-aware with weekly_points_week_start)';
COMMENT ON COLUMN users.weekly_points_week_start IS 'Monday date of the week for weekly_points';
