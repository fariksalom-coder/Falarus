-- Streak (Ketma-ket kunlar): one row per day when user had activity
CREATE TABLE IF NOT EXISTS user_activity_dates (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  PRIMARY KEY (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_user_activity_dates_user_id ON user_activity_dates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_dates_date ON user_activity_dates(activity_date);

COMMENT ON TABLE user_activity_dates IS 'One row per day when user had activity (lesson/vocabulary). Used for streak and last 7 days.';
