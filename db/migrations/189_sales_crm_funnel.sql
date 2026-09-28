-- Sales CRM funnel: plan/fact per stage (team + per operator) and the two
-- manual milestones that no other table records (presentation, support group).
-- Idempotent: safe to re-run.

ALTER TABLE sales_crm_leads
  ADD COLUMN IF NOT EXISTS presentation_at  timestamptz,
  ADD COLUMN IF NOT EXISTS support_group_at timestamptz;

-- Monthly targets. operator_id = 0 is the team-wide plan (0 instead of NULL
-- so the primary key stays a plain unique constraint).
CREATE TABLE IF NOT EXISTS sales_crm_plans (
  month       date   NOT NULL,
  stage       text   NOT NULL,
  operator_id bigint NOT NULL DEFAULT 0,
  target      integer NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (month, stage, operator_id),
  CONSTRAINT sales_crm_plans_month_first CHECK (extract(day FROM month) = 1),
  CONSTRAINT sales_crm_plans_target_chk CHECK (target BETWEEN 0 AND 1000000),
  CONSTRAINT sales_crm_plans_stage_chk CHECK (
    stage IN (
      'lead', 'attempt', 'reached', 'presentation', 'payment_pending',
      'paid', 'access', 'first_login', 'support_group'
    )
  )
);

CREATE INDEX IF NOT EXISTS idx_sales_crm_calls_lead_answered
  ON sales_crm_calls (lead_id, called_at)
  WHERE answered;

CREATE INDEX IF NOT EXISTS idx_sales_crm_events_status_moves
  ON sales_crm_events (lead_id, created_at)
  WHERE event_type IN ('status_changed', 'call_logged', 'paid');

-- Backfill presentation from history: an answered call where the product was
-- discussed, or a board move into a stage that only follows a presentation.
UPDATE sales_crm_leads l
SET presentation_at = s.first_at
FROM (
  SELECT lead_id, min(at) AS first_at
  FROM (
    SELECT c.lead_id, c.called_at AS at
    FROM sales_crm_calls c
    WHERE c.answered
      AND c.result IN ('interested', 'wants_details', 'thinking', 'ready_to_pay')
    UNION ALL
    SELECT e.lead_id, e.created_at
    FROM sales_crm_events e
    WHERE e.event_type = 'status_changed'
      AND e.payload->>'to' IN ('THINKING', 'PAYMENT_PENDING', 'FOLLOW_UP')
  ) x
  GROUP BY lead_id
) s
WHERE l.id = s.lead_id
  AND l.presentation_at IS NULL;
