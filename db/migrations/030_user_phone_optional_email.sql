-- Login/register: email OR phone; profile can maintain both.

ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone_unique ON users (phone) WHERE phone IS NOT NULL;

ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_or_phone_check;
ALTER TABLE users ADD CONSTRAINT users_email_or_phone_check CHECK (
  email IS NOT NULL OR phone IS NOT NULL
);
