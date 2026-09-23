BEGIN;
CREATE TABLE IF NOT EXISTS dictation_topics (
 id TEXT PRIMARY KEY, title_ru TEXT NOT NULL, title_uz TEXT NOT NULL, icon TEXT NOT NULL DEFAULT '🎧',
 description_ru TEXT NOT NULL DEFAULT '', description_uz TEXT NOT NULL DEFAULT '', background_id TEXT NOT NULL DEFAULT 'city',
 sort_order INTEGER NOT NULL DEFAULT 0, is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dictation_items (
 id TEXT PRIMARY KEY, topic_id TEXT NOT NULL REFERENCES dictation_topics(id), type TEXT NOT NULL CHECK(type IN ('word','sentence')),
 text TEXT NOT NULL CHECK(length(text) BETWEEN 1 AND 200), translation_uz TEXT NOT NULL,
 audio_url TEXT, difficulty INTEGER NOT NULL CHECK(difficulty BETWEEN 1 AND 5), sort_order INTEGER NOT NULL DEFAULT 0,
 is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dictation_items_topic ON dictation_items(topic_id,sort_order);
CREATE TABLE IF NOT EXISTS dictation_sessions (
 id UUID PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 topic_id TEXT NOT NULL REFERENCES dictation_topics(id), request_id UUID NOT NULL,
 state JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(user_id,request_id)
);
CREATE TABLE IF NOT EXISTS dictation_attempts (
 id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 item_id TEXT NOT NULL REFERENCES dictation_items(id), session_id UUID NOT NULL REFERENCES dictation_sessions(id) ON DELETE CASCADE,
 position INTEGER NOT NULL, user_answer TEXT NOT NULL, correct_answer TEXT NOT NULL, is_correct BOOLEAN NOT NULL,
 mistake_count INTEGER NOT NULL CHECK(mistake_count>=0), response_time_ms INTEGER NOT NULL CHECK(response_time_ms>=0),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(session_id,position)
);
CREATE INDEX IF NOT EXISTS dictation_attempts_review ON dictation_attempts(user_id,item_id,id DESC);
CREATE TABLE IF NOT EXISTS dictation_progress (
 id BIGSERIAL PRIMARY KEY, user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 topic_id TEXT NOT NULL REFERENCES dictation_topics(id), completed_items INTEGER NOT NULL DEFAULT 0,
 correct_items INTEGER NOT NULL DEFAULT 0, wrong_items INTEGER NOT NULL DEFAULT 0,
 best_score INTEGER NOT NULL DEFAULT 0, best_combo INTEGER NOT NULL DEFAULT 0,
 last_played_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(user_id,topic_id)
);
COMMIT;
