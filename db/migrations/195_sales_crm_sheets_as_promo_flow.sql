-- Google Sheets / table leads are the advertising flow while Promo Russian is paused.
-- Platform registrations stay on the first operator; table/ad leads go to operator 2+.

WITH first_operator AS (
  SELECT id
  FROM sales_crm_agents
  WHERE active = true AND role = 'operator'
  ORDER BY id ASC
  LIMIT 1
),
promo_ops AS (
  SELECT array_agg(id ORDER BY id ASC) AS ids
  FROM sales_crm_agents
  WHERE active = true
    AND role = 'operator'
    AND id IS DISTINCT FROM (SELECT id FROM first_operator)
),
candidates AS (
  SELECT
    l.id,
    ((row_number() OVER (ORDER BY l.created_at ASC, l.id ASC) - 1)
      % greatest(array_length((SELECT ids FROM promo_ops), 1), 1)) + 1 AS op_index
  FROM sales_crm_leads l
  WHERE array_length((SELECT ids FROM promo_ops), 1) IS NOT NULL
    AND coalesce(l.source, '') NOT IN ('website', 'backfill', 'payment')
    AND l.status NOT IN ('PAID', 'PAYMENT_PENDING')
    AND l.paid_at IS NULL
    AND (
      l.assigned_operator_id IS NULL
      OR l.assigned_operator_id = (SELECT id FROM first_operator)
    )
),
moved AS (
  UPDATE sales_crm_leads l
  SET assigned_operator_id = ((SELECT ids FROM promo_ops))[c.op_index],
      updated_at = now()
  FROM candidates c
  WHERE l.id = c.id
  RETURNING l.id, l.assigned_operator_id
)
INSERT INTO sales_crm_events (lead_id, actor_id, event_type, payload)
SELECT
  moved.id,
  NULL,
  'assigned',
  jsonb_build_object('mode', 'sheets_promo_rebalance', 'operator_id', moved.assigned_operator_id)
FROM moved;
