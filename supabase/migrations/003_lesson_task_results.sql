-- Lesson task results (per user, per lesson path, per task number).
CREATE TABLE IF NOT EXISTS lesson_task_results (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_path TEXT NOT NULL,
  task_number INT NOT NULL,
  correct INT NOT NULL DEFAULT 0,
  total INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_path, task_number)
);

CREATE INDEX IF NOT EXISTS idx_lesson_task_results_user_id ON lesson_task_results(user_id);
CREATE INDEX IF NOT EXISTS idx_lesson_task_results_user_lesson ON lesson_task_results(user_id, lesson_path);
