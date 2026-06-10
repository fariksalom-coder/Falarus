-- Global Q&A group chat (SAVOL-JAVOB): all authenticated users can read/write.

CREATE TABLE IF NOT EXISTS public.community_group_messages (
  id              bigserial PRIMARY KEY,
  group_code      text NOT NULL DEFAULT 'savol_javob',
  sender_user_id  integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content         text NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_community_group_messages_group_created
  ON public.community_group_messages (group_code, created_at DESC);

CREATE TABLE IF NOT EXISTS public.community_group_reads (
  user_id       integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_code    text NOT NULL DEFAULT 'savol_javob',
  last_read_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_code)
);
