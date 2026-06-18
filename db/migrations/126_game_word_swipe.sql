-- Word-swipe game: stages, words, user progress

CREATE TABLE IF NOT EXISTS game_word_swipe_stages (
  id BIGSERIAL PRIMARY KEY,
  level_number INTEGER NOT NULL,
  stage_number INTEGER NOT NULL,
  title TEXT,
  grid_rows INTEGER NOT NULL DEFAULT 5,
  grid_cols INTEGER NOT NULL DEFAULT 6,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (level_number, stage_number),
  CHECK (level_number > 0),
  CHECK (stage_number BETWEEN 1 AND 50),
  CHECK (grid_rows BETWEEN 4 AND 8),
  CHECK (grid_cols BETWEEN 4 AND 8)
);

CREATE TABLE IF NOT EXISTS game_word_swipe_words (
  id BIGSERIAL PRIMARY KEY,
  stage_id BIGINT NOT NULL REFERENCES game_word_swipe_stages(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  word_uz TEXT NOT NULL,
  word_ru TEXT NOT NULL,
  word_ru_normalized TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stage_id, word_ru_normalized)
);

CREATE INDEX IF NOT EXISTS idx_game_word_swipe_stages_level_stage
  ON game_word_swipe_stages(level_number, stage_number)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_game_word_swipe_words_stage
  ON game_word_swipe_words(stage_id, sort_order)
  WHERE is_active = TRUE;

CREATE TABLE IF NOT EXISTS user_game_word_swipe_progress (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level_number INTEGER NOT NULL DEFAULT 1,
  stage_number INTEGER NOT NULL DEFAULT 1,
  completed_stages JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id),
  CHECK (level_number > 0),
  CHECK (stage_number BETWEEN 1 AND 50)
);

CREATE INDEX IF NOT EXISTS idx_user_game_word_swipe_progress_updated
  ON user_game_word_swipe_progress(updated_at DESC);
