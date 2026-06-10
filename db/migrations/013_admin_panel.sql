-- Admin panel: admins, subscription payment requests, support, pricing, withdrawal fields, indexes

-- 1. Admins table (single super-admin)
CREATE TABLE IF NOT EXISTS admins (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Subscription payment requests (user pays by card, admin confirms)
CREATE TABLE IF NOT EXISTS subscription_payment_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'three_months', 'yearly')),
  amount NUMERIC(14, 2) NOT NULL,
  payment_method TEXT DEFAULT 'card',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_subscription_payment_requests_status ON subscription_payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_subscription_payment_requests_user ON subscription_payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payment_requests_created ON subscription_payment_requests(created_at DESC);

-- 3. referral_withdrawals: add card_number, phone, full_name, admin_receipt
ALTER TABLE referral_withdrawals
  ADD COLUMN IF NOT EXISTS card_number TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS full_name TEXT,
  ADD COLUMN IF NOT EXISTS admin_receipt TEXT;

-- 4. Support messages
CREATE TABLE IF NOT EXISTS support_messages (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'answered')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  answered_at TIMESTAMPTZ,
  reply TEXT
);

CREATE INDEX IF NOT EXISTS idx_support_messages_status ON support_messages(status);
CREATE INDEX IF NOT EXISTS idx_support_messages_user ON support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON support_messages(created_at DESC);

-- 5. Pricing plans (admin-editable)
CREATE TABLE IF NOT EXISTS pricing_plans (
  id BIGSERIAL PRIMARY KEY,
  plan_name TEXT NOT NULL,
  duration_days INT NOT NULL,
  price NUMERIC(14, 2) NOT NULL,
  discount_percent NUMERIC(5, 2) DEFAULT 0 NOT NULL,
  active BOOLEAN DEFAULT TRUE NOT NULL
);

-- 6. Performance indexes (user requested)
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
