-- Run this in Supabase SQL Editor to create the table for streak tracking.
-- Table: one row per (user_id, activity_date) when user had activity that day.
CREATE TABLE IF NOT EXISTS user_activity_dates (
  user_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date date NOT NULL,
  PRIMARY KEY (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_user_activity_dates_user_id ON user_activity_dates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_dates_date ON user_activity_dates(activity_date);

COMMENT ON TABLE user_activity_dates IS 'One row per day when user had activity (lesson/vocabulary). Used for streak and last 7 days.';
