-- OAuth (Google / Apple) sign-in support.
--
-- 1. Allow password-less users (signed in via Google / Apple).
-- 2. Track provider identities in a dedicated table so one user can link
--    multiple providers (Google + Apple + password) without colliding
--    on the unique email/phone constraints.

-- 1) Make password nullable. Existing rows are unaffected.
ALTER TABLE users ALTER COLUMN password DROP NOT NULL;

-- 2) Per-provider identity table.
CREATE TABLE IF NOT EXISTS user_oauth_identities (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'apple')),
  -- The stable subject ("sub") returned by the provider. Never reuse for
  -- another user. Apple returns a per-app identifier that never changes.
  provider_user_id TEXT NOT NULL,
  -- Email captured at link time (may be a private relay address for Apple).
  -- Informational only — we never trust it for re-linking.
  email_at_link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- A given provider sub maps to exactly one local user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_oauth_identities_provider_sub
  ON user_oauth_identities (provider, provider_user_id);

-- Fast lookup of all identities for a user (profile / unlink).
CREATE INDEX IF NOT EXISTS idx_user_oauth_identities_user
  ON user_oauth_identities (user_id);
