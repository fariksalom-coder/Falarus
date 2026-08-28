-- Suhbatlar panelidagi RELS — qisqa vertikal videolar.
--
-- Kim joylaydi: admin, support va oddiy foydalanuvchilar.
-- Kim o'chiradi: muallifning o'zi, support (oltin hisob) va admin.
--
-- O'CHIRISH YUMSHOQ (`deleted_at`), qattiq emas. Sabab: kim, qachon va
-- nimani olib tashlaganini bilish kerak — moderatsiyada bu muhim.
-- Fayl esa diskdan darhol o'chiriladi, chunki joyni aynan u egallaydi.

CREATE TABLE IF NOT EXISTS public.community_reels (
  id             BIGSERIAL   PRIMARY KEY,
  author_user_id INTEGER     NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  video_url      TEXT        NOT NULL,
  /** Muqova rasmi — ro'yxatda videoni yuklamasdan ko'rsatish uchun. */
  poster_url     TEXT,
  caption        TEXT        NOT NULL DEFAULT '',
  duration_ms    INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  /** Yumshoq o'chirish — yozuv qoladi, fayl esa diskdan ketadi. */
  deleted_at     TIMESTAMPTZ,
  deleted_by     INTEGER     REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT community_reels_caption_check CHECK (char_length(caption) <= 500)
);

-- Lenta har doim "yangi birinchi" tartibida va o'chirilganlarsiz o'qiladi.
CREATE INDEX IF NOT EXISTS idx_community_reels_feed
  ON public.community_reels (created_at DESC)
  WHERE deleted_at IS NULL;

-- Muallifning o'z relslarini topish uchun.
CREATE INDEX IF NOT EXISTS idx_community_reels_author
  ON public.community_reels (author_user_id, created_at DESC);

COMMENT ON TABLE public.community_reels IS
  'Suhbatlar panelidagi qisqa videolar (rels). Yumshoq o''chiriladi.';
