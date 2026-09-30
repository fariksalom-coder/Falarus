BEGIN;

ALTER TABLE sales_crm_leads
  ADD COLUMN IF NOT EXISTS no_answer_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_answer_retry_at timestamptz;

ALTER TABLE sales_crm_leads DROP CONSTRAINT IF EXISTS sales_crm_no_answer_attempts_chk;
ALTER TABLE sales_crm_leads ADD CONSTRAINT sales_crm_no_answer_attempts_chk
  CHECK (no_answer_attempts BETWEEN 0 AND 5);

ALTER TABLE sales_crm_leads DROP CONSTRAINT IF EXISTS sales_crm_leads_status_chk;
ALTER TABLE sales_crm_leads ADD CONSTRAINT sales_crm_leads_status_chk CHECK (
  status IN ('NEW','TO_CALL','CALLED','ANSWERED','FOLLOW_UP','THINKING',
    'PAYMENT_PENDING','PAID','NO_ANSWER','INVALID_PHONE','CALLBACK',
    'NOT_INTERESTED','ARCHIVED','LOW_QUALITY')
);

CREATE INDEX IF NOT EXISTS idx_sales_crm_no_answer_due
  ON sales_crm_leads (no_answer_retry_at, id)
  WHERE status = 'NO_ANSWER' AND no_answer_retry_at IS NOT NULL;

-- Keep board moves, call results and background updates on one durable clock.
CREATE OR REPLACE FUNCTION sales_crm_no_answer_transition() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  delay_hours integer;
BEGIN
  IF NEW.status = 'NO_ANSWER' THEN
    IF OLD.status <> 'NO_ANSWER' OR OLD.no_answer_attempts = 0 THEN
      NEW.no_answer_attempts := least(OLD.no_answer_attempts + 1, 5);
      IF NEW.no_answer_attempts >= 5 THEN
        NEW.status := 'LOW_QUALITY';
        NEW.no_answer_retry_at := NULL;
        NEW.next_contact_at := NULL;
      ELSE
        delay_hours := (ARRAY[2, 4, 12, 24])[NEW.no_answer_attempts];
        NEW.no_answer_retry_at := now() + make_interval(hours => delay_hours);
        NEW.next_contact_at := NEW.no_answer_retry_at;
      END IF;
    ELSE
      -- A repeated request or an edit to the waiting card is not another call.
      NEW.no_answer_attempts := OLD.no_answer_attempts;
      NEW.no_answer_retry_at := OLD.no_answer_retry_at;
      NEW.next_contact_at := OLD.no_answer_retry_at;
    END IF;
  ELSE
    NEW.no_answer_retry_at := NULL;
    IF OLD.status = 'NO_ANSWER' AND NEW.next_contact_at IS NOT DISTINCT FROM OLD.next_contact_at THEN
      NEW.next_contact_at := NULL;
    END IF;
  END IF;

  IF NEW.status IN ('PAID','ARCHIVED','NOT_INTERESTED','INVALID_PHONE','LOW_QUALITY') THEN
    NEW.next_contact_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sales_crm_no_answer_transition_trg ON sales_crm_leads;
CREATE TRIGGER sales_crm_no_answer_transition_trg
  BEFORE UPDATE ON sales_crm_leads
  FOR EACH ROW EXECUTE FUNCTION sales_crm_no_answer_transition();

CREATE OR REPLACE FUNCTION sales_crm_no_answer_audit() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('NO_ANSWER','LOW_QUALITY') AND
     (OLD.status IS DISTINCT FROM NEW.status OR OLD.no_answer_attempts <> NEW.no_answer_attempts) THEN
    UPDATE sales_crm_tasks SET status = 'cancelled', completed_at = now()
      WHERE lead_id = NEW.id AND status = 'open';
    INSERT INTO sales_crm_events (lead_id, event_type, payload)
      VALUES (NEW.id, 'no_answer_retry', jsonb_build_object(
        'attempt', NEW.no_answer_attempts, 'retry_at', NEW.no_answer_retry_at,
        'from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sales_crm_no_answer_audit_trg ON sales_crm_leads;
CREATE TRIGGER sales_crm_no_answer_audit_trg
  AFTER UPDATE ON sales_crm_leads
  FOR EACH ROW EXECUTE FUNCTION sales_crm_no_answer_audit();

-- Existing waiting leads start at attempt one, without guessing historic calls.
-- The zero guard also makes this migration safe to run again.
UPDATE sales_crm_leads SET status = 'NO_ANSWER', updated_at = now()
  WHERE status = 'NO_ANSWER' AND no_answer_attempts = 0;

COMMIT;
