-- Single source of truth for kunlik reja block completions
-- Presence of a row means the block is done (no is_done column needed)
CREATE TABLE IF NOT EXISTS user_kunlik_progress (
  user_id    BIGINT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 182),
  block_kind TEXT    NOT NULL CHECK (block_kind IN ('grammar', 'vocabulary', 'text', 'review')),
  done_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day_number, block_kind)
);

CREATE INDEX IF NOT EXISTS idx_ukp_user_id ON user_kunlik_progress(user_id);
