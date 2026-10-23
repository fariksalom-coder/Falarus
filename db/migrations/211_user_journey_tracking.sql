-- FOYDALANUVCHI YO'LI: ro'yxatdan o'tgandan keyin nima qilgani.
--
-- Ikki jadval, ikkalasi ham foydalanuvchi + kalit bo'yicha BITTA qator
-- (upsert): jadval har bosishda o'smaydi, faqat birinchi/oxirgi vaqt va
-- son yangilanadi.
--
-- user_journey_steps — qaysi qadamni ochgani: kirish, 0-kun va uning
--   bloklari, kurs videosi sahifasi. Ro'yxat serverda (allowlist).
-- user_video_progress — video qancha ko'rilgani: haqiqiy ko'rilgan
--   soniyalar, qaysi joygacha yetgani, necha marta boshlangani.
BEGIN;

CREATE TABLE IF NOT EXISTS public.user_journey_steps (
  user_id  BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  step_key TEXT   NOT NULL CHECK (length(step_key) BETWEEN 1 AND 80),
  first_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  hits     INTEGER     NOT NULL DEFAULT 1 CHECK (hits >= 1),
  PRIMARY KEY (user_id, step_key)
);
CREATE INDEX IF NOT EXISTS user_journey_steps_key_idx
  ON public.user_journey_steps (step_key, first_at);

CREATE TABLE IF NOT EXISTS public.user_video_progress (
  user_id              BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  video_key            TEXT   NOT NULL CHECK (length(video_key) BETWEEN 1 AND 60),
  duration_seconds     REAL,
  max_position_seconds REAL    NOT NULL DEFAULT 0 CHECK (max_position_seconds >= 0),
  watched_seconds      REAL    NOT NULL DEFAULT 0 CHECK (watched_seconds >= 0),
  plays                INTEGER NOT NULL DEFAULT 0 CHECK (plays >= 0),
  completed_at         TIMESTAMPTZ,
  first_started_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_watched_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, video_key)
);
CREATE INDEX IF NOT EXISTS user_video_progress_key_idx
  ON public.user_video_progress (video_key, last_watched_at DESC);

COMMIT;
