-- Ensure patent exam results table exists (DBs that never applied 030_course_products).

CREATE TABLE IF NOT EXISTS patent_variant_results (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  variant_number INTEGER NOT NULL CHECK (variant_number BETWEEN 1 AND 11),
  correct_count INTEGER NOT NULL CHECK (correct_count >= 0),
  total_count INTEGER NOT NULL CHECK (total_count > 0),
  score_percent INTEGER NOT NULL CHECK (score_percent BETWEEN 0 AND 100),
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, variant_number)
);

CREATE INDEX IF NOT EXISTS idx_patent_variant_results_user
  ON patent_variant_results(user_id);
