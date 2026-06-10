-- Online presence and typing indicators for SAVOL-JAVOB group.

CREATE TABLE IF NOT EXISTS public.community_group_presence (
  user_id       integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_code    text NOT NULL DEFAULT 'savol_javob',
  last_seen_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_code)
);

CREATE INDEX IF NOT EXISTS idx_community_group_presence_group_seen
  ON public.community_group_presence (group_code, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS public.community_group_typing (
  user_id     integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_code  text NOT NULL DEFAULT 'savol_javob',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, group_code)
);

CREATE INDEX IF NOT EXISTS idx_community_group_typing_group_updated
  ON public.community_group_typing (group_code, updated_at DESC);
