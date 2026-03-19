-- Vocabulary steps extended state for three-step learning flow
-- Adds detailed flashcards and test attempt stats to user_word_group_progress.

ALTER TABLE user_word_group_progress
  ADD COLUMN IF NOT EXISTS flashcards_known INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flashcards_unknown INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flashcards_completed BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS test_last_correct INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS test_last_incorrect INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS test_last_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS test_passed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_user_word_group_progress_flashcards_completed
  ON user_word_group_progress (user_id, word_group_id, flashcards_completed);

CREATE INDEX IF NOT EXISTS idx_user_word_group_progress_test_passed
  ON user_word_group_progress (user_id, word_group_id, test_passed);

