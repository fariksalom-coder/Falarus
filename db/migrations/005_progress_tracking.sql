-- Progress tracking: courses, lesson_plan, task_plan, user_tasks, user_lessons
-- (lesson_plan/task_plan avoid conflict with existing "lessons" table)

CREATE TABLE IF NOT EXISTS courses (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_plan (
  id BIGSERIAL PRIMARY KEY,
  course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  "order" INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS task_plan (
  id BIGSERIAL PRIMARY KEY,
  lesson_id BIGINT NOT NULL REFERENCES lesson_plan(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_tasks (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id BIGINT NOT NULL REFERENCES task_plan(id) ON DELETE CASCADE,
  correct_answers INT NOT NULL DEFAULT 0,
  total_questions INT NOT NULL DEFAULT 0,
  percentage REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'PASSED')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

CREATE TABLE IF NOT EXISTS user_lessons (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id BIGINT NOT NULL REFERENCES lesson_plan(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED')),
  progress REAL NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_task_id ON user_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_user_lessons_user_id ON user_lessons(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lessons_lesson_id ON user_lessons(lesson_id);
CREATE INDEX IF NOT EXISTS idx_task_plan_lesson_id ON task_plan(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_plan_course_id ON lesson_plan(course_id);
