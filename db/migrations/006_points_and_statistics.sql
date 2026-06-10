-- Points and statistics: user_tasks.points, users.total_points
-- points = correct_answers per task; total_points = sum of all task points per user

ALTER TABLE user_tasks
  ADD COLUMN IF NOT EXISTS points INT NOT NULL DEFAULT 0;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS total_points INT NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_total_points ON users(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_tasks_points ON user_tasks(user_id, points);

COMMENT ON COLUMN user_tasks.points IS 'Points earned for this task ( = correct_answers )';
COMMENT ON COLUMN users.total_points IS 'Sum of all points from user_tasks for this user';
