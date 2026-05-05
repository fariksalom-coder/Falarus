-- Replace the coarse _108 table with a detailed per-day progress table
DROP TABLE IF EXISTS user_kunlik_progress;

CREATE TABLE IF NOT EXISTS user_kunlik_day_progress (
  user_id        BIGINT   NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_number     INTEGER  NOT NULL CHECK (day_number BETWEEN 1 AND 182),

  -- Grammatika (done = passed ≥70%)
  grammar_1      BOOLEAN  NOT NULL DEFAULT false,
  grammar_2      BOOLEAN  NOT NULL DEFAULT false,
  grammar_3      BOOLEAN  NOT NULL DEFAULT false,

  -- Lug'at (vocabulary)
  words_learned  SMALLINT NOT NULL DEFAULT 0,    -- tanishish: bilgan so'zlar soni
  words_correct  SMALLINT NOT NULL DEFAULT 0,    -- test: to'g'ri topganlar
  words_match    BOOLEAN  NOT NULL DEFAULT false, -- juftlash: o'yin tugadi

  -- O'qish
  oqish_done     BOOLEAN  NOT NULL DEFAULT false,

  -- Gapirish
  speaking_level SMALLINT NOT NULL DEFAULT 0,    -- nechi taskgacha bajardi

  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, day_number)
);

CREATE INDEX IF NOT EXISTS idx_ukdp_user_id ON user_kunlik_day_progress(user_id);
