-- Vocabulary section: Topic → Subtopic → WordGroup → Words
-- + Progress cache: user_word_group_progress, user_subtopic_progress, user_topic_progress

-- Topics (e.g. Kundalik hayot)
CREATE TABLE IF NOT EXISTS vocabulary_topics (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL
);

-- Subtopics (e.g. Salomlashish)
CREATE TABLE IF NOT EXISTS vocabulary_subtopics (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES vocabulary_topics(id) ON DELETE CASCADE,
  title TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_subtopics_topic_id ON vocabulary_subtopics(topic_id);

-- Word groups (e.g. Ot, Sifat) — one per "part" in content
CREATE TABLE IF NOT EXISTS vocabulary_word_groups (
  id BIGSERIAL PRIMARY KEY,
  subtopic_id TEXT NOT NULL REFERENCES vocabulary_subtopics(id) ON DELETE CASCADE,
  part_id TEXT NOT NULL,
  title TEXT NOT NULL,
  total_words INT NOT NULL DEFAULT 0,
  UNIQUE(subtopic_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_word_groups_subtopic ON vocabulary_word_groups(subtopic_id);

-- Words in a group (word = Russian, translation = Uzbek)
CREATE TABLE IF NOT EXISTS vocabulary_words (
  id BIGSERIAL PRIMARY KEY,
  word_group_id BIGINT NOT NULL REFERENCES vocabulary_word_groups(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  translation TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_words_word_group ON vocabulary_words(word_group_id);

-- Progress cache: per user per word group (updated only on task completion)
CREATE TABLE IF NOT EXISTS user_word_group_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  word_group_id BIGINT NOT NULL REFERENCES vocabulary_word_groups(id) ON DELETE CASCADE,
  learned_words INT NOT NULL DEFAULT 0,
  total_words INT NOT NULL DEFAULT 0,
  flashcards_completed BOOLEAN NOT NULL DEFAULT false,
  test_best_correct INT NOT NULL DEFAULT 0,
  match_completed BOOLEAN NOT NULL DEFAULT false,
  progress_percent REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, word_group_id)
);

CREATE INDEX IF NOT EXISTS idx_user_word_group ON user_word_group_progress(user_id, word_group_id);

-- Progress cache: per user per subtopic (recalculated from word groups)
CREATE TABLE IF NOT EXISTS user_subtopic_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subtopic_id TEXT NOT NULL REFERENCES vocabulary_subtopics(id) ON DELETE CASCADE,
  learned_words INT NOT NULL DEFAULT 0,
  total_words INT NOT NULL DEFAULT 0,
  progress_percent REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, subtopic_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subtopic ON user_subtopic_progress(user_id, subtopic_id);

-- Progress cache: per user per topic (recalculated from subtopics)
CREATE TABLE IF NOT EXISTS user_topic_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL REFERENCES vocabulary_topics(id) ON DELETE CASCADE,
  learned_words INT NOT NULL DEFAULT 0,
  total_words INT NOT NULL DEFAULT 0,
  progress_percent REAL NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

CREATE INDEX IF NOT EXISTS idx_user_topic ON user_topic_progress(user_id, topic_id);
