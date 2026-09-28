-- Split CRM lead assignment by source:
-- platform registrations stay with the first operator, promo leads use a separate round-robin.

INSERT INTO sales_crm_settings (key, value)
VALUES ('promo_round_robin_cursor', '0')
ON CONFLICT (key) DO NOTHING;

WITH first_operator AS (
  SELECT id
  FROM sales_crm_agents
  WHERE active = true AND role = 'operator'
  ORDER BY id ASC
  LIMIT 1
),
moved AS (
  UPDATE sales_crm_leads l
  SET assigned_operator_id = (SELECT id FROM first_operator),
      updated_at = now()
  WHERE (SELECT id FROM first_operator) IS NOT NULL
    AND COALESCE(l.source, '') IN ('website', 'backfill')
    AND l.status <> 'PAID'
    AND l.paid_at IS NULL
    AND l.assigned_operator_id IS DISTINCT FROM (SELECT id FROM first_operator)
  RETURNING l.id, l.assigned_operator_id
)
INSERT INTO sales_crm_events (lead_id, actor_id, event_type, payload)
SELECT
  moved.id,
  NULL,
  'assigned',
  jsonb_build_object('mode', 'registration_first_operator_backfill', 'operatorId', moved.assigned_operator_id)
FROM moved;
