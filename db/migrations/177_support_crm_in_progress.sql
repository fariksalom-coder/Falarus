-- Support CRM: "Jarayonda" (in_progress) contact outcome.
-- Idempotent: safe to re-run.

ALTER TABLE support_crm_contacts
  DROP CONSTRAINT IF EXISTS support_crm_contacts_outcome_chk;

ALTER TABLE support_crm_contacts
  ADD CONSTRAINT support_crm_contacts_outcome_chk CHECK (
    outcome IN (
      'reached',
      'no_answer',
      'no_pickup',
      'no_contact',
      'no_telegram',
      'no_whatsapp',
      'no_imo',
      'in_progress',
      'other'
    )
  );

CREATE INDEX IF NOT EXISTS idx_support_crm_contacts_outcome_created
  ON support_crm_contacts (outcome, created_at DESC);
