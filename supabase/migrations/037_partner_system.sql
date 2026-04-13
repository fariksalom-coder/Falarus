-- Partner (Naparnik) system: profiles, requests, matches, chat
-- ============================================================

-- 1. Partner profiles
CREATE TABLE IF NOT EXISTS public.partner_profiles (
  user_id      integer PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  display_name text    NOT NULL,
  age          integer NOT NULL CHECK (age BETWEEN 10 AND 99),
  gender       text    NOT NULL CHECK (gender IN ('male', 'female')),
  language_level text  NOT NULL,
  goal         text    NOT NULL CHECK (goal IN ('work', 'conversation')),
  about        text    NOT NULL DEFAULT '',
  seeking      text    NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- 2. Partner requests
CREATE TABLE IF NOT EXISTS public.partner_requests (
  id           serial  PRIMARY KEY,
  sender_id    integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id  integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status       text    NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT partner_requests_no_self CHECK (sender_id <> receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_partner_requests_receiver_status
  ON public.partner_requests (receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_partner_requests_sender_status
  ON public.partner_requests (sender_id, status);

-- Only one pending request per sender at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_requests_one_pending_per_sender
  ON public.partner_requests (sender_id) WHERE status = 'pending';

-- 3. Partner matches
CREATE TABLE IF NOT EXISTS public.partner_matches (
  id         serial  PRIMARY KEY,
  user1_id   integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user2_id   integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status     text    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  matched_at timestamptz NOT NULL DEFAULT now(),
  ended_at   timestamptz,
  CONSTRAINT partner_matches_no_self CHECK (user1_id <> user2_id)
);

-- At most one active match per user (enforced via two partial unique indexes)
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_matches_one_active_user1
  ON public.partner_matches (user1_id) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_matches_one_active_user2
  ON public.partner_matches (user2_id) WHERE status = 'active';

-- 4. Chat messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         bigserial   PRIMARY KEY,
  match_id   integer     NOT NULL REFERENCES public.partner_matches(id) ON DELETE CASCADE,
  sender_id  integer     NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) > 0 AND char_length(content) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_match_created
  ON public.chat_messages (match_id, created_at);

-- Enable Supabase Realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ============================================================
-- RLS policies
-- ============================================================
ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_matches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages    ENABLE ROW LEVEL SECURITY;

-- partner_profiles: anyone authenticated can read; owner can write
CREATE POLICY partner_profiles_select ON public.partner_profiles
  FOR SELECT USING (true);
CREATE POLICY partner_profiles_insert ON public.partner_profiles
  FOR INSERT WITH CHECK (user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer);
CREATE POLICY partner_profiles_update ON public.partner_profiles
  FOR UPDATE USING (user_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer);

-- partner_requests: sender/receiver can read; sender can insert
CREATE POLICY partner_requests_select ON public.partner_requests
  FOR SELECT USING (
    sender_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer
    OR receiver_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer
  );
CREATE POLICY partner_requests_insert ON public.partner_requests
  FOR INSERT WITH CHECK (sender_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer);
CREATE POLICY partner_requests_update ON public.partner_requests
  FOR UPDATE USING (
    receiver_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer
  );

-- partner_matches: participants can read
CREATE POLICY partner_matches_select ON public.partner_matches
  FOR SELECT USING (
    user1_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer
    OR user2_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer
  );

-- chat_messages: match participants can read/write
CREATE POLICY chat_messages_select ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.partner_matches m
      WHERE m.id = match_id
        AND m.status = 'active'
        AND ((current_setting('request.jwt.claims', true)::json->>'sub')::integer IN (m.user1_id, m.user2_id))
    )
  );
CREATE POLICY chat_messages_insert ON public.chat_messages
  FOR INSERT WITH CHECK (
    sender_id = (current_setting('request.jwt.claims', true)::json->>'sub')::integer
    AND EXISTS (
      SELECT 1 FROM public.partner_matches m
      WHERE m.id = match_id
        AND m.status = 'active'
        AND ((current_setting('request.jwt.claims', true)::json->>'sub')::integer IN (m.user1_id, m.user2_id))
    )
  );
