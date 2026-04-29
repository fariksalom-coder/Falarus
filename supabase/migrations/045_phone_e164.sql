-- E.164 phone storage: normalized lookup + legacy phone mirror for compatibility.

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_raw TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_normalized TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_code TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_invalid BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN users.phone_raw IS 'Original phone input at registration or last manual edit.';
COMMENT ON COLUMN users.phone_normalized IS 'E.164 including leading + (UZ/KZ/RU/TJ/TJ subset enforced in app).';
COMMENT ON COLUMN users.country_code IS 'ISO 3166-1 alpha-2 country derived from normalized number.';
COMMENT ON COLUMN users.phone_verified IS 'OTP verification reserved for future use.';
COMMENT ON COLUMN users.phone_invalid IS 'True when legacy value could not be normalized (manual cleanup).';

-- Replace legacy uniqueness on raw phone with uniqueness on normalized E.164.
DROP INDEX IF EXISTS idx_users_phone_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_normalized_unique
  ON users (phone_normalized)
  WHERE phone_normalized IS NOT NULL AND phone_invalid = FALSE;

CREATE INDEX IF NOT EXISTS idx_users_phone_legacy_lookup ON users (phone)
  WHERE phone IS NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_normalized_format_chk;
ALTER TABLE users ADD CONSTRAINT users_phone_normalized_format_chk CHECK (
  phone_normalized IS NULL OR phone_normalized ~ '^\+[1-9][0-9]{6,14}$'
);
