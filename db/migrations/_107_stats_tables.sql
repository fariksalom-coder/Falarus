-- Track how many kunlik reja days completed per calendar date
CREATE TABLE IF NOT EXISTS user_course_daily_activity (
  user_id       BIGINT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_date DATE    NOT NULL DEFAULT CURRENT_DATE,
  course_days_completed INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_ucda_user_id   ON user_course_daily_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_ucda_user_date ON user_course_daily_activity(user_id, activity_date);
