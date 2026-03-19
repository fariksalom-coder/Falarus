-- Stores each Step 2 (Test) completion so we can calculate "Bugun / Bu hafta"
-- based on calendar dates with maximum correct answers per word-group per day.

CREATE TABLE IF NOT EXISTS user_vocabulary_step2_attempts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_group_id BIGINT NOT NULL,
  activity_date DATE NOT NULL,
  correct_answers INT NOT NULL,
  incorrect_answers INT NOT NULL,
  total_questions INT NOT NULL,
  percentage NUMERIC(6,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_vocabulary_step2_attempts_user_date
  ON user_vocabulary_step2_attempts (user_id, activity_date);

CREATE INDEX IF NOT EXISTS idx_user_vocabulary_step2_attempts_user_wordgroup
  ON user_vocabulary_step2_attempts (user_id, word_group_id);

