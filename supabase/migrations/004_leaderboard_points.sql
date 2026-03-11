-- Leaderboard: user points (all-time, weekly, monthly) and optional avatar
ALTER TABLE users ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS weekly_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS monthly_points INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

CREATE INDEX IF NOT EXISTS idx_users_points ON users(points DESC);
CREATE INDEX IF NOT EXISTS idx_users_weekly_points ON users(weekly_points DESC);
CREATE INDEX IF NOT EXISTS idx_users_monthly_points ON users(monthly_points DESC);
