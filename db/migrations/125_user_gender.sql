-- User profile gender for default avatar icons (avatar_url already exists on users).

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS gender text
  CHECK (gender IS NULL OR gender IN ('male', 'female'));

COMMENT ON COLUMN public.users.gender IS 'Default avatar: male or female icon when avatar_url is empty.';
