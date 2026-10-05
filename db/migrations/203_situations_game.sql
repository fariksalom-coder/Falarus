-- Isolated from existing games. Never deletes imported content or learner progress.
BEGIN;
CREATE TABLE IF NOT EXISTS dialogue_topics (
  id text PRIMARY KEY, sort_order integer NOT NULL, metadata jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS dialogue_situations (
  id text PRIMARY KEY, topic_id text NOT NULL REFERENCES dialogue_topics(id),
  sort_order integer NOT NULL, content jsonb NOT NULL
);
CREATE TABLE IF NOT EXISTS dialogue_sessions (
  id uuid PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  situation_id text NOT NULL REFERENCES dialogue_situations(id), request_id uuid NOT NULL,
  state jsonb NOT NULL, finished boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,request_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS dialogue_one_active_situation
  ON dialogue_sessions(user_id,situation_id) WHERE NOT finished;
CREATE TABLE IF NOT EXISTS dialogue_progress (
  user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  situation_id text NOT NULL REFERENCES dialogue_situations(id),
  stars integer NOT NULL CHECK(stars BETWEEN 1 AND 3),
  best_mistakes integer NOT NULL CHECK(best_mistakes >= 0), attempts integer NOT NULL DEFAULT 1,
  completed_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(user_id,situation_id)
);
COMMIT;
