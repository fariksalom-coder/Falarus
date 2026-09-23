-- Sales CRM (inbound leads) — isolated from Support CRM retention.
-- Lead source of truth remains users(+phone); this layer adds pipeline state.
-- Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS sales_crm_agents (
  id            bigserial PRIMARY KEY,
  login         text NOT NULL,
  password_hash text NOT NULL,
  name          text NOT NULL DEFAULT '',
  role          text NOT NULL DEFAULT 'operator',
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_crm_agents_login_len CHECK (char_length(login) BETWEEN 3 AND 40),
  CONSTRAINT sales_crm_agents_login_fmt CHECK (login ~ '^[a-z0-9_.-]+$'),
  CONSTRAINT sales_crm_agents_role_chk CHECK (role IN ('admin', 'operator'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_crm_agents_login
  ON sales_crm_agents (lower(login));

CREATE INDEX IF NOT EXISTS idx_sales_crm_agents_active_role
  ON sales_crm_agents (active, role)
  WHERE active = true;

CREATE TABLE IF NOT EXISTS sales_crm_settings (
  key   text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO sales_crm_settings (key, value)
VALUES
  ('assignment_mode', 'round_robin'),
  ('round_robin_cursor', '0')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS sales_crm_leads (
  id                    bigserial PRIMARY KEY,
  user_id               bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_normalized      text,
  assigned_operator_id  bigint REFERENCES sales_crm_agents(id) ON DELETE SET NULL,
  status                text NOT NULL DEFAULT 'NEW',
  source                text,
  medium                text,
  campaign              text,
  ad                    text,
  landing_page          text,
  last_contact_at       timestamptz,
  next_contact_at       timestamptz,
  last_action_at        timestamptz NOT NULL DEFAULT now(),
  paid_amount           numeric(14, 2),
  paid_currency         text,
  paid_at               timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_crm_leads_status_chk CHECK (
    status IN (
      'NEW', 'TO_CALL', 'CALLED', 'ANSWERED', 'FOLLOW_UP', 'THINKING',
      'PAYMENT_PENDING', 'PAID', 'NO_ANSWER', 'CALLBACK', 'NOT_INTERESTED', 'ARCHIVED'
    )
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_crm_leads_user
  ON sales_crm_leads (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_crm_leads_phone
  ON sales_crm_leads (phone_normalized)
  WHERE phone_normalized IS NOT NULL AND phone_normalized <> '';

CREATE INDEX IF NOT EXISTS idx_sales_crm_leads_status
  ON sales_crm_leads (status);

CREATE INDEX IF NOT EXISTS idx_sales_crm_leads_operator
  ON sales_crm_leads (assigned_operator_id)
  WHERE assigned_operator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_crm_leads_next_contact
  ON sales_crm_leads (next_contact_at)
  WHERE next_contact_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sales_crm_leads_created
  ON sales_crm_leads (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_crm_leads_last_action
  ON sales_crm_leads (last_action_at DESC);

CREATE TABLE IF NOT EXISTS sales_crm_events (
  id         bigserial PRIMARY KEY,
  lead_id    bigint NOT NULL REFERENCES sales_crm_leads(id) ON DELETE CASCADE,
  actor_id   bigint REFERENCES sales_crm_agents(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_crm_events_type_len CHECK (char_length(event_type) BETWEEN 2 AND 64)
);

CREATE INDEX IF NOT EXISTS idx_sales_crm_events_lead_created
  ON sales_crm_events (lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sales_crm_tasks (
  id            bigserial PRIMARY KEY,
  lead_id       bigint NOT NULL REFERENCES sales_crm_leads(id) ON DELETE CASCADE,
  operator_id   bigint REFERENCES sales_crm_agents(id) ON DELETE SET NULL,
  task_type     text NOT NULL DEFAULT 'call',
  scheduled_at  timestamptz NOT NULL,
  completed_at  timestamptz,
  status        text NOT NULL DEFAULT 'open',
  note          text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_crm_tasks_type_chk CHECK (task_type IN ('call', 'follow_up', 'other')),
  CONSTRAINT sales_crm_tasks_status_chk CHECK (status IN ('open', 'done', 'cancelled')),
  CONSTRAINT sales_crm_tasks_note_len CHECK (note IS NULL OR char_length(note) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_sales_crm_tasks_open_sched
  ON sales_crm_tasks (operator_id, scheduled_at)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_sales_crm_tasks_lead_open
  ON sales_crm_tasks (lead_id)
  WHERE status = 'open';

CREATE TABLE IF NOT EXISTS sales_crm_comments (
  id         bigserial PRIMARY KEY,
  lead_id    bigint NOT NULL REFERENCES sales_crm_leads(id) ON DELETE CASCADE,
  agent_id   bigint NOT NULL REFERENCES sales_crm_agents(id) ON DELETE RESTRICT,
  comment    text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_crm_comments_len CHECK (char_length(comment) BETWEEN 1 AND 2000)
);

CREATE INDEX IF NOT EXISTS idx_sales_crm_comments_lead
  ON sales_crm_comments (lead_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sales_crm_calls (
  id               bigserial PRIMARY KEY,
  lead_id          bigint NOT NULL REFERENCES sales_crm_leads(id) ON DELETE CASCADE,
  operator_id      bigint NOT NULL REFERENCES sales_crm_agents(id) ON DELETE RESTRICT,
  answered         boolean NOT NULL,
  result           text NOT NULL,
  comment          text,
  next_contact_at  timestamptz,
  called_at        timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_crm_calls_result_len CHECK (char_length(result) BETWEEN 2 AND 64),
  CONSTRAINT sales_crm_calls_comment_len CHECK (comment IS NULL OR char_length(comment) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_sales_crm_calls_lead
  ON sales_crm_calls (lead_id, called_at DESC);

CREATE INDEX IF NOT EXISTS idx_sales_crm_calls_operator
  ON sales_crm_calls (operator_id, called_at DESC);
