-- Support CRM (retention): outbound calls to inactive premium students.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS support_crm_agents (
  id            bigserial PRIMARY KEY,
  login         text NOT NULL,
  password_hash text NOT NULL,
  name          text NOT NULL DEFAULT '',
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_crm_agents_login_len CHECK (char_length(login) BETWEEN 3 AND 40),
  CONSTRAINT support_crm_agents_login_fmt CHECK (login ~ '^[a-z0-9_.-]+$')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_support_crm_agents_login
  ON support_crm_agents (lower(login));

CREATE TABLE IF NOT EXISTS support_crm_contacts (
  id             bigserial PRIMARY KEY,
  agent_id       bigint NOT NULL REFERENCES support_crm_agents(id) ON DELETE RESTRICT,
  user_id        bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel        text NOT NULL,
  channel_other  text,
  outcome        text NOT NULL,
  result         text,
  comment_text   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_crm_contacts_channel_chk CHECK (
    channel IN ('phone', 'telegram', 'whatsapp', 'max', 'other')
  ),
  CONSTRAINT support_crm_contacts_outcome_chk CHECK (
    outcome IN ('reached', 'no_answer', 'no_pickup', 'no_contact', 'no_telegram', 'no_whatsapp', 'other')
  ),
  CONSTRAINT support_crm_contacts_result_chk CHECK (
    result IS NULL OR result IN ('returned_ok', 'helped_login', 'needs_fix', 'feedback', 'other')
  ),
  CONSTRAINT support_crm_contacts_channel_other_chk CHECK (
    (channel = 'other' AND channel_other IS NOT NULL AND char_length(trim(channel_other)) > 0)
    OR (channel <> 'other' AND (channel_other IS NULL OR channel_other = ''))
  ),
  CONSTRAINT support_crm_contacts_comment_len CHECK (
    comment_text IS NULL OR char_length(comment_text) <= 2000
  )
);

CREATE INDEX IF NOT EXISTS idx_support_crm_contacts_user_created
  ON support_crm_contacts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_crm_contacts_created
  ON support_crm_contacts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_crm_contacts_agent_created
  ON support_crm_contacts (agent_id, created_at DESC);

-- Speeds up "active premium + last kunlik activity" queue scans.
CREATE INDEX IF NOT EXISTS idx_users_plan_expires_active
  ON users (plan_expires_at)
  WHERE plan_expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ukdp_user_updated
  ON user_kunlik_day_progress (user_id, updated_at DESC);
