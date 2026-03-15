-- Optimization indexes for serverless (Vercel): fewer connections, faster queries.
-- All use IF NOT EXISTS so migration is idempotent.

-- Users: filter/sort by created_at (admin dashboard, analytics)
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- Payments: filter by status (pending/approved/rejected), admin list
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- Leaderboard: order by total_points (leaderboard API)
CREATE INDEX IF NOT EXISTS idx_leaderboard_points ON leaderboard(total_points DESC);
