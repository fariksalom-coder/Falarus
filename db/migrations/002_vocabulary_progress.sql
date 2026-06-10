-- Vocabulary section progress (So'zlar): result = test + pairs only, synced per device.
CREATE TABLE IF NOT EXISTS vocabulary_progress (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  subtopic_id TEXT NOT NULL,
  part_id TEXT NOT NULL,
  result_count INT NOT NULL DEFAULT 0,
  stage_cards TEXT,
  stage_test TEXT,
  stage_pairs TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_id, subtopic_id, part_id)
);

CREATE INDEX IF NOT EXISTS idx_vocabulary_progress_user_id ON vocabulary_progress(user_id);
